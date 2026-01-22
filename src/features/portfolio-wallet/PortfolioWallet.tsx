"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, TrendingUp, TrendingDown, Clock, Layers, ChevronUp, ChevronDown, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CountUp } from "@/components/animations";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import type { PortfolioWalletProps, TimeFilter, PortfolioStats, Position as UiPosition, ChartHistoryEntry } from "./types";
import { useDashboardStats, usePositions, useSmartTradingConfig } from "@/features/smart-trading";
import { useSharedWebSocket } from "@/features/smart-trading/hooks/useWebSocket";

// Generate mock chart data (placeholder until we have historical data API)
function generateChartData(timeFilter: TimeFilter, isProfitable: boolean) {
  const points = timeFilter === "1H" ? 12 : timeFilter === "24H" ? 24 : timeFilter === "1W" ? 7 : timeFilter === "1M" ? 30 : 90;
  const baseValue = 10000;
  const data = [];
  let currentValue = baseValue;

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - (isProfitable ? 0.4 : 0.6)) * 200;
    currentValue = Math.max(currentValue + change, baseValue * 0.5);
    data.push({
      time: i.toString(),
      value: Math.round(currentValue),
    });
  }

  if (isProfitable && data[data.length - 1].value < baseValue) {
    data[data.length - 1].value = baseValue * 1.28;
  } else if (!isProfitable && data[data.length - 1].value > baseValue) {
    data[data.length - 1].value = baseValue * 0.85;
  }

  return data;
}

function formatSolValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  if (value >= 100) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

// Type for on-chain holdings from API (IDENTICAL to PortfolioHoldingsPanel)
interface OnChainHolding {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  entry_price: number;
  entry_time: string;
  entry_sol_value: number;
  initial_quantity: number;
  current_quantity: number;
  current_price: number;
  unrealized_pnl_sol: number;
  unrealized_pnl_pct: number;
  peak_price: number;
  peak_pnl_pct: number;
  realized_pnl_sol: number;
  status: "open" | "partially_closed" | "partiallyclosed" | "closed" | "pending";
  market_cap: number | null;
  liquidity: number | null;
  volume_24h: number | null;
  buy_signature: string | null;
  image_url?: string | null;
}

