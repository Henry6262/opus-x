/**
 * Trading Analytics Hook
 *
 * Fetches and calculates overall trading metrics from position data.
 * Powers charts, cards, and tables in TradingAnalyticsDashboard.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { tradingApi, type BackendTradingStats } from '@/lib/trading-api';
import type {
  TradingPosition,
  TradingAnalytics,
  DailyTradingMetrics,
  TokenPerformance,
} from '@/types/trading';

export function useTradingAnalytics(dateRange?: { start: string; end: string }) {
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [backendStats, setBackendStats] = useState<BackendTradingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch positions AND backend stats
      // Backend stats use Birdeye PnL cache (SINGLE SOURCE OF TRUTH)
      const [openPositions, historyPositions, stats] = await Promise.all([
        tradingApi.getPositions(),
        tradingApi.getHistory(500), // Get last 500 closed positions
        tradingApi.getStats(), // Get accurate stats from backend
      ]);

      // Merge and deduplicate by position ID
      const allPositions = [...openPositions];
      const openIds = new Set(openPositions.map(p => p.id));

      for (const pos of historyPositions) {
        if (!openIds.has(pos.id)) {
          allPositions.push(pos);
        }
      }

      // Apply date range filter if provided
      // Include positions if they were ENTERED or CLOSED within the date range
      // This ensures we capture all relevant activity for the selected period
      let filteredPositions = allPositions;
      if (dateRange) {
        filteredPositions = allPositions.filter(p => {
          const entryDate = new Date(p.entry_time).toISOString().split('T')[0];
          const closeDate = p.closed_at ? new Date(p.closed_at).toISOString().split('T')[0] : null;

          // Include if entered during range
          const enteredDuringRange = entryDate >= dateRange.start && entryDate <= dateRange.end;
          // Include if closed during range
          const closedDuringRange = closeDate && closeDate >= dateRange.start && closeDate <= dateRange.end;
          // Include if still open and entered before/during range
          const stillOpenAndRelevant = !closeDate && entryDate <= dateRange.end;

          return enteredDuringRange || closedDuringRange || stillOpenAndRelevant;
        });
      }

      setPositions(filteredPositions);
      setBackendStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Calculate overall analytics
  const analytics: TradingAnalytics = useMemo(() => {
    // Use backend stats as SINGLE SOURCE OF TRUTH (uses Birdeye PnL cache)
    if (backendStats) {
      const totalTrades = positions.length;
      const openPositionsList = positions.filter(p => p.status === 'open');
      const closedPositionsList = positions.filter(p => p.status === 'closed' || p.status === 'partially_closed');

      const totalInvestedSol = positions.reduce((sum, p) => sum + p.entry_sol_value, 0);

      // Use backend stats for accurate Birdeye-synced data
      const totalPnlSol = backendStats.total_pnl;
      const totalPnlPct = totalInvestedSol > 0 ? (totalPnlSol / totalInvestedSol) * 100 : 0;
      const winRate = backendStats.win_rate;
      const avgHoldTimeMinutes = backendStats.avg_hold_time_minutes;
      const bestTradePct = backendStats.best_trade_pct;
      const worstTradePct = backendStats.worst_trade_pct;

      // Calculate multiplier from positions (not in backend stats)
      const avgMultiplier = totalTrades > 0
        ? positions.reduce((sum, p) => sum + ((p.peak_pnl_pct / 100) + 1), 0) / totalTrades
        : 0;

      // TP hit rates - ONLY count closed positions (open trades haven't had chance to hit TPs)
      const tp1HitRate = closedPositionsList.length > 0
        ? (closedPositionsList.filter(p => p.tp1_hit).length / closedPositionsList.length) * 100
        : 0;
      const tp2HitRate = closedPositionsList.length > 0
        ? (closedPositionsList.filter(p => p.tp2_hit).length / closedPositionsList.length) * 100
        : 0;
      const tp3HitRate = closedPositionsList.length > 0
        ? (closedPositionsList.filter(p => p.tp3_hit).length / closedPositionsList.length) * 100
        : 0;

      return {
        totalTrades,
        openPositions: openPositionsList.length,
        closedPositions: closedPositionsList.length,
        totalInvestedSol,
        totalPnlSol,
        totalPnlPct,
        winRate,
        avgMultiplier,
        avgHoldTimeMinutes,
        bestTradePct,
        worstTradePct,
        tp1HitRate,
        tp2HitRate,
        tp3HitRate,
      };
    }

    // Fallback to manual calculation if backend stats not available
    const totalTrades = positions.length;
    const openPositionsList = positions.filter(p => p.status === 'open');
    const closedPositionsList = positions.filter(p => p.status === 'closed' || p.status === 'partially_closed');

    const totalInvestedSol = positions.reduce((sum, p) => sum + p.entry_sol_value, 0);
    const totalPnlSol = positions.reduce((sum, p) => sum + p.realized_pnl_sol, 0);
    const totalPnlPct = totalInvestedSol > 0 ? (totalPnlSol / totalInvestedSol) * 100 : 0;

    const profitableClosedPositions = closedPositionsList.filter(
      p => p.tp1_hit || p.realized_pnl_sol > 0
    );
    const winRate = closedPositionsList.length > 0 ? (profitableClosedPositions.length / closedPositionsList.length) * 100 : 0;

    const avgMultiplier = totalTrades > 0
      ? positions.reduce((sum, p) => sum + ((p.peak_pnl_pct / 100) + 1), 0) / totalTrades
      : 0;

    const closedWithTime = closedPositionsList.filter(p => p.closed_at);
    const avgHoldTimeMinutes = closedWithTime.length > 0
      ? closedWithTime.reduce((sum, p) => {
        const entryTime = new Date(p.entry_time).getTime();
        const closeTime = new Date(p.closed_at!).getTime();
        return sum + (closeTime - entryTime) / (1000 * 60);
      }, 0) / closedWithTime.length
      : 0;

    const bestTradePct = positions.length > 0
      ? Math.max(...positions.map(p => p.peak_pnl_pct))
      : 0;
    const worstTradePct = positions.length > 0
      ? Math.min(...positions.map(p => p.unrealized_pnl_pct))
      : 0;

    const tp1HitRate = closedPositionsList.length > 0
      ? (closedPositionsList.filter(p => p.tp1_hit).length / closedPositionsList.length) * 100
      : 0;
    const tp2HitRate = closedPositionsList.length > 0
      ? (closedPositionsList.filter(p => p.tp2_hit).length / closedPositionsList.length) * 100
      : 0;
    const tp3HitRate = closedPositionsList.length > 0
      ? (closedPositionsList.filter(p => p.tp3_hit).length / closedPositionsList.length) * 100
      : 0;

    return {
      totalTrades,
      openPositions: openPositionsList.length,
      closedPositions: closedPositionsList.length,
      totalInvestedSol,
      totalPnlSol,
      totalPnlPct,
      winRate,
      avgMultiplier,
      avgHoldTimeMinutes,
      bestTradePct,
      worstTradePct,
      tp1HitRate,
      tp2HitRate,
      tp3HitRate,
    };
  }, [positions, backendStats]);

  // Calculate daily metrics for charts
  const dailyMetrics: DailyTradingMetrics[] = useMemo(() => {
    const dateMap = new Map<string, TradingPosition[]>();

    // Group positions by entry date
    positions.forEach(p => {
      const date = new Date(p.entry_time).toISOString().split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(p);
    });

    // Calculate metrics for each date
    return Array.from(dateMap.entries())
      .map(([date, dayPositions]) => {
        const totalTrades = dayPositions.length;
        // Only count trades with realized profit (actual SOL received)
        const winningTrades = dayPositions.filter(
          p => p.tp1_hit || p.realized_pnl_sol > 0
        ).length;
        const losingTrades = totalTrades - winningTrades;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        // ONLY use realized_pnl_sol - we don't count unrealized profits
        const totalPnlSol = dayPositions.reduce(
          (sum, p) => sum + p.realized_pnl_sol,
          0
        );

        const avgMultiplier = totalTrades > 0
          ? dayPositions.reduce((sum, p) => sum + ((p.peak_pnl_pct / 100) + 1), 0) / totalTrades
          : 0;

        const totalInvestedSol = dayPositions.reduce((sum, p) => sum + p.entry_sol_value, 0);

        return {
          date,
          totalTrades,
          winningTrades,
          losingTrades,
          winRate,
          totalPnlSol,
          avgMultiplier,
          totalInvestedSol,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [positions]);

  // Token performance ranking
  const tokenPerformance: TokenPerformance[] = useMemo(() => {
    return positions
      .map(p => {
        // ONLY use realized_pnl_sol - we don't count unrealized profits
        const totalPnlSol = p.realized_pnl_sol;
        const pnlPct = p.entry_sol_value > 0 ? (totalPnlSol / p.entry_sol_value) * 100 : 0;

        let holdTimeMinutes: number | null = null;
        if (p.closed_at) {
          const entryTime = new Date(p.entry_time).getTime();
          const closeTime = new Date(p.closed_at).getTime();
          holdTimeMinutes = (closeTime - entryTime) / (1000 * 60);
        }

        return {
          positionId: p.id,
          mint: p.mint,
          tokenName: p.token_name,
          ticker: p.ticker,
          entryTime: p.entry_time,
          exitTime: p.closed_at,
          entryPrice: p.entry_price,
          exitPrice: p.closed_at ? p.current_price : null,
          investedSol: p.entry_sol_value,
          realizedPnlSol: p.realized_pnl_sol,
          unrealizedPnlSol: p.unrealized_pnl_sol || 0,
          totalPnlSol,
          pnlPct,
          peakPnlPct: p.peak_pnl_pct,
          holdTimeMinutes,
          status: p.status,
          tp1Hit: p.tp1_hit,
          tp2Hit: p.tp2_hit,
          tp3Hit: p.tp3_hit,
          buySignature: p.buy_signature || null,
          sellTransactions: p.sell_transactions || [],
        };
      })
      .sort((a, b) => b.totalPnlSol - a.totalPnlSol); // Sort by total P&L descending
  }, [positions]);

  return {
    positions,
    analytics,
    dailyMetrics,
    tokenPerformance,
    loading,
    error,
    reload: loadPositions,
  };
}
