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
const DEFAULT_TRADING_WALLET = "FXP5NMdrC4qHQbtBy8dduLbryVmevCkjd25mmLBKVA7x";

// ============================================
// Helper: Generate activity message
// ============================================

function generateActivityMessage(event: MigrationFeedEvent): { message: string; color: ActivityItem["color"] } {
  const data = event.data as Record<string, unknown> | undefined;

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
      const pos = data?.position as Record<string, any> | undefined;
      const symbol = pos?.symbol || pos?.token_name || "Token";
      const price = pos?.entry_price ? `$${(pos.entry_price as number).toFixed(6)}` : "";
      return {
        message: `🚀 Position Opened: ${symbol} @ ${price}`,
        color: "green",
      };
    }

    case "price_update": {
      const ticker = data?.ticker || "Position";
      const multiplier = data?.multiplier as number | undefined;
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
  // WebSocket connection (shared singleton)
  const {
    status: connectionStatus,
    clientId,
    on,
    connect,
  } = useSharedWebSocket({
    autoConnect: enabled,
    path: "/ws/trading",
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

  // Update connection status in state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      connectionStatus,
      clientId,
    }));
  }, [connectionStatus, clientId]);

  // Prevent double-fetch in StrictMode
  const hasFetchedRef = useRef(false);

  // Add activity item
  const addActivity = useCallback((event: MigrationFeedEvent) => {
    const { message, color } = generateActivityMessage(event);

    const item: ActivityItem = {
      id: `${event.type}-${event.timestamp}-${Math.random().toString(36).slice(2, 9)}`,
      type: event.type,
      message,
      timestamp: new Date(event.timestamp),
      data: event.data,
      color,
    };

    setState((prev) => ({
      ...prev,
      activityFeed: [item, ...prev.activityFeed].slice(0, maxActivityItems),
    }));
  }, [maxActivityItems]);

  // Clear activity feed
  const clearActivityFeed = useCallback(() => {
    setState((prev) => ({ ...prev, activityFeed: [] }));
  }, []);

  // ============================================
  // SINGLE CONSOLIDATED API CALL - Replaces 7 parallel requests
  // ============================================
  const fetchDashboard = useCallback(async () => {
    if (!enabled) return;

    console.log("[SmartTrading] 🔄 Fetching dashboard data via consolidated endpoint...");

    try {
      // ONE API call instead of 7!
      const response = await smartTradingService.getDashboardInit();

      console.log("[SmartTrading] ✅ Dashboard init received:", {
        config: { tradingEnabled: response.config?.tradingEnabled },
        walletsCount: response.wallets?.length,
        signalsCount: response.signals?.length,
        openPositionsCount: response.positions?.open?.length,
        closedPositionsCount: response.positions?.closed?.length,
        migrationsCount: response.migrations?.length,
      });

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
      console.error("[SmartTrading] ❌ Failed to fetch dashboard data:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch data",
      }));
    }
  }, [enabled]);

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
      console.error("[SmartTrading] ❌ Failed to fetch migrations:", err);
      // Don't set error for migrations - it's secondary data
    }
  }, [enabled, migrationLimit]);

  // ============================================
  // WebSocket Event Handlers - Surgical Updates
  // ============================================
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

    // AI analysis completed - surgical update
    unsubscribes.push(
      on<{ tokenMint: string; decision: string; confidence: number; reasoning: string }>(
        "ai_analysis",
        (data, event) => {
          addActivity(event);

          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.tokenMint === data.tokenMint) {
                return {
                  ...rm,
                  lastAiDecision: data.decision as Migration["lastAiDecision"],
                  lastAiConfidence: data.confidence,
                  lastAiReasoning: data.reasoning,
                  lastAnalyzedAt: new Date().toISOString(),
                };
              }
              return rm;
            }),
          }));
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

    // NEW: Position Opened
    unsubscribes.push(
      on("position_opened", (data, event) => {
        addActivity(event);
        // Definitely refetch to show new position
        console.log("[SmartTrading] Position opened:", data);
        fetchDashboard();
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
      }>("price_update", (data) => {
        // Safety check
        if (!data || !data.mint) {
          console.warn("[SmartTrading] Invalid price_update data:", data);
          return;
        }

        // Don't add to activity feed - too noisy
        // Surgical update to positions
        console.log(`[SmartTrading] price_update for ${data.ticker}: ${data.pnl_pct.toFixed(2)}%, updating positions...`);
        setState((prev) => {
          const updatedPositions = prev.positions.map((pos) => {
            if (pos.tokenMint === data.mint) {
              console.log(`[SmartTrading] Updating position ${pos.tokenSymbol}: currentPrice ${pos.currentPrice} → ${data.price}`);
              return {
                ...pos,
                currentPrice: data.price,
                unrealizedPnl: data.pnl_sol,
                updatedAt: new Date().toISOString(),
              };
            }
            return pos;
          });
          console.log(`[SmartTrading] Updated ${updatedPositions.filter(p => p.tokenMint === data.mint).length} positions`);
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
        // Safety check
        if (!data || !data.mint) {
          console.warn("[SmartTrading] Invalid take_profit_triggered data:", data);
          return;
        }

        addActivity({
          ...event,
          type: "take_profit_triggered",
          data: {
            ...data,
            message: `🎯 ${data.target_multiplier}x TP hit on ${data.ticker}! +${data.realized.toFixed(4)} SOL`,
          },
        });

        // Surgical update or refetch
        if (data.is_final) {
          // Full exit - refetch to move to history
          fetchDashboard();
        } else {
          // Partial exit - update position in place
          setState((prev) => ({
            ...prev,
            positions: prev.positions.map((pos) => {
              if (pos.tokenMint === data.mint) {
                return {
                  ...pos,
                  remainingTokens: data.remaining,
                  realizedPnlSol: pos.realizedPnlSol + data.realized,
                  target1Hit: data.target_multiplier === 2 ? true : pos.target1Hit,
                  target2Hit: data.target_multiplier === 3 ? true : pos.target2Hit,
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
        // Safety check
        if (!data || !data.mint) {
          console.warn("[SmartTrading] Invalid position_closed data:", data);
          return;
        }

        addActivity({
          ...event,
          type: "position_closed",
          data: {
            ...data,
            message: `Position closed: ${data.ticker} (${data.reason}) - ${data.total_pnl_sol >= 0 ? "+" : ""}${data.total_pnl_sol.toFixed(4)} SOL`,
          },
        });

        // Refetch to update positions and history
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

  // Initial fetch (with StrictMode protection)
  useEffect(() => {
    if (hasFetchedRef.current || !enabled) return;
    hasFetchedRef.current = true;

    console.log("[SmartTrading] 🚀 Starting initial data fetch...");
    fetchDashboard();
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
