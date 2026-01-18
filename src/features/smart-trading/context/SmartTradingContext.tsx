"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { smartTradingService, fetchMigrationsFromDevprint } from "../service";
import { useSharedWebSocket, type ConnectionStatus } from "../hooks/useWebSocket";
import { dispatchTerminalEvent } from "../../terminal";
import { logAiAnalysis, logMarketSnapshot } from "@/lib/analysisLogger";
import type {
  TradingConfig,
  DashboardStatsResponse,
  TrackedWallet,
  TradingSignal,
  Position,
  PortfolioSnapshot,
  RankedMigration,
  MigrationFeedStats,
  MigrationFeedEvent,
  Migration,
  DashboardMigrationStats,
  HoldingsSnapshotData,
  HoldingData,
} from "../types";

// ============================================
// Activity Feed Types
// ============================================

export interface ActivityItem {
  id: string;
  type: MigrationFeedEvent["type"];
  message: string;
  timestamp: Date;
  data?: unknown;
  color: "green" | "red" | "yellow" | "blue" | "purple" | "cyan";
}

// ============================================
// Context State Types
// ============================================

interface SmartTradingState {
  // Core data
  config: TradingConfig | null;
  dashboardStats: DashboardStatsResponse | null;
  wallets: TrackedWallet[];
  signals: TradingSignal[];
  positions: Position[];
  history: Position[];
  chartHistory: PortfolioSnapshot[];

  // Migration feed data (shared)
  rankedMigrations: RankedMigration[];
  migrationStats: MigrationFeedStats | null;

  // WebSocket status
  connectionStatus: ConnectionStatus;
  clientId: string | null;

  // Activity feed (recent events)
  activityFeed: ActivityItem[];

  // Loading/error states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface SmartTradingContextValue extends SmartTradingState {
  // Actions
  refresh: () => Promise<void>;
  refreshMigrations: () => Promise<void>;
  toggleTrading: (enabled: boolean) => Promise<void>;
  closePosition: (positionId: string) => Promise<void>;
  trackMigration: (tokenMint: string, options?: { skipVerification?: boolean }) => Promise<void>;
  analyzeMigration: (tokenMint: string) => Promise<void>;
  refreshMigrationData: (tokenMint: string) => Promise<void>;
  syncWalletTwitterProfile: (address: string) => Promise<void>;
  clearActivityFeed: () => void;
}

const SmartTradingContext = createContext<SmartTradingContextValue | null>(null);
const DEFAULT_TRADING_WALLET = "HAQ37mA8Qcktyyqy9YSUZc6rfUAGFPG9qkDEXMEKYCn1";

// ============================================
// Helper: Generate activity message
// ============================================

