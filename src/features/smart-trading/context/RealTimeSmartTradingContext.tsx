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
import { smartTradingService } from "../service";
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

interface RealTimeSmartTradingState {
  // Core data
  config: TradingConfig | null;
  dashboardStats: DashboardStatsResponse | null;
  wallets: TrackedWallet[];
  signals: TradingSignal[];
  positions: Position[];
  history: Position[];
  chartHistory: PortfolioSnapshot[];

  // Migration feed data (updated via WebSocket)
  rankedMigrations: RankedMigration[];
  migrationStats: MigrationFeedStats | null;

  // WebSocket status
  connectionStatus: ConnectionStatus;
  clientId: string | null;

  // Activity feed (recent events)
  activityFeed: ActivityItem[];

  // Loading/error states
  isLoading: boolean;
  isInitialLoad: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface RealTimeSmartTradingContextValue extends RealTimeSmartTradingState {
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

const RealTimeSmartTradingContext = createContext<RealTimeSmartTradingContextValue | null>(null);

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

interface RealTimeSmartTradingProviderProps {
  children: ReactNode;
  /** Enable/disable the provider */
  enabled?: boolean;
  /** Fallback refresh interval (default: 60s) */
  fallbackRefreshIntervalMs?: number;
  /** Max activity feed items (default: 50) */
  maxActivityItems?: number;
  /** Migration limit for API calls (default: 20) */
  migrationLimit?: number;
}

// ============================================
// Provider Component
// ============================================

export function RealTimeSmartTradingProvider({
  children,
  enabled = true,
  fallbackRefreshIntervalMs = 60000,
  maxActivityItems = 50,
  migrationLimit = 20,
}: RealTimeSmartTradingProviderProps) {
  // WebSocket connection
  const {
    status: connectionStatus,
    clientId,
    on,
    connect,
  } = useSharedWebSocket({
    autoConnect: enabled,
  });

  // State
  const [state, setState] = useState<RealTimeSmartTradingState>({
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
    isInitialLoad: true,
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

  // Fetch main dashboard data (initial load and fallback refresh)
  const fetchDashboard = useCallback(async () => {
    if (!enabled) return;

    try {
      const [
        dashboardStats,
        config,
        wallets,
        signalsResponse,
        positionsResponse,
        historyResponse,
        chartHistory,
      ] = await Promise.all([
        smartTradingService.getDashboardStats(),
        smartTradingService.getConfig(),
        smartTradingService.getWallets(),
        smartTradingService.getSignals({ limit: 20 }),
        smartTradingService.getPositions({ status: "OPEN", limit: 50 }),
        smartTradingService.getPositions({ status: "CLOSED", limit: 50 }),
        smartTradingService.getHistory(288),
      ]);

      setState((prev) => ({
        ...prev,
        dashboardStats,
        config,
        wallets,
        signals: signalsResponse.items,
        positions: positionsResponse.items,
        history: historyResponse.items,
        chartHistory,
        isLoading: false,
        isInitialLoad: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (err) {
      console.error("[RealTimeSmartTrading] Failed to fetch dashboard data:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialLoad: false,
        error: err instanceof Error ? err.message : "Failed to fetch data",
      }));
    }
  }, [enabled]);

  // Fetch migration feed data
  const fetchMigrations = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await smartTradingService.getRankedMigrations(migrationLimit);
      setState((prev) => ({
        ...prev,
        rankedMigrations: response.items,
        migrationStats: response.stats,
      }));
    } catch (err) {
      console.error("[RealTimeSmartTrading] Failed to fetch migrations:", err);
    }
  }, [enabled, migrationLimit]);

  // Handle WebSocket events
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to all WebSocket events
    const unsubscribes: (() => void)[] = [];

    // Connected event
    unsubscribes.push(
      on("connected", (_data, event) => {
        console.log("[RealTimeSmartTrading] WebSocket connected");
        addActivity(event);
        // Refresh data on reconnect
        fetchDashboard();
        fetchMigrations();
      })
    );

    // Migration detected - add new migration to list
    unsubscribes.push(
      on<Migration>("migration_detected", (migration, event) => {
        addActivity(event);
        // Refresh migrations to get proper ranking
        fetchMigrations();
      })
    );

    // Market data updated - update existing migration
    unsubscribes.push(
      on<{ tokenMint: string; priceUsd?: number; marketCap?: number; priceChange1h?: number }>(
        "market_data_updated",
        (data, event) => {
          addActivity(event);

          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.migration.tokenMint === data.tokenMint) {
                return {
                  ...rm,
                  migration: {
                    ...rm.migration,
                    lastPriceUsd: data.priceUsd ?? rm.migration.lastPriceUsd,
                    lastMarketCap: data.marketCap ?? rm.migration.lastMarketCap,
                    lastPriceChange1h: data.priceChange1h ?? rm.migration.lastPriceChange1h,
                    lastUpdatedAt: new Date().toISOString(),
                  },
                };
              }
              return rm;
            }),
          }));
        }
      )
    );

    // AI analysis completed
    unsubscribes.push(
      on<{ tokenMint: string; decision: string; confidence: number; reasoning: string }>(
        "ai_analysis",
        (data, event) => {
          addActivity(event);

          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.migration.tokenMint === data.tokenMint) {
                return {
                  ...rm,
                  migration: {
                    ...rm.migration,
                    lastAiDecision: data.decision as Migration["lastAiDecision"],
                    lastAiConfidence: data.confidence,
                    lastAiReasoning: data.reasoning,
                    lastAnalyzedAt: new Date().toISOString(),
                  },
                };
              }
              return rm;
            }),
          }));
        }
      )
    );

    // Wallet signal received
    unsubscribes.push(
      on<{ tokenMint: string; walletAddress: string; walletLabel?: string; action: string; amountSol?: number }>(
        "wallet_signal",
        (data, event) => {
          addActivity(event);

          setState((prev) => ({
            ...prev,
            rankedMigrations: prev.rankedMigrations.map((rm) => {
              if (rm.migration.tokenMint === data.tokenMint) {
                return {
                  ...rm,
                  migration: {
                    ...rm.migration,
                    walletSignalCount: rm.migration.walletSignalCount + 1,
                    walletSignals: [
                      {
                        walletAddress: data.walletAddress,
                        walletLabel: data.walletLabel,
                        action: data.action as "BUY" | "SELL",
                        amountSol: data.amountSol,
                        timestamp: new Date().toISOString(),
                      },
                      ...rm.migration.walletSignals.slice(0, 9),
                    ],
                    lastWalletSignalAt: new Date().toISOString(),
                  },
                };
              }
              return rm;
            }),
          }));
        }
      )
    );

    // Migration expired
    unsubscribes.push(
      on<{ tokenMint: string }>("migration_expired", (data, event) => {
        addActivity(event);

        setState((prev) => ({
          ...prev,
          rankedMigrations: prev.rankedMigrations.filter(
            (rm) => rm.migration.tokenMint !== data.tokenMint
          ),
        }));
      })
    );

    // Full feed update (fallback/bulk update)
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

    fetchDashboard();
    fetchMigrations();
  }, [enabled, fetchDashboard, fetchMigrations]);

  // Fallback refresh (every 60s as safety net)
  useEffect(() => {
    if (!enabled || !fallbackRefreshIntervalMs) return;

    const interval = setInterval(() => {
      // Only refresh if WebSocket is not connected
      if (connectionStatus !== "connected") {
        fetchDashboard();
        fetchMigrations();
      }
    }, fallbackRefreshIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, fallbackRefreshIntervalMs, connectionStatus, fetchDashboard, fetchMigrations]);

  // Reconnect on connection error after delay
  useEffect(() => {
    if (connectionStatus === "error" && enabled) {
      const timeout = setTimeout(() => {
        connect();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus, enabled, connect]);

  // Actions
  const toggleTrading = useCallback(async (tradingEnabled: boolean) => {
    try {
      const updated = await smartTradingService.toggleTrading(tradingEnabled);
      setState((prev) => ({ ...prev, config: updated }));
    } catch (err) {
      console.error("Failed to toggle trading:", err);
      throw err;
    }
  }, []);

  const closePosition = useCallback(async (positionId: string) => {
    try {
      await smartTradingService.closePosition(positionId);
      await fetchDashboard();
    } catch (err) {
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
      await fetchMigrations();
    } catch (err) {
      console.error("Failed to analyze migration:", err);
      throw err;
    }
  }, [fetchMigrations]);

  const refreshMigrationData = useCallback(async (tokenMint: string) => {
    try {
      await smartTradingService.refreshMigrationMarketData(tokenMint);
      await fetchMigrations();
    } catch (err) {
      console.error("Failed to refresh migration data:", err);
      throw err;
    }
  }, [fetchMigrations]);

  const syncWalletTwitterProfile = useCallback(async (address: string) => {
    try {
      await smartTradingService.syncWalletTwitterProfile(address);
      await fetchDashboard();
    } catch (err) {
      console.error("Failed to sync wallet Twitter profile:", err);
      throw err;
    }
  }, [fetchDashboard]);

  // Memoize context value
  const value = useMemo<RealTimeSmartTradingContextValue>(
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
    <RealTimeSmartTradingContext.Provider value={value}>
      {children}
    </RealTimeSmartTradingContext.Provider>
  );
}

// ============================================
// Consumer Hook
// ============================================

export function useRealTimeSmartTrading(): RealTimeSmartTradingContextValue {
  const context = useContext(RealTimeSmartTradingContext);
  if (!context) {
    throw new Error("useRealTimeSmartTrading must be used within a RealTimeSmartTradingProvider");
  }
  return context;
}

// ============================================
// Selective Hooks
// ============================================

/** Hook for connection status */
export function useConnectionStatus() {
  const { connectionStatus, clientId } = useRealTimeSmartTrading();
  return { connectionStatus, clientId, isConnected: connectionStatus === "connected" };
}

/** Hook for activity feed */
export function useActivityFeed() {
  const { activityFeed, clearActivityFeed } = useRealTimeSmartTrading();
  return { activityFeed, clearActivityFeed };
}

/** Hook for dashboard stats */
export function useRealTimeDashboardStats() {
  const { dashboardStats, isLoading, error, lastUpdated } = useRealTimeSmartTrading();
  return { dashboardStats, isLoading, error, lastUpdated };
}

/** Hook for positions */
export function useRealTimePositions() {
  const { positions, history, isLoading, closePosition } = useRealTimeSmartTrading();
  return { positions, history, isLoading, closePosition };
}

/** Hook for wallets/signals */
export function useRealTimeWalletSignals() {
  const { wallets, signals, isLoading } = useRealTimeSmartTrading();
  return { wallets, signals, isLoading };
}

/** Hook for config */
export function useRealTimeConfig() {
  const { config, isLoading, toggleTrading } = useRealTimeSmartTrading();
  return { config, isLoading, toggleTrading };
}

/** Hook for migration feed */
export function useRealTimeMigrationFeed() {
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
  } = useRealTimeSmartTrading();

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
