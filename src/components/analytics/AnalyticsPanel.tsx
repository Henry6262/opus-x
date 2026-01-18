"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { smartTradingService } from "@/features/smart-trading/service";
import type { DashboardStatsResponse, Position } from "@/features/smart-trading/types";
import { motion, AnimatePresence } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { format, subHours, subDays, startOfHour, startOfDay, isAfter } from "date-fns";

// ============================================
// TYPES
// ============================================

type Timeframe = "1H" | "4H" | "1D" | "7D" | "30D" | "ALL";

interface AnalysisLog {
  id: string;
  token_symbol: string;
  token_mint: string;
  decision: string;
  reasoning: string;
  confidence: number;
  analyzed_at: string;
  market_cap: number;
  resulted_in_trade: boolean;
  price_usd: number;
}

interface Stats {
  totalAnalyzed: number;
  enterDecisions: number;
  passDecisions: number;
  watchDecisions: number;
  winRate: number;
  totalPnl: number;
  // From trading API
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgConfidence: number;
}

// Brand colors
const BRAND = {
  primary: "#68ac6e",
  primaryDark: "#4a8050",
  red: "#ff0033",
  amber: "#ffaa00",
};

const pnlChartConfig = {
  pnl: { label: "P&L", color: BRAND.primary },
};

// ============================================
// STAT CARD
// ============================================

function StatCard({ label, value, suffix, decimals = 0, color = BRAND.primary, subtext }: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  color?: string;
  subtext?: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.08] p-4"
      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full" />
      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-semibold font-mono" style={{ color }}>
        <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
      </div>
      {subtext && <div className="text-[10px] text-white/20 mt-1">{subtext}</div>}
    </motion.div>
  );
}

// ============================================
// RADIAL CARD
// ============================================

function RadialCard({ value, label, subLabel }: { value: number; label: string; subLabel?: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 flex items-center gap-4"
      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative w-[72px] h-[72px] shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
          <motion.circle
            cx="50%" cy="50%" r={radius}
            stroke={BRAND.primary}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold font-mono text-white">{Math.round(value)}%</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">{label}</div>
        {subLabel && <div className="text-[10px] text-white/20 mt-0.5">{subLabel}</div>}
      </div>
    </motion.div>
  );
}

// ============================================
// DECISION ROW (Compact)
// ============================================

function DecisionRow({ log, index }: { log: AnalysisLog; index: number }) {
  const colors: Record<string, string> = {
    ENTER: BRAND.primary,
    PASS: BRAND.red,
    WATCH: BRAND.amber,
    WAIT: BRAND.amber,
  };
  const color = colors[log.decision] || BRAND.amber;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0 text-xs"
    >
      <span className="font-mono font-medium w-12 shrink-0" style={{ color }}>
        {log.decision}
      </span>
      <span className="font-medium text-white/70 w-16 shrink-0">
        ${log.token_symbol || "???"}
      </span>
      <span className="text-white/30 flex-1 truncate">
        {log.reasoning}
      </span>
      <span className="font-mono text-white/50 w-10 text-right shrink-0">
        {(log.confidence * 100).toFixed(0)}%
      </span>
      <span className="text-white/25 w-12 text-right shrink-0">
        {format(new Date(log.analyzed_at), "HH:mm")}
      </span>
    </motion.div>
  );
}

// ============================================
// LABEL
// ============================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] text-white/30 uppercase tracking-widest mb-3">{children}</h3>
  );
}

// ============================================
// CHART TYPE TOGGLE
// ============================================

type ChartType = string;

function ChartToggle({
  options,
  value,
  onChange
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/[0.03] rounded-full p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-[9px] uppercase tracking-wider rounded-full transition-all ${
            value === opt.value
              ? "bg-white/10 text-white"
              : "text-white/30 hover:text-white/50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ChartHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.06]">
      <h3 className="text-[11px] text-white/50 uppercase tracking-widest font-medium">{label}</h3>
      {children}
    </div>
  );
}

// ============================================
// TIMEFRAME TOGGLE
// ============================================

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1H", label: "1H" },
  { value: "4H", label: "4H" },
  { value: "1D", label: "1D" },
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "ALL", label: "ALL" },
];

