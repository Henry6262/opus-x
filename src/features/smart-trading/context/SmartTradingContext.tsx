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
import type {
  TradingConfig,
  DashboardStatsResponse,
  TrackedWallet,
  TradingSignal,
  Position,
  PortfolioSnapshot,
  RankedMigration,
  MigrationFeedStats,
} from "../types";

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
}

const SmartTradingContext = createContext<SmartTradingContextValue | null>(null);

// ============================================
// Provider Props
// ============================================

interface SmartTradingProviderProps {
  children: ReactNode;
  /** Main data refresh interval (default: 10s) */
  refreshIntervalMs?: number;
  /** Migration feed refresh interval (default: 5s) */
  migrationRefreshIntervalMs?: number;
  /** Whether to enable polling */
  enabled?: boolean;
  /** Limit for migrations */
  migrationLimit?: number;
}

// ============================================
// Provider Component
// ============================================

export function SmartTradingProvider({
  children,
  refreshIntervalMs = 10000,
  migrationRefreshIntervalMs = 5000,
  enabled = true,
  migrationLimit = 20,
}: SmartTradingProviderProps) {
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
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  // Prevent double-fetch in StrictMode
  const hasFetchedRef = useRef(false);

  // Fetch main dashboard data (7 requests in parallel)
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
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (err) {
      console.error("Failed to fetch smart trading data:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch data",
      }));
    }
  }, [enabled]);

  // Fetch migration feed data (1 request)
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
      console.error("Failed to fetch migrations:", err);
      // Don't set error for migrations - it's secondary data
    }
  }, [enabled, migrationLimit]);

  // Initial fetch (with StrictMode protection)
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchDashboard();
    fetchMigrations();
  }, [fetchDashboard, fetchMigrations]);

  // Main data polling (10s interval)
  useEffect(() => {
    if (!enabled || !refreshIntervalMs) return;

    const interval = setInterval(fetchDashboard, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, refreshIntervalMs, fetchDashboard]);

  // Migration polling (5s interval - separate for faster updates)
  useEffect(() => {
    if (!enabled || !migrationRefreshIntervalMs) return;

    const interval = setInterval(fetchMigrations, migrationRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, migrationRefreshIntervalMs, fetchMigrations]);

  // Actions
  const toggleTrading = useCallback(async (tradingEnabled: boolean) => {
    try {
      const updated = await smartTradingService.toggleTrading(tradingEnabled);
      setState((prev) => ({
        ...prev,
        config: updated,
      }));
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
    }),
    [state, fetchDashboard, fetchMigrations, toggleTrading, closePosition, trackMigration, analyzeMigration, refreshMigrationData]
  );

  return (
    <SmartTradingContext.Provider value={value}>
      {children}
    </SmartTradingContext.Provider>
  );
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
// Optional: Selective hooks for components that only need partial data
// ============================================

/** Hook for components that only need dashboard stats */
export function useDashboardStats() {
  const { dashboardStats, isLoading, error, lastUpdated } = useSmartTradingContext();
  return { dashboardStats, isLoading, error, lastUpdated };
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
