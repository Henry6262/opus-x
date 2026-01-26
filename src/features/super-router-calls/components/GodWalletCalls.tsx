"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Copy, Check, Sparkles } from "lucide-react";
import { createChart, LineSeries, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { useGodWallets } from "../hooks/useGodWallets";
import type { GodWalletBuy } from "../types";
import ShinyText from "@/components/ShinyText";
import GradientText from "@/components/GradientText";

// Market data cache
const marketDataCache = new Map<string, { mcap: number; price: number; priceChange24h: number; totalSupply: number }>();

interface WalletAggregatedEntry {
  wallet: {
    id: string;
    label: string | null;
    pfpUrl: string | null;
    address: string;
  };
  buyCount: number;
  totalSolInvested: number;
  totalUsdInvested: number;
  avgEntryMcap: number | null; // Weighted average by SOL invested
  avgEntryPricePerToken: number; // Weighted average
  positionHeld: number; // 0-100% (100 for now since we don't track sells)
  firstBuyTimestamp: string;
  lastBuyTimestamp: string;
}

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
    amountSol: number;
    positionHeld: number; // 0-100%
    timestamp: string;
  }>;
  // Aggregated entries per wallet
  aggregatedEntries: WalletAggregatedEntry[];
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

    // Add line series - Brand green for runners, muted for cold
    const isPositive = currentMcap >= startMcap;
    const lineSeries = chart.addSeries(LineSeries, {
      color: isPositive ? "#c4f70e" : "rgba(255, 255, 255, 0.3)",
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
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 120,
        });
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
    return <div className="h-full min-h-[120px] bg-white/[0.02]" />;
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
    <div className="relative h-full min-h-[120px]">
      <div ref={chartContainerRef} className="h-full" />
      {/* Entry markers overlay - Wallet PFPs with brand green */}
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
                width={22}
                height={22}
                className="rounded-full ring-2 ring-[#c4f70e] shadow-lg shadow-[#c4f70e]/30"
                unoptimized
              />
            ) : (
              <div className="w-[22px] h-[22px] rounded-full bg-[#c4f70e]/20 ring-2 ring-[#c4f70e] shadow-lg shadow-[#c4f70e]/30 flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-[#c4f70e]" />
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
  const [isHovered, setIsHovered] = useState(false);

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: isRunner ? 1.01 : 1.005 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group h-full"
    >
      {/* Border - Animated gradient for runners, muted for disabled */}
      <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
        {isRunner ? (
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, #c4f70e, #22c55e, #c4f70e)",
              backgroundSize: "200% 100%",
            }}
            animate={{
              backgroundPosition: isHovered ? ["0% 50%", "100% 50%", "0% 50%"] : "0% 50%",
            }}
            transition={{
              duration: 2,
              repeat: isHovered ? Infinity : 0,
              ease: "linear",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-white/10" />
        )}
      </div>

      {/* Glow effect - only for runners */}
      {isRunner && (
        <motion.div
          className="absolute -inset-2 rounded-xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
          style={{ background: "radial-gradient(circle at center, #c4f70e, transparent 70%)" }}
        />
      )}

      {/* Card content */}
      <div className="relative rounded-xl bg-black overflow-hidden h-full">
        {/* Main content - 50/50 split, fixed height for consistency */}
        <div className="flex flex-col lg:flex-row h-full lg:min-h-[160px]">
          {/* Left side - 50% */}
          <div className="lg:w-[50%] p-4 flex flex-col justify-between">
            {/* Header row: Image + Title */}
            <div className="flex items-center gap-3 mb-3">
              {/* Token image */}
              <div className="relative flex-shrink-0">
                {isRunner && (
                  <div className="absolute -inset-1 rounded-xl blur-md opacity-60 bg-[#c4f70e]" />
                )}
                <div className={`relative w-11 h-11 rounded-xl overflow-hidden bg-black border ${isRunner ? "border-[#c4f70e]/50" : "border-white/10"}`}>
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
              </div>

              {/* Title + Performance */}
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
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-[#c4f70e]" />
                    ) : (
                      <Copy className="w-3 h-3 text-white/30 hover:text-white/50" />
                    )}
                  </button>
                </div>

                {/* Performance */}
                {call.performancePct !== null && (
                  isRunner ? (
                    <GradientText
                      colors={["#c4f70e", "#22c55e", "#c4f70e"]}
                      animationSpeed={3}
                      className="text-xs font-bold"
                    >
                      +{call.performancePct.toFixed(0)}%
                    </GradientText>
                  ) : (
                    <span className="text-xs font-medium text-white/40">
                      {call.performancePct >= 0 ? "+" : ""}{call.performancePct.toFixed(0)}%
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Wallet entries - fixed height for 2 entries, scrollable */}
            <div className="overflow-hidden">
              <div
                className="space-y-1.5 h-[72px] overflow-y-auto pr-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                }}
              >
                {call.entries.map((entry, idx) => (
                  <div
                    key={`${entry.wallet.id}-${idx}`}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {entry.wallet.pfpUrl ? (
                        <Image
                          src={entry.wallet.pfpUrl}
                          alt={entry.wallet.label || "Wallet"}
                          width={22}
                          height={22}
                          className={`rounded-full ring-1 ${isRunner ? "ring-[#c4f70e]/50" : "ring-white/20"}`}
                          unoptimized
                        />
                      ) : (
                        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center ${isRunner ? "bg-[#c4f70e]/20 ring-1 ring-[#c4f70e]/50" : "bg-white/10 ring-1 ring-white/20"}`}>
                          <Crown className={`w-2.5 h-2.5 ${isRunner ? "text-[#c4f70e]" : "text-white/40"}`} />
                        </div>
                      )}
                      <span className="text-white/70 text-sm font-medium truncate max-w-[80px]">
                        {entry.wallet.label || `${entry.wallet.address.slice(0, 4)}...`}
                      </span>
                    </div>
                    <span className="text-white/40 text-xs font-mono">
                      @{entry.entryMcap ? formatMcap(entry.entryMcap) : formatAmount(entry.amountUsd)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - 50% - Chart */}
          <div className={`lg:w-[50%] border-t lg:border-t-0 lg:border-l ${isRunner ? "border-[#c4f70e]/20" : "border-white/5"} overflow-hidden`}>
            <div className="w-full h-[120px] lg:h-full lg:min-h-[140px]">
              <MiniChart
                mint={call.mint}
                entries={call.entries}
                currentMcap={call.currentMcap}
                firstEntryMcap={call.firstEntryMcap}
              />
            </div>
          </div>
        </div>
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

  // Sort order state - updates every 7 seconds to reorder runners to top
  const [sortVersion, setSortVersion] = useState(0);

  // Timer effect for periodic sorting - clean interval to prevent memory leaks
  useEffect(() => {
    const intervalId = setInterval(() => {
      setSortVersion((v) => v + 1);
    }, 7000);

    return () => clearInterval(intervalId);
  }, []);

  // Sorted calls: runners first (sorted by performance desc), then cold items (sorted by recency)
  const sortedCalls = useMemo(() => {
    // Create a shallow copy to avoid mutating the original
    const items = [...enrichedCalls];

    // Separate runners from cold items
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

    // Sort cold by most recent entry
    cold.sort((a, b) => {
      const aTime = a.entries[0] ? new Date(a.entries[0].timestamp).getTime() : 0;
      const bTime = b.entries[0] ? new Date(b.entries[0].timestamp).getTime() : 0;
      return bTime - aTime;
    });

    // Runners first, then cold
    return [...runners, ...cold];
  }, [enrichedCalls, sortVersion]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full"
        />
      </div>
    );
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
  // Using layout animation for smooth reordering
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {sortedCalls.slice(0, 10).map((call) => (
          <motion.div
            key={call.mint}
            layout
            layoutId={call.mint}
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
