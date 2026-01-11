"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Wallet, X, TrendingUp, TrendingDown, BarChart3, Clock, Layers, ChevronUp, ChevronDown } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CountUp } from "@/components/animations";
import type { PortfolioWalletProps, TimeFilter, PortfolioStats, WalletView, Position as UiPosition, Transaction } from "./types";
import { useSmartTrading } from "@/features/smart-trading/hooks/useSmartTrading";

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

function formatValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
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

export function PortfolioWallet({ className }: PortfolioWalletProps) {
  const { stats, positions, history, dashboardStats, chartHistory } = useSmartTrading({ refreshIntervalMs: 5000 });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeView, setActiveView] = useState<WalletView>("overview");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24H");

  // Calculate real values
  // Use realWalletBalance if available (even in simulation mode), otherwise fall back to reported balance
  const walletBalance = stats?.realWalletBalance ?? stats?.walletBalance ?? 0;
  const totalExposure = dashboardStats?.trading.totalExposure || 0;
  const unrealizedPnL = dashboardStats?.trading.unrealizedPnL || 0;
  // Total Value = Liquid SOL + Cost Basis of Open Positions + Unrealized PnL
  // (or simpler: Liquid SOL + Current Value of Positions)
  const totalValue = walletBalance + totalExposure + unrealizedPnL;

  // Real PnL values
  const totalPnL = stats?.totalPnL || 0; // realized
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
    winRate: stats?.winRate || 0,
    avgPnL: (dashboardStats?.performance.netPnlSol || 0) / (dashboardStats?.performance.totalTrades || 1), // approx
    topPerformer: null, // TODO: Compute from history
    worstPerformer: null, // TODO: Compute from history
    totalTrades: dashboardStats?.performance.totalTrades || 0,
  };

  // Map API positions to UI positions
  const uiPositions: UiPosition[] = positions.map(p => ({
    id: p.id,
    symbol: p.tokenSymbol || "TOKEN",
    name: p.tokenSymbol || "Unknown Token",
    entryPrice: p.entryPriceSol,
    currentPrice: p.currentPrice || p.entryPriceSol,
    quantity: p.remainingTokens,
    value: p.remainingTokens * (p.currentPrice || p.entryPriceSol),
    pnl: p.unrealizedPnl || 0,
    pnlPercent: p.entryPriceSol > 0 ? ((p.currentPrice || p.entryPriceSol) - p.entryPriceSol) / p.entryPriceSol * 100 : 0,
    entryTime: new Date(p.createdAt),
  }));

  // Map History to Transactions
  // We'll treat closed positions as "SELL" and their entries as "BUY" conceptually,
  // but for now let's just show closed positions as completed trades.
  const transactions: Transaction[] = history.map(p => ({
    id: p.id,
    type: "sell", // Completed trade
    symbol: p.tokenSymbol || "TOKEN",
    price: p.currentPrice || 0, // Exit price ideally
    quantity: p.entryTokens, // Total tokens traded
    value: p.realizedPnlSol + p.entryAmountSol, // Total exit value
    pnl: p.realizedPnlSol,
    pnlPercent: p.entryAmountSol > 0 ? (p.realizedPnlSol / p.entryAmountSol) * 100 : 0,
    timestamp: new Date(p.closedAt || p.updatedAt),
    txHash: p.target1TxSig || p.stopLossTxSig || undefined,
  }));

  const isProfitable = pnlPercent >= 0;
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
    return generateChartData(timeFilter, isProfitable);
  }, [timeFilter, isProfitable, chartHistory]);

  const chartConfig: ChartConfig = {
    value: {
      label: "Portfolio Value",
      color: isProfitable ? "#00ff41" : "#ff3366",
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
              <Wallet className="w-5 h-5" />
            </div>
            <div className="portfolio-wallet-sol-balance">
              {walletBalance.toFixed(2)}
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

      {/* Expanded State */}
      {isExpanded && (
        <div className={`portfolio-wallet expanded ${className || ""}`}>
          <div className="portfolio-wallet-expanded">
            {/* Header */}
            <div className="portfolio-wallet-header">
              <div className="portfolio-wallet-title">
                <Wallet className="w-4 h-4" />
                <span>VIBR WALLET</span>
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
                {/* Total Value */}
                <div className="portfolio-wallet-total">
                  <div className="portfolio-wallet-total-value">
                    {/* formatValue expects $ input, but totalValue is in SOL. Let's assume $150/SOL for now or just show SOL symbol */}
                    {/* Actually current UI mock used dollar values ($12,847). Users expect $. */}
                    {/* We'll approximate USD value for now nicely. */}
                    {formatValue(totalValue * 150)}
                  </div>
                  <div className={`portfolio-wallet-total-pnl ${isProfitable ? "positive" : "negative"}`}>
                    {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{isProfitable ? "+" : ""}{portfolioStats.totalPnLPercent.toFixed(1)}%</span>
                    <span className="portfolio-wallet-period">({timeFilter})</span>
                  </div>
                </div>

                {/* Time Filters */}
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

                {/* Chart */}
                <div className="portfolio-wallet-chart">
                  <ChartContainer config={chartConfig} className="h-[120px] w-full">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isProfitable ? "#00ff41" : "#ff3366"} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={isProfitable ? "#00ff41" : "#ff3366"} stopOpacity={0} />
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
                        stroke={isProfitable ? "#00ff41" : "#ff3366"}
                        strokeWidth={2}
                        fill="url(#portfolioGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: isProfitable ? "#00ff41" : "#ff3366" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                {/* Stats Grid */}
                <div className="portfolio-wallet-stats">
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Win Rate</span>
                    <span className="portfolio-wallet-stat-value text-matrix-green">{portfolioStats.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Avg Trade</span>
                    <span className={`portfolio-wallet-stat-value ${portfolioStats.avgPnL >= 0 ? "text-matrix-green" : "text-terminal-red"}`}>
                      {portfolioStats.avgPnL >= 0 ? "+" : ""}{portfolioStats.avgPnL.toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Best</span>
                    <span className="portfolio-wallet-stat-value text-matrix-green">
                      +{portfolioStats.topPerformer?.pnlPercent || 0}%
                    </span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Trades</span>
                    <span className="portfolio-wallet-stat-value">{portfolioStats.totalTrades}</span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Winners</span>
                    <span className="portfolio-wallet-stat-value text-matrix-green">{portfolioStats.winnersCount}</span>
                  </div>
                  <div className="portfolio-wallet-stat">
                    <span className="portfolio-wallet-stat-label">Losers</span>
                    <span className="portfolio-wallet-stat-value text-terminal-red">{portfolioStats.losersCount}</span>
                  </div>
                </div>
              </>
            )}

            {/* Positions View */}
            {activeView === "positions" && (
              <div className="portfolio-wallet-positions">
                {uiPositions.length === 0 ? (
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
                            <span className="portfolio-wallet-position-ticker">{position.symbol}</span>
                            <span className="portfolio-wallet-position-name">{position.name}</span>
                          </div>
                          <div className={`portfolio-wallet-position-pnl ${position.pnlPercent >= 0 ? "positive" : "negative"}`}>
                            {position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(1)}%
                          </div>
                        </div>
                        <div className="portfolio-wallet-position-details">
                          <div className="portfolio-wallet-position-detail">
                            <span className="label">Value</span>
                            {/* Display value in SOL, then converted to USD approx */}
                            <span className="value">
                              {position.value.toFixed(2)} SOL
                              {/* <span className="text-xs text-white/40 ml-1">(${formatValue(position.value * 150)})</span> */}
                            </span>
                          </div>
                          <div className="portfolio-wallet-position-detail">
                            <span className="label">PnL</span>
                            <span className={`value ${position.pnl >= 0 ? "text-matrix-green" : "text-terminal-red"}`}>
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
                {transactions.length === 0 ? (
                  <div className="portfolio-wallet-empty">
                    <Clock className="w-8 h-8 text-white/20" />
                    <span>No transactions yet</span>
                  </div>
                ) : (
                  <div className="portfolio-wallet-history-list">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="portfolio-wallet-transaction">
                        <div className="portfolio-wallet-transaction-header">
                          <div className={`portfolio-wallet-transaction-type ${tx.type}`}>
                            {tx.type === "buy" ? "BUY" : "SELL"}
                          </div>
                          <span className="portfolio-wallet-transaction-symbol">{tx.symbol}</span>
                          <span className="portfolio-wallet-transaction-time">{formatTimeAgo(tx.timestamp)}</span>
                        </div>
                        <div className="portfolio-wallet-transaction-details">
                          <div className="portfolio-wallet-transaction-value">
                            {/* Value in SOL */}
                            {tx.value.toFixed(2)} SOL
                          </div>
                          {tx.type === "sell" && tx.pnlPercent !== undefined && (
                            <div className={`portfolio-wallet-transaction-pnl ${tx.pnlPercent >= 0 ? "positive" : "negative"}`}>
                              {tx.pnlPercent >= 0 ? "+" : ""}{tx.pnlPercent.toFixed(1)}%
                            </div>
                          )}
                        </div>
                        {tx.txHash && (
                          <div className="portfolio-wallet-transaction-hash">
                            {tx.txHash.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
