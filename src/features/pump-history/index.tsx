"use client";

import { useMemo } from "react";
import { Panel } from "@/components/design-system";
import { Button } from "@/components/ui";
import { usePumpTokens } from "./hooks/usePumpTokens";
import { usePumpTokensStream } from "./hooks/usePumpTokensStream";
import { usePriceTracking } from "./hooks/usePriceTracking";
import { useAiTokenAnalysis } from "./hooks/useAiTokenAnalysis";
import { useRetracementAnalysis } from "./hooks/useRetracementAnalysis";
import { useAiEntryAnalysis } from "./hooks/useAiEntryAnalysis";
import { FiltersBar } from "./components/FiltersBar";
import { TokensTable } from "./components/TokensTable";
import type { LabelStatus } from "./types";

export function PumpHistorySection() {
  const { tokens, total, isLoading, error, filters, updateFilters, refresh } = usePumpTokens({
    limit: 20,
    sortBy: "detected_at",
    sortOrder: "desc",
  });

  const {
    newTokens,
    newTokenCount,
    showNewTokens,
    isConnected,
    clearNewTokens,
  } = usePumpTokensStream({
    enabled: true,
  });

  // Memoize merged tokens to prevent unnecessary re-renders
  const mergedTokens = useMemo(() => {
    return [...newTokens, ...tokens];
  }, [newTokens, tokens]);

  // Track real-time prices and PnL
  const {
    pnlData,
    isLoading: isPriceLoading,
    lastUpdated,
    refresh: refreshPrices,
  } = usePriceTracking({
    tokens: mergedTokens,
    enabled: true,
    refreshIntervalMs: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // AI Token Analysis - runs when price data is available (legacy)
  const {
    analysisResults,
    currentlyAnalyzing,
    isAnalyzing,
    analyzedCount,
  } = useAiTokenAnalysis({
    tokens: mergedTokens,
    pnlData,
    enabled: pnlData.size > 0, // Only start when we have price data
    analysisIntervalMs: 2000, // 2 seconds between token analyses
  });

  // Retracement Analysis - tracks price journey for pullback entries
  const {
    analysisResults: retracementResults,
    isPolling: isTrackingPrices,
    strongBuys,
    buys,
  } = useRetracementAnalysis({
    tokens: mergedTokens,
    enabled: mergedTokens.length > 0,
    pollIntervalMs: 30000, // Poll every 30 seconds
  });

  // AI Entry Analysis - generates natural language reasoning for BUY signals
  const {
    aiResults,
    currentlyAnalyzing: aiAnalyzing,
    isAnalyzing: isAiAnalyzing,
  } = useAiEntryAnalysis({
    retracementResults,
    signalsToAnalyze: ['strong_buy', 'buy'],
    enabled: retracementResults.size > 0,
    batchDelayMs: 1000, // 1 second between AI requests
  });

  const stats = useMemo(() => {
    const byStatus = {
      approved: 0,
      rejected: 0,
      needs_review: 0,
      flagged: 0,
    } satisfies Record<LabelStatus, number>;

    mergedTokens.forEach((token) => {
      token.labels?.forEach((label) => {
        byStatus[label.status] += 1;
      });
    });

    return {
      total: mergedTokens.length,
      labeled: mergedTokens.filter((token) => token.labels && token.labels.length > 0).length,
      unlabeled: mergedTokens.filter((token) => !token.labels || token.labels.length === 0).length,
      byStatus,
    };
  }, [mergedTokens]);

  return (
    <section className="section-content">
      {newTokenCount > 0 && (
        <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">
              {newTokenCount} new token{newTokenCount > 1 ? "s" : ""} detected.
            </p>
            <p className="text-xs text-white/50">
              Click show to prepend them to the feed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="solid"
              size="sm"
              onClick={() => {
                showNewTokens();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Show
            </Button>
            <Button variant="ghost" size="sm" onClick={clearNewTokens}>
              Dismiss
            </Button>
          </div>
        </Panel>
      )}

      <FiltersBar filters={filters} onChange={updateFilters} />

      {error ? (
        <Panel>
          <p className="text-sm text-[var(--terminal-red)]">Failed to load tokens: {error}</p>
        </Panel>
      ) : null}

      <TokensTable
        tokens={mergedTokens}
        isLoading={isLoading}
        onRefresh={refresh}
        pnlData={pnlData}
        analysisResults={analysisResults}
        retracementResults={retracementResults}
        aiEntryResults={aiResults}
        currentlyAnalyzing={currentlyAnalyzing}
        aiAnalyzing={aiAnalyzing}
      />
    </section>
  );
}
