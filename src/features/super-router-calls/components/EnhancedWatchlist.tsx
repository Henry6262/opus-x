"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Loader2, Copy, Check, Brain, Users, ExternalLink, X, BarChart3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { smartTradingService } from "@/features/smart-trading/service";
import { useSharedWebSocket } from "@/features/smart-trading/hooks/useWebSocket";
import { TrackerWalletIndicator } from "./TrackerWalletIndicator";
import { WalletEntryChart } from "./WalletEntryChart";
import { useMultipleWalletEntries, type WalletEntryPoint } from "../hooks/useWalletEntries";
import type { WatchlistToken, WatchlistAddedEvent, WatchlistUpdatedEvent, WatchlistRemovedEvent } from "@/features/smart-trading/types";

interface EnhancedWatchlistCardProps {
  token: WatchlistToken;
  walletEntries: WalletEntryPoint[];
  aiReasoning?: {
    reasoning: string;
    conviction: number;
    will_trade: boolean;
    timestamp: number;
  };
  onOpenChart: (token: WatchlistToken) => void;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function getStateLabel(token: WatchlistToken): { label: string; color: string } {
  const { last_result } = token;

  if (last_result.passed) {
    return { label: "GOOD BUY", color: "bg-green-500/20 text-green-400" };
  }

  if (last_result.improving) {
    return { label: "IMPROVING", color: "bg-yellow-500/20 text-yellow-400" };
  }

  return { label: "MONITORING", color: "bg-white/10 text-white/60" };
}

function EnhancedWatchlistCard({ token, walletEntries, aiReasoning, onOpenChart }: EnhancedWatchlistCardProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const dexScreenerImgUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${token.mint}.png`;
  const dexScreenerChartUrl = `https://dexscreener.com/solana/${token.mint}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(token.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenDexScreener = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(dexScreenerChartUrl, "_blank", "noopener,noreferrer");
  };

  const stateInfo = getStateLabel(token);
  const hasWalletEntries = walletEntries.length > 0;

