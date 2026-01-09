"use client";

import { useState, useMemo } from "react";
import { Wallet, X, TrendingUp, TrendingDown, BarChart3, Clock, Layers } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { PortfolioWalletProps, TimeFilter, PortfolioStats, WalletView, Position, Transaction } from "./types";

// Mock data for now - will wire up real hook later
const mockStats: PortfolioStats = {
  totalValue: 12847.32,
  totalPnL: 2847.32,
  totalPnLPercent: 28.4,
  winnersCount: 18,
  losersCount: 6,
  winRate: 75,
  avgPnL: 8.3,
  topPerformer: { symbol: "PEPE", pnlPercent: 142 },
  worstPerformer: { symbol: "DOGE", pnlPercent: -24 },
  totalTrades: 24,
};

// Mock positions data
const mockPositions: Position[] = [
  {
    id: "1",
    symbol: "PEPE",
    name: "Pepe Token",
    entryPrice: 0.0000082,
    currentPrice: 0.0000198,
    quantity: 125000000,
    value: 2475,
    pnl: 1450,
    pnlPercent: 141.5,
    entryTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    symbol: "WIF",
    name: "dogwifhat",
    entryPrice: 2.15,
    currentPrice: 2.87,
    quantity: 420,
    value: 1205.4,
    pnl: 302.4,
    pnlPercent: 33.5,
    entryTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    symbol: "BONK",
    name: "Bonk",
    entryPrice: 0.000024,
    currentPrice: 0.000019,
    quantity: 50000000,
    value: 950,
    pnl: -250,
    pnlPercent: -20.8,
    entryTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

// Mock transactions data
const mockTransactions: Transaction[] = [
  {
    id: "t1",
    type: "buy",
    symbol: "PEPE",
    price: 0.0000082,
    quantity: 125000000,
    value: 1025,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    txHash: "3xK7...9mPq",
  },
  {
    id: "t2",
    type: "sell",
    symbol: "SHIB",
    price: 0.0000245,
    quantity: 10000000,
    value: 245,
    pnl: 45,
    pnlPercent: 22.5,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    txHash: "7yN2...4kLp",
  },
  {
    id: "t3",
    type: "buy",
    symbol: "WIF",
    price: 2.15,
    quantity: 420,
    value: 903,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    txHash: "9zM5...2vRs",
  },
  {
    id: "t4",
    type: "sell",
    symbol: "FLOKI",
    price: 0.000185,
    quantity: 5000000,
    value: 925,
    pnl: -125,
    pnlPercent: -11.9,
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    txHash: "2pQ8...6nWx",
  },
  {
    id: "t5",
    type: "buy",
    symbol: "BONK",
    price: 0.000024,
    quantity: 50000000,
    value: 1200,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    txHash: "5tR1...8mYz",
  },
];

// Generate mock chart data
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

function formatTimeAgo(date: Date): string {
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeView, setActiveView] = useState<WalletView>("overview");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24H");

  const stats = mockStats;
  const positions = mockPositions;
  const transactions = mockTransactions;
  const isProfitable = stats.totalPnLPercent > 0;

  const chartData = useMemo(() => generateChartData(timeFilter, isProfitable), [timeFilter, isProfitable]);

  const chartConfig: ChartConfig = {
    value: {
      label: "Portfolio Value",
      color: isProfitable ? "#00ff41" : "#ff3366",
    },
  };

  return (
    <div className={`portfolio-wallet ${isExpanded ? "expanded" : "collapsed"} ${className || ""}`}>
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="portfolio-wallet-collapsed"
        >
          <div className="portfolio-wallet-icon">
            <Wallet className="w-4 h-4" />
          </div>
          <div className={`portfolio-wallet-pnl ${isProfitable ? "positive" : "negative"}`}>
            {isProfitable ? "+" : ""}{stats.totalPnLPercent.toFixed(1)}%
          </div>
          <div className="portfolio-wallet-value">
            {formatValue(stats.totalValue)}
          </div>
        </button>
      )}

      {/* Expanded State */}
      {isExpanded && (
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
              <span className="portfolio-wallet-tab-count">{positions.length}</span>
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
                  {formatValue(stats.totalValue)}
                </div>
                <div className={`portfolio-wallet-total-pnl ${isProfitable ? "positive" : "negative"}`}>
                  {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{isProfitable ? "+" : ""}{stats.totalPnLPercent.toFixed(1)}%</span>
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
                  <span className="portfolio-wallet-stat-value text-matrix-green">{stats.winRate}%</span>
                </div>
                <div className="portfolio-wallet-stat">
                  <span className="portfolio-wallet-stat-label">Avg Trade</span>
                  <span className={`portfolio-wallet-stat-value ${stats.avgPnL >= 0 ? "text-matrix-green" : "text-terminal-red"}`}>
                    {stats.avgPnL >= 0 ? "+" : ""}{stats.avgPnL.toFixed(1)}%
                  </span>
                </div>
                <div className="portfolio-wallet-stat">
                  <span className="portfolio-wallet-stat-label">Best</span>
                  <span className="portfolio-wallet-stat-value text-matrix-green">
                    +{stats.topPerformer?.pnlPercent}%
                  </span>
                </div>
                <div className="portfolio-wallet-stat">
                  <span className="portfolio-wallet-stat-label">Trades</span>
                  <span className="portfolio-wallet-stat-value">{stats.totalTrades}</span>
                </div>
                <div className="portfolio-wallet-stat">
                  <span className="portfolio-wallet-stat-label">Winners</span>
                  <span className="portfolio-wallet-stat-value text-matrix-green">{stats.winnersCount}</span>
                </div>
                <div className="portfolio-wallet-stat">
                  <span className="portfolio-wallet-stat-label">Losers</span>
                  <span className="portfolio-wallet-stat-value text-terminal-red">{stats.losersCount}</span>
                </div>
              </div>
            </>
          )}

          {/* Positions View */}
          {activeView === "positions" && (
            <div className="portfolio-wallet-positions">
              {positions.length === 0 ? (
                <div className="portfolio-wallet-empty">
                  <Layers className="w-8 h-8 text-white/20" />
                  <span>No active positions</span>
                </div>
              ) : (
                <div className="portfolio-wallet-positions-list">
                  {positions.map((position) => (
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
                          <span className="value">{formatValue(position.value)}</span>
                        </div>
                        <div className="portfolio-wallet-position-detail">
                          <span className="label">PnL</span>
                          <span className={`value ${position.pnl >= 0 ? "text-matrix-green" : "text-terminal-red"}`}>
                            {position.pnl >= 0 ? "+" : ""}{formatValue(position.pnl)}
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
                          {formatValue(tx.value)}
                        </div>
                        {tx.type === "sell" && tx.pnlPercent !== undefined && (
                          <div className={`portfolio-wallet-transaction-pnl ${tx.pnlPercent >= 0 ? "positive" : "negative"}`}>
                            {tx.pnlPercent >= 0 ? "+" : ""}{tx.pnlPercent.toFixed(1)}%
                          </div>
                        )}
                      </div>
                      {tx.txHash && (
                        <div className="portfolio-wallet-transaction-hash">
                          {tx.txHash}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
