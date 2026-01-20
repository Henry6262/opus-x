"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, TrendingUp, TrendingDown, BarChart3, Clock, Layers, ChevronUp, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CountUp } from "@/components/animations";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import type { PortfolioWalletProps, TimeFilter, PortfolioStats, WalletView, Position as UiPosition, Transaction, ChartHistoryEntry } from "./types";
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

function formatTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const [fetchedTransactions, setFetchedTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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
  const [activeView, setActiveView] = useState<WalletView>("overview");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24H");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Compute UI Data
  const portfolioStats: PortfolioStats = {
    totalValue,
    totalPnL: displayPnL,
    totalPnLPercent: pnlPercent,
    winnersCount: dashboardStats?.performance.winningTrades || 0,
    losersCount: dashboardStats?.performance.losingTrades || 0,
    winRate: dashboardStats?.performance.winRate || 0,
    avgPnL: (dashboardStats?.performance.netPnlSol || 0) / (dashboardStats?.performance.totalTrades || 1), // approx
    topPerformer: null, // TODO: Compute from history
    worstPerformer: null, // TODO: Compute from history
    totalTrades: dashboardStats?.performance.totalTrades || 0,
  };

  // Map holdings to UI positions - using backend API data (IDENTICAL to PortfolioHoldingsPanel)
  const uiPositions: UiPosition[] = useMemo(() => {
    // Use API holdings (same source as main dashboard's PortfolioHoldingsPanel)
    if (fetchedHoldings.length > 0) {
      return fetchedHoldings.map(h => ({
        id: h.id,
        mint: h.mint,
        symbol: h.symbol || "TOKEN",
        name: h.name || "Unknown Token",
        entryPrice: h.entry_price,
        currentPrice: h.current_price,
        quantity: h.current_quantity,
        value: h.current_quantity * h.current_price,
        pnl: h.unrealized_pnl_sol || 0,
        pnlPercent: h.unrealized_pnl_pct || 0,
        entryTime: new Date(h.entry_time),
        isValidated: true,
        birdeyeValueUsd: null,
      }));
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

  type EnrichedTransaction = {
    id: string;
    tx_type: "buy" | "sell";
    signature: string;
    mint: string;
    ticker: string;
    token_name: string;
    sol_amount?: number;
    tokens_received?: number;
    tokens_sold?: number;
    sol_received?: number;
    price: number;
    timestamp: string;
    current_price?: number;
  };

  const mapHistoryToTransactions = useMemo(
    () =>
      history.map((p) => ({
        id: p.id,
        mint: p.tokenMint,
        type: "sell" as const,
        symbol: p.tokenSymbol || "TOKEN",
        price: p.currentPrice || p.entryPriceSol || 0,
        quantity: p.entryTokens,
        value: p.realizedPnlSol + p.entryAmountSol,
        pnl: p.realizedPnlSol,
        pnlPercent: p.entryAmountSol > 0 ? (p.realizedPnlSol / p.entryAmountSol) * 100 : 0,
        timestamp: new Date(p.closedAt || p.updatedAt),
        txHash: p.target1TxSig || p.stopLossTxSig || undefined,
      })),
    [history]
  );

  const mapEnrichedTransaction = useCallback((tx: EnrichedTransaction): Transaction => {
    const value = tx.tx_type === "buy" ? tx.sol_amount ?? 0 : tx.sol_received ?? 0;
    const quantity = tx.tx_type === "buy" ? tx.tokens_received ?? 0 : tx.tokens_sold ?? 0;
    const pnlPercent =
      tx.current_price && tx.price
        ? ((tx.current_price / tx.price - 1) * 100)
        : undefined;

    return {
      id: tx.id || tx.signature,
      mint: tx.mint,
      type: tx.tx_type,
      symbol: tx.ticker || tx.token_name || tx.mint?.slice(0, 4) || "TOKEN",
      price: tx.price || 0,
      quantity,
      value,
      pnlPercent,
      timestamp: new Date(tx.timestamp),
      txHash: tx.signature,
    };
  }, []);

  // Fetch transactions from API (same as main dashboard's TransactionsPanel)
  useEffect(() => {
    let cancelled = false;

    const fetchTransactions = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const url = buildDevprntApiUrl("/api/trading/transactions?limit=25");
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const items: EnrichedTransaction[] = Array.isArray(result.data) ? result.data : [];
        if (!cancelled) {
          setFetchedTransactions(items.map(mapEnrichedTransaction));
        }
      } catch (err) {
        console.error("Failed to fetch wallet transaction history", err);
        if (!cancelled) {
          setHistoryError(err instanceof Error ? err.message : "Failed to load transactions");
        }
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };

    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, [mapEnrichedTransaction]);

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

  const transactions: Transaction[] =
    fetchedTransactions.length > 0 ? fetchedTransactions : mapHistoryToTransactions;

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
            <div className={`portfolio-wallet-pnl-animated ${isProfitable ? "positive" : "negative"}`}>
              <CountUp
                from={!hasInitialAnimated ? 0 : shouldAnimate ? prevPnlPercent : displayedPnlPercent}
                to={displayedPnlPercent}
                duration={!hasInitialAnimated ? 1.2 : shouldAnimate ? 1.2 : 0}
                prefix={isProfitable ? "+" : ""}
                suffix="%"
                decimals={2}
                className="portfolio-wallet-pnl-value"
                onEnd={() => {
                  if (!hasInitialAnimated) setHasInitialAnimated(true);
                  if (shouldAnimate) setShouldAnimate(false);
                }}
              />
              {showArrow && pnlDirection && (
                <span className={`portfolio-wallet-pnl-arrow ${pnlDirection}`}>
                  {pnlDirection === "up" ? (
                    <ChevronUp className="w-2.5 h-2.5" />
                  ) : (
                    <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </span>
              )}
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

            {/* View Tabs */}
            <div className="portfolio-wallet-tabs">
              <button
                onClick={() => setActiveView("overview")}
                className={`portfolio-wallet-tab ${activeView === "overview" ? "active" : ""}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveView("positions")}
                className={`portfolio-wallet-tab ${activeView === "positions" ? "active" : ""}`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Positions</span>
                <span className="portfolio-wallet-tab-count">{uiPositions.length}</span>
              </button>
              <button
                onClick={() => setActiveView("history")}
                className={`portfolio-wallet-tab ${activeView === "history" ? "active" : ""}`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>

            {/* Overview View */}
            {activeView === "overview" && (
              <>
                {/* Total Value in SOL */}
                <div className="portfolio-wallet-total">
                  <div className="portfolio-wallet-total-value">
                    <span className="tabular-nums">{formatSolValue(totalValue)}</span>
                    <Image src="/logos/solana.png" alt="SOL" width={24} height={24} className="inline-block ml-2" />
                  </div>
                  <div className={`portfolio-wallet-total-pnl ${isProfitable ? "positive" : "negative"}`}>
                    {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{isProfitable ? "+" : ""}{portfolioStats.totalPnLPercent.toFixed(1)}%</span>
                    <span className="portfolio-wallet-period">({timeFilter})</span>
                  </div>
                </div>

                {/* Time Filters - Dropdown on mobile, buttons on desktop */}
                {isMobile ? (
                  <div className="portfolio-wallet-filters-mobile">
                    <button
                      onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
                      className="portfolio-wallet-filter-dropdown"
                    >
                      <span>{timeFilter}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isTimeFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isTimeFilterOpen && (
                      <div className="portfolio-wallet-filter-dropdown-menu">
                        {(["1H", "24H", "1W", "1M", "ALL"] as TimeFilter[]).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setTimeFilter(filter);
                              setIsTimeFilterOpen(false);
                            }}
                            className={`portfolio-wallet-filter-dropdown-item ${timeFilter === filter ? "active" : ""}`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="portfolio-wallet-filters">
                    {(["1H", "24H", "1W", "1M", "ALL"] as TimeFilter[]).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        className={`portfolio-wallet-filter ${timeFilter === filter ? "active" : ""}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chart */}
                <div className="portfolio-wallet-chart">
                  <ChartContainer config={chartConfig} className="h-[120px] w-full">
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

                {/* Stats Grid */}
                <div className="portfolio-wallet-stats">
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Win Rate</span>
                    <span className="portfolio-wallet-stat-value tabular-nums text-matrix-green">{portfolioStats.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Avg Trade</span>
                    <span className={`portfolio-wallet-stat-value tabular-nums ${portfolioStats.avgPnL >= 0 ? "text-matrix-green" : "text-terminal-red"}`}>
                      {portfolioStats.avgPnL >= 0 ? "+" : ""}{portfolioStats.avgPnL.toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Best</span>
                    <span className="portfolio-wallet-stat-value tabular-nums text-matrix-green">
                      +{portfolioStats.topPerformer?.pnlPercent || 0}%
                    </span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Trades</span>
                    <span className="portfolio-wallet-stat-value tabular-nums">{portfolioStats.totalTrades}</span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Winners</span>
                    <span className="portfolio-wallet-stat-value tabular-nums text-matrix-green">{portfolioStats.winnersCount}</span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Losers</span>
                    <span className="portfolio-wallet-stat-value tabular-nums text-terminal-red">{portfolioStats.losersCount}</span>
                  </div>
                </div>
              </>
            )}

            {/* Positions View */}
            {activeView === "positions" && (
              <div className="portfolio-wallet-positions">
                {isLoadingHoldingsApi && uiPositions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <Layers className="w-8 h-8 text-white/20 animate-pulse" />
                    <span>Loading positions...</span>
                  </div>
                ) : holdingsApiError && uiPositions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <AlertCircle className="w-8 h-8 text-red-400/60" />
                    <span className="text-red-400/80">{holdingsApiError}</span>
                  </div>
                ) : uiPositions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <Layers className="w-8 h-8 text-white/20" />
                    <span>No active positions</span>
                  </div>
                ) : (
                  <div className="portfolio-wallet-positions-list">
                    {uiPositions.map((position) => (
                      <div key={position.id} className="portfolio-wallet-position">
                        <div className="portfolio-wallet-position-header">
                          <div className="portfolio-wallet-position-symbol">
                            <Image
                              src={`https://dd.dexscreener.com/ds-data/tokens/solana/${position.mint}.png`}
                              alt={position.symbol}
                              width={28}
                              height={28}
                              className="rounded-lg flex-shrink-0"
                              unoptimized
                            />
                            <div className="flex flex-col">
                              <span className="portfolio-wallet-position-ticker">{position.symbol}</span>
                              <span className="portfolio-wallet-position-name text-[10px] text-white/40">{position.name}</span>
                            </div>
                          </div>
                          <div className={`portfolio-wallet-position-pnl tabular-nums min-w-[4ch] ${position.pnlPercent >= 0 ? "positive" : "negative"}`}>
                            {position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(0)}%
                          </div>
                        </div>
                        <div className="portfolio-wallet-position-details">
                          <div className="portfolio-wallet-position-detail">
                            <span className="label">Value</span>
                            <span className="value tabular-nums">
                              {position.value.toFixed(2)} SOL
                            </span>
                          </div>
                          <div className="portfolio-wallet-position-detail">
                            <span className="label">PnL</span>
                            <span className={`value tabular-nums ${position.pnl >= 0 ? "text-matrix-green" : "text-terminal-red"}`}>
                              {position.pnl >= 0 ? "+" : ""}{position.pnl.toFixed(4)} SOL
                            </span>
                          </div>
                          <div className="portfolio-wallet-position-detail">
                            <span className="label">Entry</span>
                            <span className="value text-white/50">{formatTimeAgo(position.entryTime)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History View */}
            {activeView === "history" && (
              <div className="portfolio-wallet-history">
                {isLoadingHistory && transactions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <Clock className="w-8 h-8 text-white/20 animate-pulse" />
                    <span>Loading history...</span>
                  </div>
                ) : historyError && transactions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <AlertCircle className="w-8 h-8 text-red-400/60" />
                    <span className="text-red-400/80">{historyError}</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <Clock className="w-8 h-8 text-white/20" />
                    <span>No transactions yet</span>
                  </div>
                ) : (
                  <div className="portfolio-wallet-history-list">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="portfolio-wallet-transaction">
                        <div className="portfolio-wallet-transaction-header">
                          {tx.mint && (
                            <Image
                              src={`https://dd.dexscreener.com/ds-data/tokens/solana/${tx.mint}.png`}
                              alt={tx.symbol}
                              width={24}
                              height={24}
                              className="rounded-md flex-shrink-0"
                              unoptimized
                            />
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="portfolio-wallet-transaction-symbol font-semibold">{tx.symbol}</span>
                              <div className={`portfolio-wallet-transaction-type ${tx.type}`}>
                                {tx.type === "buy" ? "BUY" : "SELL"}
                              </div>
                            </div>
                            <span className="portfolio-wallet-transaction-time text-[10px]">{formatTimeAgo(tx.timestamp)}</span>
                          </div>
                          {tx.pnlPercent !== undefined && (
                            <div className={`portfolio-wallet-transaction-pnl tabular-nums min-w-[4ch] ${tx.pnlPercent >= 0 ? "positive" : "negative"}`}>
                              {tx.pnlPercent >= 0 ? "+" : ""}{tx.pnlPercent.toFixed(0)}%
                            </div>
                          )}
                        </div>
                        <div className="portfolio-wallet-transaction-details">
                          <div className="portfolio-wallet-transaction-value tabular-nums">
                            {tx.value.toFixed(2)} SOL
                          </div>
                          {tx.txHash && (
                            <a
                              href={`https://solscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="portfolio-wallet-transaction-hash hover:text-[#c4f70e] transition-colors"
                            >
                              {tx.txHash.substring(0, 6)}...
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </>,
        portalContainer
      )}
    </>
  );
}
