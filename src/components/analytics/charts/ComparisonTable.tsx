/**
 * ComparisonTable Component - REDESIGNED AS CARDS
 *
 * Replaces boring table with modern card-based layout.
 * Each version gets a sleek card with progress bars and visual hierarchy.
 */

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Check, Zap, TrendingUp } from 'lucide-react';
import type {
  AgentVersion,
  VersionSummary,
  VersionComparisonData,
  MetricType,
} from '@/types/versioning';

interface ComparisonTableProps {
  data: VersionComparisonData;
  selectedMetric: MetricType;
  onViewDetails: (version: AgentVersion) => void;
}

interface RankedVersion {
  version: AgentVersion;
  summary: VersionSummary;
  rank: number;
  isBest: boolean;
}

/**
 * Rank versions by selected metric.
 */
function rankVersions(
  data: VersionComparisonData,
  selectedMetric: MetricType
): RankedVersion[] {
  const ranked = data.versions
    .map((version) => ({
      version,
      summary: data.summary[version.id],
    }))
    .sort((a, b) => {
      const aValue = getMetricValueFromSummary(a.summary, selectedMetric);
      const bValue = getMetricValueFromSummary(b.summary, selectedMetric);
      return bValue - aValue;
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      isBest: index === 0,
    }));

  return ranked;
}

function getMetricValueFromSummary(summary: VersionSummary, metric: MetricType): number {
  switch (metric) {
    case 'winRate':
      return summary.winRate;
    case 'totalPnl':
      return summary.totalPnlSol;
    case 'avgHoldTime':
      return summary.avgHoldTimeMinutes;
    case 'avgMultiplier':
      return summary.avgMultiplier;
    case 'tradeCount':
      return summary.totalTrades;
    default:
      return 0;
  }
}

/**
 * Animated Progress Bar
 */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = (value / max) * 100;

  return (
    <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}80, ${color})`
        }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {/* Shimmer effect */}
      <motion.div
        className="absolute left-0 top-0 h-full w-1/3"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}40, transparent)`
        }}
        animate={{
          x: ['0%', '300%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}

/**
 * Version Comparison Card
 */
function VersionCard({
  item,
  maxValues,
  onViewDetails
}: {
  item: RankedVersion;
  maxValues: { trades: number; pnl: number; multiplier: number };
  onViewDetails: (version: AgentVersion) => void;
}) {
  const { version, summary, rank, isBest } = item;

  const winRateColor =
    summary.winRate >= 60 ? '#68ac6e' :
    summary.winRate >= 50 ? '#ffaa00' : '#ff0033';

  return (
    <motion.div
      className="
        relative group
        rounded-2xl overflow-hidden
        bg-gradient-to-br from-white/[0.08] to-white/[0.02]
        backdrop-blur-xl
        border border-white/[0.12]
        p-5
      "
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      whileHover={{
        scale: 1.02,
        borderColor: 'rgba(255,255,255,0.2)',
      }}
    >
      {/* Rank Badge & Best Indicator */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className={`
              flex items-center justify-center
              w-10 h-10 rounded-xl
              font-black text-lg
              ${isBest
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-white/[0.08] text-white/60'}
            `}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: rank * 0.05 + 0.2 }}
          >
            {isBest ? <Trophy className="w-5 h-5" /> : `#${rank}`}
          </motion.div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white">
                {version.versionName}
              </h3>
              {version.isActive && (
                <motion.span
                  className="
                    inline-flex items-center gap-1 px-2 py-0.5
                    rounded-full bg-[#68ac6e]/20 text-[#68ac6e]
                    text-xs font-bold
                  "
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: rank * 0.05 + 0.3 }}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  LIVE
                </motion.span>
              )}
            </div>
            <span className="text-xs text-white/40 font-mono">
              {version.versionCode}
            </span>
          </div>
        </div>

        <button
          onClick={() => onViewDetails(version)}
          className="
            px-3 py-1.5 rounded-lg
            text-xs font-semibold
            text-white/70 hover:text-white
            bg-white/[0.05] hover:bg-white/[0.1]
            border border-white/[0.1]
            transition-all duration-200
          "
        >
          Details
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Win Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50 font-medium">Win Rate</span>
            <span
              className="font-bold"
              style={{ color: winRateColor }}
            >
              {summary.winRate.toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            value={summary.winRate}
            max={100}
            color={winRateColor}
          />
        </div>

        {/* Total Trades */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50 font-medium">Trades</span>
            <span className="font-bold text-white">{summary.totalTrades}</span>
          </div>
          <ProgressBar
            value={summary.totalTrades}
            max={maxValues.trades}
            color="#3b82f6"
          />
        </div>

        {/* Total P&L */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50 font-medium">Total P&L</span>
            <span
              className="font-bold font-mono"
              style={{
                color: summary.totalPnlSol >= 0 ? '#68ac6e' : '#ff0033'
              }}
            >
              {summary.totalPnlSol >= 0 ? '+' : ''}
              {summary.totalPnlSol.toFixed(2)}
            </span>
          </div>
          <ProgressBar
            value={Math.abs(summary.totalPnlSol)}
            max={Math.abs(maxValues.pnl)}
            color={summary.totalPnlSol >= 0 ? '#68ac6e' : '#ff0033'}
          />
        </div>

        {/* Avg Multiplier */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50 font-medium">Multiplier</span>
            <span className="font-bold text-white">
              {summary.avgMultiplier.toFixed(2)}x
            </span>
          </div>
          <ProgressBar
            value={summary.avgMultiplier}
            max={maxValues.multiplier}
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Description if available */}
      {version.description && (
        <div className="text-xs text-white/40 leading-relaxed">
          {version.description}
        </div>
      )}

      {/* Hover Glow Effect */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${isBest ? '#ffaa00' : '#68ac6e'}20, transparent 60%)`
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

/**
 * ComparisonTable - Modern card-based version comparison
 */
export function ComparisonTable({
  data,
  selectedMetric,
  onViewDetails,
}: ComparisonTableProps) {
  const rankedVersions = useMemo(
    () => rankVersions(data, selectedMetric),
    [data, selectedMetric]
  );

  // Calculate max values for progress bars
  const maxValues = useMemo(() => {
    const summaries = Object.values(data.summary);
    return {
      trades: Math.max(...summaries.map(s => s.totalTrades), 1),
      pnl: Math.max(...summaries.map(s => Math.abs(s.totalPnlSol)), 1),
      multiplier: Math.max(...summaries.map(s => s.avgMultiplier), 1),
    };
  }, [data.summary]);

  if (rankedVersions.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6">
        <p className="text-white/40 text-center">No versions to compare</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {rankedVersions.map((item) => (
        <VersionCard
          key={item.version.id}
          item={item}
          maxValues={maxValues}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
