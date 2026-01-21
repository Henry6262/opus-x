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

import { useState, useEffect, useMemo } from 'react';
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
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { TradingAnalyticsDashboard } from '@/components/trading/TradingAnalyticsDashboard';

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
// VERSION TAB COMPONENT
// ============================================

interface VersionTabProps {
  version: AgentVersion;
  isActive: boolean;
  isSelected: boolean;
  colorIndex: number;
  onClick: () => void;
}

function VersionTab({ version, isActive, isSelected, colorIndex, onClick }: VersionTabProps) {
  const color = VERSION_COLORS[colorIndex % VERSION_COLORS.length];
  const versionLabel = (version.versionCode || version.versionName || '').toUpperCase();
  const displayLabel = versionLabel || 'V?';

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative w-full text-left transition-all duration-200 cursor-pointer",
        "rounded-r-lg border-l-4 px-3 py-2",
        "hover:bg-white/5",
        isSelected
          ? "bg-white/10 border-l-[#c4f70e]"
          : "border-l-transparent hover:border-l-white/20"
      )}
      style={{
        borderLeftColor: isActive ? "#c4f70e" : isSelected ? "rgba(255,255,255,0.25)" : undefined,
      }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <p
        className="text-xs font-semibold leading-snug text-white/80 line-clamp-2"
        style={{
          color: isActive ? "#c4f70e" : isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
        }}
        title={version.versionName || version.versionCode}
      >
        {displayLabel}
      </p>
    </motion.button>
  );
}

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
    <div className={cn("flex flex-col gap-2", compact && "gap-1", className)}>
      {!compact && (
        <label
          className={cn(
            "font-semibold uppercase text-white/40",
            compact ? "text-[9px] tracking-[0.25em]" : "text-xs tracking-widest"
          )}
        >
          Metric
        </label>
      )}
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
// MAIN CHART COMPONENT
// ============================================

interface VersionChartProps {
  versions: AgentVersion[];
  selectedVersionId: string;
  metricsByVersion: Record<string, VersionMetrics[]>;
  selectedMetric: MetricType;
}

function VersionChart({ versions, selectedVersionId, metricsByVersion, selectedMetric }: VersionChartProps) {
  // Build chart data - combine all version data by date
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();

    versions.forEach((version, idx) => {
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
  }, [versions, metricsByVersion, selectedMetric]);

  // Build chart config
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    versions.forEach((version, idx) => {
      const isSelected = version.id === selectedVersionId;
      config[version.id] = {
        label: version.versionName || version.versionCode,
        color: isSelected ? VERSION_COLORS[idx % VERSION_COLORS.length].stroke : "rgba(255,255,255,0.35)",
      };
    });
    return config;
  }, [versions, selectedVersionId]);

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
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <LineChart data={chartData} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} horizontal={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[160px]"
              labelFormatter={(value) => {
                return new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }}
            />
          }
        />
        {versions.map((version, idx) => {
          const isSelected = version.id === selectedVersionId;
          const lineColor = isSelected
            ? VERSION_COLORS[idx % VERSION_COLORS.length].stroke
            : "rgba(255,255,255,0.25)";

          return (
            <Line
              key={version.id}
              dataKey={version.id}
              type="monotone"
              stroke={lineColor}
              strokeWidth={isSelected ? 3 : 2}
              strokeOpacity={isSelected ? 1 : 0.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
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
    <div className="h-full flex flex-col md:flex-row">
      {/* LEFT SIDEBAR - Version Tabs */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative hidden w-40 flex-shrink-0 bg-white/[0.02] py-4 md:block"
      >
        <div className="absolute right-0 top-6 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
        <div className="px-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
            Versions
          </h3>
        </div>

        <div className="space-y-1">
          {versions.map((version, idx) => (
            <VersionTab
              key={version.id}
              version={version}
              isActive={version.id === activeVersion?.id}
              isSelected={version.id === selectedVersionId}
              colorIndex={idx}
              onClick={() => setSelectedVersionId(version.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto px-2 py-6 space-y-6 md:p-6">
        {/* Chart Section */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Activity className="w-6 h-6 text-[#c4f70e]" />
                Agent Metrics
              </h3>
            </div>
            <MetricSelector
              selectedMetric={selectedMetric}
              onChange={setSelectedMetric}
              className="hidden md:flex"
            />
          </div>

          <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/15 to-white/0" />

          {selectedSummary && (
            <div className="grid grid-cols-3 text-[11px] md:grid-cols-4 md:text-xs">
              <div className="px-2 py-2 text-center">
                <p className="uppercase tracking-widest text-[10px] text-white/40 md:text-[10px]">PnL</p>
                <p className="flex items-center justify-center gap-1 text-[13px] font-semibold text-white md:text-sm">
                  {selectedSummary.totalPnlSol >= 0 ? "+" : ""}
                  {selectedSummary.totalPnlSol.toFixed(1)}
                  <img
                    src="/logos/solana.png"
                    alt="Solana"
                    className="h-3.5 w-3.5"
                  />
                </p>
              </div>
              <div className="relative px-2 py-2 text-center">
                <span className="pointer-events-none absolute left-0 top-1/2 h-6 -translate-y-1/2 w-px bg-white/15" />
                <p className="uppercase tracking-widest text-[10px] text-white/40 md:text-[10px]">WR %</p>
                <p className="text-[13px] font-semibold text-white md:text-sm">
                  {selectedSummary.winRate.toFixed(1)}%
                </p>
              </div>
              <div className="relative px-2 py-2 text-center">
                <span className="pointer-events-none absolute left-0 top-1/2 h-6 -translate-y-1/2 w-px bg-white/15" />
                <p className="uppercase tracking-widest text-[10px] text-white/40 md:text-[10px]">Trades</p>
                <p className="text-[13px] font-semibold text-white md:text-sm">
                  {selectedSummary.totalTrades}
                </p>
              </div>
              <div className="relative px-2 py-2 text-center md:block hidden">
                <span className="pointer-events-none absolute left-0 top-1/2 h-6 -translate-y-1/2 w-px bg-white/15" />
                <p className="uppercase tracking-widest text-[9px] text-white/40 md:text-[10px]">Avg Hold</p>
                <p className="text-[11px] font-semibold text-white md:text-sm">
                  {Math.round(selectedSummary.avgHoldTimeMinutes)}m
                </p>
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 md:hidden">
              {versions.map((version) => {
                const isSelected = version.id === selectedVersionId;
                return (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition cursor-pointer ${isSelected
                      ? "bg-[#c4f70e]/25 text-[#c4f70e] shadow-[0_0_14px_rgba(196,247,14,0.2)]"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                      }`}
                  >
                    {(version.versionCode || version.versionName || "V?").toUpperCase()}
                  </button>
                );
              })}
            </div>
            <MetricSelector
              selectedMetric={selectedMetric}
              onChange={setSelectedMetric}
              compact
              className="absolute right-4 top-4 z-10 md:hidden"
            />
            <div className="p-4">
              {comparisonLoading ? (
                <div className="relative flex items-center justify-center h-[200px] overflow-hidden rounded-xl">
                  <img
                    src="/videos/gif.gif"
                    alt="Loading"
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
                  <div className="relative z-10 text-sm font-semibold text-white/80 uppercase tracking-[0.2em]">
                    Loading
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
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-white/40">Select a version to view metrics</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <TradingAnalyticsDashboard />
      </div>
    </div>
  );
}
