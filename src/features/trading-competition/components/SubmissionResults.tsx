"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CountUp } from "@/components/animations/CountUp";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Droplets,
  BarChart3,
  Send,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type LineData,
  UTCTimestamp,
} from "lightweight-charts";
import type { TokenData, AggregatedTradeData, SubmissionAnalysisData, WalletTrade } from "../types";

interface SubmissionResultsProps {
  tokenData: TokenData;
  tradeData: AggregatedTradeData | null;
  analysisData: SubmissionAnalysisData;
  onUpdateAnalysis: (data: Partial<SubmissionAnalysisData>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price === 0) return "$0";
  if (price < 0.0000001) return `$${price.toExponential(2)}`;
  if (price < 0.00001) return `$${price.toFixed(8)}`;
  if (price < 0.001) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Mini chart component for price visualization
function MiniPriceChart({
  trades,
  currentPrice,
  entryPrice,
}: {
  trades: WalletTrade[];
  currentPrice: number;
  entryPrice: number;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.4)",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 120,
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
        borderVisible: false,
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Generate price line from trades + current price
    const now = Date.now();
    const lineData: LineData[] = [];

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

    // Add trade points
    sortedTrades.forEach((trade) => {
      lineData.push({
        time: Math.floor(trade.timestamp / 1000) as UTCTimestamp,
        value: trade.price_usd,
      });
    });

    // Add current price point
    lineData.push({
      time: Math.floor(now / 1000) as UTCTimestamp,
      value: currentPrice,
    });

    // Ensure we have at least 2 points for a line
    if (lineData.length < 2) {
      lineData.unshift({
        time: (Math.floor(now / 1000) - 3600) as UTCTimestamp,
        value: entryPrice,
      });
    }

    const isPositive = currentPrice >= entryPrice;

    const lineSeries = chart.addSeries(LineSeries, {
      color: isPositive ? "#22c55e" : "#ef4444",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    lineSeries.setData(lineData);

    // Add entry price line
    lineSeries.createPriceLine({
      price: entryPrice,
      color: "rgba(196, 247, 14, 0.5)",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: "",
    });

    chart.timeScale().fitContent();

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
  }, [trades, currentPrice, entryPrice]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
      {/* Entry line label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/80 rounded-md border border-[#c4f70e]/20">
        <div className="w-3 h-px bg-[#c4f70e]/60" style={{ borderStyle: "dashed" }} />
        <span className="text-[9px] font-mono text-[#c4f70e]/70">Entry</span>
      </div>
    </div>
  );
}

// Trade activity row
function TradeRow({ trade, index }: { trade: WalletTrade; index: number }) {
  const isBuy = trade.action === "buy";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/5"
    >
      <div
        className={`p-1.5 rounded-md ${
          isBuy ? "bg-emerald-500/10" : "bg-red-500/10"
        }`}
      >
        {isBuy ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono font-semibold ${
              isBuy ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isBuy ? "BUY" : "SELL"}
          </span>
          <span className="text-[11px] font-mono text-white/60">
            {formatUsd(trade.amount_usd)}
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/30">
          @ {formatPrice(trade.price_usd)}
        </span>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] font-mono text-white/40">
          {formatTimeAgo(trade.timestamp)}
        </span>
        <a
          href={`https://solscan.io/tx/${trade.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono text-white/20 hover:text-[#c4f70e]/60 transition-colors flex items-center gap-1"
        >
          {trade.tx_hash.slice(0, 6)}...
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </motion.div>
  );
}

export function SubmissionResults({
  tokenData,
  tradeData,
  analysisData,
  onUpdateAnalysis,
  onSubmit,
  isSubmitting,
}: SubmissionResultsProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);

  const pnl = tradeData?.pnl_pct ?? 0;
  const isPnlPositive = pnl >= 0;
  const entryPrice = tradeData?.avg_entry_price ?? tokenData.price_usd;
  const trades = tradeData?.trades ?? [];
  const visibleTrades = showAllTrades ? trades : trades.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Token Header Card ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent"
      >
        {/* Background glow based on PnL */}
        <div
          className={`absolute inset-0 opacity-20 ${
            isPnlPositive
              ? "bg-gradient-to-br from-emerald-500/20 to-transparent"
              : "bg-gradient-to-br from-red-500/20 to-transparent"
          }`}
        />

        <div className="relative p-4">
          <div className="flex items-start gap-4">
            {/* Token image */}
            {tokenData.image_url ? (
              <img
                src={tokenData.image_url}
                alt={tokenData.symbol}
                className="w-14 h-14 rounded-xl border border-white/10 bg-black/50"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#c4f70e]/10 border border-[#c4f70e]/20 flex items-center justify-center">
                <span className="text-[#c4f70e] font-mono text-lg font-bold">
                  {tokenData.symbol?.[0] ?? "?"}
                </span>
              </div>
            )}

            {/* Token info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-mono font-bold text-white">
                  {tokenData.symbol}
                </span>
                <span className="text-[11px] text-white/40 truncate">
                  {tokenData.name}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <a
                  href={`https://dexscreener.com/solana/${tokenData.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-[#c4f70e]/60 transition-colors flex items-center gap-1"
                >
                  {tokenData.mint.slice(0, 6)}...{tokenData.mint.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* PnL Badge */}
            <div
              className={`flex flex-col items-end gap-1 px-3 py-2 rounded-xl ${
                isPnlPositive
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-1">
                {isPnlPositive ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-lg font-mono font-bold ${
                    isPnlPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  <CountUp
                    to={pnl}
                    duration={1}
                    decimals={1}
                    prefix={isPnlPositive ? "+" : ""}
                    suffix="%"
                  />
                </span>
              </div>
              {tradeData && (
                <span
                  className={`text-[10px] font-mono ${
                    isPnlPositive ? "text-emerald-400/60" : "text-red-400/60"
                  }`}
                >
                  {formatUsd(tradeData.pnl_usd)}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== Price Chart ===== */}
      {trades.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-white/30">
              Price since entry
            </span>
            <span className="text-[10px] font-mono text-white/40">
              Current: {formatPrice(tokenData.price_usd)}
            </span>
          </div>
          <MiniPriceChart
            trades={trades}
            currentPrice={tokenData.price_usd}
            entryPrice={entryPrice}
          />
        </motion.div>
      )}

      {/* ===== Metrics Grid ===== */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Market Cap"
          value={formatUsd(tokenData.market_cap)}
          icon={<BarChart3 className="w-3 h-3" />}
          delay={0.1}
        />
        <MetricCard
          label="Liquidity"
          value={formatUsd(tokenData.liquidity)}
          icon={<Droplets className="w-3 h-3" />}
          delay={0.15}
        />
        <MetricCard
          label="24h Volume"
          value={formatUsd(tokenData.volume_24h)}
          icon={<DollarSign className="w-3 h-3" />}
          delay={0.2}
        />
        <MetricCard
          label="Current Price"
          value={formatPrice(tokenData.price_usd)}
          icon={<TrendingUp className="w-3 h-3" />}
          color={isPnlPositive ? "text-emerald-400" : "text-red-400"}
          delay={0.25}
        />
      </div>

      {/* ===== Trade Summary ===== */}
      {tradeData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
            <Calendar className="w-3 h-3 text-white/30" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-white/30">
              Trade Summary
            </span>
          </div>

          <div className="p-3 grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wider font-mono text-white/25">
                Bought
              </span>
              <span className="text-[13px] font-mono font-semibold text-emerald-400">
                {formatUsd(tradeData.total_bought_usd)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wider font-mono text-white/25">
                Sold
              </span>
              <span className="text-[13px] font-mono font-semibold text-red-400">
                {formatUsd(tradeData.total_sold_usd)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wider font-mono text-white/25">
                Net P&L
              </span>
              <span
                className={`text-[13px] font-mono font-semibold ${
                  isPnlPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {isPnlPositive ? "+" : ""}
                {formatUsd(tradeData.pnl_usd)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Trade History ===== */}
      {trades.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-white/30">
                Trade History
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/30">
              {trades.length} transaction{trades.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {visibleTrades.map((trade, index) => (
              <TradeRow key={trade.tx_hash} trade={trade} index={index} />
            ))}
          </div>

          {trades.length > 3 && (
            <button
              onClick={() => setShowAllTrades(!showAllTrades)}
              className="flex items-center justify-center gap-1 py-2 text-[10px] font-mono text-white/30 hover:text-white/50 transition-colors"
            >
              {showAllTrades ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Show {trades.length - 3} more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </motion.div>
      )}

      {/* ===== Analysis Section (Collapsible) ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
      >
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="p-1.5 rounded-lg bg-[#c4f70e]/10">
            <Sparkles className="w-3.5 h-3.5 text-[#c4f70e]" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-[12px] font-mono text-white/70">
              Add your analysis
            </span>
            <span className="text-[10px] text-white/30 ml-2">
              (boosts your score)
            </span>
          </div>
          {showAnalysis ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </button>

        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 p-4 pt-0 border-t border-white/5">
                <TextArea
                  label="Why did you buy?"
                  value={analysisData.why_bought ?? ""}
                  onChange={(v) => onUpdateAnalysis({ why_bought: v })}
                  placeholder="What caught your attention? What was the setup?"
                />
                <TextArea
                  label="Indicators & signals"
                  value={analysisData.indicators_used ?? ""}
                  onChange={(v) => onUpdateAnalysis({ indicators_used: v })}
                  placeholder="Volume spike? Social momentum? Chart pattern?"
                />
                <TextArea
                  label="Exit reasoning"
                  value={analysisData.exit_reasoning ?? ""}
                  onChange={(v) => onUpdateAnalysis({ exit_reasoning: v })}
                  placeholder="Why did you exit (or plan to)? Target hit?"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ===== Submit Button ===== */}
      <motion.button
        onClick={onSubmit}
        disabled={isSubmitting}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#c4f70e] to-[#a8d800]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#d4ff3e] to-[#c4f70e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Content */}
        <Send className="relative w-4 h-4 text-black" />
        <span className="relative text-[13px] font-mono font-bold text-black">
          {isSubmitting ? "SUBMITTING..." : "SUBMIT TO COMPETITION"}
        </span>
      </motion.button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color = "text-white/70",
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex flex-col gap-1.5 p-3 bg-white/[0.03] border border-white/5 rounded-xl"
    >
      <div className="flex items-center gap-1.5 text-white/30">
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-mono">
          {label}
        </span>
      </div>
      <span className={`text-[14px] font-mono font-semibold ${color} tabular-nums`}>
        {value}
      </span>
    </motion.div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-[12px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#c4f70e]/30 focus:bg-black/40 resize-none font-mono transition-all"
      />
    </div>
  );
}
