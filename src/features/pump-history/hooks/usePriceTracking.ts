"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { calculateTokenPnL, clearPriceCache, type TokenPnL } from "@/lib/priceTracking";
import type { PumpTokenWithTweet } from "../types";

export interface UsePriceTrackingOptions {
  tokens: PumpTokenWithTweet[];
  enabled?: boolean;
  refreshIntervalMs?: number;
}

export interface UsePriceTrackingResult {
  pnlData: Map<string, TokenPnL>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => void;
}

/**
 * Hook to track real-time prices and calculate PnL for tokens
 *
 * Features:
 * - Auto-refresh every 5 minutes (configurable)
 * - Manual refresh support
 * - Caching to avoid rate limits
 * - Jupiter (primary) + DexScreener (fallback)
 */
export function usePriceTracking(options: UsePriceTrackingOptions): UsePriceTrackingResult {
  const { tokens, enabled = true, refreshIntervalMs = 5 * 60 * 1000 } = options; // 5 min default

  const [pnlData, setPnlData] = useState<Map<string, TokenPnL>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const tokensRef = useRef(tokens);
  const lastMintHashRef = useRef<string>("");

  // Update tokens ref
  tokensRef.current = tokens;

  // Create a stable hash of token mints to detect actual changes
  const currentMintHash = tokens.map(t => t.mint).sort().join(',');

  const fetchPrices = useCallback(async () => {
    const currentTokens = tokensRef.current;

    if (!enabled || currentTokens.length === 0 || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[usePriceTracking] Fetching prices for ${currentTokens.length} tokens`);

      const pnl = await calculateTokenPnL(
        currentTokens.map(t => ({
          mint: t.mint,
          market_cap: t.market_cap,
        }))
      );

      setPnlData(pnl);
      setLastUpdated(Date.now());
      console.log(`[usePriceTracking] Successfully updated ${pnl.size} token prices`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch prices";
      setError(errorMsg);
      console.error('[usePriceTracking] Error:', err);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [enabled]);

  const refresh = useCallback(() => {
    console.log('[usePriceTracking] Manual refresh triggered, clearing cache');
    clearPriceCache();
    fetchPrices();
  }, [fetchPrices]);

  // Initial fetch + auto-refresh interval
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Only fetch if mints have actually changed
    if (currentMintHash !== lastMintHashRef.current) {
      lastMintHashRef.current = currentMintHash;
      fetchPrices();
    }

    // Set up auto-refresh interval
    if (refreshIntervalMs > 0 && !intervalRef.current) {
      console.log(`[usePriceTracking] Setting up auto-refresh every ${refreshIntervalMs / 1000}s`);
      intervalRef.current = setInterval(fetchPrices, refreshIntervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [enabled, currentMintHash, fetchPrices, refreshIntervalMs]);

  return {
    pnlData,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}
