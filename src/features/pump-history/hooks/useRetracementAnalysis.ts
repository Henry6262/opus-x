"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTerminal } from "@/features/terminal";
import type { PumpTokenWithTweet } from "../types";
import {
  TokenJourney,
  EntryAnalysis,
  analyzeTokenJourney,
  formatEntrySignal,
  formatRiskLevel,
} from "@/lib/tokenJourney";

// ============================================
// TYPES
// ============================================

export interface RetracementAnalysisResult {
  mint: string;
  symbol: string;
  journey: TokenJourney;
  analysis: EntryAnalysis;
}

interface UseRetracementAnalysisOptions {
  tokens: PumpTokenWithTweet[];
  enabled?: boolean;
  pollIntervalMs?: number;
}

interface UseRetracementAnalysisReturn {
  analysisResults: Map<string, RetracementAnalysisResult>;
  isLoading: boolean;
  isPolling: boolean;
  lastUpdated: number | null;
  error: string | null;
  refresh: () => Promise<void>;
  // Convenience getters
  strongBuys: RetracementAnalysisResult[];
  buys: RetracementAnalysisResult[];
  watches: RetracementAnalysisResult[];
}

// Terminal color constants
const COLORS = {
  SYSTEM: "var(--matrix-green)",
  ANALYZING: "var(--solana-cyan)",
  STRONG_BUY: "#00ff88",
  BUY: "var(--matrix-green)",
  WATCH: "var(--warning-amber)",
  AVOID: "var(--terminal-red)",
  MUTED: "var(--white-60)",
};

// ============================================
// HOOK
// ============================================

export function useRetracementAnalysis({
  tokens,
  enabled = true,
  pollIntervalMs = 30000, // Poll every 30 seconds
}: UseRetracementAnalysisOptions): UseRetracementAnalysisReturn {
  const { log } = useTerminal();
  const [analysisResults, setAnalysisResults] = useState<Map<string, RetracementAnalysisResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Fetch and update tracking data
  const fetchTrackingData = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current || !enabled || tokens.length === 0) return;

    isFetchingRef.current = true;
    if (isInitial) setIsLoading(true);
    setIsPolling(true);

    try {
      // Prepare token data for the API
      const tokenData = tokens.map(t => ({
        mint: t.mint,
        symbol: t.symbol,
        detected_at: t.detected_at,
        market_cap: t.market_cap,
      }));

      // Call our tracking API
      const response = await fetch('/api/token-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: tokenData }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }

      // Process results
      const newResults = new Map<string, RetracementAnalysisResult>();
      const journeysWithAnalysis = data.data.journeys || [];

      // Log summary to terminal
      if (isInitial || journeysWithAnalysis.length > 0) {
        log({
          text: `[RETRACEMENT] Tracking ${journeysWithAnalysis.length} tokens`,
          color: COLORS.SYSTEM,
        });
      }

      // Process each journey
      for (const { journey, analysis } of journeysWithAnalysis) {
        const result: RetracementAnalysisResult = {
          mint: journey.mint,
          symbol: journey.symbol,
          journey,
          analysis,
        };

        newResults.set(journey.mint, result);

        // Log significant signals
        if (analysis.signal === 'strong_buy' || analysis.signal === 'buy') {
          const signalFormat = formatEntrySignal(analysis.signal);
          const riskFormat = formatRiskLevel(journey.signals.riskLevel);

          log({
            text: `[ENTRY] ${journey.symbol} · ${signalFormat.label} · ${journey.signals.pumpMultiple.toFixed(1)}x pump · ${journey.signals.drawdownPercent.toFixed(0)}% dip`,
            color: analysis.signal === 'strong_buy' ? COLORS.STRONG_BUY : COLORS.BUY,
          });

          // Log reasons
          for (const reason of analysis.reasons.slice(0, 3)) {
            log({ text: `  ├─ ${reason}`, color: COLORS.MUTED });
          }
          if (analysis.warnings.length > 0) {
            log({ text: `  └─ ⚠ ${analysis.warnings[0]}`, color: COLORS.WATCH });
          }
        }
      }

      setAnalysisResults(newResults);
      setLastUpdated(Date.now());
      setError(null);

      // Log stats
      const stats = data.data.stats;
      if (stats && isInitial) {
        log({
          text: `[RETRACEMENT] Signals: ${stats.signalCounts.strong_buy} STRONG · ${stats.signalCounts.buy} BUY · ${stats.signalCounts.watch} WATCH`,
          color: COLORS.SYSTEM,
        });
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      log({ text: `[ERROR] Tracking failed: ${errorMsg}`, color: COLORS.AVOID });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsPolling(false);
    }
  }, [tokens, enabled, log]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchTrackingData(false);
  }, [fetchTrackingData]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (!enabled || tokens.length === 0) return;

    // Initial fetch
    fetchTrackingData(true);

    // Setup polling
    pollIntervalRef.current = setInterval(() => {
      fetchTrackingData(false);
    }, pollIntervalMs);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [enabled, tokens.length, pollIntervalMs, fetchTrackingData]);

  // Computed: tokens by signal
  const strongBuys = Array.from(analysisResults.values())
    .filter(r => r.analysis.signal === 'strong_buy')
    .sort((a, b) => b.analysis.score - a.analysis.score);

  const buys = Array.from(analysisResults.values())
    .filter(r => r.analysis.signal === 'buy')
    .sort((a, b) => b.analysis.score - a.analysis.score);

  const watches = Array.from(analysisResults.values())
    .filter(r => r.analysis.signal === 'watch')
    .sort((a, b) => b.analysis.score - a.analysis.score);

  return {
    analysisResults,
    isLoading,
    isPolling,
    lastUpdated,
    error,
    refresh,
    strongBuys,
    buys,
    watches,
  };
}
