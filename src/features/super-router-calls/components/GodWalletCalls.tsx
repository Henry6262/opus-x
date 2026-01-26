"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import { createChart, LineSeries, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { useGodWallets } from "../hooks/useGodWallets";
import { useMultipleAggregatedWalletEntries } from "../hooks/useAggregatedWalletEntries";
import type { AggregatedWalletEntry } from "../types";
import ShinyText from "@/components/ShinyText";

// ============================================
// Skeleton Components - Sophisticated loading states
// ============================================

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </div>
  );
}

function CallCardSkeleton() {
  return (
    <div className="relative h-full">
      <div
        className="relative rounded-xl overflow-hidden h-full border border-zinc-800/80"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {/* MOBILE LAYOUT */}
        <div className="lg:hidden">
          {/* Top row: Token info + Wallet entries */}
          <div className="flex items-start justify-between p-3 gap-2">
            {/* Left: Token image + name + mcap */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <Shimmer className="w-10 h-10 rounded-lg bg-white/[0.06]" />
              <div className="flex flex-col gap-1.5">
                <Shimmer className="h-4 w-16 rounded bg-white/[0.06]" />
                <Shimmer className="h-3 w-12 rounded bg-white/[0.04]" />
              </div>
            </div>

            {/* Right: Wallet entry skeletons */}
            <div className="flex items-center gap-1 overflow-hidden max-w-[60%]">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-1 py-0.5 px-1.5 rounded-md bg-white/[0.04] flex-shrink-0">
                  <Shimmer className="w-4 h-4 rounded-full bg-white/[0.08]" />
                  <Shimmer className="h-3 w-10 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          </div>

          {/* Chart skeleton */}
          <div className="border-t border-white/5">
            <div className="w-full h-[100px] relative">
              <Shimmer className="absolute inset-0 bg-white/[0.02]" />
              {/* Fake chart line */}
              <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
                <path
                  d="M0,70 Q25,50 50,55 T100,40 T150,45 T200,35 T250,40 T300,30"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="hidden lg:flex flex-row h-full min-h-[160px]">
          {/* Left side - 50% */}
          <div className="w-[50%] p-4 flex flex-col justify-between">
            {/* Header row: Image + Title */}
            <div className="flex items-center gap-3 mb-3">
              <Shimmer className="w-14 h-14 rounded-xl bg-white/[0.06] flex-shrink-0" />
              <div className="flex flex-col gap-2">
                <Shimmer className="h-5 w-20 rounded bg-white/[0.06]" />
                <Shimmer className="h-3 w-16 rounded bg-white/[0.04]" />
              </div>
            </div>

            {/* Wallet entries skeleton */}
            <div className="space-y-2 h-[88px] overflow-hidden">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <Shimmer className="w-[26px] h-[26px] rounded-full bg-white/[0.08]" />
                    <div className="flex flex-col gap-1.5">
                      <Shimmer className="h-4 w-16 rounded bg-white/[0.06]" />
                      <Shimmer className="h-2 w-12 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Shimmer className="h-4 w-14 rounded bg-white/[0.06]" />
                    <Shimmer className="h-1.5 w-12 rounded-full bg-white/[0.08]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - 50% - Chart */}
          <div className="w-[50%] border-l border-white/5 overflow-hidden relative">
            <Shimmer className="absolute inset-0 bg-white/[0.02]" />
            {/* Fake chart line */}
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
              <path
                d="M0,100 Q50,80 100,85 T200,60 T300,70 T400,50"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
              />
            </svg>
            {/* Fake entry markers */}
            <div className="absolute top-1/2 left-[25%] -translate-y-1/2 -translate-x-1/2">
              <Shimmer className="w-5 h-5 rounded-full bg-white/[0.1]" />
            </div>
            <div className="absolute top-1/2 left-[60%] -translate-y-1/2 -translate-x-1/2">
              <Shimmer className="w-5 h-5 rounded-full bg-white/[0.1]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GodWalletCallsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <CallCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Market data cache
const marketDataCache = new Map<string, { mcap: number; price: number; priceChange24h: number; totalSupply: number }>();

interface TokenCall {
  mint: string;
  symbol: string;
  imageUrl: string | null;
  // Aggregated entries from backend (one per wallet)
  aggregatedEntries: AggregatedWalletEntry[];
  // Current market data
  currentMcap: number | null;
  currentPrice: number | null;
  performancePct: number | null;
  firstEntryMcap: number | null;
}

function formatMcap(mcap: number | null | undefined): string {
  if (mcap == null || mcap === 0) return "—";
  if (mcap >= 1_000_000_000) return `$${(mcap / 1_000_000_000).toFixed(1)}B`;
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(1)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(0)}K`;
  return `$${mcap.toFixed(0)}`;
}

function formatAmount(usd: number | null | undefined): string {
  if (usd == null || usd === 0) return "—";
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

// Mini chart component for each call
interface MiniChartProps {
  mint: string;
  aggregatedEntries: AggregatedWalletEntry[];
  currentMcap: number | null;
  firstEntryMcap: number | null;
}

function MiniChart({ mint, aggregatedEntries, currentMcap, firstEntryMcap }: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tooltipData, setTooltipData] = useState<{ mcap: string; x: number; y: number; visible: boolean }>({
    mcap: "",
    x: 0,
    y: 0,
    visible: false,
  });

  useEffect(() => {
    if (!chartContainerRef.current || !currentMcap) return;

    // Get container height dynamically
    const containerHeight = chartContainerRef.current.clientHeight || 120;

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
      height: containerHeight,
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
        mode: 1,
        vertLine: {
          color: "rgba(196, 247, 14, 0.3)",
          width: 1,
          style: 2,
          labelVisible: false,
        },
        horzLine: {
          color: "rgba(196, 247, 14, 0.3)",
          width: 1,
          style: 2,
          labelVisible: false,
        },
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Generate synthetic price data (from entry to now)
    const now = Date.now();
    // Find oldest entry across all wallets
    const oldestTimestamp = aggregatedEntries.reduce((oldest, entry) => {
      const entryTime = new Date(entry.firstEntryTimestamp).getTime();
      return entryTime < oldest ? entryTime : oldest;
    }, now);
    const startTime = oldestTimestamp < now ? oldestTimestamp : now - 3600000;
    const startMcap = firstEntryMcap || currentMcap * 0.8;

    // Create price line data - ensure unique ascending timestamps
    const lineData: { time: UTCTimestamp; value: number }[] = [];
    const duration = Math.max(now - startTime, 3600000); // Minimum 1 hour span
    const steps = 30;
    let lastTime = 0;

    for (let i = 0; i <= steps; i++) {
      const t = startTime + (duration * i) / steps;
      const timeSeconds = Math.floor(t / 1000);

      // Ensure strictly ascending - skip if same or less than previous
      if (timeSeconds <= lastTime) continue;
      lastTime = timeSeconds;

      // Interpolate mcap with some noise
      const progress = i / steps;
      const mcap = startMcap + (currentMcap - startMcap) * progress;
      const noise = 1 + (Math.random() - 0.5) * 0.1;

      lineData.push({
        time: timeSeconds as UTCTimestamp,
        value: mcap * noise,
      });
    }

    // Add line series - Brand green for runners, muted for cold
    const isPositive = currentMcap >= startMcap;
    const lineSeries = chart.addSeries(LineSeries, {
      color: isPositive ? "#c4f70e" : "rgba(255, 255, 255, 0.3)",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    lineSeries.setData(lineData);

    chart.timeScale().fitContent();

    // Crosshair move handler for tooltip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCrosshairMove = (param: any) => {
      if (!param.time || !param.point) {
        setTooltipData((prev) => ({ ...prev, visible: false }));
        return;
      }

      const data = param.seriesData.get(lineSeries);
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (data as any).value ?? 0;
        setTooltipData({
          mcap: formatMcap(value),
          x: param.point.x,
          y: param.point.y,
          visible: true,
        });
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 120,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
    };
  }, [mint, aggregatedEntries, currentMcap, firstEntryMcap]);

  if (!currentMcap) {
    return <div className="h-full min-h-[120px] bg-white/[0.02]" />;
  }

  // Calculate marker positions (% along the timeline) with wallet info
  const now = Date.now();
  const oldestTimestamp = aggregatedEntries.reduce((oldest, entry) => {
    const entryTime = new Date(entry.firstEntryTimestamp).getTime();
    return entryTime < oldest ? entryTime : oldest;
  }, now);
  const startTime = oldestTimestamp < now ? oldestTimestamp : now - 3600000;
  const duration = now - startTime;

  const markers = aggregatedEntries.map((entry) => {
    const entryTime = new Date(entry.firstEntryTimestamp).getTime();
    const pct = duration > 0 ? ((entryTime - startTime) / duration) * 100 : 50;
    return {
      pct: Math.max(5, Math.min(95, pct)), // Clamp between 5-95%
      pfpUrl: entry.wallet.pfpUrl,
      label: entry.wallet.label,
      buyCount: entry.buyCount,
      sellCount: entry.sellCount,
    };
  });

  return (
    <div className="relative h-full min-h-[120px]">
      <div ref={chartContainerRef} className="h-full" />

      {/* Tooltip */}
      {tooltipData.visible && (
        <div
          className="absolute pointer-events-none z-20 bg-black/90 backdrop-blur-sm border border-[#c4f70e]/40 rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: Math.min(tooltipData.x + 10, (chartContainerRef.current?.clientWidth || 150) - 70),
            top: Math.max(5, tooltipData.y - 30),
          }}
        >
          <div className="text-[#c4f70e] font-bold">{tooltipData.mcap}</div>
          <div className="text-white/40 text-[9px]">Market Cap</div>
        </div>
      )}

      {/* Entry markers overlay - Only show wallets with PFPs */}
      <div className="absolute inset-0 pointer-events-none">
        {markers
          .filter((marker) => marker.pfpUrl)
          .map((marker, idx) => (
            <div
              key={idx}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${marker.pct}%` }}
            >
              <div className="relative">
                <Image
                  src={marker.pfpUrl!}
                  alt={marker.label || "Wallet"}
                  width={22}
                  height={22}
                  className="rounded-full ring-2 ring-[#c4f70e] shadow-lg shadow-[#c4f70e]/30"
                  unoptimized
                />
                {/* Buy/Sell indicator dots */}
                {(marker.buyCount > 1 || marker.sellCount > 0) && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {/* Green dots for buys (max 3) */}
                    {Array.from({ length: Math.min(marker.buyCount, 3) }).map((_, i) => (
                      <div key={`buy-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    ))}
                    {/* Red dots for sells (max 2) */}
                    {Array.from({ length: Math.min(marker.sellCount, 2) }).map((_, i) => (
                      <div key={`sell-${i}`} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    ))}
                  </div>
                )}
              </div>
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

  // Runner = positive performance (uptrending), otherwise disabled/cold
  const isRunner = call.performancePct !== null && call.performancePct > 0;

  return (
    <div className="relative h-full">
      {/* Card content - gradient bg for runners, subtle border for depth */}
      <div
        className="relative rounded-xl overflow-hidden h-full border border-zinc-800/80"
        style={{
          background: isRunner
            ? "linear-gradient(135deg, #000 0%, rgba(0,0,0,0.95) 30%, rgba(34,197,94,0.08) 70%, rgba(196,247,14,0.15) 100%)"
            : "rgba(255,255,255,0.03)"
        }}
      >
        {/* MOBILE LAYOUT */}
        <div className="lg:hidden">
          {/* Top row: Token info (left) + Wallet entries (right) */}
          <div className="flex items-start justify-between p-3 gap-2">
            {/* Left: Token image + name + mcap */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black border border-zinc-700/50 flex-shrink-0">
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
                  <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">
                    {call.symbol.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <a
                    href={chartUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-bold text-sm transition-colors ${isRunner ? "text-white hover:text-[#c4f70e]" : "text-white/60 hover:text-white/80"}`}
                  >
                    {isRunner ? (
                      <ShinyText
                        text={call.symbol}
                        speed={3}
                        color="#ffffff"
                        shineColor="#c4f70e"
                        className="font-bold text-sm"
                      />
                    ) : (
                      call.symbol
                    )}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-2.5 h-2.5 text-[#c4f70e]" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-white/30 hover:text-white/50" />
                    )}
                  </button>
                </div>
                {call.currentMcap && (
                  <span className="text-[10px] font-medium text-white/60">
                    {formatMcap(call.currentMcap)}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Compact wallet entries - horizontal scroll */}
            <div className="flex items-center gap-1 overflow-x-auto flex-shrink min-w-0 max-w-[60%]">
              {call.aggregatedEntries.slice(0, 3).map((entry, idx) => (
                <div
                  key={`${entry.wallet.id}-${idx}`}
                  className="flex items-center gap-1 py-0.5 px-1.5 flex-shrink-0"
                >
                  {/* Crown icon only - no bg */}
                  <Crown className={`w-3 h-3 flex-shrink-0 ${isRunner ? "text-[#c4f70e]" : "text-white/40"}`} />
                  {/* Avg Entry Mcap + Position % */}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-white/60">
                      {formatMcap(entry.avgEntryMcap)}
                    </span>
                    {(entry.positionHeldPct ?? 100) < 100 && (
                      <span className="text-[8px] text-red-400/80">
                        {(entry.positionHeldPct ?? 0).toFixed(0)}% held
                      </span>
                    )}
                  </div>
                  {/* Buy/Sell dots */}
                  <div className="flex gap-0.5 ml-0.5">
                    {Array.from({ length: Math.min(entry.buyCount, 3) }).map((_, i) => (
                      <div key={`b${i}`} className="w-1 h-1 rounded-full bg-green-500" />
                    ))}
                    {Array.from({ length: Math.min(entry.sellCount, 2) }).map((_, i) => (
                      <div key={`s${i}`} className="w-1 h-1 rounded-full bg-red-500" />
                    ))}
                  </div>
                  {/* Separator between items on mobile */}
                  {idx < Math.min(call.aggregatedEntries.length, 3) - 1 && (
                    <div className="w-px h-4 bg-gradient-to-b from-transparent via-white/15 to-transparent ml-1" />
                  )}
                </div>
              ))}
              {call.aggregatedEntries.length > 3 && (
                <span className="text-[9px] text-white/40 flex-shrink-0">+{call.aggregatedEntries.length - 3}</span>
              )}
            </div>
          </div>

          {/* Chart - full width on mobile */}
          <div className={`border-t ${isRunner ? "border-[#c4f70e]/20" : "border-white/5"}`}>
            <div className="w-full h-[100px]">
              <MiniChart
                mint={call.mint}
                aggregatedEntries={call.aggregatedEntries}
                currentMcap={call.currentMcap}
                firstEntryMcap={call.firstEntryMcap}
              />
            </div>
          </div>
        </div>

        {/* DESKTOP LAYOUT - 50/50 split */}
        <div className="hidden lg:flex flex-row h-full min-h-[160px]">
          {/* Left side - 50% */}
          <div className="w-[50%] p-4 flex flex-col justify-between">
            {/* Header row: Image + Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black border border-zinc-700/50">
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
                    <div className="w-full h-full flex items-center justify-center text-white/40 text-base font-bold">
                      {call.symbol.slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={chartUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-bold text-base transition-colors ${isRunner ? "text-white hover:text-[#c4f70e]" : "text-white/60 hover:text-white/80"}`}
                  >
                    {isRunner ? (
                      <ShinyText
                        text={call.symbol}
                        speed={3}
                        color="#ffffff"
                        shineColor="#c4f70e"
                        className="font-bold"
                      />
                    ) : (
                      call.symbol
                    )}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-[#c4f70e]" />
                    ) : (
                      <Copy className="w-3 h-3 text-white/30 hover:text-white/50" />
                    )}
                  </button>
                </div>

                {call.currentMcap && (
                  <span className="text-xs font-medium text-white/80">
                    {formatMcap(call.currentMcap)} mcap
                  </span>
                )}
              </div>
            </div>

            {/* Wallet entries - desktop (aggregated) */}
            <div className="overflow-hidden">
              <div
                className="h-[88px] overflow-y-auto pr-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                }}
              >
                {call.aggregatedEntries.map((entry, idx) => (
                  <div key={`${entry.wallet.id}-${idx}`}>
                    <div className="flex items-center justify-between py-2 px-1">
                      <div className="flex items-center gap-2">
                        {/* Crown icon only - no bg, no circle */}
                        <Crown className={`w-4 h-4 flex-shrink-0 ${isRunner ? "text-[#c4f70e]" : "text-white/40"}`} />
                        {/* Buy/Sell activity indicators */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5 text-green-500" />
                            <span className="text-[9px] text-green-400">{entry.buyCount}</span>
                          </div>
                          {entry.sellCount > 0 && (
                            <div className="flex items-center gap-0.5">
                              <TrendingDown className="w-2.5 h-2.5 text-red-500" />
                              <span className="text-[9px] text-red-400">{entry.sellCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Right side: Avg entry mcap + position held */}
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono text-white/70">
                          {formatMcap(entry.avgEntryMcap)}
                        </span>
                        {/* Position held bar */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(entry.positionHeldPct ?? 0) >= 80 ? "bg-green-500" : (entry.positionHeldPct ?? 0) >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${entry.positionHeldPct ?? 0}%` }}
                            />
                          </div>
                          <span className={`text-[9px] ${(entry.positionHeldPct ?? 0) >= 80 ? "text-green-400" : (entry.positionHeldPct ?? 0) >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                            {(entry.positionHeldPct ?? 0).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Fading horizontal separator - only between items, not after last */}
                    {idx < call.aggregatedEntries.length - 1 && (
                      <div className="h-px mx-2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - 50% - Chart */}
          <div className={`w-[50%] border-l ${isRunner ? "border-[#c4f70e]/20" : "border-white/5"} overflow-hidden`}>
            <div className="w-full h-full min-h-[140px]">
              <MiniChart
                mint={call.mint}
                aggregatedEntries={call.aggregatedEntries}
                currentMcap={call.currentMcap}
                firstEntryMcap={call.firstEntryMcap}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GodWalletCalls() {
  const { godWallets, recentBuys, isLoading } = useGodWallets();
  const [marketData, setMarketData] = useState<Map<string, { mcap: number; price: number; totalSupply: number }>>(new Map());

  // Extract unique mints from recent buys
  const mints = useMemo(() => {
    const uniqueMints = new Set<string>();
    for (const buy of recentBuys) {
      uniqueMints.add(buy.mint);
    }
    return Array.from(uniqueMints);
  }, [recentBuys]);

  // Fetch aggregated wallet entries for all mints from backend
  const aggregatedEntriesMap = useMultipleAggregatedWalletEntries(mints, { godWalletsOnly: true });

  // Group buys by token and attach aggregated entries
  const calls = useMemo(() => {
    const tokenMap = new Map<string, TokenCall>();

    for (const buy of recentBuys) {
      if (!tokenMap.has(buy.mint)) {
        // Get aggregated entries from the backend for this mint
        const aggregatedEntries = aggregatedEntriesMap.get(buy.mint) || [];

        tokenMap.set(buy.mint, {
          mint: buy.mint,
          symbol: buy.symbol,
          imageUrl: buy.imageUrl,
          aggregatedEntries,
          currentMcap: null,
          currentPrice: null,
          performancePct: null,
          firstEntryMcap: null,
        });
      }
    }

    // Convert to array and sort by most recent entry (from aggregated data)
    return Array.from(tokenMap.values()).sort((a, b) => {
      const aTime = a.aggregatedEntries[0] ? new Date(a.aggregatedEntries[0].lastTradeTimestamp).getTime() : 0;
      const bTime = b.aggregatedEntries[0] ? new Date(b.aggregatedEntries[0].lastTradeTimestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [recentBuys, aggregatedEntriesMap]);

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
      if (!data) return call;

      // Get first entry mcap from the aggregated data (oldest wallet's avg entry)
      const oldestEntry = call.aggregatedEntries[call.aggregatedEntries.length - 1];
      const firstEntryMcap = oldestEntry?.avgEntryMcap || null;

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
      };
    });
  }, [calls, marketData]);

  // Sort order state - updates every 7 seconds to reorder runners to top
  const [sortVersion, setSortVersion] = useState(0);

  // Timer effect for periodic sorting
  useEffect(() => {
    const intervalId = setInterval(() => {
      setSortVersion((v) => v + 1);
    }, 7000);

    return () => clearInterval(intervalId);
  }, []);

  // Sorted calls: runners first (sorted by performance desc), then cold items (sorted by recency)
  const sortedCalls = useMemo(() => {
    const items = [...enrichedCalls];

    const runners: typeof items = [];
    const cold: typeof items = [];

    for (const item of items) {
      if (item.performancePct !== null && item.performancePct > 0) {
        runners.push(item);
      } else {
        cold.push(item);
      }
    }

    // Sort runners by performance (highest first)
    runners.sort((a, b) => (b.performancePct ?? 0) - (a.performancePct ?? 0));

    // Sort cold by most recent trade
    cold.sort((a, b) => {
      const aTime = a.aggregatedEntries[0] ? new Date(a.aggregatedEntries[0].lastTradeTimestamp).getTime() : 0;
      const bTime = b.aggregatedEntries[0] ? new Date(b.aggregatedEntries[0].lastTradeTimestamp).getTime() : 0;
      return bTime - aTime;
    });

    return [...runners, ...cold];
  }, [enrichedCalls, sortVersion]);

  if (isLoading) {
    return <GodWalletCallsSkeleton />;
  }

  if (godWallets.length === 0) {
    return (
      <div className="text-center py-12">
        <Crown className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
        <p className="text-base text-white/50">No god wallets configured</p>
      </div>
    );
  }

  if (sortedCalls.length === 0) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Crown className="w-10 h-10 text-[#c4f70e]/40 mx-auto mb-4" />
        </motion.div>
        <p className="text-base text-white/50">Watching for god wallet calls...</p>
        <p className="text-sm text-white/30 mt-2">{godWallets.length} wallets tracked</p>
      </div>
    );
  }

  // Grid of cards - runners first, then cold items
  // Using layout animation for smooth reordering (initial=false prevents jump on first render)
  // Mobile: max 3 items visible (~640px) with scroll, desktop: no limit
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[640px] lg:max-h-none overflow-y-auto lg:overflow-visible pr-1 lg:pr-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <AnimatePresence mode="popLayout" initial={false}>
        {sortedCalls.slice(0, 10).map((call) => (
          <motion.div
            key={call.mint}
            layout
            layoutId={call.mint}
            initial={false}
            transition={{
              layout: { duration: 0.4, ease: "easeInOut" },
            }}
          >
            <CallCard call={call} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
