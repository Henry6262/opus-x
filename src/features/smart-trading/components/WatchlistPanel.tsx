"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { Eye, Loader2, Wifi, WifiOff } from "lucide-react";
import { smartTradingService } from "../service";
import { useSharedWebSocket } from "../hooks/useWebSocket";
import { WatchlistCard } from "./WatchlistCard";
import type {
  WatchlistToken,
  WatchlistStats,
  WatchlistAddedEvent,
  WatchlistUpdatedEvent,
  WatchlistRemovedEvent,
  WatchlistGraduatedEvent,
} from "../types";

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

  const isFetchingRef = useRef(false);
  const { on: onTradingEvent, status: wsStatus } = useSharedWebSocket({ path: "/ws/trading" });
  const isConnected = wsStatus === "connected";

  // Fetch initial data
  const fetchWatchlist = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setIsLoading(true);
      const response = await smartTradingService.getWatchlist();
      setTokens(response.tokens);
      setStats(response.stats);
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
          market_cap_usd: 0,
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
      setTokens((prev) => [newToken, ...prev]);
    });

    const unsubUpdated = onTradingEvent<WatchlistUpdatedEvent>("watchlist_updated", (data) => {
      setTokens((prev) =>
        prev.map((t) =>
          t.mint === data.mint
            ? {
                ...t,
                check_count: data.check_count,
                last_check_at: new Date(data.timestamp).toISOString(),
                metrics: { ...t.metrics, market_cap_usd: data.market_cap_usd, volume_24h_usd: data.volume_24h_usd, holder_count: data.holder_count },
                last_result: { ...t.last_result, improving: data.improving, failed_checks: data.failed_checks },
              }
            : t
        )
      );
    });

    const unsubRemoved = onTradingEvent<WatchlistRemovedEvent>("watchlist_removed", (data) => {
      setTokens((prev) => prev.filter((t) => t.mint !== data.mint));
    });

    const unsubGraduated = onTradingEvent<WatchlistGraduatedEvent>("watchlist_graduated", (data) => {
      setTokens((prev) => prev.filter((t) => t.mint !== data.mint));
    });

    return () => {
      unsubAdded?.();
      unsubUpdated?.();
      unsubRemoved?.();
      unsubGraduated?.();
    };
  }, [onTradingEvent]);

  // Hide if empty
  if (!isLoading && tokens.length === 0 && !error) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-yellow-400" />
          <span className="text-base font-semibold text-white">Watchlist</span>
          {tokens.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/20 text-yellow-400">
              {tokens.length}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-[10px] ${isConnected ? "text-green-400" : "text-red-400"}`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>Live</span>
        </div>
      </div>

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
          <div className="flex gap-3">
            <AnimatePresence mode="popLayout">
              {tokens.map((token) => (
                <WatchlistCard key={token.mint} token={token} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchlistPanel;
