"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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
// Types
// ============================================

interface WatchlistState {
  tokens: WatchlistToken[];
  stats: WatchlistStats;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

// ============================================
// Main WatchlistPanel Component
// ============================================

export function WatchlistPanel() {
  const [state, setState] = useState<WatchlistState>({
    tokens: [],
    stats: {
      total_watching: 0,
      improving_count: 0,
      avg_check_count: 0,
      oldest_token_age_secs: 0,
    },
    isLoading: true,
    error: null,
    isConnected: false,
  });

  // Track graduating tokens for animation
  const [graduatingMints, setGraduatingMints] = useState<Set<string>>(new Set());

  // Ref to prevent duplicate fetches
  const isFetchingRef = useRef(false);

  // Subscribe to trading WebSocket
  const { on: onTradingEvent, status: wsStatus } = useSharedWebSocket({ path: "/ws/trading" });

  // Fetch initial watchlist data
  const fetchWatchlist = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await smartTradingService.getWatchlist();

      setState((prev) => ({
        ...prev,
        tokens: response.tokens,
        stats: response.stats,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      console.error("[WatchlistPanel] Failed to fetch watchlist:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load watchlist",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Update connection status
  useEffect(() => {
    setState((prev) => ({ ...prev, isConnected: wsStatus === "connected" }));
  }, [wsStatus]);

  // WebSocket event handlers
  useEffect(() => {
    // Handle watchlist_added event
    const unsubAdded = onTradingEvent<WatchlistAddedEvent>("watchlist_added", (data) => {
      console.log("[WatchlistPanel] Token added:", data.symbol);

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

      setState((prev) => ({
        ...prev,
        tokens: [newToken, ...prev.tokens],
        stats: {
          ...prev.stats,
          total_watching: prev.stats.total_watching + 1,
        },
      }));
    });

    // Handle watchlist_updated event
    const unsubUpdated = onTradingEvent<WatchlistUpdatedEvent>("watchlist_updated", (data) => {
      console.log("[WatchlistPanel] Token updated:", data.symbol, "improving:", data.improving);

      setState((prev) => ({
        ...prev,
        tokens: prev.tokens.map((t) =>
          t.mint === data.mint
            ? {
                ...t,
                check_count: data.check_count,
                last_check_at: new Date(data.timestamp).toISOString(),
                metrics: {
                  ...t.metrics,
                  liquidity_usd: data.liquidity_usd,
                  volume_24h_usd: data.volume_24h_usd,
                  holder_count: data.holder_count,
                },
                last_result: {
                  ...t.last_result,
                  improving: data.improving,
                  failed_checks: data.failed_checks,
                  checked_at: new Date(data.timestamp).toISOString(),
                },
              }
            : t
        ),
        stats: {
          ...prev.stats,
          improving_count: prev.tokens.filter(
            (t) => (t.mint === data.mint ? data.improving : t.last_result.improving)
          ).length,
        },
      }));
    });

    // Handle watchlist_removed event
    const unsubRemoved = onTradingEvent<WatchlistRemovedEvent>("watchlist_removed", (data) => {
      console.log("[WatchlistPanel] Token removed:", data.symbol, "reason:", data.reason);

      setState((prev) => ({
        ...prev,
        tokens: prev.tokens.filter((t) => t.mint !== data.mint),
        stats: {
          ...prev.stats,
          total_watching: Math.max(0, prev.stats.total_watching - 1),
        },
      }));
    });

    // Handle watchlist_graduated event (special animation before removal)
    const unsubGraduated = onTradingEvent<WatchlistGraduatedEvent>("watchlist_graduated", (data) => {
      console.log("[WatchlistPanel] Token GRADUATED:", data.symbol);

      // Add to graduating set for animation
      setGraduatingMints((prev) => new Set(prev).add(data.mint));

      // Remove after animation delay
      setTimeout(() => {
        setGraduatingMints((prev) => {
          const next = new Set(prev);
          next.delete(data.mint);
          return next;
        });

        setState((prev) => ({
          ...prev,
          tokens: prev.tokens.filter((t) => t.mint !== data.mint),
          stats: {
            ...prev.stats,
            total_watching: Math.max(0, prev.stats.total_watching - 1),
          },
        }));
      }, 1500); // Animation duration
    });

    return () => {
      unsubAdded?.();
      unsubUpdated?.();
      unsubRemoved?.();
      unsubGraduated?.();
    };
  }, [onTradingEvent]);

  // Don't render if empty and not loading
  if (!state.isLoading && state.tokens.length === 0 && !state.error) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-yellow-400" />
          <span className="text-base font-semibold text-white">Watchlist</span>
          {state.tokens.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/20 text-yellow-400">
              {state.tokens.length}
            </span>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {state.stats.improving_count > 0 && (
            <span className="text-[10px] text-green-400 font-medium">
              {state.stats.improving_count} improving
            </span>
          )}
          <div className={`flex items-center gap-1 text-[10px] ${state.isConnected ? "text-green-400" : "text-red-400"}`}>
            {state.isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {state.isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
      )}

      {state.error && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="text-sm text-red-400 mb-2">{state.error}</span>
          <button
            onClick={fetchWatchlist}
            className="text-xs text-white/40 hover:text-white underline"
          >
            Retry
          </button>
        </div>
      )}

      {!state.isLoading && !state.error && state.tokens.length > 0 && (
        <div className="relative">
          {/* Horizontal scroll container */}
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <motion.div
              className="flex gap-3"
              initial={false}
              animate={{ opacity: 1 }}
            >
              <AnimatePresence mode="popLayout">
                {state.tokens.map((token, index) => (
                  <WatchlistCard
                    key={`${token.mint}-${index}`}
                    token={token}
                    index={index}
                    isGraduating={graduatingMints.has(token.mint)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Scroll fade indicators */}
          <div className="absolute top-0 bottom-2 left-0 w-4 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-2 right-0 w-4 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  );
}

export default WatchlistPanel;
