/**
 * Trading Analytics Dashboard - REVAMPED
 *
 * Premium trading performance dashboard with:
 * - Animated pulse ring for win rate
 * - TP hit rate progress bars with shine effects
 * - Glassmorphic card design
 * - Staggered entrance animations
 */

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Radar, Target, Trophy } from 'lucide-react';
import { subDays } from 'date-fns';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { PulseRing, MetricBar, StatRow } from './OutcomePrimitives';
import { CountUp } from '@/components/animations/CountUp';
import { cn } from '@/lib/utils';

type ViewMode = 'overview' | 'targets' | 'performance';

export function TradingAnalyticsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [dateRange] = useState({
    start: subDays(new Date(), 30).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { analytics, tokenPerformance, loading, error } =
    useTradingAnalytics(dateRange);

  // Calculate derived stats
  const avgTargetEfficiency = useMemo(() => {
    return (analytics.tp1HitRate + analytics.tp2HitRate + analytics.tp3HitRate) / 3;
  }, [analytics]);

  const topPerformers = useMemo(() => {
    return tokenPerformance.slice(0, 3);
  }, [tokenPerformance]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
      >
        <div className="flex items-center justify-center h-[300px]">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className="w-12 h-12 rounded-full border-2 border-[#c4f70e]/30 border-t-[#c4f70e]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-white/40 text-sm uppercase tracking-widest">Loading Pulse...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[300px] rounded-2xl border border-red-500/20 bg-red-500/5">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#c4f70e]/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <Radar className="w-6 h-6 text-[#c4f70e]" />
              <motion.div
                className="absolute -inset-1 bg-[#c4f70e]/20 rounded-full blur-sm"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h2 className="text-xl font-bold text-white">Outcome Pulse</h2>
          </motion.div>

          {/* View Mode Tabs */}
          <div className="flex gap-1 rounded-full bg-white/5 p-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'targets', label: 'Targets' },
              { id: 'performance', label: 'Top Trades' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full transition-all cursor-pointer",
                  viewMode === tab.id
                    ? "bg-[#c4f70e]/20 text-[#c4f70e] shadow-[0_0_12px_rgba(196,247,14,0.2)]"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center">
            {/* Pulse Ring - Win Rate with padding */}
            <div className="flex justify-center p-8 md:p-12">
              <PulseRing
                value={analytics.winRate}
                label="Win Rate"
                sublabel={`${analytics.totalTrades} trades`}
                size={210}
                strokeWidth={12}
                delay={0.1}
              />
            </div>

            {/* Stats - Vertical Stack with Horizontal Rows */}
            <div className="space-y-3">
              {/* PnL Row */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.04] p-5 md:p-6"
              >
                  <span className="text-base font-semibold uppercase tracking-[0.16em] text-white/60 flex-1 md:text-lg">
                    Total PnL
                  </span>
                <div className="text-2xl font-bold text-white md:text-3xl">
                  <span className={analytics.totalPnlSol >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {analytics.totalPnlSol >= 0 ? "+" : ""}
                  </span>
                  <CountUp to={analytics.totalPnlSol} decimals={3} duration={1.5} suffix=" SOL" />
                </div>
              </motion.div>

              <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-3">
                {/* Multiplier */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-lg bg-white/[0.03] p-2 md:p-4"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 md:text-sm">
                    Avg Multiplier
                  </span>
                  <div className="mt-1 text-base font-bold text-white md:text-xl">
                    <CountUp to={analytics.avgMultiplier} decimals={2} duration={1.5} suffix="x" />
                  </div>
                </motion.div>

                {/* Hold Time */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-lg bg-white/[0.03] p-2 md:p-4"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 md:text-sm">
                    Avg Hold
                  </span>
                  <div className="mt-1 text-base font-bold text-white md:text-xl">
                    <CountUp to={analytics.avgHoldTimeMinutes} decimals={0} duration={1.5} suffix="m" />
                  </div>
                </motion.div>

                {/* Best Trade */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="rounded-lg bg-white/[0.03] p-2 md:p-4"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 md:text-sm">
                    Best Trade
                  </span>
                  <div className="mt-1 text-base font-bold text-white md:text-xl">
                    <span className={analytics.bestTradePct >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {analytics.bestTradePct >= 0 ? "+" : ""}
                    </span>
                    <CountUp to={analytics.bestTradePct} decimals={0} duration={1.5} suffix="%" />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'targets' && (
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
            {/* Target Efficiency Ring */}
            <div className="flex justify-center">
              <PulseRing
                value={avgTargetEfficiency}
                label="Target Efficiency"
                sublabel="Avg TP Hit Rate"
                size={180}
                strokeWidth={10}
                glowColor="rgba(139, 92, 246, 0.5)"
                delay={0.1}
              />
            </div>

            {/* TP Hit Bars */}
            <div className="space-y-5">
              <MetricBar
                label="TP1 Hit Rate"
                value={analytics.tp1HitRate}
                color="#c4f70e"
                delay={0.15}
              />
              <MetricBar
                label="TP2 Hit Rate"
                value={analytics.tp2HitRate}
                color="rgba(196, 247, 14, 0.7)"
                delay={0.25}
              />
              <MetricBar
                label="TP3 Hit Rate"
                value={analytics.tp3HitRate}
                color="rgba(196, 247, 14, 0.45)"
                delay={0.35}
              />

              {/* Summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-4 border-t border-white/10"
              >
                <p className="text-sm text-white/40">
                  Targets hit across <span className="text-white/70 font-medium">{analytics.totalTrades}</span> trades.
                  Average efficiency is <span className="text-[#c4f70e] font-medium">{avgTargetEfficiency.toFixed(1)}%</span>.
                </p>
              </motion.div>
            </div>
          </div>
        )}

        {viewMode === 'performance' && (
          <div className="space-y-4">
            {topPerformers.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-white/40">
                No trades yet
              </div>
            ) : (
              <>
                {/* Top Performers List */}
                <div className="space-y-3">
                  {topPerformers.map((token, idx) => (
                    <motion.div
                      key={token.mint}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/10 p-4"
                    >
                      {/* Rank Badge */}
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                        idx === 0 && "bg-yellow-500/20 text-yellow-400",
                        idx === 1 && "bg-gray-400/20 text-gray-300",
                        idx === 2 && "bg-orange-600/20 text-orange-400"
                      )}>
                        {idx === 0 ? <Trophy className="w-4 h-4" /> : `#${idx + 1}`}
                      </div>

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">${token.ticker}</span>
                          <span className="text-xs text-white/40 truncate">{token.tokenName}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                          <span>Invested: {token.investedSol.toFixed(3)} SOL</span>
                          {token.holdTimeMinutes && (
                            <span>Hold: {Math.round(token.holdTimeMinutes)}m</span>
                          )}
                        </div>
                      </div>

                      {/* PnL */}
                      <div className="text-right">
                        <div className={cn(
                          "text-lg font-bold",
                          token.totalPnlSol >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {token.totalPnlSol >= 0 ? "+" : ""}{token.totalPnlSol.toFixed(4)} SOL
                        </div>
                        <div className={cn(
                          "text-xs font-medium",
                          token.pnlPct >= 0 ? "text-emerald-400/70" : "text-red-400/70"
                        )}>
                          {token.pnlPct >= 0 ? "+" : ""}{token.pnlPct.toFixed(1)}%
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Stats Summary */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-between pt-4 border-t border-white/10 text-sm"
                >
                  <span className="text-white/40">Total analyzed: {tokenPerformance.length} trades</span>
                  <span className="text-white/60">
                    Best peak: <span className="text-[#c4f70e] font-medium">+{analytics.bestTradePct.toFixed(0)}%</span>
                  </span>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c4f70e]/40 to-transparent"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
