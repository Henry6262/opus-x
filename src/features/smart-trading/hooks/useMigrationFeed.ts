"use client";

import { useState, useEffect, useCallback } from "react";
import { smartTradingService } from "../service";
import type {
  RankedMigration,
  MigrationFeedStats,
  Migration,
  MigrationAnalysis,
} from "../types";

interface UseMigrationFeedOptions {
  /** Polling interval in milliseconds (default: 5000ms for real-time feel) */
  refreshIntervalMs?: number;
  /** Enable/disable the hook */
  enabled?: boolean;
  /** Limit for ranked migrations */
  limit?: number;
}

interface MigrationFeedState {
  rankedMigrations: RankedMigration[];
  stats: MigrationFeedStats | null;
}

const initialState: MigrationFeedState = {
  rankedMigrations: [],
  stats: null,
};

export function useMigrationFeed(options: UseMigrationFeedOptions = {}) {
  const { refreshIntervalMs = 5000, enabled = true, limit = 20 } = options;

  const [state, setState] = useState<MigrationFeedState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch ranked migrations and stats
  const fetchMigrationFeed = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await smartTradingService.getRankedMigrations(limit);

      setState({
        rankedMigrations: response.items,
        stats: response.stats,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch migration feed:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch migration feed");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, limit]);

  // Initial fetch
  useEffect(() => {
    fetchMigrationFeed();
  }, [fetchMigrationFeed]);

  // Polling
  useEffect(() => {
    if (!enabled || !refreshIntervalMs) return;

    const interval = setInterval(fetchMigrationFeed, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, refreshIntervalMs, fetchMigrationFeed]);

  // Action: Track a new migration manually
  const trackMigration = useCallback(
    async (tokenMint: string, skipVerification?: boolean): Promise<Migration | null> => {
      try {
        const migration = await smartTradingService.trackMigration(tokenMint, {
          skipVerification,
        });
        // Refresh the feed after tracking
        await fetchMigrationFeed();
        return migration;
      } catch (err) {
        console.error("Failed to track migration:", err);
        setError(err instanceof Error ? err.message : "Failed to track migration");
        return null;
      }
    },
    [fetchMigrationFeed]
  );

  // Action: Stop tracking a migration
  const stopTrackingMigration = useCallback(
    async (tokenMint: string): Promise<boolean> => {
      try {
        await smartTradingService.stopTrackingMigration(tokenMint);
        // Refresh the feed after stopping
        await fetchMigrationFeed();
        return true;
      } catch (err) {
        console.error("Failed to stop tracking migration:", err);
        setError(err instanceof Error ? err.message : "Failed to stop tracking");
        return false;
      }
    },
    [fetchMigrationFeed]
  );

  // Action: Trigger AI analysis for a token
  const analyzeMigration = useCallback(
    async (tokenMint: string): Promise<MigrationAnalysis | null> => {
      try {
        const analysis = await smartTradingService.analyzeMigration(tokenMint);
        // Refresh the feed after analysis
        await fetchMigrationFeed();
        return analysis;
      } catch (err) {
        console.error("Failed to analyze migration:", err);
        setError(err instanceof Error ? err.message : "Failed to analyze migration");
        return null;
      }
    },
    [fetchMigrationFeed]
  );

  // Action: Refresh market data for a specific token
  const refreshMigrationData = useCallback(
    async (tokenMint: string): Promise<Migration | null> => {
      try {
        const migration = await smartTradingService.refreshMigrationMarketData(tokenMint);
        // Refresh the full feed
        await fetchMigrationFeed();
        return migration;
      } catch (err) {
        console.error("Failed to refresh migration data:", err);
        setError(err instanceof Error ? err.message : "Failed to refresh data");
        return null;
      }
    },
    [fetchMigrationFeed]
  );

  // Get a single migration's details
  const getMigration = useCallback(async (tokenMint: string): Promise<Migration | null> => {
    try {
      return await smartTradingService.getMigration(tokenMint);
    } catch (err) {
      console.error("Failed to get migration:", err);
      return null;
    }
  }, []);

  // Get analysis history for a migration
  const getAnalysisHistory = useCallback(
    async (tokenMint: string, historyLimit?: number): Promise<MigrationAnalysis[]> => {
      try {
        return await smartTradingService.getMigrationAnalysisHistory(tokenMint, historyLimit);
      } catch (err) {
        console.error("Failed to get analysis history:", err);
        return [];
      }
    },
    []
  );

  return {
    // Data
    rankedMigrations: state.rankedMigrations,
    stats: state.stats,

    // State
    isLoading,
    error,
    lastUpdated,

    // Actions
    refresh: fetchMigrationFeed,
    trackMigration,
    stopTrackingMigration,
    analyzeMigration,
    refreshMigrationData,
    getMigration,
    getAnalysisHistory,
  };
}
