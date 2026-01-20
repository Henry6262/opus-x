"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { Eye, Loader2 } from "lucide-react";
import { smartTradingService } from "../service";
import { useSharedWebSocket } from "../hooks/useWebSocket";
import { WatchlistCard, type AiReasoningEntry } from "./WatchlistCard";
import { SectionHeader } from "./SectionHeader";
import type {
  WatchlistToken,
  WatchlistStats,
  WatchlistAddedEvent,
  WatchlistUpdatedEvent,
  WatchlistRemovedEvent,
  WatchlistGraduatedEvent,
} from "../types";

// ============================================
// Types
// ============================================

interface AiReasoningEvent {
  symbol: string;
  mint: string;
  reasoning: string;
  conviction: number;
  will_trade: boolean;
  timestamp: number;
}

// Max number of AI reasonings to store per token
const MAX_REASONINGS_PER_TOKEN = 10;

// ============================================
// WatchlistPanel
// ============================================

export function WatchlistPanel() {
  const [tokens, setTokens] = useState<WatchlistToken[]>([]);
  const [stats, setStats] = useState<WatchlistStats>({
    total_watching: 0,
    improving_count: 0,
    avg_check_count: 0,
    oldest_token_age_secs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Reasoning history per token (keyed by mint address)
  const [aiReasoningsMap, setAiReasoningsMap] = useState<Map<string, AiReasoningEntry[]>>(new Map());

  const isFetchingRef = useRef(false);
  const { on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });
  // Separate WebSocket for AI reasoning events
  const { on: onReasoningEvent } = useSharedWebSocket({ path: "/ws/trading/reasoning" });

  // Fetch initial data (watchlist + reasoning backfill)
  const fetchWatchlist = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setIsLoading(true);

      // Fetch watchlist and reasoning in parallel
      const [watchlistResponse, reasoningResponse] = await Promise.all([
        smartTradingService.getWatchlist(),
        smartTradingService.getWatchlistReasoning(),
      ]);

      // Deduplicate tokens by mint address
      const uniqueTokens = watchlistResponse.tokens.filter(
        (token, index, self) => index === self.findIndex((t) => t.mint === token.mint)
      );
      setTokens(uniqueTokens);
      setStats(watchlistResponse.stats);

      // Backfill AI reasoning history from API response
      if (reasoningResponse.reasoning && Object.keys(reasoningResponse.reasoning).length > 0) {
        console.log("[WatchlistPanel] Backfilling AI reasoning for", Object.keys(reasoningResponse.reasoning).length, "tokens");
        const reasoningMap = new Map<string, AiReasoningEntry[]>();
        for (const [mint, entries] of Object.entries(reasoningResponse.reasoning)) {
          // entries is already an array of AiReasoningEntry
          reasoningMap.set(mint, entries.slice(0, MAX_REASONINGS_PER_TOKEN));
        }
        setAiReasoningsMap(reasoningMap);
      }

      setError(null);
    } catch (err) {
      console.error("[WatchlistPanel] Failed to fetch:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // WebSocket events
  useEffect(() => {
    const unsubAdded = onTradingEvent<WatchlistAddedEvent>("watchlist_added", (data) => {
      console.log("[WatchlistPanel] watchlist_added:", data.symbol, data);
      const newToken: WatchlistToken = {
        mint: data.mint,
        symbol: data.symbol,
        name: data.name,
        added_at: new Date(data.timestamp).toISOString(),
        last_check_at: new Date(data.timestamp).toISOString(),
        check_count: 1,
        watch_reasons: data.watch_reasons,
        metrics: {
          liquidity_usd: data.liquidity_usd,
          volume_24h_usd: data.volume_24h_usd,
          market_cap_usd: data.market_cap_usd ?? 0,
          holder_count: data.holder_count,
          price_usd: 0,
        },
        last_result: {
          passed: false,
          failed_checks: data.watch_reasons,
          improving: false,
          checked_at: new Date(data.timestamp).toISOString(),
        },
      };
      setTokens((prev) => {
        // Prevent duplicates - skip if token already exists
        if (prev.some((t) => t.mint === newToken.mint)) {
          return prev;
        }
        return [newToken, ...prev];
      });
    });

    const unsubUpdated = onTradingEvent<WatchlistUpdatedEvent>("watchlist_updated", (data) => {
      console.log("[WatchlistPanel] watchlist_updated:", data.symbol, {
        mcap: data.market_cap_usd,
        vol: data.volume_24h_usd,
        holders: data.holder_count,
        improving: data.improving,
      });
      setTokens((prev) =>
        prev.map((t) =>
          t.mint === data.mint
            ? {
                ...t,
                check_count: data.check_count,
                last_check_at: new Date(data.timestamp).toISOString(),
                metrics: {
                  ...t.metrics,
                  market_cap_usd: data.market_cap_usd ?? t.metrics.market_cap_usd,
                  volume_24h_usd: data.volume_24h_usd ?? t.metrics.volume_24h_usd,
                  holder_count: data.holder_count ?? t.metrics.holder_count,
                },
                last_result: {
                  ...t.last_result,
                  improving: data.improving,
                  failed_checks: data.failed_checks ?? t.last_result.failed_checks,
                },
              }
            : t
        )
      );
    });

    const unsubRemoved = onTradingEvent<WatchlistRemovedEvent>("watchlist_removed", (data) => {
      setTokens((prev) => prev.filter((t) => t.mint !== data.mint));
      // Clean up AI reasonings for removed token
      setAiReasoningsMap((prev) => {
        const next = new Map(prev);
        next.delete(data.mint);
        return next;
      });
    });

    const unsubGraduated = onTradingEvent<WatchlistGraduatedEvent>("watchlist_graduated", (data) => {
      setTokens((prev) => prev.filter((t) => t.mint !== data.mint));
      // Clean up AI reasonings for removed token
      setAiReasoningsMap((prev) => {
        const next = new Map(prev);
        next.delete(data.mint);
        return next;
      });
    });

    return () => {
      unsubAdded?.();
      unsubUpdated?.();
      unsubRemoved?.();
      unsubGraduated?.();
    };
  }, [onTradingEvent]);

  // Listen for AI reasoning events from dedicated reasoning WebSocket
  useEffect(() => {
    const unsubAiReasoning = onReasoningEvent<AiReasoningEvent>("ai_reasoning", (data) => {
      console.log("[WatchlistPanel] ai_reasoning from /ws/trading/reasoning:", data.symbol, {
        conviction: data.conviction,
        will_trade: data.will_trade,
      });

      const newEntry: AiReasoningEntry = {
        reasoning: data.reasoning,
        conviction: data.conviction,
        will_trade: data.will_trade,
        timestamp: data.timestamp,
      };

      setAiReasoningsMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.mint) || [];
        // Add new entry at the beginning, keep only the last N entries
        const updated = [newEntry, ...existing].slice(0, MAX_REASONINGS_PER_TOKEN);
        next.set(data.mint, updated);
        return next;
      });
    });

    return () => {
      unsubAiReasoning?.();
    };
  }, [onReasoningEvent]);

  // Hide if empty
  if (!isLoading && tokens.length === 0 && !error) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/10 p-3">
      {/* Header */}
      <SectionHeader
        icon={<Eye className="w-6 h-6 text-[#c4f70e]" />}
        title="Watchlist"
        tooltip="Tokens being monitored that didn't meet initial entry criteria. They're re-checked periodically and may qualify for entry as metrics improve."
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-4">
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={fetchWatchlist} className="block mx-auto mt-1 text-xs text-white/40 hover:text-white underline">
            Retry
          </button>
        </div>
      )}

      {/* Cards */}
      {!isLoading && !error && tokens.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2">
            <AnimatePresence mode="popLayout">
              {tokens.map((token) => (
                <WatchlistCard
                  key={token.mint}
                  token={token}
                  aiReasonings={aiReasoningsMap.get(token.mint)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchlistPanel;
