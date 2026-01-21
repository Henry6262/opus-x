/**
 * AnalyticsDashboard Component - COMPLETE REDESIGN V2
 *
 * Modern trading analytics dashboard with:
 * - Version selector tabs on left side
 * - Interactive area/line charts with gradients
 * - Glassmorphism + motion animations
 * - Sexy metric cards
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Activity,
  Zap,
  Target,
  Clock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { subDays } from 'date-fns';
import {
  CartesianGrid,
  XAxis,
  Line,
  LineChart,
} from 'recharts';

import { useVersions } from '@/hooks/useVersions';
import { useVersionComparison } from '@/hooks/useVersionComparison';
import type { MetricType, AgentVersion, VersionSummary, VersionMetrics } from '@/types/versioning';
import { cn } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { TradingAnalyticsDashboard } from '@/components/trading/TradingAnalyticsDashboard';
import { StatCard } from '@/components/analytics/StatCard';

// ============================================
// COLORS
// ============================================

const VERSION_COLORS = [
  { stroke: '#c4f70e', fill: 'rgba(196, 247, 14, 0.15)', name: 'Lime' },
  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', name: 'Blue' },
  { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.15)', name: 'Orange' },
  { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)', name: 'Purple' },
  { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.15)', name: 'Pink' },
  { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.15)', name: 'Teal' },
];

// ============================================
// METRIC OPTIONS
// ============================================

const METRICS: { id: MetricType; label: string; icon: typeof TrendingUp; format: (v: number) => string }[] = [
  { id: 'winRate', label: 'Win Rate', icon: Target, format: (v) => `${v.toFixed(1)}%` },
  { id: 'totalPnl', label: 'Total P&L', icon: TrendingUp, format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(3)} SOL` },
  { id: 'avgMultiplier', label: 'Avg Multiplier', icon: Zap, format: (v) => `${v.toFixed(2)}x` },
  { id: 'tradeCount', label: 'Trades', icon: BarChart3, format: (v) => v.toString() },
  { id: 'avgHoldTime', label: 'Hold Time', icon: Clock, format: (v) => `${Math.round(v)}m` },
];

// ============================================
// METRIC SELECTOR
// ============================================

interface MetricSelectorProps {
  selectedMetric: MetricType;
  onChange: (metric: MetricType) => void;
  compact?: boolean;
  className?: string;
}

function MetricSelector({ selectedMetric, onChange, compact = false, className }: MetricSelectorProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact && "flex-row items-center gap-2",
        className
      )}
    >
      <label
        className={cn(
          "font-semibold uppercase text-white/40",
          compact ? "text-[9px] tracking-[0.25em]" : "text-xs tracking-widest"
        )}
      >
        Metric
      </label>
      <div className="relative">
        <select
          value={selectedMetric}
          onChange={(event) => onChange(event.target.value as MetricType)}
          className={cn(
            "appearance-none rounded-lg border border-white/10 bg-black/40 cursor-pointer",
            compact ? "px-2 py-1 pr-7 text-[11px] font-semibold" : "px-3 py-2 pr-9 text-sm font-semibold",
            "text-white/80",
            "shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition",
            "focus:border-[#c4f70e]/40 focus:outline-none"
          )}
        >
          {METRICS.map((metric) => (
            <option key={metric.id} value={metric.id} className="bg-black text-white">
              {metric.label}
            </option>
          ))}
        </select>
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2",
            compact ? "right-2 text-[10px] text-[#c4f70e]" : "right-3 text-white/50"
          )}
        >
          ▾
        </div>
      </div>
    </div>
  );
}

// ============================================
// TIMEFRAME SELECTOR
// ============================================

interface TimeframeSelectorProps {
  selectedBucket: '1d' | '3h';
  onChange: (bucket: '1d' | '3h') => void;
  className?: string;
}

function TimeframeSelector({ selectedBucket, onChange, className }: TimeframeSelectorProps) {
  return (
    <div className={cn("flex gap-1 rounded-full bg-white/5 p-1", className)}>
      <button
        onClick={() => onChange('1d')}
        className={cn(
          "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full transition-all cursor-pointer",
          selectedBucket === '1d'
            ? "bg-[#c4f70e]/20 text-[#c4f70e] shadow-[0_0_12px_rgba(196,247,14,0.2)]"
            : "text-white/50 hover:text-white/70 hover:bg-white/5"
        )}
      >
        Daily
      </button>
      <button
        onClick={() => onChange('3h')}
        className={cn(
          "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full transition-all cursor-pointer",
          selectedBucket === '3h'
            ? "bg-[#c4f70e]/20 text-[#c4f70e] shadow-[0_0_12px_rgba(196,247,14,0.2)]"
            : "text-white/50 hover:text-white/70 hover:bg-white/5"
        )}
      >
        3-Hour
      </button>
    </div>
  );
}

// ============================================
// MAIN CHART COMPONENT
// ============================================

interface VersionChartProps {
  versions: AgentVersion[];
  selectedVersionId: string;
  metricsByVersion: Record<string, VersionMetrics[]>;
  selectedMetric: MetricType;
}

function VersionChart({ versions, selectedVersionId, metricsByVersion, selectedMetric }: VersionChartProps) {
  const displayVersions = useMemo(() => {
    if (!selectedVersionId) return versions;
    return versions.filter((version) => version.id === selectedVersionId);
  }, [versions, selectedVersionId]);

  const metricsByDate = useMemo(() => {
    if (!selectedVersionId) return new Map<string, VersionMetrics>();
    const metrics = metricsByVersion[selectedVersionId] || [];
    return new Map(metrics.map((metric) => [metric.date, metric]));
  }, [metricsByVersion, selectedVersionId]);

  const tooltipContent = useCallback(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ value?: number } & { payload?: { date?: string } }>;
      label?: string;
    }) => {
      if (!active || !payload?.length || !label) return null;
      const metrics = metricsByDate.get(label);
      const dateLabel = new Date(label).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formatNumber = (value?: number, decimals = 2) =>
        typeof value === "number" ? value.toFixed(decimals) : "—";
      const formatInt = (value?: number) =>
        typeof value === "number" ? Math.round(value).toLocaleString() : "—";
      const versionLabel = (displayVersions[0]?.versionCode || "Version").toString();

      return (
        <div className="min-w-[220px] rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs text-white shadow-xl">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span>{versionLabel}</span>
            <span>{dateLabel}</span>
          </div>
          <div className="mt-2 grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">PnL</span>
              <span className="font-mono text-white">
                {formatNumber(metrics?.totalPnlSol, 2)} SOL
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Win Rate</span>
              <span className="font-mono text-white">
                {formatNumber(metrics?.winRate, 1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Trades</span>
              <span className="font-mono text-white">{formatInt(metrics?.totalTrades)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Avg Hold</span>
              <span className="font-mono text-white">
                {formatInt(metrics?.avgHoldTimeMinutes)}m
              </span>
            </div>
          </div>
        </div>
      );
    },
    [displayVersions, metricsByDate]
  );

  // Build chart data - combine all version data by date
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();

    displayVersions.forEach((version) => {
      const metrics = metricsByVersion[version.id] || [];
      metrics.forEach((m) => {
        const existing = dateMap.get(m.date) || { date: m.date };
        // Extract the metric value
        const metricValue = selectedMetric === 'winRate' ? m.winRate
          : selectedMetric === 'totalPnl' ? m.totalPnlSol
            : selectedMetric === 'avgMultiplier' ? m.avgMultiplier
              : selectedMetric === 'avgHoldTime' ? m.avgHoldTimeMinutes
                : m.totalTrades;
        existing[version.id] = typeof metricValue === 'number' ? metricValue : 0;
        dateMap.set(m.date, existing);
      });
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [displayVersions, metricsByVersion, selectedMetric]);

  // Build chart config
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    displayVersions.forEach((version, idx) => {
      config[version.id] = {
        label: version.versionName || version.versionCode,
        color: VERSION_COLORS[idx % VERSION_COLORS.length].stroke,
      };
    });
    return config;
  }, [displayVersions]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="text-center">
          <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No trading data yet</p>
          <p className="text-white/30 text-xs mt-1">Start trading to see performance metrics</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[230px] w-full md:h-[250px]">
      <LineChart
        key={`${selectedVersionId ?? "all"}-${selectedMetric}`}
        data={chartData}
        margin={{ top: 6, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} horizontal={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          interval="preserveStartEnd"
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
        />
        <ChartTooltip content={tooltipContent} />
        {displayVersions.map((version, idx) => {
          const isSelected = version.id === selectedVersionId;
          const lineColor = VERSION_COLORS[idx % VERSION_COLORS.length].stroke;

          return (
            <Line
              key={version.id}
              dataKey={version.id}
              type="monotone"
              stroke={lineColor}
              strokeWidth={isSelected ? 3 : 2}
              strokeOpacity={isSelected ? 0.9 : 0.2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
}

// ============================================
// LOADING STATE
// ============================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10 text-[#c4f70e]" />
        </motion.div>
        <p className="text-white/50 text-sm font-medium">Loading analytics...</p>
      </motion.div>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <motion.div
        className="flex flex-col items-center gap-4 text-center max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-white/20" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">No Versions Yet</h3>
          <p className="text-white/50 text-sm">
            Create your first agent version to start tracking performance metrics.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export function AnalyticsDashboard() {
  // State
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('winRate');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<'1d' | '3h'>('1d');
  const [dateRange] = useState({
    start: subDays(new Date(), 30).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Data fetching
  const {
    versions,
    activeVersion,
    loading: versionsLoading,
    error: versionsError,
  } = useVersions();

  const {
    data: comparisonData,
    loading: comparisonLoading,
  } = useVersionComparison({
    versionIds: versions.map((v) => v.id),
    selectedMetric,
    dateRange,
    bucket,
  });

  // Auto-select active version or first version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(activeVersion?.id || versions[0].id);
    }
  }, [versions, activeVersion, selectedVersionId]);

  const selectedSummary: VersionSummary | null = useMemo(() => {
    if (!selectedVersionId || !comparisonData?.summary) return null;
    return comparisonData.summary[selectedVersionId] || null;
  }, [selectedVersionId, comparisonData]);

  // Get summary for selected version
  // Loading state
  if (versionsLoading) {
    return <LoadingState />;
  }

  // Error state
  if (versionsError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading analytics</p>
          <p className="text-white/40 text-sm">{versionsError}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (versions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="h-full">
      {/* MAIN CONTENT */}
      <div className="w-full overflow-y-auto px-2 py-6 space-y-6 md:p-6">
        {/* Chart Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Activity className="w-6 h-6 text-[#c4f70e]" />
                Agent Metrics
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <TimeframeSelector
                selectedBucket={bucket}
                onChange={setBucket}
                className="shrink-0"
              />
              <MetricSelector
                selectedMetric={selectedMetric}
                onChange={setSelectedMetric}
                compact
                className="shrink-0"
              />
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/15 to-white/0 md:hidden" />

          <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative flex-1 rounded-2xl bg-white/[0.02] backdrop-blur-sm overflow-hidden md:w-[72%] md:border-l md:border-b md:border-white/10"
            >
              <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                {versions.map((version) => {
                  const isSelected = version.id === selectedVersionId;
                  return (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersionId(version.id)}
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition cursor-pointer md:px-4 md:py-1.5 md:text-[11px] md:border md:border-transparent md:bg-transparent md:text-white/60 md:hover:bg-white/5 md:hover:text-white/90 ${isSelected
                        ? "bg-[#c4f70e]/30 text-[#c4f70e] shadow-[0_0_24px_rgba(196,247,14,0.55)] md:border-[#c4f70e]/80 md:text-[#c4f70e]"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                        }`}
                    >
                      {(version.versionCode || version.versionName || "V?").toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <div className="p-3 md:p-4">
                {comparisonLoading ? (
                  <div className="flex items-center justify-center h-[200px] rounded-xl bg-white/[0.02] md:h-[170px]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#c4f70e]" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                        Loading
                      </span>
                    </div>
                  </div>
                ) : comparisonData && selectedVersionId ? (
                  <VersionChart
                    versions={versions}
                    selectedVersionId={selectedVersionId}
                    metricsByVersion={comparisonData.metricsByVersion}
                    selectedMetric={selectedMetric}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[200px] md:h-[170px]">
                    <p className="text-white/40">Select a version to view metrics</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats Cards - Animated Glassmorphic Design */}
            {selectedSummary && (
              <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-2 md:w-[28%]">
                <StatCard
                  label="Total PnL"
                  value={selectedSummary.totalPnlSol}
                  prefix={selectedSummary.totalPnlSol >= 0 ? "+" : ""}
                  suffix=" SOL"
                  decimals={2}
                  icon={TrendingUp}
                  delay={0}
                  glowColor={selectedSummary.totalPnlSol >= 0 ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}
                />
                <StatCard
                  label="Win Rate"
                  value={selectedSummary.winRate}
                  suffix="%"
                  decimals={1}
                  icon={Target}
                  delay={0.05}
                  glowColor="rgba(196, 247, 14, 0.35)"
                />
                <StatCard
                  label="Trades"
                  value={selectedSummary.totalTrades}
                  decimals={0}
                  icon={BarChart3}
                  delay={0.1}
                  glowColor="rgba(59, 130, 246, 0.35)"
                />
                <StatCard
                  label="Avg Hold"
                  value={selectedSummary.avgHoldTimeMinutes}
                  suffix="m"
                  decimals={0}
                  icon={Clock}
                  delay={0.15}
                  glowColor="rgba(139, 92, 246, 0.35)"
                />
              </div>
            )}
          </div>
        </div>

        <TradingAnalyticsDashboard />
      </div>
    </div>
  );
}
