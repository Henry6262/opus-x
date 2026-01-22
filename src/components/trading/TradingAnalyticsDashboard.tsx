/**
 * Trading Analytics Dashboard - REVAMPED
 *
 * Premium trading performance dashboard with:
 * - Animated pulse ring for win rate
 * - TP hit rate progress bars with shine effects
 * - Glassmorphic card design
 * - Staggered entrance animations
 * - Top trades with TransactionDrawer for tx verification
 */

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Radar, Target, Trophy, ExternalLink, TrendingUp, TrendingDown, Clock, Coins } from 'lucide-react';
import { subDays } from 'date-fns';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { PulseRing, MetricBar, StatRow } from './OutcomePrimitives';
import { CountUp } from '@/components/animations/CountUp';
import { TransactionDrawer } from '@/features/smart-trading/components/TransactionDrawer';
import { TokenAvatar } from './TokenAvatar';
import { cn } from '@/lib/utils';
import type { TokenPerformance } from '@/types/trading';

type ViewMode = 'overview' | 'targets' | 'performance';

export function TradingAnalyticsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedToken, setSelectedToken] = useState<TokenPerformance | null>(null);
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

      <div className="relative z-10 p-5 md:p-8">
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
                {/* Top Performers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {topPerformers.map((token, idx) => {
                    const isProfit = token.totalPnlSol >= 0;
                    const rankColors = [
                      { bg: 'from-yellow-500/20 to-amber-600/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400' },
                      { bg: 'from-gray-400/15 to-slate-500/10', border: 'border-gray-400/25', badge: 'bg-gray-400/20 text-gray-300' },
                      { bg: 'from-orange-600/15 to-amber-700/10', border: 'border-orange-500/25', badge: 'bg-orange-600/20 text-orange-400' },
                    ];
                    const rankStyle = rankColors[idx] || rankColors[2];

                    return (
                      <motion.div
                        key={token.mint}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.1 + idx * 0.1, type: 'spring', stiffness: 200 }}
                        onClick={() => setSelectedToken(token)}
                        className={cn(
                          "relative overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all duration-300",
                          "bg-gradient-to-br hover:scale-[1.02] hover:shadow-xl",
                          rankStyle.bg,
                          rankStyle.border,
                          "hover:border-white/30 group"
                        )}
                      >
                        {/* Rank Badge - Top Right */}
                        <div className={cn(
                          "absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs",
                          rankStyle.badge
                        )}>
                          {idx === 0 ? <Trophy className="w-3.5 h-3.5" /> : `#${idx + 1}`}
                        </div>

                        {/* Token Image & Name Row */}
                        <div className="flex items-center gap-3 mb-4">
                          <TokenAvatar
                            symbol={token.ticker}
                            mint={token.mint}
                            size={52}
                            rounded="xl"
                            className="ring-2 ring-white/10"
                          />
                          <div className="flex-1 min-w-0 pr-8">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-base truncate">${token.ticker}</span>
                            </div>
                            <p className="text-xs text-white/40 truncate mt-0.5">{token.tokenName}</p>
                          </div>
                        </div>

                        {/* PnL Display - Prominent */}
                        <div className={cn(
                          "rounded-xl p-3 mb-3",
                          isProfit ? "bg-emerald-500/10" : "bg-red-500/10"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {isProfit ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-xs font-medium text-white/50">P&L</span>
                            </div>
                            <div className={cn(
                              "text-lg font-bold",
                              isProfit ? "text-emerald-400" : "text-red-400"
                            )}>
                              {isProfit ? "+" : ""}{token.totalPnlSol.toFixed(4)} SOL
                            </div>
                          </div>
                          <div className={cn(
                            "text-right text-sm font-semibold mt-0.5",
                            isProfit ? "text-emerald-400/80" : "text-red-400/80"
                          )}>
                            {isProfit ? "+" : ""}{token.pnlPct.toFixed(1)}%
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-white/50">
                            <Coins className="w-3 h-3" />
                            <span>{token.investedSol.toFixed(3)} SOL</span>
                          </div>
                          {token.holdTimeMinutes !== null && (
                            <div className="flex items-center gap-1 text-white/50">
                              <Clock className="w-3 h-3" />
                              <span>{Math.round(token.holdTimeMinutes)}m</span>
                            </div>
                          )}
                        </div>

                        {/* Hover indicator */}
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-4 h-4 text-[#c4f70e]" />
                        </div>

                        {/* Subtle shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                      </motion.div>
                    );
                  })}
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

      {/* Transaction Drawer for Top Trades */}
      <TransactionDrawer
        isOpen={selectedToken !== null}
        onClose={() => setSelectedToken(null)}
        tokenSymbol={selectedToken?.ticker || ''}
        tokenMint={selectedToken?.mint || ''}
        positionId={selectedToken?.positionId}
      />
    </motion.div>
  );
}
