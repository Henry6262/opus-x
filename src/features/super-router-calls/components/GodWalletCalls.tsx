"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Crown, ExternalLink, Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createChart, LineSeries, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { useGodWallets } from "../hooks/useGodWallets";
import type { GodWalletBuy } from "../types";

// Market data cache
const marketDataCache = new Map<string, { mcap: number; price: number; priceChange24h: number; totalSupply: number }>();

interface TokenCall {
  mint: string;
  symbol: string;
  imageUrl: string | null;
  entries: Array<{
    wallet: {
      id: string;
      label: string | null;
      pfpUrl: string | null;
      address: string;
    };
    entryMcap: number | null;
    entryPricePerToken: number; // Token price at entry
    amountUsd: number;
    positionHeld: number; // 0-100%
    timestamp: string;
  }>;
  // Current market data
  currentMcap: number | null;
  currentPrice: number | null;
  performancePct: number | null;
  firstEntryMcap: number | null;
}

function formatMcap(mcap: number): string {
  if (mcap >= 1_000_000_000) return `$${(mcap / 1_000_000_000).toFixed(1)}B`;
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(1)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(0)}K`;
  return `$${mcap.toFixed(0)}`;
}

function formatAmount(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

// Mini chart component for each call
interface MiniChartProps {
  mint: string;
  entries: TokenCall["entries"];
  currentMcap: number | null;
  firstEntryMcap: number | null;
}

function MiniChart({ mint, entries, currentMcap, firstEntryMcap }: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !currentMcap) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.3)",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 80,
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      leftPriceScale: {
        visible: false,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Generate synthetic price data (from entry to now)
    const now = Date.now();
    const oldestEntry = entries[entries.length - 1];
    const startTime = oldestEntry ? new Date(oldestEntry.timestamp).getTime() : now - 3600000;
    const startMcap = firstEntryMcap || currentMcap * 0.8;

    // Create price line data
    const lineData: { time: UTCTimestamp; value: number }[] = [];
    const duration = now - startTime;
    const steps = 30;

    for (let i = 0; i <= steps; i++) {
      const t = startTime + (duration * i) / steps;
      // Interpolate mcap with some noise
      const progress = i / steps;
      const mcap = startMcap + (currentMcap - startMcap) * progress;
      const noise = 1 + (Math.random() - 0.5) * 0.1;

      lineData.push({
        time: Math.floor(t / 1000) as UTCTimestamp,
        value: mcap * noise,
      });
    }

    // Add line series
    const isPositive = currentMcap >= startMcap;
    const lineSeries = chart.addSeries(LineSeries, {
      color: isPositive ? "#22c55e" : "#ef4444",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    lineSeries.setData(lineData);

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [mint, entries, currentMcap, firstEntryMcap]);

  if (!currentMcap) {
    return <div className="h-[80px] bg-white/[0.02]" />;
  }

  // Calculate marker positions (% along the timeline) with wallet info
  const now = Date.now();
  const oldestEntry = entries[entries.length - 1];
  const startTime = oldestEntry ? new Date(oldestEntry.timestamp).getTime() : now - 3600000;
  const duration = now - startTime;

  const markers = entries.map((entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    const pct = duration > 0 ? ((entryTime - startTime) / duration) * 100 : 50;
    return {
      pct: Math.max(5, Math.min(95, pct)), // Clamp between 5-95%
      pfpUrl: entry.wallet.pfpUrl,
      label: entry.wallet.label,
    };
  });

  return (
    <div className="relative h-[80px]">
      <div ref={chartContainerRef} className="h-full" />
      {/* Entry markers overlay - Wallet PFPs */}
      <div className="absolute inset-0 pointer-events-none">
        {markers.map((marker, idx) => (
          <div
            key={idx}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${marker.pct}%` }}
          >
            {marker.pfpUrl ? (
              <Image
                src={marker.pfpUrl}
                alt={marker.label || "Wallet"}
                width={24}
                height={24}
                className="rounded-full ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/40"
                unoptimized
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/40 flex items-center justify-center">
                <Crown className="w-3 h-3 text-yellow-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CallCardProps {
  call: TokenCall;
}

function CallCard({ call }: CallCardProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(call.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const dexScreenerImg = `https://dd.dexscreener.com/ds-data/tokens/solana/${call.mint}.png`;
  const chartUrl = `https://dexscreener.com/solana/${call.mint}`;

  const isPositive = (call.performancePct ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden"
    >
      {/* Header - Token + Performance + Current MC */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* Token image */}
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
            {!imgError ? (
              <Image
                src={call.imageUrl || dexScreenerImg}
                alt={call.symbol}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-bold">
                {call.symbol.slice(0, 2)}
              </div>
            )}
          </div>

          {/* Symbol + actions */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xl">{call.symbol}</span>
              <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10">
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/30 hover:text-white/60" />
                )}
              </button>
              <a
                href={chartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            {/* Current MC */}
            <div className="text-sm text-white/50">
              {call.currentMcap ? formatMcap(call.currentMcap) : "—"} MC
            </div>
          </div>
        </div>

        {/* Performance + Called at */}
        <div className="text-right">
          {call.performancePct !== null && (
            <div
              className={`flex items-center justify-end gap-1.5 text-xl font-bold ${
                isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {isPositive ? "+" : ""}{call.performancePct.toFixed(0)}%
            </div>
          )}
          <div className="text-sm text-white/40">
            from {call.firstEntryMcap ? formatMcap(call.firstEntryMcap) : "—"}
          </div>
        </div>
      </div>

      {/* Mini Chart - Price timeline with entry markers */}
      <div className="border-t border-b border-white/5 mx-4">
        <MiniChart
          mint={call.mint}
          entries={call.entries}
          currentMcap={call.currentMcap}
          firstEntryMcap={call.firstEntryMcap}
        />
      </div>

      {/* Wallet entries */}
      <div className="divide-y divide-white/5 px-4 pb-2">
        {call.entries.map((entry, idx) => (
          <div key={`${entry.wallet.id}-${idx}`} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {/* Wallet avatar */}
              {entry.wallet.pfpUrl ? (
                <Image
                  src={entry.wallet.pfpUrl}
                  alt={entry.wallet.label || "Wallet"}
                  width={24}
                  height={24}
                  className="rounded-full ring-1 ring-yellow-500/50"
                  unoptimized
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 ring-1 ring-yellow-500/50 flex items-center justify-center">
                  <Crown className="w-3 h-3 text-yellow-500" />
                </div>
              )}
              <span className="text-white/70 text-sm font-medium">
                {entry.wallet.label || `${entry.wallet.address.slice(0, 4)}...`}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {/* Entry mcap */}
              <span className="text-white/40">
                @{entry.entryMcap ? formatMcap(entry.entryMcap) : formatAmount(entry.amountUsd)}
              </span>

              {/* Position held */}
              <span
                className={`font-medium min-w-[40px] text-right ${
                  entry.positionHeld >= 75
                    ? "text-green-400"
                    : entry.positionHeld >= 25
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {entry.positionHeld}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function GodWalletCalls() {
  const { godWallets, recentBuys, isLoading } = useGodWallets();
  const [marketData, setMarketData] = useState<Map<string, { mcap: number; price: number; totalSupply: number }>>(new Map());

  // Group buys by token
  const calls = useMemo(() => {
    const tokenMap = new Map<string, TokenCall>();

    for (const buy of recentBuys) {
      let call = tokenMap.get(buy.mint);

      if (!call) {
        call = {
          mint: buy.mint,
          symbol: buy.symbol,
          imageUrl: buy.imageUrl,
          entries: [],
          currentMcap: null,
          currentPrice: null,
          performancePct: null,
          firstEntryMcap: null,
        };
        tokenMap.set(buy.mint, call);
      }

      // Add entry
      call.entries.push({
        wallet: {
          id: buy.wallet.id,
          label: buy.wallet.label,
          pfpUrl: buy.wallet.pfpUrl,
          address: buy.wallet.address,
        },
        entryMcap: null, // Will be calculated from entryPricePerToken * totalSupply
        entryPricePerToken: buy.entryPricePerToken,
        amountUsd: buy.amountUsd,
        positionHeld: 100, // Default to 100% since we don't track sells yet
        timestamp: buy.timestamp,
      });
    }

    // Sort entries by timestamp (newest first) within each call
    for (const call of tokenMap.values()) {
      call.entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Convert to array and sort by most recent entry
    return Array.from(tokenMap.values()).sort((a, b) => {
      const aTime = a.entries[0] ? new Date(a.entries[0].timestamp).getTime() : 0;
      const bTime = b.entries[0] ? new Date(b.entries[0].timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [recentBuys]);

  // Fetch market data for all tokens
  useEffect(() => {
    if (calls.length === 0) return;

    const fetchMarketData = async () => {
      const newMarketData = new Map<string, { mcap: number; price: number; totalSupply: number }>();

      await Promise.all(
        calls.map(async (call) => {
          // Check cache
          if (marketDataCache.has(call.mint)) {
            const cached = marketDataCache.get(call.mint)!;
            newMarketData.set(call.mint, { mcap: cached.mcap, price: cached.price, totalSupply: cached.totalSupply });
            return;
          }

          try {
            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${call.mint}`
            );
            if (response.ok) {
              const data = await response.json();
              const pair = data.pairs?.[0];
              if (pair) {
                const mcap = pair.marketCap || pair.fdv || 0;
                const price = parseFloat(pair.priceUsd) || 0;
                // Calculate total supply from FDV / price (FDV = fully diluted valuation)
                const fdv = pair.fdv || mcap;
                const totalSupply = price > 0 ? fdv / price : 0;
                marketDataCache.set(call.mint, { mcap, price, priceChange24h: pair.priceChange?.h24 || 0, totalSupply });
                newMarketData.set(call.mint, { mcap, price, totalSupply });
              }
            }
          } catch (err) {
            console.error("[GodWalletCalls] Failed to fetch market data for", call.mint);
          }
        })
      );

      setMarketData(newMarketData);
    };

    fetchMarketData();
  }, [calls]);

  // Enrich calls with market data
  const enrichedCalls = useMemo(() => {
    return calls.map((call) => {
      const data = marketData.get(call.mint);
      if (!data || data.totalSupply === 0) return call;

      // Calculate entry mcap for each entry: entry_price_per_token * total_supply
      const enrichedEntries = call.entries.map((entry) => {
        const entryMcap = entry.entryPricePerToken > 0
          ? entry.entryPricePerToken * data.totalSupply
          : null;

        return {
          ...entry,
          entryMcap,
        };
      });

      // Get the oldest entry (first caller) for "called at" mcap
      const oldestEntry = enrichedEntries[enrichedEntries.length - 1];
      const firstEntryMcap = oldestEntry?.entryMcap || null;

      // Calculate performance: (current_mcap - entry_mcap) / entry_mcap * 100
      const performancePct = firstEntryMcap && firstEntryMcap > 0
        ? ((data.mcap - firstEntryMcap) / firstEntryMcap) * 100
        : null;

      return {
        ...call,
        currentMcap: data.mcap,
        currentPrice: data.price,
        firstEntryMcap,
        performancePct,
        entries: enrichedEntries,
      };
    });
  }, [calls, marketData]);

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full"
          />
        </div>
      </div>
    );
  }

  if (godWallets.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="text-center py-12">
          <Crown className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <p className="text-base text-white/50">No god wallets configured</p>
        </div>
      </div>
    );
  }

  if (enrichedCalls.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="text-center py-12">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-10 h-10 text-yellow-500/40 mx-auto mb-4" />
          </motion.div>
          <p className="text-base text-white/50">Watching for god wallet calls...</p>
          <p className="text-sm text-white/30 mt-2">{godWallets.length} wallets tracked</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <span className="text-base font-semibold text-white">God Wallet Calls</span>
        </div>
        <span className="text-sm text-white/40">
          {enrichedCalls.length} active · {godWallets.length} wallets
        </span>
      </div>

      {/* Calls grid - 1 col mobile, 2 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {enrichedCalls.slice(0, 10).map((call) => (
            <CallCard key={call.mint} call={call} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