function TimeframeToggle({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-full p-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`px-2 py-0.5 text-[8px] uppercase tracking-wider rounded-full transition-all ${
            value === tf.value
              ? "bg-white/10 text-white"
              : "text-white/25 hover:text-white/40"
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// GAUGE COMPONENT
// ============================================

function Gauge({ value, max = 100, label, color = BRAND.primary }: {
  value: number;
  max?: number;
  label: string;
  color?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const rotation = (percentage / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        {/* Background arc */}
        <div
          className="absolute bottom-0 left-0 w-24 h-24 rounded-full border-8 border-white/5"
          style={{ clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)" }}
        />
        {/* Filled arc */}
        <div
          className="absolute bottom-0 left-0 w-24 h-24 rounded-full border-8"
          style={{
            borderColor: color,
            clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
            transform: `rotate(${rotation - 90}deg)`,
            transformOrigin: "center center",
            opacity: 0.3
          }}
        />
        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 w-0.5 h-10 origin-bottom"
          style={{ backgroundColor: color }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Center dot */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="text-lg font-semibold font-mono mt-1" style={{ color }}>{Math.round(value)}%</div>
      <div className="text-[9px] text-white/30 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ============================================
// CUSTOM TREEMAP CONTENT
// ============================================

const CustomTreemapContent = ({ x, y, width, height, name, value, color }: any) => {
  if (width < 30 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} rx={4} />
      {width > 50 && height > 40 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="white" fontSize={11} fontWeight="600">
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={9}>
            {value}%
          </text>
        </>
      )}
    </g>
  );
};

// ============================================
// MAIN
// ============================================

export function AnalyticsPanel() {
  const [stats, setStats] = useState<Stats>({
    totalAnalyzed: 0, enterDecisions: 0, passDecisions: 0, watchDecisions: 0,
    winRate: 0, totalPnl: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0, avgConfidence: 0,
  });
  const [recentLogs, setRecentLogs] = useState<AnalysisLog[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [holdings, setHoldings] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart type states
  const [pnlChartType, setPnlChartType] = useState<"area" | "bar" | "line" | "composed">("area");
  const [decisionChartType, setDecisionChartType] = useState<"donut" | "bar" | "funnel">("donut");
  const [analysisChartType, setAnalysisChartType] = useState<"scatter" | "histogram" | "treemap">("scatter");
  const [timeframe, setTimeframe] = useState<Timeframe>("7D");

  // P&L data from real positions - grouped by timeframe
  const { pnlData, dailyPnlData } = useMemo(() => {
    const cumulative: { date: string; pnl: number }[] = [];
    const periodData: { date: string; pnl: number; fill: string }[] = [];

    // Determine time range and grouping based on timeframe
    const now = new Date();
    let startDate: Date;
    let intervals: Date[] = [];
    let formatStr: string;
    let groupKeyFn: (d: Date) => string;

    switch (timeframe) {
      case "1H":
        startDate = subHours(now, 1);
        // 5-minute intervals for 1H (12 points)
        for (let i = 12; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 5 * 60 * 1000);
          intervals.push(d);
        }
        formatStr = "HH:mm";
        groupKeyFn = (d: Date) => {
          const mins = Math.floor(d.getMinutes() / 5) * 5;
          return format(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), mins), "HH:mm");
        };
        break;
      case "4H":
        startDate = subHours(now, 4);
        // 15-minute intervals for 4H (16 points)
        for (let i = 16; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 15 * 60 * 1000);
          intervals.push(d);
        }
        formatStr = "HH:mm";
        groupKeyFn = (d: Date) => {
          const mins = Math.floor(d.getMinutes() / 15) * 15;
          return format(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), mins), "HH:mm");
        };
        break;
      case "1D":
        startDate = subDays(now, 1);
        // Hourly intervals for 1D (24 points)
        for (let i = 24; i >= 0; i--) {
          intervals.push(subHours(now, i));
        }
        formatStr = "HH:mm";
        groupKeyFn = (d: Date) => format(startOfHour(d), "HH:mm");
        break;
      case "7D":
        startDate = subDays(now, 7);
        // Daily intervals for 7D
        for (let i = 7; i >= 0; i--) {
          intervals.push(subDays(now, i));
        }
        formatStr = "MMM d";
        groupKeyFn = (d: Date) => format(startOfDay(d), "MMM d");
        break;
      case "30D":
        startDate = subDays(now, 30);
        // Daily intervals for 30D
        for (let i = 30; i >= 0; i--) {
          intervals.push(subDays(now, i));
        }
        formatStr = "MMM d";
        groupKeyFn = (d: Date) => format(startOfDay(d), "MMM d");
        break;
      case "ALL":
      default:
        // Find earliest position date or use 90 days
        const earliestPos = positions.length > 0
          ? positions.reduce((min, p) => {
              const d = new Date(p.createdAt);
              return d < min ? d : min;
            }, new Date())
          : subDays(now, 90);
        startDate = earliestPos;
        const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // Weekly intervals if > 60 days, daily otherwise
        if (daysDiff > 60) {
          const weeks = Math.ceil(daysDiff / 7);
          for (let i = weeks; i >= 0; i--) {
            intervals.push(subDays(now, i * 7));
          }
          formatStr = "MMM d";
          groupKeyFn = (d: Date) => {
            const weekStart = new Date(d);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return format(weekStart, "MMM d");
          };
        } else {
          for (let i = daysDiff; i >= 0; i--) {
            intervals.push(subDays(now, i));
          }
          formatStr = "MMM d";
          groupKeyFn = (d: Date) => format(startOfDay(d), "MMM d");
        }
        break;
    }

    if (positions.length === 0) {
      // Generate placeholder data
      intervals.forEach((d) => {
        const dateStr = format(d, formatStr);
        cumulative.push({ date: dateStr, pnl: 0 });
        periodData.push({ date: dateStr, pnl: 0, fill: BRAND.primary });
      });
      return { pnlData: cumulative, dailyPnlData: periodData };
    }

    // Filter positions within timeframe and group by period
    const pnlByPeriod = new Map<string, number>();
    positions.forEach((pos) => {
      const posDate = new Date(pos.closedAt || pos.createdAt);
      if (isAfter(posDate, startDate)) {
        const key = groupKeyFn(posDate);
        const pnl = pos.realizedPnlSol + (pos.unrealizedPnl || 0);
        pnlByPeriod.set(key, (pnlByPeriod.get(key) || 0) + pnl);
      }
    });

    // Build cumulative data
    let total = 0;
    const seenKeys = new Set<string>();
    intervals.forEach((d) => {
      const dateStr = format(d, formatStr);
      if (seenKeys.has(dateStr)) return; // Skip duplicates
      seenKeys.add(dateStr);

      const periodPnl = pnlByPeriod.get(dateStr) || 0;
      total += periodPnl;
      cumulative.push({ date: dateStr, pnl: parseFloat(total.toFixed(4)) });
      periodData.push({
        date: dateStr,
        pnl: parseFloat(periodPnl.toFixed(4)),
        fill: periodPnl >= 0 ? BRAND.primary : BRAND.red
      });
    });

    return { pnlData: cumulative, dailyPnlData: periodData };
  }, [positions, timeframe]);

  const decisionData = useMemo(() => [
    { name: "Enter", value: stats.enterDecisions, color: BRAND.primary, fill: BRAND.primary },
    { name: "Pass", value: stats.passDecisions, color: BRAND.red, fill: BRAND.red },
    { name: "Watch", value: stats.watchDecisions, color: BRAND.amber, fill: BRAND.amber },
  ].filter((d) => d.value > 0), [stats]);

  // For radial bar chart
  const radialDecisionData = useMemo(() => {
    const total = stats.enterDecisions + stats.passDecisions + stats.watchDecisions;
    if (total === 0) return [];
    return [
      { name: "Enter", value: (stats.enterDecisions / total) * 100, fill: BRAND.primary },
      { name: "Pass", value: (stats.passDecisions / total) * 100, fill: BRAND.red },
      { name: "Watch", value: (stats.watchDecisions / total) * 100, fill: BRAND.amber },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const scatterData = useMemo(() => recentLogs.map((log) => ({
    confidence: log.confidence * 100,
    outcome: log.resulted_in_trade ? Math.random() * 50 + 50 : Math.random() * 50,
    symbol: log.token_symbol,
    isWin: log.resulted_in_trade,
  })), [recentLogs]);

  // Confidence histogram data
  const confidenceHistogram = useMemo(() => {
    const buckets = [
      { range: "0-20%", min: 0, max: 20, count: 0, wins: 0 },
      { range: "20-40%", min: 20, max: 40, count: 0, wins: 0 },
      { range: "40-60%", min: 40, max: 60, count: 0, wins: 0 },
      { range: "60-80%", min: 60, max: 80, count: 0, wins: 0 },
      { range: "80-100%", min: 80, max: 100, count: 0, wins: 0 },
    ];
    recentLogs.forEach((log) => {
      const conf = log.confidence * 100;
      const bucket = buckets.find((b) => conf >= b.min && conf < b.max) || buckets[4];
      bucket.count++;
      if (log.resulted_in_trade) bucket.wins++;
    });
    return buckets.map((b) => ({
      range: b.range,
      total: b.count,
      wins: b.wins,
      losses: b.count - b.wins,
    }));
  }, [recentLogs]);

  // Composed chart data (P&L + Trade Volume) - uses same timeframe as main chart
  const composedData = useMemo(() => {
    const data: { date: string; pnl: number; trades: number }[] = [];
    const now = new Date();
    let startDate: Date;
    let intervals: Date[] = [];
    let formatStr: string;
    let groupKeyFn: (d: Date) => string;

    // Use same timeframe logic as pnlData
    switch (timeframe) {
      case "1H":
        startDate = subHours(now, 1);
        for (let i = 12; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 5 * 60 * 1000));
        }
        formatStr = "HH:mm";
        groupKeyFn = (d: Date) => {
          const mins = Math.floor(d.getMinutes() / 5) * 5;
          return format(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), mins), "HH:mm");
        };
        break;
      case "4H":
        startDate = subHours(now, 4);
        for (let i = 16; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 15 * 60 * 1000));
        }
        formatStr = "HH:mm";
        groupKeyFn = (d: Date) => {
          const mins = Math.floor(d.getMinutes() / 15) * 15;
          return format(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), mins), "HH:mm");
        };
        break;
      case "1D":
        startDate = subDays(now, 1);
        for (let i = 24; i >= 0; i--) {
          intervals.push(subHours(now, i));
        }
        formatStr = "HH:mm";
        groupKeyFn = (d: Date) => format(startOfHour(d), "HH:mm");
        break;
      case "7D":
        startDate = subDays(now, 7);
        for (let i = 7; i >= 0; i--) {
          intervals.push(subDays(now, i));
        }
        formatStr = "MMM d";
        groupKeyFn = (d: Date) => format(startOfDay(d), "MMM d");
        break;
      case "30D":
        startDate = subDays(now, 30);
        for (let i = 30; i >= 0; i--) {
          intervals.push(subDays(now, i));
        }
        formatStr = "MMM d";
        groupKeyFn = (d: Date) => format(startOfDay(d), "MMM d");
        break;
      case "ALL":
      default:
        startDate = subDays(now, 90);
        for (let i = 90; i >= 0; i--) {
          intervals.push(subDays(now, i));
        }
        formatStr = "MMM d";
        groupKeyFn = (d: Date) => format(startOfDay(d), "MMM d");
        break;
    }

    // Group positions by period
    const pnlByPeriod = new Map<string, number>();
    const tradesByPeriod = new Map<string, number>();
    positions.forEach((pos) => {
      const posDate = new Date(pos.closedAt || pos.createdAt);
      if (isAfter(posDate, startDate)) {
        const key = groupKeyFn(posDate);
        const pnl = pos.realizedPnlSol + (pos.unrealizedPnl || 0);
        pnlByPeriod.set(key, (pnlByPeriod.get(key) || 0) + pnl);
        tradesByPeriod.set(key, (tradesByPeriod.get(key) || 0) + 1);
      }
    });

    // Build composed data
    let cumulative = 0;
    const seenKeys = new Set<string>();
    intervals.forEach((d) => {
      const dateStr = format(d, formatStr);
      if (seenKeys.has(dateStr)) return;
      seenKeys.add(dateStr);

      const periodPnl = pnlByPeriod.get(dateStr) || 0;
      cumulative += periodPnl;
      data.push({
        date: dateStr,
        pnl: parseFloat(cumulative.toFixed(4)),
        trades: tradesByPeriod.get(dateStr) || 0,
      });
    });

    return data;
  }, [positions, timeframe]);

  // Treemap data from real holdings
  const treemapData = useMemo(() => {
    const colors = [BRAND.primary, "#14f195", "#9945ff", BRAND.amber, BRAND.red, "#00d4ff"];

    if (holdings.length > 0) {
      return holdings;
    }

    // Calculate from open positions if no holdings data
    if (positions.length > 0) {
      const openPositions = positions.filter(p => p.status === "OPEN");
      const totalValue = openPositions.reduce((sum, p) => sum + p.entryAmountSol, 0);

      if (totalValue > 0) {
        return openPositions.map((p, i) => ({
          name: p.tokenSymbol || "???",
          value: Math.round((p.entryAmountSol / totalValue) * 100),
          color: colors[i % colors.length],
        }));
      }
    }

    // Placeholder data
    return [
      { name: "No positions", value: 100, color: "rgba(255,255,255,0.1)" },
    ];
  }, [holdings, positions]);

  // Funnel data (trade pipeline) - using real trading stats
  const funnelData = useMemo(() => {
    const analyzed = stats.totalAnalyzed || stats.totalTrades || 0;
    const entered = stats.enterDecisions || stats.totalTrades || 0;
    const profitable = stats.winningTrades || Math.round(entered * (stats.winRate / 100)) || 0;
    return [
      { name: "Analyzed", value: analyzed || 1, fill: "rgba(255,255,255,0.2)" },
      { name: "Traded", value: entered || 0, fill: BRAND.amber },
      { name: "Profitable", value: profitable || 0, fill: BRAND.primary },
    ];
  }, [stats]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAnalytics() {
    try {
      // Fetch from both Supabase (AI logs) and trading API (positions/stats) in parallel
      const [supabaseData, tradingData] = await Promise.all([
        fetchSupabaseData(),
        fetchTradingData(),
      ]);

      // Merge stats from both sources
      setStats({
        // From Supabase AI logs
        totalAnalyzed: supabaseData.total || tradingData.totalTrades || 0,
        enterDecisions: supabaseData.enters || 0,
        passDecisions: supabaseData.passes || 0,
        watchDecisions: supabaseData.watches || 0,
        // From Trading API (more accurate)
        winRate: tradingData.winRate || (supabaseData.enters && supabaseData.total
          ? Math.round((supabaseData.enters / supabaseData.total) * 100) : 0),
        totalPnl: tradingData.totalPnl || 0,
        totalTrades: tradingData.totalTrades || 0,
        winningTrades: tradingData.winningTrades || 0,
        losingTrades: tradingData.losingTrades || 0,
        avgConfidence: supabaseData.avgConfidence || 0,
      });

      if (supabaseData.logs) setRecentLogs(supabaseData.logs as AnalysisLog[]);
      if (tradingData.positions) setPositions(tradingData.positions);
      if (tradingData.holdings) setHoldings(tradingData.holdings);

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSupabaseData() {
    if (!supabase) return { total: 0, enters: 0, passes: 0, watches: 0, logs: [], avgConfidence: 0 };

    try {
      const [{ count: total }, { count: enters }, { count: passes }, { count: watches }, { data: logs }] =
        await Promise.all([
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }),
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }).eq("decision", "ENTER"),
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }).eq("decision", "PASS"),
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }).in("decision", ["WATCH", "WAIT"]),
          supabase.from("token_ai_analysis_log").select("*").order("analyzed_at", { ascending: false }).limit(20),
        ]);

      // Calculate average confidence from logs
      const avgConfidence = logs && logs.length > 0
        ? Math.round(logs.reduce((sum, log: any) => sum + (log.confidence || 0), 0) / logs.length * 100)
        : 0;

      return { total: total || 0, enters: enters || 0, passes: passes || 0, watches: watches || 0, logs: logs || [], avgConfidence };
    } catch (error) {
      console.error("Error fetching Supabase data:", error);
      return { total: 0, enters: 0, passes: 0, watches: 0, logs: [], avgConfidence: 0 };
    }
  }

  async function fetchTradingData() {
    try {
      const dashboardData = await smartTradingService.getDashboardInit();
      const { stats: dashboardStats, positions: positionsData } = dashboardData;

      // Combine open and closed positions
      const allPositions = [...(positionsData.open || []), ...(positionsData.closed || [])];

      // Calculate holdings from open positions
      const colors = [BRAND.primary, "#14f195", "#9945ff", BRAND.amber, BRAND.red, "#00d4ff"];
      const openPositions = positionsData.open || [];
      const totalValue = openPositions.reduce((sum, p) => sum + p.entryAmountSol, 0);
      const holdingsData = totalValue > 0
        ? openPositions.map((p, i) => ({
            name: p.tokenSymbol || "???",
            value: Math.round((p.entryAmountSol / totalValue) * 100),
            color: colors[i % colors.length],
          }))
        : [];

      return {
        totalTrades: dashboardStats.performance.totalTrades,
        winningTrades: dashboardStats.performance.winningTrades,
        losingTrades: dashboardStats.performance.losingTrades,
        winRate: dashboardStats.performance.winRate,
        totalPnl: dashboardStats.performance.netPnlSol,
        positions: allPositions,
        holdings: holdingsData,
      };
    } catch (error) {
      console.error("Error fetching trading data:", error);
      return {
        totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, totalPnl: 0,
        positions: [], holdings: [],
      };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <motion.div
          className="w-5 h-5 border-2 border-white/10 border-t-[var(--brand-primary)] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const hasData = stats.totalAnalyzed > 0;

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Tokens Analyzed"
          value={stats.totalAnalyzed}
          color="white"
          subtext="All time"
        />
        <StatCard
          label="Win Rate"
          value={hasData ? Math.round(stats.winRate) : 0}
          suffix="%"
          color={stats.winRate > 50 ? BRAND.primary : BRAND.amber}
          subtext="Profitable trades"
        />
        <StatCard
          label="Total P&L"
          value={hasData ? stats.totalPnl : 0}
          suffix=" SOL"
          decimals={1}
          color={stats.totalPnl >= 0 ? BRAND.primary : BRAND.red}
          subtext="Realized gains"
        />
        <RadialCard
          value={hasData ? Math.round((stats.enterDecisions / stats.totalAnalyzed) * 100) : 0}
          label="Entry Rate"
          subLabel="Tokens entered"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* P&L Chart */}
        <div className="col-span-12 lg:col-span-7 bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
          <ChartHeader label="P&L Performance">
            <div className="flex items-center gap-2">
              <TimeframeToggle value={timeframe} onChange={setTimeframe} />
              <ChartToggle
                options={[
                  { value: "area", label: "Area" },
                  { value: "bar", label: "Bar" },
                  { value: "composed", label: "P&L+Vol" },
                ]}
                value={pnlChartType}
                onChange={(v) => setPnlChartType(v as "area" | "bar" | "line" | "composed")}
              />
            </div>
          </ChartHeader>
          <div className="mt-2">
            <ResponsiveContainer width="100%" height={160}>
              {pnlChartType === "area" ? (
                <AreaChart data={pnlData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND.primary} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={BRAND.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} width={35} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white/50">Cumulative:</span> <span className="text-white font-mono ml-1">{d.pnl > 0 ? "+" : ""}{d.pnl} SOL</span></div>;
                  }} />
                  <Area type="monotone" dataKey="pnl" stroke={BRAND.primary} strokeWidth={1.5} fill="url(#pnlGradient)" />
                </AreaChart>
              ) : pnlChartType === "bar" ? (
                <BarChart data={dailyPnlData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} width={35} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white/50">Daily:</span> <span className="font-mono ml-1" style={{ color: d.pnl >= 0 ? BRAND.primary : BRAND.red }}>{d.pnl > 0 ? "+" : ""}{d.pnl} SOL</span></div>;
                  }} />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {dailyPnlData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <ComposedChart data={composedData} margin={{ top: 5, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND.primary} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={BRAND.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="pnl" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} width={35} />
                  <YAxis yAxisId="trades" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 9 }} width={25} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]">
                        <div><span className="text-white/50">P&L:</span> <span className="text-white font-mono ml-1" style={{ color: BRAND.primary }}>{d.pnl > 0 ? "+" : ""}{d.pnl} SOL</span></div>
                        <div><span className="text-white/50">Trades:</span> <span className="text-white font-mono ml-1" style={{ color: BRAND.amber }}>{d.trades}</span></div>
                      </div>
                    );
                  }} />
                  <Area yAxisId="pnl" type="monotone" dataKey="pnl" stroke={BRAND.primary} strokeWidth={1.5} fill="url(#pnlGradient2)" />
                  <Bar yAxisId="trades" dataKey="trades" fill={BRAND.amber} opacity={0.4} radius={[2, 2, 0, 0]} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Decisions Chart */}
        <div className="col-span-6 lg:col-span-2 bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
          <ChartHeader label="Decisions">
            <ChartToggle
              options={[
                { value: "donut", label: "Donut" },
                { value: "funnel", label: "Funnel" },
              ]}
              value={decisionChartType}
              onChange={(v) => setDecisionChartType(v as "donut" | "bar" | "funnel")}
            />
          </ChartHeader>
          <div className="h-[160px] flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              {hasData ? (
                decisionChartType === "donut" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={decisionData} cx="50%" cy="50%" innerRadius="45%" outerRadius="75%" paddingAngle={2} dataKey="value">
                        {decisionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span style={{ color: d.color }}>{d.name}</span> <span className="text-white/70 font-mono ml-1">{d.value}</span></div>;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white">{d.name}</span> <span className="text-white/70 font-mono ml-1">{d.value}</span></div>;
                      }} />
                      <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        <LabelList position="center" fill="white" fontSize={10} fontWeight={600} formatter={(v: number) => v} />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                )
              ) : <span className="text-xs text-white/20">No data</span>}
            </div>
            {hasData && (
              <div className="flex justify-center gap-3 pt-2 border-t border-white/[0.04]">
                {decisionChartType === "donut" ? (
                  decisionData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-white/40">{d.name}</span>
                    </div>
                  ))
                ) : (
                  funnelData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-white/40">{d.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Chart */}
        <div className="col-span-6 lg:col-span-3 bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
          <ChartHeader label={analysisChartType === "treemap" ? "Portfolio" : "Confidence Analysis"}>
            <ChartToggle
              options={[
                { value: "scatter", label: "Scatter" },
                { value: "treemap", label: "Alloc" },
              ]}
              value={analysisChartType}
              onChange={(v) => setAnalysisChartType(v as "scatter" | "histogram" | "treemap")}
            />
          </ChartHeader>
          <div className="h-[160px] flex flex-col">
            <div className="flex-1">
              {analysisChartType === "scatter" ? (
                scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis type="number" dataKey="confidence" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} />
                      <YAxis type="number" dataKey="outcome" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white">${d.symbol}</span></div>;
                      }} />
                      <Scatter data={scatterData.filter((d) => d.isWin)} fill={BRAND.primary} r={3} />
                      <Scatter data={scatterData.filter((d) => !d.isWin)} fill={BRAND.red} r={3} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-white/20">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="value"
                    aspectRatio={4/3}
                    stroke="rgba(0,0,0,0.3)"
                    content={<CustomTreemapContent />}
                  >
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white font-medium">{d.name}</span> <span className="text-white/70 font-mono ml-1">{d.value}%</span></div>;
                    }} />
                  </Treemap>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 pt-2 border-t border-white/[0.04]">
              {analysisChartType === "scatter" ? (
                <>
                  <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.primary }} /><span className="text-white/40">Traded</span></div>
                  <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.red }} /><span className="text-white/40">Passed</span></div>
                </>
              ) : (
                <>
                  {treemapData.slice(0, 3).map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-white/40">{d.name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gauges Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex justify-center">
          <Gauge value={Math.round(stats.winRate) || 0} label="Win Rate" color={stats.winRate > 50 ? BRAND.primary : BRAND.amber} />
        </div>
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex justify-center">
          <Gauge value={hasData && stats.totalAnalyzed > 0 ? Math.round((stats.enterDecisions / stats.totalAnalyzed) * 100) : 0} label="Entry Rate" color={BRAND.primary} />
        </div>
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex justify-center">
          <Gauge value={Math.round(stats.avgConfidence) || 0} label="AI Confidence" color="#9945ff" />
        </div>
      </div>

      {/* Decision Log */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
        <div className="mb-2 pb-2 border-b border-white/[0.06]">
          <h3 className="text-[11px] text-white/50 uppercase tracking-widest font-medium">Recent Decisions</h3>
        </div>
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
          {recentLogs.length > 0 ? (
            recentLogs.map((log, i) => <DecisionRow key={log.id} log={log} index={i} />)
          ) : (
            <div className="py-8 text-center text-xs text-white/20">No decisions yet</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
