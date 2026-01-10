"use client";

import { useState, useEffect, useCallback } from "react";
import { smartTradingService } from "../service";
import type {
  DashboardStatsResponse,
  TradingConfig,
  TrackedWallet,
  TradingSignal,
  Position,
} from "../types";

interface UseSmartTradingOptions {
  refreshIntervalMs?: number;
  enabled?: boolean;
}

interface SmartTradingState {
  dashboardStats: DashboardStatsResponse | null;
  config: TradingConfig | null;
  wallets: TrackedWallet[];
  signals: TradingSignal[];
  positions: Position[];
  history: Position[];
}

interface TradingStats {
  tradingEnabled: boolean;
  walletBalance: number;
  openPositions: number;
  maxOpenPositions: number;
  dailyPnL: number;
  totalPnL: number;
  winRate: number;
  recommendedPositionSize: number;
}

export function useSmartTrading(options: UseSmartTradingOptions = {}) {
  const { refreshIntervalMs = 10000, enabled = true } = options;

  const [state, setState] = useState<SmartTradingState>({
    dashboardStats: null,
    config: null,
    wallets: [],
    signals: [],
    positions: [],
    history: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!enabled) return;

    try {
      // Fetch all data in parallel
      const [dashboardStats, config, wallets, signalsResponse, positionsResponse, historyResponse] =
        await Promise.all([
          smartTradingService.getDashboardStats(),
          smartTradingService.getConfig(),
          smartTradingService.getWallets(),
          smartTradingService.getSignals({ limit: 20 }),
          smartTradingService.getPositions({ status: "OPEN", limit: 50 }),
          smartTradingService.getPositions({ status: "CLOSED", limit: 50 }),
        ]);

      setState({
        dashboardStats,
        config,
        wallets,
        signals: signalsResponse.items,
        positions: positionsResponse.items,
        history: historyResponse.items,
      });
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch trading data";
      setError(message);
      console.error("[SmartTrading] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Polling
  useEffect(() => {
    if (!enabled || !refreshIntervalMs) return;

    const interval = setInterval(fetchDashboard, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, refreshIntervalMs, fetchDashboard]);

  // Actions
  const toggleTrading = useCallback(async (enableTrading: boolean) => {
    try {
      const newConfig = await smartTradingService.toggleTrading(enableTrading);
      setState((prev) => ({
        ...prev,
        config: newConfig,
      }));
      return newConfig;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle trading";
      throw new Error(message);
    }
  }, []);

  const updateConfig = useCallback(async (config: Partial<TradingConfig>) => {
    try {
      const newConfig = await smartTradingService.updateConfig(config);
      setState((prev) => ({
        ...prev,
        config: newConfig,
      }));
      return newConfig;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update config";
      throw new Error(message);
    }
  }, []);

  const closePosition = useCallback(
    async (positionId: string) => {
      try {
        await smartTradingService.closePosition(positionId);
        await fetchDashboard(); // Refresh data
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to close position";
        throw new Error(message);
      }
    },
    [fetchDashboard]
  );

  // Computed stats for easier consumption
  const stats: TradingStats | null = state.dashboardStats
    ? {
      tradingEnabled: state.dashboardStats.trading.tradingEnabled,
      walletBalance: state.dashboardStats.trading.walletBalance,
      openPositions: state.dashboardStats.trading.openPositions,
      maxOpenPositions: state.dashboardStats.trading.maxOpenPositions,
      dailyPnL: state.dashboardStats.trading.dailyPnL,
      totalPnL: state.dashboardStats.performance.netPnlSol,
      winRate: state.dashboardStats.performance.winRate,
      recommendedPositionSize: state.dashboardStats.trading.recommendedPositionSize,
    }
    : null;

  return {
    // Data
    config: state.config,
    stats,
    wallets: state.wallets,
    signals: state.signals,
    positions: state.positions,
    history: state.history,

    // Raw dashboard stats for advanced usage
    dashboardStats: state.dashboardStats,

    // State
    isLoading,
    error,
    lastUpdated,

    // Actions
    refresh: fetchDashboard,
    toggleTrading,
    updateConfig,
    closePosition,
  };
}
