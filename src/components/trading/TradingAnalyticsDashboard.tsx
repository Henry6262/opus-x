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
import { Radar, Target, Trophy, ExternalLink, TrendingUp, TrendingDown, Clock, Coins, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { usePositions, useDashboardStats } from '@/features/smart-trading/context';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { PulseRing, MetricBar, StatRow } from './OutcomePrimitives';
import { CountUp } from '@/components/animations/CountUp';
import { TransactionDrawer } from '@/features/smart-trading/components/TransactionDrawer';
import { TokenAvatar } from './TokenAvatar';
import { SolIcon } from '@/components/SolIcon';
import { cn } from '@/lib/utils';
import type { Position } from '@/features/smart-trading/types';
import type { TokenPerformance as BackendTokenPerformance } from '@/types/trading';

// Extended Position type with fields added by WebSocket context
type ExtendedPosition = Position & {
  peakPrice?: number;
  peakPnlPct?: number;
  marketCap?: number;
  liquidity?: number;
  volume24h?: number;
};

// Transformed token performance for the trades view
interface TokenPerformance {
  positionId: string;
  mint: string;
  tokenName: string;
  ticker: string;
  entryTime: string;
  exitTime: string | null;
  investedSol: number;
  totalPnlSol: number;
  pnlPct: number;
  peakPnlPct: number;
  holdTimeMinutes: number | null;
  status: 'open' | 'partially_closed' | 'closed';
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  buySignature: string | null;
  sellTransactions: { signature: string; sol_received: number; quantity: number; price: number; timestamp: string }[];
}

type ViewMode = 'overview' | 'targets' | 'performance';

export function TradingAnalyticsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedToken, setSelectedToken] = useState<TokenPerformance | null>(null);

  // Use the same data source as HistoryPanel for consistency
  const { positions, history, isLoading } = usePositions();

  // Use backend stats as SINGLE SOURCE OF TRUTH for PnL (Birdeye cache)
  const { dashboardStats } = useDashboardStats();

  // Use trading analytics hook for TOP TRADES - this fetches directly from backend
  // with accurate realized_pnl_sol values (not the WebSocket position data)
  const { tokenPerformance: backendTokenPerformance, loading: analyticsLoading } = useTradingAnalytics();

  // Cast to extended type since WebSocket context adds extra fields
  const allPositions = useMemo(() => [...positions, ...history] as ExtendedPosition[], [positions, history]);

  // Calculate analytics - use backend stats for authoritative PnL values
  const analytics = useMemo(() => {
    const totalTrades = allPositions.length;
    const openPositionsCount = positions.length;
    const closedPositions = history.length;

    const totalInvestedSol = allPositions.reduce((sum, p) => sum + (p.entryAmountSol || 0), 0);

    // USE BACKEND STATS for Total PnL (single source of truth from Birdeye cache)
    // This ensures consistency with TraderProfileCard which also uses backend stats
    const totalPnlSol = dashboardStats?.performance?.netPnlSol ??
      allPositions.reduce((sum, p) => sum + (p.realizedPnlSol || 0), 0);
    const totalPnlPct = totalInvestedSol > 0 ? (totalPnlSol / totalInvestedSol) * 100 : 0;

    // USE BACKEND STATS for Win Rate (single source of truth)
    const winRate = dashboardStats?.performance?.winRate ?? (() => {
      const closedWithPnl = history.filter(p => p.realizedPnlSol !== undefined);
      const profitableTrades = closedWithPnl.filter(p => (p.realizedPnlSol || 0) > 0);
      return closedWithPnl.length > 0 ? (profitableTrades.length / closedWithPnl.length) * 100 : 0;
    })();

    // Average multiplier (from peak P&L)
    const avgMultiplier = totalTrades > 0
      ? allPositions.reduce((sum, p) => sum + (((p.peakPnlPct || 0) / 100) + 1), 0) / totalTrades
      : 0;

    // Hold time calculation
    const closedWithTime = history.filter(p => p.closedAt);
    const avgHoldTimeMinutes = closedWithTime.length > 0
      ? closedWithTime.reduce((sum, p) => {
          const entryTime = new Date(p.createdAt).getTime();
          const closeTime = new Date(p.closedAt!).getTime();
          return sum + (closeTime - entryTime) / (1000 * 60);
        }, 0) / closedWithTime.length
      : 0;

    // Best trade from backend stats or fallback to local calculation
    const bestTradePct = dashboardStats?.performance?.largestWin ?? (
      allPositions.length > 0
        ? Math.max(...allPositions.map(p => p.peakPnlPct || 0))
        : 0
    );

    // TP hit rates - only from closed positions
    const tp1HitRate = closedPositions > 0
      ? (history.filter(p => p.target1Hit).length / closedPositions) * 100
      : 0;
    const tp2HitRate = closedPositions > 0
      ? (history.filter(p => p.target2Hit).length / closedPositions) * 100
      : 0;
    const tp3HitRate = 0; // Position type doesn't have target3

    return {
      totalTrades: dashboardStats?.performance?.totalTrades ?? totalTrades,
      openPositions: openPositionsCount,
      closedPositions,
      totalInvestedSol,
      totalPnlSol,
      totalPnlPct,
      winRate,
      avgMultiplier,
      avgHoldTimeMinutes,
      bestTradePct,
      tp1HitRate,
      tp2HitRate,
      tp3HitRate,
    };
  }, [allPositions, positions, history, dashboardStats]);

  // Transform positions to TokenPerformance format for top trades display
  const tokenPerformance: TokenPerformance[] = useMemo(() => {
    return allPositions.map((p): TokenPerformance => {
      const totalPnlSol = p.realizedPnlSol || 0;
      const pnlPct = p.entryAmountSol > 0 ? (totalPnlSol / p.entryAmountSol) * 100 : 0;

      let holdTimeMinutes: number | null = null;
      if (p.closedAt) {
        const entryTime = new Date(p.createdAt).getTime();
        const closeTime = new Date(p.closedAt).getTime();
        holdTimeMinutes = (closeTime - entryTime) / (1000 * 60);
      }

      return {
        positionId: p.id,
        mint: p.tokenMint,
        tokenName: p.tokenSymbol || 'Unknown',
        ticker: p.tokenSymbol || (p.tokenMint ? p.tokenMint.slice(0, 6) : 'UNKNOWN'),
        entryTime: p.createdAt,
        exitTime: p.closedAt || null,
        investedSol: p.entryAmountSol || 0,
        totalPnlSol,
        pnlPct,
        peakPnlPct: p.peakPnlPct || 0,
        holdTimeMinutes,
        status: (p.status === 'CLOSED' || p.status === 'STOPPED_OUT' ? 'closed'
          : p.status === 'PARTIALLY_CLOSED' ? 'partially_closed'
          : 'open') as 'open' | 'partially_closed' | 'closed',
        tp1Hit: p.target1Hit || false,
        tp2Hit: p.target2Hit || false,
        tp3Hit: false, // Position type doesn't have target3
        buySignature: p.entryTxSig || null,
        sellTransactions: [], // Not available from Position type, drawer will fetch
      };
    }).sort((a, b) => b.totalPnlSol - a.totalPnlSol); // Sort by P&L descending
  }, [allPositions]);

  const loading = isLoading || analyticsLoading;

  // Calculate derived stats
  const avgTargetEfficiency = useMemo(() => {
    return (analytics.tp1HitRate + analytics.tp2HitRate + analytics.tp3HitRate) / 3;
  }, [analytics]);

  // TOP PERFORMERS: Calculate ACTUAL PnL from sell_transactions
  // The backend realized_pnl_sol is unreliable - we must compute from actual tx data
  const topPerformers = useMemo(() => {
    // Get closed positions and calculate ACTUAL PnL from transactions
    const closedWithActualPnl = backendTokenPerformance
      .filter(t => t.status === 'closed')
      .map(t => {
        // Calculate actual PnL: sum of sol_received from sells - entry cost
        const totalReturned = t.sellTransactions.reduce(
          (sum, tx) => sum + (tx.sol_received || 0),
          0
        );
        const actualPnl = totalReturned - t.investedSol;
        const actualPnlPct = t.investedSol > 0 ? (actualPnl / t.investedSol) * 100 : 0;

        return {
          ...t,
          calculatedPnl: actualPnl,
          calculatedPnlPct: actualPnlPct,
          totalReturned,
        };
      })
      // Filter to only ACTUALLY profitable (returned > invested)
      .filter(t => t.calculatedPnl > 0)
      // Sort by actual PnL descending
      .sort((a, b) => b.calculatedPnl - a.calculatedPnl)
      .slice(0, 3);

    // Debug log to verify correct calculation
    if (closedWithActualPnl.length > 0) {
      console.log('[TopTrades] Top 3 profitable (calculated from sell_transactions):');
      closedWithActualPnl.forEach((t, i) => {
        console.log(`  ${i+1}. ${t.ticker}: invested=${t.investedSol.toFixed(3)}, returned=${t.totalReturned.toFixed(3)}, pnl=${t.calculatedPnl.toFixed(3)} (${t.calculatedPnlPct.toFixed(1)}%)`);
      });
    }

    // Map to our TokenPerformance format for display
    return closedWithActualPnl.map((t): TokenPerformance => ({
      positionId: t.positionId,
      mint: t.mint,
      tokenName: t.tokenName,
      ticker: t.ticker,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      investedSol: t.investedSol,
      totalPnlSol: t.calculatedPnl, // Use ACTUAL calculated PnL
      pnlPct: t.calculatedPnlPct,
      peakPnlPct: t.peakPnlPct,
      holdTimeMinutes: t.holdTimeMinutes,
      status: t.status,
      tp1Hit: t.tp1Hit,
      tp2Hit: t.tp2Hit,
      tp3Hit: t.tp3Hit,
      buySignature: t.buySignature,
      sellTransactions: t.sellTransactions,
    }));
  }, [backendTokenPerformance]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-black/40 backdrop-blur-xl md:rounded-2xl md:border md:border-white/10"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#c4f70e]/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none hidden md:block"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 px-0 py-5 md:p-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-6 px-4 md:px-0 md:flex-row md:justify-between">
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
          <div className="flex gap-1 rounded-full bg-white/5 p-1 w-fit">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'targets', label: 'Targets' },
              { id: 'performance', label: 'Trades', desktopLabel: 'Top Trades' },
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
                <span className="md:hidden">{tab.label}</span>
                <span className="hidden md:inline">{'desktopLabel' in tab ? tab.desktopLabel : tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center px-4 md:px-0">
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
                  <CountUp to={analytics.totalPnlSol} decimals={3} duration={1.5} /><SolIcon size={20} className="ml-2" />
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
                    <span className="md:hidden">Avg PNL</span>
                    <span className="hidden md:inline">Avg Multiplier</span>
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
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center px-4 md:px-0">
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
          <div className="space-y-4 md:px-0">
            {topPerformers.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-white/40 px-4">
                No trades yet
              </div>
            ) : (
              <>
                {/* Top Performers Grid */}
                <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
                  {topPerformers.map((token, idx) => {
                    const isProfit = token.totalPnlSol >= 0;
                    const totalSellsReceived = token.sellTransactions.reduce((sum, tx) => sum + tx.sol_received, 0);
                    const multiplier = (token.pnlPct / 100) + 1;

                    return (
                      <motion.div
                        key={token.mint}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.1 + idx * 0.1, type: 'spring', stiffness: 200 }}
                        onClick={() => setSelectedToken(token)}
                        className="relative overflow-hidden px-4 py-3 cursor-pointer transition-all duration-300 bg-gradient-to-br from-black to-zinc-900/80 md:rounded-xl md:border md:border-white/10 md:p-4 md:hover:scale-[1.02] md:hover:shadow-xl md:hover:border-white/20 group"
                      >
                        {/* Header: Token + PnL + Multiplier */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <TokenAvatar
                              symbol={token.ticker}
                              mint={token.mint}
                              size={40}
                              rounded="lg"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm truncate">${token.ticker}</span>
                                <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                                  <Clock className="w-3 h-3" />
                                  {token.holdTimeMinutes !== null ? `${Math.round(token.holdTimeMinutes)}m` : '-'}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/40 truncate">{token.tokenName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                "text-sm font-bold",
                                isProfit ? "text-emerald-400" : "text-red-400"
                              )}>
                                {isProfit ? "+" : ""}{token.totalPnlSol.toFixed(1)}
                              </span>
                              <SolIcon size={14} className="ml-0.5" />
                            </div>
                            <span className={cn(
                              "text-xl font-bold",
                              isProfit ? "text-emerald-400" : "text-red-400"
                            )}>
                              {multiplier.toFixed(2)}X
                            </span>
                          </div>
                        </div>

                        {/* Entry → Sales Row */}
                        <div className="flex items-center gap-2 text-xs mb-3">
                          <div className="flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-blue-400" />
                            <span className="text-white/50">{token.investedSol.toFixed(3)}</span>
                          </div>
                          <span className="text-white/20">→</span>
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">
                              {totalSellsReceived > 0 ? totalSellsReceived.toFixed(3) : '-'}
                            </span>
                            {token.sellTransactions.length > 0 && (
                              <span className="text-white/30">({token.sellTransactions.length})</span>
                            )}
                          </div>
                          <div className="flex-1" />
                          {/* Status + TPs on right */}
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-medium",
                              token.status === 'closed' ? "bg-white/5 text-white/50" : "bg-emerald-500/10 text-emerald-400/70"
                            )}>
                              {token.status === 'closed' ? 'Closed' : token.status === 'partially_closed' ? 'Partial' : 'Open'}
                            </span>
                            {(token.tp1Hit || token.tp2Hit || token.tp3Hit) && (
                              <>
                                <div className="w-px h-3 bg-white/20" />
                                <div className="flex items-center gap-1">
                                  {token.tp1Hit && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#c4f70e]/15 text-[#c4f70e]">TP1</span>
                                  )}
                                  {token.tp2Hit && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#c4f70e]/15 text-[#c4f70e]">TP2</span>
                                  )}
                                  {token.tp3Hit && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#c4f70e]/15 text-[#c4f70e]">TP3</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Hover shine */}
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
                  className="flex items-center justify-between pt-4 border-t border-white/10 text-sm px-4 md:px-0"
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
        buySignature={selectedToken?.buySignature}
        entrySolValue={selectedToken?.investedSol}
        entryTime={selectedToken?.entryTime}
        initialQuantity={undefined}
      />
    </motion.div>
  );
}
