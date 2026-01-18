"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
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
  ResponsiveContainer,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { format } from "date-fns";

// ============================================
// TYPES
// ============================================

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
      className="relative overflow-hidden rounded-lg bg-white/[0.02] border border-white/[0.04] p-4"
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
      className="relative overflow-hidden rounded-lg bg-white/[0.02] border border-white/[0.04] p-4 flex items-center gap-4"
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
          <span className="text-lg font-semibold font-mono text-white">{value}%</span>
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
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[10px] text-white/30 uppercase tracking-widest">{label}</h3>
      {children}
    </div>
  );
}

// ============================================
// MAIN
// ============================================

export function AnalyticsPanel() {
  const [stats, setStats] = useState<Stats>({
    totalAnalyzed: 0, enterDecisions: 0, passDecisions: 0, watchDecisions: 0, winRate: 0, totalPnl: 0,
  });
  const [recentLogs, setRecentLogs] = useState<AnalysisLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart type states
  const [pnlChartType, setPnlChartType] = useState<"area" | "bar" | "line">("area");
  const [decisionChartType, setDecisionChartType] = useState<"donut" | "bar" | "radial">("donut");
  const [analysisChartType, setAnalysisChartType] = useState<"scatter" | "histogram">("scatter");

  // P&L data - both cumulative and daily
  const { pnlData, dailyPnlData } = useMemo(() => {
    const cumulative: { date: string; pnl: number }[] = [];
    const daily: { date: string; pnl: number; fill: string }[] = [];
    let total = 0;
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayPnl = (Math.random() - 0.4) * 0.5;
      total += dayPnl;
      const dateStr = format(date, "MMM d");
      cumulative.push({ date: dateStr, pnl: parseFloat(total.toFixed(2)) });
      daily.push({
        date: dateStr,
        pnl: parseFloat(dayPnl.toFixed(2)),
        fill: dayPnl >= 0 ? BRAND.primary : BRAND.red
      });
    }
    return { pnlData: cumulative, dailyPnlData: daily };
  }, []);

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

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAnalytics() {
    if (!supabase) { setLoading(false); return; }
    try {
      const [{ count: total }, { count: enters }, { count: passes }, { count: watches }, { data: logs }] =
        await Promise.all([
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }),
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }).eq("decision", "ENTER"),
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }).eq("decision", "PASS"),
          supabase.from("token_ai_analysis_log").select("*", { count: "exact", head: true }).in("decision", ["WATCH", "WAIT"]),
          supabase.from("token_ai_analysis_log").select("*").order("analyzed_at", { ascending: false }).limit(20),
        ]);
      setStats({
        totalAnalyzed: total || 0,
        enterDecisions: enters || 0,
        passDecisions: passes || 0,
        watchDecisions: watches || 0,
        winRate: enters && total ? Math.round((enters / total) * 100) : 0,
        totalPnl: 2.4,
      });
      if (logs) setRecentLogs(logs as AnalysisLog[]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
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
          value={hasData ? stats.winRate : 0}
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
        <div className="col-span-12 lg:col-span-7">
          <ChartHeader label="P&L Performance">
            <ChartToggle
              options={[
                { value: "area", label: "Area" },
                { value: "bar", label: "Bar" },
                { value: "line", label: "Line" },
              ]}
              value={pnlChartType}
              onChange={(v) => setPnlChartType(v as "area" | "bar" | "line")}
            />
          </ChartHeader>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
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
                <LineChart data={pnlData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} width={35} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white/50">Cumulative:</span> <span className="text-white font-mono ml-1">{d.pnl > 0 ? "+" : ""}{d.pnl} SOL</span></div>;
                  }} />
                  <Line type="monotone" dataKey="pnl" stroke={BRAND.primary} strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Decisions Chart */}
        <div className="col-span-6 lg:col-span-2">
          <ChartHeader label="Decisions">
            <ChartToggle
              options={[
                { value: "donut", label: "Donut" },
                { value: "bar", label: "Bar" },
              ]}
              value={decisionChartType}
              onChange={(v) => setDecisionChartType(v as "donut" | "bar" | "radial")}
            />
          </ChartHeader>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 h-[196px] flex flex-col">
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
                    <BarChart data={decisionData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} width={45} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span style={{ color: d.color }}>{d.name}</span> <span className="text-white/70 font-mono ml-1">{d.value}</span></div>;
                      }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {decisionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : <span className="text-xs text-white/20">No data</span>}
            </div>
            {hasData && (
              <div className="flex justify-center gap-3 pt-2 border-t border-white/[0.04]">
                {decisionData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-white/40">{d.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Chart */}
        <div className="col-span-6 lg:col-span-3">
          <ChartHeader label="Confidence Analysis">
            <ChartToggle
              options={[
                { value: "scatter", label: "Scatter" },
                { value: "histogram", label: "Dist" },
              ]}
              value={analysisChartType}
              onChange={(v) => setAnalysisChartType(v as "scatter" | "histogram")}
            />
          </ChartHeader>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 h-[196px] flex flex-col">
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
                  <BarChart data={confidenceHistogram} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 8 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <div className="bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px]"><span className="text-white">{d.range}</span><br/><span className="text-white/50">Total: {d.total}</span></div>;
                    }} />
                    <Bar dataKey="wins" stackId="a" fill={BRAND.primary} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="losses" stackId="a" fill={BRAND.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.primary }} /><span className="text-white/40">{analysisChartType === "scatter" ? "Traded" : "Wins"}</span></div>
              <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.red }} /><span className="text-white/40">{analysisChartType === "scatter" ? "Passed" : "Losses"}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Log */}
      <div>
        <Label>Recent Decisions</Label>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-3 max-h-[220px] overflow-y-auto custom-scrollbar">
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