export function PortfolioWallet({ className }: PortfolioWalletProps) {
  // Use unified WebSocket-first context (live updates!)
  const { dashboardStats } = useDashboardStats();
  const { positions, history } = usePositions();
  const { config } = useSmartTradingConfig();
  const chartHistory: ChartHistoryEntry[] = []; // TODO: Add chartHistory to real-time context

  // Fetch holdings directly like the main dashboard does
  const [fetchedHoldings, setFetchedHoldings] = useState<OnChainHolding[]>([]);
  const [isLoadingHoldingsApi, setIsLoadingHoldingsApi] = useState(false);
  const [holdingsApiError, setHoldingsApiError] = useState<string | null>(null);

  // Market cap cache and API loaded flag (same as PortfolioHoldingsPanel)
  const marketCapCacheRef = useRef<Map<string, number>>(new Map());
  const apiLoadedRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // WebSocket for real-time updates (same as PortfolioHoldingsPanel)
  const { on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });

  const [isExpanded, setIsExpanded] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24H");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [positionSortBy, setPositionSortBy] = useState<"recency" | "pnl">("recency");

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set up portal container on mount
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Calculate real values from dashboardStats.trading
  // Use realWalletBalance if available (even in simulation mode), otherwise fall back to reported balance
  const walletBalance = dashboardStats?.trading.realWalletBalance ?? dashboardStats?.trading.walletBalance ?? 0;
  const totalExposure = dashboardStats?.trading.totalExposure || 0;
  const unrealizedPnL = dashboardStats?.trading.unrealizedPnL || 0;
  // Total Value = Liquid SOL + Cost Basis of Open Positions + Unrealized PnL
  // (or simpler: Liquid SOL + Current Value of Positions)
  const totalValue = walletBalance + totalExposure + unrealizedPnL;

  // Real PnL values from dashboardStats.performance
  const totalPnL = dashboardStats?.performance.netPnlSol || 0; // realized
  // For display, we might want combined realized + unrealized
  const displayPnL = totalPnL + unrealizedPnL;

  // Avoiding division by zero for initial state
  const startingValue = totalValue - displayPnL;
  const pnlPercent = startingValue > 0 ? (displayPnL / startingValue) * 100 : 0;

  // PnL state with auto-refresh animation
  const [displayedPnlPercent, setDisplayedPnlPercent] = useState(pnlPercent);
  const [prevPnlPercent, setPrevPnlPercent] = useState(pnlPercent);
  const [pnlDirection, setPnlDirection] = useState<"up" | "down" | null>(null);
  const [showArrow, setShowArrow] = useState(false);
  const isInitialLoad = useRef(true);
  const [hasInitialAnimated, setHasInitialAnimated] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  // Sync PnL updates
  useEffect(() => {
    if (pnlPercent !== displayedPnlPercent) {
      setPrevPnlPercent(displayedPnlPercent);
      setDisplayedPnlPercent(pnlPercent);
      setPnlDirection(pnlPercent > displayedPnlPercent ? "up" : "down");
      setShowArrow(true);
      setShouldAnimate(true);

      const timer = setTimeout(() => setShowArrow(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [pnlPercent, displayedPnlPercent]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, []);

  // Compute UI Data - Calculate stats from history for consistency with Outcome Pulse
  // The history array comes from /api/analytics/history (same source as Outcome Pulse)
  const calculatedStats = useMemo(() => {
    // Combine positions (open) and history (closed) for full trade data
    const allTrades = [...positions, ...history];
    const closedTrades = history;

    // Calculate win rate from closed trades (same logic as Outcome Pulse)
    const winningTrades = closedTrades.filter(
      p => p.realizedPnlSol > 0
    ).length;
    const losingTrades = closedTrades.length - winningTrades;
    const winRate = closedTrades.length > 0
      ? (winningTrades / closedTrades.length) * 100
      : 0;

    // Calculate total PnL from history
    const totalRealizedPnL = closedTrades.reduce((sum, p) => sum + p.realizedPnlSol, 0);
    const avgPnL = closedTrades.length > 0
      ? totalRealizedPnL / closedTrades.length
      : 0;

    // Find best trade
    const bestTrade = closedTrades.length > 0
      ? closedTrades.reduce((best, p) => {
          const pnlPct = p.entryAmountSol > 0 ? (p.realizedPnlSol / p.entryAmountSol) * 100 : 0;
          const bestPct = best.entryAmountSol > 0 ? (best.realizedPnlSol / best.entryAmountSol) * 100 : 0;
          return pnlPct > bestPct ? p : best;
        })
      : null;

    const bestTradePct = bestTrade && bestTrade.entryAmountSol > 0
      ? (bestTrade.realizedPnlSol / bestTrade.entryAmountSol) * 100
      : 0;

    return {
      totalTrades: allTrades.length,
      winningTrades,
      losingTrades,
      winRate,
      avgPnL,
      bestTradePct,
    };
  }, [positions, history]);

  const portfolioStats: PortfolioStats = {
    totalValue,
    totalPnL: displayPnL,
    totalPnLPercent: pnlPercent,
    winnersCount: calculatedStats.winningTrades,
    losersCount: calculatedStats.losingTrades,
    winRate: calculatedStats.winRate,
    avgPnL: calculatedStats.avgPnL,
    topPerformer: { pnlPercent: calculatedStats.bestTradePct } as PortfolioStats['topPerformer'],
    worstPerformer: null,
    totalTrades: calculatedStats.totalTrades,
  };

  // Map holdings to UI positions - using backend API data (IDENTICAL to PortfolioHoldingsPanel)
  const uiPositions: UiPosition[] = useMemo(() => {
    // Use API holdings (same source as main dashboard's PortfolioHoldingsPanel)
    if (fetchedHoldings.length > 0) {
      return fetchedHoldings.map(h => {
        const pnlSol = h.unrealized_pnl_sol || 0;
        const entrySolValue = typeof h.entry_sol_value === "number" ? h.entry_sol_value : undefined;
        const currentSolValue =
          entrySolValue !== undefined ? entrySolValue + pnlSol : h.current_quantity * h.current_price;
        return ({
        id: h.id,
        mint: h.mint,
        symbol: h.symbol || "TOKEN",
        name: h.name || "Unknown Token",
        entryPrice: h.entry_price,
        currentPrice: h.current_price,
        quantity: h.current_quantity,
        value: currentSolValue,
        pnl: pnlSol,
        pnlPercent: h.unrealized_pnl_pct || 0,
        entryTime: new Date(h.entry_time),
        isValidated: true,
        birdeyeValueUsd: null,
      })});
    }

    // Fallback to context positions - also sort by PnL% to match portfolio panel
    return positions
      .filter(p => p.status === "OPEN" || p.status === "PARTIALLY_CLOSED")
      .map(p => {
        const quantity = p.remainingTokens;
        const currentPrice = p.currentPrice || p.entryPriceSol;
        const pnlPercent = p.entryPriceSol > 0 ? (currentPrice - p.entryPriceSol) / p.entryPriceSol * 100 : 0;

        return {
          id: p.id,
          mint: p.tokenMint,
          symbol: p.tokenSymbol || "TOKEN",
          name: p.tokenSymbol || "Unknown Token",
          entryPrice: p.entryPriceSol,
          currentPrice,
          quantity,
          value: quantity * currentPrice,
          pnl: p.unrealizedPnl || 0,
          pnlPercent,
          entryTime: new Date(p.createdAt),
          isValidated: true,
          birdeyeValueUsd: null,
        };
      })
      // Sort by PnL% descending (same as PortfolioHoldingsPanel)
      .sort((a, b) => b.pnlPercent - a.pnlPercent);
  }, [fetchedHoldings, positions]);

  // Sorted positions based on user selection
  const sortedPositions = useMemo(() => {
    const positionsToSort = [...uiPositions];
    if (positionSortBy === "recency") {
      return positionsToSort.sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime());
    }
    // Sort by PnL (SOL amount)
    return positionsToSort.sort((a, b) => b.pnl - a.pnl);
  }, [uiPositions, positionSortBy]);

  // Calculate total SOL invested in active positions (entry values)
  // This matches PortfolioHoldingsPanel calculation exactly
  const totalActiveExposure = useMemo(() => {
    // Use fetchedHoldings entry_sol_value (same as PortfolioHoldingsPanel)
    if (fetchedHoldings.length > 0) {
      return fetchedHoldings.reduce((sum, h) => sum + (h.entry_sol_value ?? 0), 0);
    }
    // Fallback to uiPositions calculation
    return uiPositions.reduce((sum, p) => {
      const entryValue = p.value - p.pnl;
      return sum + Math.max(0, entryValue);
    }, 0);
  }, [fetchedHoldings, uiPositions]);

  // Total portfolio value = wallet balance + positions entry value
  // This is what should be displayed in the collapsed pill "Total"
  const totalPortfolioValue = walletBalance + totalActiveExposure;

  // Fetch holdings from API (IDENTICAL to PortfolioHoldingsPanel)
  const fetchHoldings = useCallback(async () => {
    if (hasFetchedRef.current && fetchedHoldings.length > 0) return; // Prevent duplicate fetches

    setIsLoadingHoldingsApi(true);
    setHoldingsApiError(null);
    try {
      const url = buildDevprntApiUrl("/api/trading/holdings");
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result?.success === false) {
        throw new Error(result.error || "Failed to load holdings");
      }
      const rawData = (result?.data as OnChainHolding[]) || [];

      // Filter open AND partially_closed positions (handles both spellings like PortfolioHoldingsPanel)
      const data = rawData.filter(
        (h) => (h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0
      );

      // Sort by unrealized PnL percentage (highest profit first) - SAME AS PORTFOLIO PANEL
      data.sort((a, b) => (b.unrealized_pnl_pct ?? 0) - (a.unrealized_pnl_pct ?? 0));

      // Cache market_cap values from API - these are the source of truth
      data.forEach(h => {
        if (h.market_cap && h.market_cap > 0) {
          marketCapCacheRef.current.set(h.mint, h.market_cap);
        }
      });

      apiLoadedRef.current = true;
      hasFetchedRef.current = true;
      setFetchedHoldings(data);
    } catch (err) {
      console.error("Failed to fetch wallet holdings", err);
      setHoldingsApiError(err instanceof Error ? err.message : "Failed to load holdings");
    } finally {
      setIsLoadingHoldingsApi(false);
    }
  }, [fetchedHoldings.length]);

  // Initial fetch on mount
  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Listen for position opened/closed events to refresh holdings list (same as PortfolioHoldingsPanel)
  useEffect(() => {
    const unsubPositionOpened = onTradingEvent("position_opened", () => {
      hasFetchedRef.current = false; // Allow refetch
      fetchHoldings();
    });
    const unsubPositionClosed = onTradingEvent("position_closed", () => {
      hasFetchedRef.current = false;
      fetchHoldings();
    });
    const unsubTakeProfit = onTradingEvent("take_profit_triggered", () => {
      hasFetchedRef.current = false;
      fetchHoldings();
    });

    return () => {
      unsubPositionOpened?.();
      unsubPositionClosed?.();
      unsubTakeProfit?.();
    };
  }, [onTradingEvent, fetchHoldings]);

  // Listen for holdings_snapshot events from backend WebSocket (IDENTICAL to PortfolioHoldingsPanel)
  useEffect(() => {
    const unsubHoldingsSnapshot = onTradingEvent<{
      holdings: OnChainHolding[];
      total_unrealized_pnl_sol: number;
      total_realized_pnl_sol: number;
      open_position_count: number;
      timestamp: number;
    }>("holdings_snapshot", (data) => {
      if (!data?.holdings) return;

      // Skip WebSocket updates until API has loaded initial data with market_cap
      if (!apiLoadedRef.current) return;

      // Filter holdings from WebSocket (handles both spellings)
      const wsHoldings = data.holdings
        .filter((h) => (h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0);

      // Apply cached market_cap to all WebSocket holdings before processing
      const wsHoldingsWithCachedMcap = wsHoldings.map(h => {
        const cachedMcap = marketCapCacheRef.current.get(h.mint);
        const finalMcap = (h.market_cap && h.market_cap > 0) ? h.market_cap : cachedMcap ?? null;

        // Update cache if WS has valid market_cap
        if (h.market_cap && h.market_cap > 0) {
          marketCapCacheRef.current.set(h.mint, h.market_cap);
        }

        return {
          ...h,
          market_cap: finalMcap,
        };
      });

      setFetchedHoldings((prevHoldings) => {
        // If we have no previous holdings, use WebSocket data
        if (prevHoldings.length === 0) {
          wsHoldingsWithCachedMcap.sort((a, b) => (b.unrealized_pnl_pct ?? 0) - (a.unrealized_pnl_pct ?? 0));
          return wsHoldingsWithCachedMcap;
        }

        // Strategy: Update existing holdings with WebSocket data, preserve holdings not in WebSocket
        const wsHoldingsMap = new Map(wsHoldingsWithCachedMcap.map(h => [h.mint, h]));

        // Update existing holdings with fresh WebSocket data where available
        const updatedHoldings = prevHoldings.map(prevH => {
          const wsHolding = wsHoldingsMap.get(prevH.mint);
          if (wsHolding) {
            const finalMcap = (wsHolding.market_cap && wsHolding.market_cap > 0)
              ? wsHolding.market_cap
              : (prevH.market_cap && prevH.market_cap > 0)
                ? prevH.market_cap
                : null;

            return {
              ...wsHolding,
              market_cap: finalMcap,
              liquidity: (wsHolding.liquidity && wsHolding.liquidity > 0) ? wsHolding.liquidity : prevH.liquidity,
              volume_24h: (wsHolding.volume_24h && wsHolding.volume_24h > 0) ? wsHolding.volume_24h : prevH.volume_24h,
            };
          }
          return prevH;
        });

        // Add any NEW holdings from WebSocket that weren't in previous state
        const existingMints = new Set(prevHoldings.map(h => h.mint));
        const newHoldings = wsHoldingsWithCachedMcap.filter(h => !existingMints.has(h.mint));
        if (newHoldings.length > 0) {
          updatedHoldings.push(...newHoldings);
          updatedHoldings.sort((a, b) => (b.unrealized_pnl_pct ?? 0) - (a.unrealized_pnl_pct ?? 0));
        }

        // Deduplicate by mint address
        const seenMints = new Set<string>();
        const deduped = updatedHoldings.filter(h => {
          if (seenMints.has(h.mint)) return false;
          seenMints.add(h.mint);
          return true;
        });

        return deduped;
      });

      setIsLoadingHoldingsApi(false);
      setHoldingsApiError(null);
    });

    return () => {
      unsubHoldingsSnapshot?.();
    };
  }, [onTradingEvent]);

  const isProfitable = pnlPercent >= 0;

  // Generate mock chart data only once per timeFilter change (not on every isProfitable change)
  // This prevents the chart from constantly re-rendering during initial data loading
  const mockChartDataRef = useRef<{ filter: TimeFilter; data: { time: string; value: number }[] } | null>(null);

  const chartData = useMemo(() => {
    if (chartHistory && chartHistory.length > 0) {
      let filteredHistory = chartHistory;
      const now = new Date().getTime();
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * 60 * 60 * 1000;

      if (timeFilter === "1H") {
        filteredHistory = chartHistory.filter(s => now - new Date(s.timestamp).getTime() < oneHour);
      } else if (timeFilter === "24H") {
        filteredHistory = chartHistory.filter(s => now - new Date(s.timestamp).getTime() < oneDay);
      }
      // For 1W, 1M, we might not have data yet, but logic is fine.

      if (filteredHistory.length > 0) {
        return filteredHistory.map(s => ({
          time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: s.totalValueSol * 150 // Approximate USD conversion
        }));
      }
    }

    // Use cached mock data if timeFilter hasn't changed (prevents re-randomizing on every render)
    if (mockChartDataRef.current && mockChartDataRef.current.filter === timeFilter) {
      return mockChartDataRef.current.data;
    }

    // Generate new mock data only when timeFilter changes
    const newMockData = generateChartData(timeFilter, isProfitable);
    mockChartDataRef.current = { filter: timeFilter, data: newMockData };
    return newMockData;
  }, [timeFilter, chartHistory]); // Removed isProfitable from deps - color is handled separately

  const chartConfig: ChartConfig = {
    value: {
      label: "Portfolio Value",
      color: isProfitable ? "#c4f70e" : "#ff3366",
    },
  };

  return (
    <>
      {/* Collapsed State - PUMP.FUN PILL Style */}
      {!isExpanded && (
        <div className={`portfolio-wallet collapsed variant-pump ${className || ""}`}>
          <button
            onClick={() => setIsExpanded(true)}
            className="portfolio-wallet-collapsed"
          >
            <div className="portfolio-wallet-icon">
              <Image
                src="/assets/wallet.png"
                alt="Wallet"
                width={28}
                height={28}
                className="portfolio-wallet-icon-img"
              />
            </div>
            <div className="portfolio-wallet-sol-balance">
              <CountUp
                from={0}
                to={walletBalance}
                duration={1.5}
                decimals={2}
              />
              <Image
                src="/logos/solana.png"
                alt="SOL"
                width={16}
                height={16}
                className="portfolio-wallet-sol-logo"
              />
            </div>
            <div className="portfolio-wallet-total-pill">
              <span className="text-[10px] text-white/50 mr-1">Total:</span>
              <CountUp
                from={0}
                to={totalPortfolioValue}
                duration={1.5}
                decimals={2}
                className="text-white font-bold"
              />
              <Image
                src="/logos/solana.png"
                alt="SOL"
                width={12}
                height={12}
                className="ml-0.5 opacity-70"
              />
            </div>
          </button>
        </div>
      )}

      {/* Expanded State - Rendered via Portal to ensure proper z-index stacking */}
      {isExpanded && portalContainer && createPortal(
        <>
          {/* Backdrop overlay - darkens/blurs the background */}
          <div
            className="portfolio-wallet-backdrop"
            onClick={() => setIsExpanded(false)}
            aria-hidden="true"
          />
          <div className={`portfolio-wallet expanded ${className || ""}`}>
            <div className="portfolio-wallet-expanded">
            {/* Header */}
            <div className="portfolio-wallet-header">
              <div className="portfolio-wallet-title">
                <Image
                  src="/assets/wallet.png"
                  alt="Wallet"
                  width={20}
                  height={20}
                />
                <span className="text-base font-bold tracking-wide font-mono">DwFk...jrB</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="portfolio-wallet-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Content */}
            {(
              <>
                {/* SOL Balance Section - Horizontal layout */}
                <div className="portfolio-wallet-total">
                  <div className="portfolio-wallet-total-value">
                    <span className="tabular-nums">{formatSolValue(walletBalance)}</span>
                    <Image src="/logos/solana.png" alt="SOL" width={24} height={24} className="inline-block ml-2" />
                  </div>
                  {/* Active Positions - vertical layout: label on top, value below */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">In Active Positions</span>
                    <span className="text-white font-bold tabular-nums">
                      {formatSolValue(totalActiveExposure)} SOL
                      <span className="text-white/40 font-normal ml-1 text-xs">({sortedPositions.length})</span>
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <div className="portfolio-wallet-chart">
                  <ChartContainer config={chartConfig} className="h-[100px] w-full">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isProfitable ? "#c4f70e" : "#ff3366"} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={isProfitable ? "#c4f70e" : "#ff3366"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]}
                            hideLabel
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={isProfitable ? "#c4f70e" : "#ff3366"}
                        strokeWidth={2}
                        fill="url(#portfolioGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: isProfitable ? "#c4f70e" : "#ff3366" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                {/* Positions Header with Sort */}
                <div className="flex items-center justify-between pt-3 pb-2 border-t border-white/10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Active Positions</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPositionSortBy("recency")}
                      className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                        positionSortBy === "recency"
                          ? "bg-[#c4f70e]/20 text-[#c4f70e]"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      Recent
                    </button>
                    <button
                      onClick={() => setPositionSortBy("pnl")}
                      className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                        positionSortBy === "pnl"
                          ? "bg-[#c4f70e]/20 text-[#c4f70e]"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      PnL
                    </button>
                  </div>
                </div>

                {/* Positions List - Outcome Pulse Style */}
                <div className="portfolio-wallet-positions-list space-y-3 max-h-[320px] overflow-y-auto pr-1 pb-2">
                  {sortedPositions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-white/30">
                      <Layers className="w-8 h-8 mb-2" />
                      <span className="text-xs">No active positions</span>
                    </div>
                  ) : (
                    sortedPositions.map((position) => {
                      const isProfit = position.pnl >= 0;
                      const multiplier = (position.pnlPercent / 100) + 1;
                      const holdTimeMinutes = Math.round((Date.now() - position.entryTime.getTime()) / (1000 * 60));
                      const entryValue = position.value - position.pnl; // Calculate entry value

                      return (
                        <div
                          key={position.id}
                          className="relative overflow-visible p-4 rounded-xl bg-gradient-to-br from-black to-zinc-900/80 border border-white/10 transition-all duration-300 hover:border-white/20 group cursor-pointer"
                        >
                          {/* Header: Token + PnL + Multiplier */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Image
                                src={`https://dd.dexscreener.com/ds-data/tokens/solana/${position.mint}.png`}
                                alt={position.symbol}
                                width={40}
                                height={40}
                                className="rounded-lg flex-shrink-0"
                                unoptimized
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">${position.symbol}</span>
                                  <span className="flex items-center gap-0.5 text-[10px] text-white/40 flex-shrink-0">
                                    <Clock className="w-3 h-3" />
                                    {holdTimeMinutes < 60
                                      ? `${holdTimeMinutes}m`
                                      : holdTimeMinutes < 1440
                                      ? `${Math.round(holdTimeMinutes / 60)}h`
                                      : `${Math.round(holdTimeMinutes / 1440)}d`}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/40 truncate max-w-[120px]">{position.name}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                              <span className={`text-sm font-bold tabular-nums ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {isProfit ? "+" : ""}{position.pnl.toFixed(3)}
                              </span>
                              <span className={`text-lg font-bold tabular-nums ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {multiplier.toFixed(2)}X
                              </span>
                            </div>
                          </div>

                          {/* Entry → Current Value Row */}
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <ArrowDownRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              <span className="text-white/50 tabular-nums">{Math.max(0, entryValue).toFixed(3)}</span>
                            </div>
                            <span className="text-white/30">→</span>
                            <div className="flex items-center gap-1.5">
                              <ArrowUpRight className={`w-3.5 h-3.5 flex-shrink-0 ${isProfit ? "text-emerald-400" : "text-red-400"}`} />
                              <span className={`font-medium tabular-nums ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {Math.max(0, position.value).toFixed(3)}
                              </span>
                            </div>
                            <div className="flex-1" />
                            <span className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400/80 flex-shrink-0">
                              Open
                            </span>
                          </div>

                          {/* Hover shine */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none rounded-xl" />
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            </div>
          </div>
        </>,
        portalContainer
      )}
    </>
  );
}