  return (
    <motion.div
      onClick={() => onOpenChart(token)}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      className="relative flex-shrink-0 w-[320px] rounded-xl overflow-hidden cursor-pointer group"
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: hasWalletEntries
            ? "linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(34, 197, 94, 0.2))"
            : "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 197, 94, 0.2))",
          filter: "blur(8px)",
        }}
      />

      {/* Card content */}
      <div className="relative p-4 bg-gradient-to-br from-zinc-900/95 to-black/95 border border-white/10 rounded-xl backdrop-blur-sm">
        {/* Top row: Token info + State badge */}
        <div className="flex items-start justify-between mb-3">
          {/* Left: Token avatar + info */}
          <div className="flex items-center gap-3">
            {/* Token avatar */}
            <div className="relative">
              {!imgError ? (
                <Image
                  src={dexScreenerImgUrl}
                  alt={token.symbol}
                  width={44}
                  height={44}
                  className="rounded-lg"
                  onError={() => setImgError(true)}
                  unoptimized
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-bold text-sm">
                  {token.symbol.slice(0, 2)}
                </div>
              )}

              {/* Wallet entry indicator badge */}
              {hasWalletEntries && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black text-[10px] font-bold">
                  {walletEntries.length}
                </div>
              )}
            </div>

            {/* Token details */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{token.symbol}</span>
                <button
                  onClick={handleCopy}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                  )}
                </button>
                <button
                  onClick={handleOpenDexScreener}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  title="Open on DexScreener"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                </button>
              </div>
              <span className="text-xs text-white/50 truncate max-w-[120px]">{token.name}</span>
            </div>
          </div>

          {/* State badge */}
          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${stateInfo.color}`}>
            {stateInfo.label}
          </span>
        </div>

        {/* Tracker wallet indicators */}
        {hasWalletEntries && (
          <div className="mb-3 py-2 px-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-[10px] text-yellow-500 font-medium">
                  {walletEntries.length} Tracker{walletEntries.length !== 1 ? "s" : ""} Entered
                </span>
              </div>
              <TrackerWalletIndicator entries={walletEntries} size="sm" maxDisplay={4} />
            </div>
          </div>
        )}

        {/* Metrics row */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-white/40">MCap</span>
              <span className="text-white font-medium">
                ${formatNumber(token.metrics.market_cap_usd)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40">Vol 24h</span>
              <span className="text-white font-medium">
                ${formatNumber(token.metrics.volume_24h_usd)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40">Holders</span>
              <span className="text-white font-medium">
                {formatNumber(token.metrics.holder_count)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-white/40">
            <Eye className="w-3 h-3" />
            <span>{token.check_count}</span>
          </div>
        </div>

        {/* Mini Chart Preview */}
        <div className="mb-3 rounded-lg overflow-hidden border border-white/5">
          <WalletEntryChart mint={token.mint} height={140} showTooltip={false} />
        </div>

        {/* AI Reasoning preview */}
        {aiReasoning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-[11px] text-white/70 truncate">
                    {aiReasoning.reasoning.slice(0, 50)}...
                  </span>
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${
                      aiReasoning.will_trade
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {(aiReasoning.conviction * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-3 bg-zinc-900/95 border border-white/10">
              <p className="text-xs text-white/80">{aiReasoning.reasoning}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Failed checks indicator */}
        {token.last_result.failed_checks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {token.last_result.failed_checks.slice(0, 3).map((check, idx) => (
              <span
                key={idx}
                className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/70"
              >
                {check}
              </span>
            ))}
            {token.last_result.failed_checks.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                +{token.last_result.failed_checks.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EnhancedWatchlist() {
  const [tokens, setTokens] = useState<WatchlistToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiReasoningsMap, setAiReasoningsMap] = useState<Map<string, { reasoning: string; conviction: number; will_trade: boolean; timestamp: number }>>(new Map());
  const [selectedToken, setSelectedToken] = useState<WatchlistToken | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  const isFetchingRef = useRef(false);

  // Fetch wallet entries for all tokens in the watchlist
  const tokenMints = tokens.map((t) => t.mint);
  const walletEntriesMap = useMultipleWalletEntries(tokenMints);

  const handleOpenChart = useCallback((token: WatchlistToken) => {
    setSelectedToken(token);
    setIsChartModalOpen(true);
  }, []);

  const { on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });
  const { on: onReasoningEvent } = useSharedWebSocket({ path: "/ws/trading/reasoning" });

  const fetchWatchlist = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setIsLoading(true);
      const [watchlistResponse, reasoningResponse] = await Promise.all([
        smartTradingService.getWatchlist(),
        smartTradingService.getWatchlistReasoning(),
      ]);

      const uniqueTokens = watchlistResponse.tokens.filter(
        (token, index, self) => index === self.findIndex((t) => t.mint === token.mint)
      );
      setTokens(uniqueTokens);

      if (reasoningResponse.reasoning) {
        const reasoningMap = new Map<string, { reasoning: string; conviction: number; will_trade: boolean; timestamp: number }>();
        for (const [mint, entries] of Object.entries(reasoningResponse.reasoning)) {
          if (entries.length > 0) {
            reasoningMap.set(mint, entries[0]);
          }
        }
        setAiReasoningsMap(reasoningMap);
      }

      setError(null);
    } catch (err) {
      console.error("[EnhancedWatchlist] Failed to fetch:", err);
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
        if (prev.some((t) => t.mint === newToken.mint)) return prev;
        return [newToken, ...prev];
      });
    });

    const unsubUpdated = onTradingEvent<WatchlistUpdatedEvent>("watchlist_updated", (data) => {
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
    });

    return () => {
      unsubAdded?.();
      unsubUpdated?.();
      unsubRemoved?.();
    };
  }, [onTradingEvent]);

  // AI reasoning events
  useEffect(() => {
    const unsubAiReasoning = onReasoningEvent<{ symbol: string; mint: string; reasoning: string; conviction: number; will_trade: boolean; timestamp: number }>("ai_reasoning", (data) => {
      setAiReasoningsMap((prev) => {
        const next = new Map(prev);
        next.set(data.mint, {
          reasoning: data.reasoning,
          conviction: data.conviction,
          will_trade: data.will_trade,
          timestamp: data.timestamp,
        });
        return next;
      });
    });

    return () => {
      unsubAiReasoning?.();
    };
  }, [onReasoningEvent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-400 mb-2">{error}</p>
        <button onClick={fetchWatchlist} className="text-xs text-white/50 hover:text-white underline">
          Retry
        </button>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl bg-white/5 border border-white/10">
        <Eye className="w-8 h-8 text-white/30 mx-auto mb-3" />
        <p className="text-sm text-white/50">No tokens in watchlist</p>
        <p className="text-xs text-white/30 mt-1">Tokens that don't meet criteria will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-primary" />
          <span className="text-sm font-semibold text-white">Enhanced Watchlist</span>
        </div>
        <span className="text-xs text-white/40">{tokens.length} token{tokens.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Scrollable cards */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3">
          <AnimatePresence mode="popLayout">
            {tokens.map((token) => (
              <EnhancedWatchlistCard
                key={token.mint}
                token={token}
                walletEntries={walletEntriesMap.get(token.mint) || []}
                aiReasoning={aiReasoningsMap.get(token.mint)}
                onOpenChart={handleOpenChart}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Chart Modal */}
      <Dialog open={isChartModalOpen} onOpenChange={setIsChartModalOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-brand-primary" />
              <span className="text-white">
                {selectedToken?.symbol} - Wallet Entries
              </span>
              <a
                href={`https://dexscreener.com/solana/${selectedToken?.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-white/50 hover:text-white flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                DexScreener
              </a>
            </DialogTitle>
          </DialogHeader>
          {selectedToken && (
            <div className="space-y-4">
              {/* Token info header */}
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <Image
                  src={`https://dd.dexscreener.com/ds-data/tokens/solana/${selectedToken.mint}.png`}
                  alt={selectedToken.symbol}
                  width={40}
                  height={40}
                  className="rounded-lg"
                  unoptimized
                />
                <div>
                  <div className="font-bold text-white">{selectedToken.symbol}</div>
                  <div className="text-xs text-white/50">{selectedToken.name}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm text-white">
                    ${formatNumber(selectedToken.metrics.market_cap_usd)}
                  </div>
                  <div className="text-xs text-white/50">Market Cap</div>
                </div>
              </div>

              {/* Chart - larger height with full tooltip */}
              <WalletEntryChart mint={selectedToken.mint} height={380} showTooltip={true} />

              {/* Legend info - simplified since chart now shows entries */}
              <div className="flex items-center justify-center gap-6 text-xs text-white/60 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-yellow-500 rounded-full" />
                  <span>Whale Entry Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500 rounded-full" />
                  <span>Tracked Wallet Entry</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
