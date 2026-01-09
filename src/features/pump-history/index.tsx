"use client";

import { useMemo } from "react";
import { Panel, SectionHeader, StatusPill } from "@/components/design-system";
import { Button } from "@/components/ui";
import { usePumpTokens } from "./hooks/usePumpTokens";
import { usePumpTokensStream } from "./hooks/usePumpTokensStream";
import { usePriceTracking } from "./hooks/usePriceTracking";
import { FiltersBar } from "./components/FiltersBar";
import { StatsStrip } from "./components/StatsStrip";
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
    <section className="space-y-6">
      <div className="section-header-row">
        <SectionHeader
          eyebrow="Pump History"
          title="Migration Intelligence"
          description="Review migrated tokens, labels, and live pump signals in one feed."
        />
        <div className="section-header-actions">
          <StatusPill tone={isConnected ? "live" : "warn"}>
            {isConnected ? "Live" : "Reconnecting"}
          </StatusPill>
          <StatusPill tone="warn">Total {total}</StatusPill>
          {lastUpdated && (
            <StatusPill tone="neutral">
              Prices: {new Date(lastUpdated).toLocaleTimeString()}
            </StatusPill>
          )}
          <Button variant="outline" size="sm" onClick={refresh}>
            Refresh Tokens
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPrices}
            disabled={isPriceLoading}
          >
            {isPriceLoading ? "Updating..." : "Refresh Prices"}
          </Button>
        </div>
      </div>

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

      <StatsStrip stats={stats} isLoading={isLoading} />

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
      />
    </section>
  );
}