function generateActivityMessage(event: MigrationFeedEvent): { message: string; color: ActivityItem["color"] } {
  const data = (event.data ?? (event as unknown as Record<string, unknown>)) as Record<string, unknown> | undefined;

  switch (event.type) {
    case "connected":
      return { message: "Connected to live feed", color: "green" };

    case "migration_detected": {
      const symbol = data?.tokenSymbol || data?.tokenMint?.toString().slice(0, 8) || "Unknown";
      return { message: `New migration: ${symbol}`, color: "cyan" };
    }

    case "market_data_updated": {
      const symbol = data?.tokenSymbol || "Token";
      const priceChange = data?.priceChange1h as number | undefined;
      const changeStr = priceChange !== undefined ? `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%` : "";
      return {
        message: `Price update: ${symbol} ${changeStr}`,
        color: priceChange !== undefined && priceChange >= 0 ? "green" : "red",
      };
    }

    case "ai_analysis": {
      const symbol = data?.tokenSymbol || "Token";
      const decision = data?.decision as string | undefined;
      const confidence = data?.confidence as number | undefined;
      const confStr = confidence !== undefined ? ` (${Math.round(confidence * 100)}%)` : "";
      return {
        message: `AI: ${decision || "ANALYZED"} ${symbol}${confStr}`,
        color: decision === "ENTER" ? "green" : decision === "PASS" ? "red" : "yellow",
      };
    }

    case "wallet_signal": {
      const label = data?.walletLabel || data?.walletAddress?.toString().slice(0, 8) || "Wallet";
      const action = data?.action || "activity";
      const symbol = data?.tokenSymbol || "";
      return {
        message: `${label}: ${action} ${symbol}`,
        color: "purple",
      };
    }

    case "signal_detected": {
      const signal = data?.signal as Record<string, any> | undefined;
      const symbol = signal?.symbol || signal?.token_name || "Token";
      const source = signal?.source === "wallet_buy" ? "Wallet Signal" : "Migration";
      const strength = (signal?.signal_strength as number) || 0;
      return {
        message: `Signal Detected: ${symbol} (${source})`,
        color: strength > 0.8 ? "green" : "cyan",
      };
    }

    case "wallet_buy_detected": {
      const wallet = data?.wallet as Record<string, any> | undefined;
      const token = data?.token as Record<string, any> | undefined;
      const label = wallet?.label || wallet?.address?.toString().slice(0, 8) || "Whale";
      const symbol = token?.symbol || "Token";
      const amountUsd = token?.buy_size_usd ? `$${Math.round(token.buy_size_usd)}` : "";
      return {
        message: `🐋 ${label} bought ${amountUsd} of ${symbol}`,
        color: "purple",
      };
    }

    case "position_opened": {
      const pos = (data?.position as Record<string, any> | undefined) ?? data;
      const symbol =
        pos?.symbol ||
        pos?.ticker ||
        pos?.tokenSymbol ||
        pos?.token_name ||
        pos?.tokenName ||
        pos?.mint?.toString().slice(0, 8) ||
        "Token";
      const price = pos?.entry_price ?? pos?.entryPrice;
      const priceStr = typeof price === "number" ? `$${price.toFixed(6)}` : "";
      return {
        message: `🚀 Position Opened: ${symbol}${priceStr ? ` @ ${priceStr}` : ""}`,
        color: "green",
      };
    }

    case "price_update": {
      const ticker =
        data?.ticker ||
        data?.symbol ||
        data?.tokenSymbol ||
        data?.token_name ||
        data?.tokenName ||
        data?.mint?.toString().slice(0, 8) ||
        "Position";
      const multiplier = (data?.multiplier as number | undefined) ?? (data?.target_multiplier as number | undefined);
      const pnlPct = data?.pnl_pct as number | undefined;
      const pnlStr = pnlPct !== undefined ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%` : "";
      return {
        message: `${ticker}: ${multiplier?.toFixed(2)}x ${pnlStr}`,
        color: pnlPct !== undefined && pnlPct >= 0 ? "green" : "red",
      };
    }

    case "take_profit_triggered": {
      const ticker = data?.ticker || "Position";
      const target = data?.target_multiplier as number | undefined;
      const realized = data?.realized as number | undefined;
      return {
        message: `🎯 ${target}x TP: ${ticker} +${realized?.toFixed(4) || "?"} SOL`,
        color: "green",
      };
    }

    case "position_closed": {
      const ticker = data?.ticker || "Position";
      const reason = data?.reason || "closed";
      const totalPnl = data?.total_pnl_sol as number | undefined;
      const pnlStr = totalPnl !== undefined ? `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(4)} SOL` : "";
      return {
        message: `Closed: ${ticker} (${reason}) ${pnlStr}`,
        color: totalPnl !== undefined && totalPnl >= 0 ? "green" : "red",
      };
    }

    case "migration_expired": {
      const symbol = data?.tokenSymbol || "Token";
      return { message: `Expired: ${symbol}`, color: "red" };
    }

    case "feed_update":
      return { message: "Feed refreshed", color: "blue" };

    case "stats_update":
      return { message: "Stats updated", color: "blue" };

    default:
      return { message: `Event: ${event.type}`, color: "blue" };
  }
}

// ============================================
// Provider Props
// ============================================

interface SmartTradingProviderProps {
  children: ReactNode;
  /** Fallback polling interval when WebSocket disconnected (default: 30s) */
  fallbackRefreshIntervalMs?: number;
  /** Whether to enable the provider */
  enabled?: boolean;
  /** Limit for migrations */
  migrationLimit?: number;
  /** Max activity feed items (default: 50) */
  maxActivityItems?: number;
}

// ============================================
// Provider Component - WebSocket-First Architecture
// ============================================

export function SmartTradingProvider({
  children,
  fallbackRefreshIntervalMs = 30000,
  enabled = true,
  migrationLimit = 20,
  maxActivityItems = 50,
}: SmartTradingProviderProps) {
  // Provider rendering
  console.log("[SmartTradingProvider] 🎬 Component rendering - enabled:", enabled);

  // WebSocket connection (shared singleton)
  const {
    status: connectionStatus,
    clientId,
    on,
    connect,
  } = useSharedWebSocket({
    autoConnect: enabled,
    path: "/ws/trading/reasoning",
  });

  console.log("[SmartTrading] WebSocket initialized:", {
    connectionStatus,
    clientId,
    hasOn: typeof on === 'function',
    hasConnect: typeof connect === 'function'
  });

  // State
  const [state, setState] = useState<SmartTradingState>({
    config: null,
    dashboardStats: null,
    wallets: [],
    signals: [],
    positions: [],
    history: [],
    chartHistory: [],
    rankedMigrations: [],
    migrationStats: null,
    connectionStatus: "disconnected",
    clientId: null,
    activityFeed: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
  });
  // State initialized

  // Update connection status in state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      connectionStatus,
      clientId,
    }));
  }, [connectionStatus, clientId]);
  // Connection status effect registered

  // Prevent double-fetch in StrictMode
  const hasFetchedRef = useRef(false);
  // Fetch ref initialized

  // Add activity item
  const addActivity = useCallback((event: MigrationFeedEvent) => {
    const { message, color } = generateActivityMessage(event);

    // Handle both flat messages { type, symbol, ... } and nested { type, data: {...} }
    // If event.data is undefined, use the event itself as data (excluding type/timestamp)
    const eventData = event.data ?? event;

    const item: ActivityItem = {
      id: `${event.type}-${event.timestamp}-${Math.random().toString(36).slice(2, 9)}`,
      type: event.type,
      message,
      timestamp: new Date(event.timestamp),
      data: eventData,
      color,
    };

    setState((prev) => ({
      ...prev,
      activityFeed: [item, ...prev.activityFeed].slice(0, maxActivityItems),
    }));
  }, [maxActivityItems]);
  // Activity handlers defined

  // Clear activity feed
  const clearActivityFeed = useCallback(() => {
    setState((prev) => ({ ...prev, activityFeed: [] }));
  }, []);
  // Activity handlers defined

  // ============================================
  // SINGLE CONSOLIDATED API CALL - Replaces 7 parallel requests
  // ============================================
  const fetchDashboard = useCallback(async () => {
    console.log("[SmartTrading] Fetching dashboard...");
    if (!enabled) {
      console.log("[SmartTrading] Dashboard fetch skipped - not enabled");
      return;
    }

    try {
      // ONE API call instead of 7!
      const response = await smartTradingService.getDashboardInit();

      setState((prev) => ({
        ...prev,
        config: response.config
          ? {
            ...response.config,
            wallet_address: response.config.wallet_address || DEFAULT_TRADING_WALLET,
          }
          : {
            id: "default",
            tradingEnabled: false,
            maxPositionPercent: 0,
            maxOpenPositions: 0,
            target1Percent: 0,
            target1SellPercent: 0,
            target2Percent: 0,
            stopLossPercent: 0,
            minTweetCount: 0,
            minSentimentScore: 0,
            maxDailyLossSol: 0,
            maxDailyTrades: 0,
            maxSlippageBps: 0,
            wallet_address: DEFAULT_TRADING_WALLET,
          },
        dashboardStats: response.stats,
        wallets: response.wallets,
        signals: response.signals,
        positions: response.positions.open,
        history: response.positions.closed,
        rankedMigrations: response.migrations,
        migrationStats: mapDashboardStatsToFeedStats(response.migrationStats),
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (err) {
      console.error("[SmartTrading] Failed to fetch dashboard data:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch data",
      }));
    }
  }, [enabled]);
  // Dashboard fetch function defined

  // Fetch migration feed data from devprint API (fallback for persistent data)
  const fetchMigrations = useCallback(async () => {
    if (!enabled) return;

    console.log("[SmartTrading] 🔄 Fetching migrations from devprint...");

    try {
      // Use devprint API for persistent token data
      const response = await fetchMigrationsFromDevprint(migrationLimit);
      setState((prev) => ({
        ...prev,
        rankedMigrations: response.items,
        migrationStats: response.stats,
      }));
    } catch (err) {
      console.error("[SmartTrading] Failed to fetch migrations:", err);
      // Don't set error for migrations - it's secondary data
    }
  }, [enabled, migrationLimit]);
  // Migrations fetch function defined

  // ============================================
  // WebSocket Event Handlers - Surgical Updates
  // ============================================
  // Registering WebSocket event handlers
  useEffect(() => {
    if (!enabled) return;

    const unsubscribes: (() => void)[] = [];

    // Connected event
    unsubscribes.push(
      on("connected", (_data, event) => {
        console.log("[SmartTrading] WebSocket connected");
        addActivity(event);
        // Refresh data on reconnect
        fetchDashboard();
      })
    );

    // Migration detected - add new migration to list
    unsubscribes.push(
      on<Migration>("migration_detected", (_migration, event) => {
        addActivity(event);
        // Refresh migrations to get proper ranking
        fetchMigrations();
      })
    );

    // Market data updated - update existing migration (surgical update)
    unsubscribes.push(
      on<{
        mint: string;
        price_usd?: number;
        market_cap?: number;
        liquidity?: number;
        volume_24h?: number;
        price_change_24h_pct?: number;
      }>(
        "market_data_updated",
        (data, event) => {
          console.log(`[SmartTrading] market_data_updated for ${data.mint}: price=$${data.price_usd}, mcap=$${data.market_cap}`);
          addActivity(event);

          // Surgical update - no full refetch
          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.tokenMint === data.mint) {
                return {
                  ...rm,
                  lastPriceUsd: data.price_usd ?? rm.lastPriceUsd,
                  lastMarketCap: data.market_cap ?? rm.lastMarketCap,
                  lastLiquidity: data.liquidity ?? rm.lastLiquidity,
                  lastVolume24h: data.volume_24h ?? rm.lastVolume24h,
                  lastPriceChange1h: data.price_change_24h_pct ?? rm.lastPriceChange1h,
                  lastUpdatedAt: new Date().toISOString(),
                };
              }
              return rm;
            }),
          }));
        }
      )
    );

    // AI reasoning completed - surgical update AND dispatch to terminal
    // Format: { type: "ai_reasoning", symbol, mint, reasoning, conviction, will_trade, timestamp }
    unsubscribes.push(
      on<{ symbol: string; mint: string; reasoning: string; conviction: number; will_trade: boolean; timestamp: number }>(
        "ai_reasoning",
        (data, event) => {
          addActivity(event);

          // 🚀 Dispatch to terminal for live streaming AI reasoning
          dispatchTerminalEvent("ai_reasoning", {
            symbol: data.symbol,
            mint: data.mint,
            reasoning: data.reasoning,
            conviction: data.conviction,
            will_trade: data.will_trade,
            timestamp: data.timestamp,
          });

          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.tokenMint === data.mint) {
                return {
                  ...rm,
                  lastAiDecision: data.will_trade ? "ENTER" : "PASS" as Migration["lastAiDecision"],
                  lastAiConfidence: data.conviction,
                  lastAiReasoning: data.reasoning,
                  lastAnalyzedAt: new Date().toISOString(),
                };
              }
              return rm;
            }),
          }));

          // Log to Supabase asynchronously
          logAiAnalysis({
            mint: data.mint,
            symbol: data.symbol,
            triggerType: "MIGRATION", // or derive from event
            decision: data.will_trade ? "ENTER" : "PASS",
            confidence: data.conviction,
            reasoning: data.reasoning,
            marketData: {
              // Note: WebSocket event might not have full market data, might need to fetch or use updated state
              price: 0, // Placeholder if not in event
            }
          }).catch(err => console.error("Failed to log AI analysis", err));
        }
      )
    );

    // No market data available - dispatch to terminal
    // Format: { type: "no_market_data", symbol, mint, reason, timestamp }
    unsubscribes.push(
      on<{ symbol: string; mint: string; reason: string; timestamp: number }>(
        "no_market_data",
        (data, event) => {
          addActivity(event);

          // 🚀 Dispatch to terminal
          dispatchTerminalEvent("no_market_data", {
            symbol: data.symbol,
            mint: data.mint,
            reason: data.reason,
            timestamp: data.timestamp,
          });
        }
      )
    );

    // Wallet signal received - surgical update (Legacy)
    unsubscribes.push(
      on<{ tokenMint: string; walletAddress: string; walletLabel?: string; action: string; amountSol?: number }>(
        "wallet_signal",
        (data, event) => {
          addActivity(event);

          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.tokenMint === data.tokenMint) {
                return {
                  ...rm,
                  walletSignalCount: rm.walletSignalCount + 1,
                  walletSignals: [
                    {
                      walletAddress: data.walletAddress,
                      walletLabel: data.walletLabel,
                      action: data.action as "BUY" | "SELL",
                      amountSol: data.amountSol,
                      timestamp: new Date().toISOString(),
                    },
                    ...rm.walletSignals.slice(0, 9),
                  ],
                  lastWalletSignalAt: new Date().toISOString(),
                };
              }
              return rm;
            }),
          }));
        }
      )
    );

    // NEW: Signal Detected
    unsubscribes.push(
      on("signal_detected", (data, event) => {
        addActivity(event);
        // A new signal might mean a new opportunity - refetch signals list
        // Note: For now we just refresh dashboard to keep it simple
        console.log("[SmartTrading] Signal detected:", data);
        fetchDashboard();
      })
    );

    // NEW: Wallet Buy Detected
    unsubscribes.push(
      on("wallet_buy_detected", (data, event) => {
        addActivity(event);
        // This is important - trigger refetch
        console.log("[SmartTrading] Wallet buy detected:", data);
        fetchDashboard();
      })
    );

    // NEW: Position Opened - Dispatch to terminal
    unsubscribes.push(
      on("position_opened", (data, event) => {
        const payload = (data ?? (event as unknown as Record<string, any>)) as Record<string, any>;
        addActivity({ ...event, data: payload });

        // 🚀 Dispatch to terminal for live streaming position opened
        dispatchTerminalEvent("position_opened", payload);

        // Definitely refetch to show new position
        console.log("[SmartTrading] Position opened:", payload);
        fetchDashboard();

        // Log trade entry snapshot
        if (payload.token_mint && payload.entry_price) {
          logMarketSnapshot({
            mint: payload.token_mint,
            symbol: payload.symbol,
            snapshotType: "TRADE_ENTRY",
            marketData: {
              price: payload.entry_price,
              // Add other available metrics
            },
            references: {
              positionId: payload.id
            }
          }).catch(err => console.error("Failed to log trade entry", err));
        }
      })
    );

    // NEW: Price Update - Surgical position update (high frequency, don't refetch)
    unsubscribes.push(
      on<{
        mint: string;
        ticker: string;
        price: number;
        entry_price: number;
        multiplier: number;
        pnl_pct: number;
        pnl_sol: number;
        peak_pnl_pct: number;
        next_target: number | null;
        target_progress: number | null;
        timestamp: number;
      }>("price_update", (data, event) => {
        const payload = (data ?? (event as unknown as Record<string, any>)) as {
          mint?: string;
          ticker?: string;
          price?: number;
          entry_price?: number;
          multiplier?: number;
          pnl_pct?: number;
          pnl_sol?: number;
          peak_pnl_pct?: number;
          next_target?: number | null;
          target_progress?: number | null;
          timestamp?: number;
        };

        // Safety check
        if (!payload || !payload.mint) {
          console.warn("[SmartTrading] Invalid price_update data:", payload);
          return;
        }

        // Don't add to activity feed - too noisy
        // Surgical update to positions
        console.log(
          `[SmartTrading] price_update for ${payload.ticker ?? payload.mint}: ${payload.pnl_pct?.toFixed(2)}%, updating positions...`
        );
        setState((prev) => {
          const updatedPositions = prev.positions.map((pos) => {
            if (pos.tokenMint === payload.mint) {
              return {
                ...pos,
                currentPrice: payload.price ?? pos.currentPrice,
                unrealizedPnl: payload.pnl_sol ?? pos.unrealizedPnl,
                updatedAt: new Date().toISOString(),
              };
            }
            return pos;
          });
          return {
            ...prev,
            positions: updatedPositions,
          };
        });
      })
    );

    // NEW: Take Profit Triggered
    unsubscribes.push(
      on<{
        mint: string;
        ticker: string;
        target_multiplier: number;
        sell_quantity: number;
        sell_price: number;
        realized: number;
        remaining: number;
        is_final: boolean;
      }>("take_profit_triggered", (data, event) => {
        const payload = (data ?? (event as unknown as Record<string, any>)) as typeof data;
        // Safety check
        if (!payload || !payload.mint) {
          console.warn("[SmartTrading] Invalid take_profit_triggered data:", payload);
          return;
        }

        addActivity({
          ...event,
          type: "take_profit_triggered",
          data: {
            ...payload,
            message: `🎯 ${payload.target_multiplier}x TP hit on ${payload.ticker}! +${payload.realized.toFixed(4)} SOL`,
          },
        });

        // 🚀 Dispatch to terminal for live streaming take profit
        dispatchTerminalEvent("take_profit", payload);

        // Surgical update or refetch
        if (payload.is_final) {
          // Full exit - refetch to move to history
          fetchDashboard();
        } else {
          // Partial exit - update position in place
          setState((prev) => ({
            ...prev,
            positions: prev.positions.map((pos) => {
              if (pos.tokenMint === payload.mint) {
                return {
                  ...pos,
                  remainingTokens: payload.remaining,
                  realizedPnlSol: pos.realizedPnlSol + payload.realized,
                  target1Hit: payload.target_multiplier === 2 ? true : pos.target1Hit,
                  target2Hit: payload.target_multiplier === 3 ? true : pos.target2Hit,
                };
              }
              return pos;
            }),
          }));
        }
      })
    );

    // NEW: Position Closed
    unsubscribes.push(
      on<{
        mint: string;
        ticker: string;
        reason: string;
        total_pnl_sol: number;
      }>("position_closed", (data, event) => {
        const payload = (data ?? (event as unknown as Record<string, any>)) as typeof data;
        // Safety check
        if (!payload || !payload.mint) {
          console.warn("[SmartTrading] Invalid position_closed data:", payload);
          return;
        }

        addActivity({
          ...event,
          type: "position_closed",
          data: {
            ...payload,
            message: `Position closed: ${payload.ticker} (${payload.reason}) - ${payload.total_pnl_sol >= 0 ? "+" : ""}${payload.total_pnl_sol.toFixed(4)} SOL`,
          },
        });

        // 🚀 Dispatch to terminal for live streaming position closed
        dispatchTerminalEvent("position_closed", payload);

        // Refetch to update positions and history
        fetchDashboard();

        // Log trade exit snapshot
        if (payload.mint) {
          // We might need to fetch final price or use payload data if available
          logMarketSnapshot({
            mint: payload.mint,
            symbol: payload.ticker,
            snapshotType: "TRADE_EXIT",
            marketData: {
              price: 0, // Placeholder, ideally get from payload
            },
            references: {
              // positionId: payload.id // If available
            }
          }).catch(err => console.error("Failed to log trade exit", err));
        }
      })
    );

    // NEW: Holdings Snapshot - Full state update every 2 seconds
    unsubscribes.push(
      on<HoldingsSnapshotData>("holdings_snapshot", (data, _event) => {
        // Safety check
        if (!data || !Array.isArray(data.holdings)) {
          console.warn("[SmartTrading] Invalid holdings_snapshot data:", data);
          return;
        }

        console.log(
          `[SmartTrading] holdings_snapshot: ${data.holdings.length} positions, total PnL: ${data.total_unrealized_pnl_sol?.toFixed(4)} SOL`
        );

        // Map backend HoldingData to frontend Position format
        const mappedPositions: Position[] = data.holdings
          .filter((h) => h.status === "open" || h.status === "partially_closed")
          .map((holding: HoldingData) => ({
            id: holding.id,
            signalId: "", // Not available in snapshot
            tokenMint: holding.mint,
            tokenSymbol: holding.symbol,
            status: holding.status === "open" ? "OPEN" : "PARTIALLY_CLOSED",

            // Entry
            entryPriceSol: holding.entry_price,
            entryAmountSol: holding.entry_sol_value,
            entryTokens: holding.initial_quantity,
            entryTxSig: holding.buy_signature,

            // Targets (preserve existing or use defaults)
            target1Price: 0,
            target1Percent: 0,
            target1Hit: false,
            target2Price: 0,
            target2Hit: false,
            stopLossPrice: 0,
            stoppedOut: false,

            // Current state
            currentPrice: holding.current_price,
            remainingTokens: holding.current_quantity,
            unrealizedPnl: holding.unrealized_pnl_sol,
            realizedPnlSol: holding.realized_pnl_sol,

            // Timestamps
            createdAt: holding.entry_time,
            updatedAt: new Date().toISOString(),

            // Extra data for display
            peakPrice: holding.peak_price,
            peakPnlPct: holding.peak_pnl_pct,
            marketCap: holding.market_cap,
            liquidity: holding.liquidity,
            volume24h: holding.volume_24h,
          } as Position));

        setState((prev) => ({
          ...prev,
          positions: mappedPositions,
          // Update dashboard stats with snapshot totals
          dashboardStats: prev.dashboardStats
            ? {
              ...prev.dashboardStats,
              totalUnrealizedPnL: data.total_unrealized_pnl_sol,
              totalRealizedPnL: data.total_realized_pnl_sol,
              openPositions: data.open_position_count,
            }
            : prev.dashboardStats,
        }));
      })
    );

    // NEW: Stop Loss Triggered
    unsubscribes.push(
      on<{
        mint: string;
        ticker: string;
        stop_price: number;
        realized_loss: number;
      }>("stop_loss_triggered", (data, event) => {
        const payload = (data ?? (event as unknown as Record<string, any>)) as typeof data;
        if (!payload || !payload.mint) {
          console.warn("[SmartTrading] Invalid stop_loss_triggered data:", payload);
          return;
        }

        addActivity({
          ...event,
          type: "position_closed",
          data: {
            ...payload,
            message: `🛑 Stop loss hit: ${payload.ticker} - ${payload.realized_loss.toFixed(4)} SOL`,
          },
        });

        // Dispatch to terminal
        dispatchTerminalEvent("stop_loss", payload);

        // Refetch to update positions
        fetchDashboard();
      })
    );

    // Migration expired - remove from list
    unsubscribes.push(
      on<{ tokenMint: string }>("migration_expired", (data, event) => {
        addActivity(event);

        setState((prev) => ({
          ...prev,
          rankedMigrations: prev.rankedMigrations.filter(
            (rm) => rm.tokenMint !== data.tokenMint
          ),
        }));
      })
    );

    // Full feed update (bulk update from server)
    unsubscribes.push(
      on<{ items: RankedMigration[]; stats: MigrationFeedStats }>("feed_update", (data, event) => {
        addActivity(event);

        setState((prev) => ({
          ...prev,
          rankedMigrations: data.items,
          migrationStats: data.stats,
        }));
      })
    );

    // Stats update
    unsubscribes.push(
      on<MigrationFeedStats>("stats_update", (stats, event) => {
        addActivity(event);

        setState((prev) => ({
          ...prev,
          migrationStats: stats,
        }));
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [enabled, on, addActivity, fetchDashboard, fetchMigrations]);
  // WebSocket event handlers registered

  // Initial fetch - using client-side initialization pattern instead of useEffect
  // (useEffect was not executing reliably, possibly due to SSR/hydration timing)
  useEffect(() => {
    // Only run on client-side after mount
    if (hasFetchedRef.current || !enabled) {
      return;
    }

    console.log("[SmartTrading] 🚀 Initializing dashboard data fetch...");
    hasFetchedRef.current = true;

    // Use setTimeout to ensure we're in the next tick (after full mount)
    const timeoutId = setTimeout(() => {
      console.log("[SmartTrading] 📡 Executing initial dashboard fetch");
      fetchDashboard();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [enabled, fetchDashboard]);

  // ============================================
  // POLLING ONLY WHEN WEBSOCKET DISCONNECTED
  // ============================================
  useEffect(() => {
    if (!enabled || !fallbackRefreshIntervalMs) return;

    const interval = setInterval(() => {
      // Only poll if WebSocket is not connected
      if (connectionStatus !== "connected") {
        console.log("[SmartTrading] 📡 Fallback polling (WebSocket disconnected)...");
        fetchDashboard();
      }
    }, fallbackRefreshIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, fallbackRefreshIntervalMs, connectionStatus, fetchDashboard]);

  // Reconnect on connection error after delay
  useEffect(() => {
    if (connectionStatus === "error" && enabled) {
      const timeout = setTimeout(() => {
        console.log("[SmartTrading] 🔌 Attempting to reconnect...");
        connect();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus, enabled, connect]);

  // ============================================
  // Actions with Optimistic Updates
  // ============================================

  const toggleTrading = useCallback(async (tradingEnabled: boolean) => {
    // Optimistic update
    setState((prev) => ({
      ...prev,
      config: prev.config ? { ...prev.config, tradingEnabled } : null,
    }));

    try {
      const updated = await smartTradingService.toggleTrading(tradingEnabled);
      setState((prev) => ({ ...prev, config: updated }));
    } catch (err) {
      // Rollback on error
      setState((prev) => ({
        ...prev,
        config: prev.config ? { ...prev.config, tradingEnabled: !tradingEnabled } : null,
      }));
      console.error("Failed to toggle trading:", err);
      throw err;
    }
  }, []);

  const closePosition = useCallback(async (positionId: string) => {
    // Optimistic update - move position to history
    setState((prev) => {
      const position = prev.positions.find((p) => p.id === positionId);
      if (!position) return prev;

      return {
        ...prev,
        positions: prev.positions.filter((p) => p.id !== positionId),
        history: [{ ...position, status: "CLOSED" as const }, ...prev.history],
      };
    });

    try {
      await smartTradingService.closePosition(positionId);
      // Refresh to get accurate data
      await fetchDashboard();
    } catch (err) {
      // Rollback on error
      await fetchDashboard();
      console.error("Failed to close position:", err);
      throw err;
    }
  }, [fetchDashboard]);

  const trackMigration = useCallback(async (tokenMint: string, options?: { skipVerification?: boolean }) => {
    try {
      await smartTradingService.trackMigration(tokenMint, options);
      await fetchMigrations();
    } catch (err) {
      console.error("Failed to track migration:", err);
      throw err;
    }
  }, [fetchMigrations]);

  const analyzeMigration = useCallback(async (tokenMint: string) => {
    try {
      await smartTradingService.analyzeMigration(tokenMint);
      // WebSocket will send ai_analysis event, no need to refetch
    } catch (err) {
      console.error("Failed to analyze migration:", err);
      throw err;
    }
  }, []);

  const refreshMigrationData = useCallback(async (tokenMint: string) => {
    try {
      await smartTradingService.refreshMigrationMarketData(tokenMint);
      // WebSocket will send market_data_updated event, no need to refetch
    } catch (err) {
      console.error("Failed to refresh migration data:", err);
      throw err;
    }
  }, []);

  const syncWalletTwitterProfile = useCallback(async (address: string) => {
    try {
      const updated = await smartTradingService.syncWalletTwitterProfile(address);
      // Optimistic update - update the wallet in state
      setState((prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) =>
          w.address === address ? updated : w
        ),
      }));
    } catch (err) {
      console.error("Failed to sync wallet Twitter profile:", err);
      throw err;
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<SmartTradingContextValue>(
    () => ({
      ...state,
      refresh: fetchDashboard,
      refreshMigrations: fetchMigrations,
      toggleTrading,
      closePosition,
      trackMigration,
      analyzeMigration,
      refreshMigrationData,
      syncWalletTwitterProfile,
      clearActivityFeed,
    }),
    [
      state,
      fetchDashboard,
      fetchMigrations,
      toggleTrading,
      closePosition,
      trackMigration,
      analyzeMigration,
      refreshMigrationData,
      syncWalletTwitterProfile,
      clearActivityFeed,
    ]
  );

  console.log("[SmartTrading] 🔷 Provider rendering with state:", {
    hasPositions: state.positions.length,
    hasDashboardStats: !!state.dashboardStats,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated
  });

  return (
    <SmartTradingContext.Provider value={value}>
      {children}
    </SmartTradingContext.Provider>
  );
}

// ============================================
// Helper: Map dashboard migration stats to feed stats
// ============================================
function mapDashboardStatsToFeedStats(dashboardStats: DashboardMigrationStats | null): MigrationFeedStats | null {
  if (!dashboardStats) return null;

  return {
    totalActive: dashboardStats.totalActive,
    pendingAnalysis: dashboardStats.analysisQueueLength,
    readyToTrade: dashboardStats.readyToTrade,
    withWalletSignals: 0, // Not provided by dashboard stats
    expiredToday: 0, // Not provided by dashboard stats
  };
}

// ============================================
// Consumer Hook
// ============================================

export function useSmartTradingContext(): SmartTradingContextValue {
  const context = useContext(SmartTradingContext);
  if (!context) {
    throw new Error("useSmartTradingContext must be used within a SmartTradingProvider");
  }
  return context;
}

// ============================================
// Selective hooks for components that only need partial data
// ============================================

/** Hook for components that only need dashboard stats */
export function useDashboardStats() {
  const { dashboardStats, isLoading, error, lastUpdated, refresh } = useSmartTradingContext();
  return { dashboardStats, isLoading, error, lastUpdated, refresh };
}

/** Hook for components that only need positions */
export function usePositions() {
  const { positions, history, isLoading, closePosition } = useSmartTradingContext();
  return { positions, history, isLoading, closePosition };
}

/** Hook for components that only need wallets/signals */
export function useWalletSignals() {
  const { wallets, signals, isLoading } = useSmartTradingContext();
  return { wallets, signals, isLoading };
}

/** Hook for components that only need config */
export function useSmartTradingConfig() {
  const { config, isLoading, toggleTrading } = useSmartTradingContext();
  return { config, isLoading, toggleTrading };
}

/** Hook for components that only need migration feed */
export function useMigrationFeedContext() {
  const {
    rankedMigrations,
    migrationStats,
    isLoading,
    error,
    lastUpdated,
    refreshMigrations,
    trackMigration,
    analyzeMigration,
    refreshMigrationData,
  } = useSmartTradingContext();

  return {
    rankedMigrations,
    stats: migrationStats,
    isLoading,
    error,
    lastUpdated,
    refresh: refreshMigrations,
    trackMigration,
    analyzeMigration,
    refreshMigrationData,
  };
}

/** Hook for connection status */
export function useConnectionStatus() {
  const { connectionStatus, clientId } = useSmartTradingContext();
  return { connectionStatus, clientId, isConnected: connectionStatus === "connected" };
}

/** Hook for activity feed */
export function useActivityFeed() {
  const { activityFeed, clearActivityFeed } = useSmartTradingContext();
  return { activityFeed, clearActivityFeed };
}
