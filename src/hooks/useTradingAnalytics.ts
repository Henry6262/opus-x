/**
 * Trading Analytics Hook
 *
 * Fetches and calculates overall trading metrics from position data.
 * Powers charts, cards, and tables in TradingAnalyticsDashboard.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { tradingApi } from '@/lib/trading-api';
import type {
  TradingPosition,
  TradingAnalytics,
  DailyTradingMetrics,
  TokenPerformance,
} from '@/types/trading';

export function useTradingAnalytics(dateRange?: { start: string; end: string }) {
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: TradingPosition[];
      if (dateRange) {
        data = await tradingApi.getPositionsByDateRange(dateRange.start, dateRange.end);
      } else {
        data = await tradingApi.getPositions();
      }

      setPositions(data);
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
    const totalTrades = positions.length;
    const openPositions = positions.filter(p => p.status === 'open').length;
    const closedPositions = positions.filter(p => p.status === 'closed' || p.status === 'partially_closed').length;

    const totalInvestedSol = positions.reduce((sum, p) => sum + p.entry_sol_value, 0);
    const totalRealizedPnl = positions.reduce((sum, p) => sum + p.realized_pnl_sol, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl_sol || 0), 0);
    const totalPnlSol = totalRealizedPnl + totalUnrealizedPnl;
    const totalPnlPct = totalInvestedSol > 0 ? (totalPnlSol / totalInvestedSol) * 100 : 0;

    // Win rate (positions that hit TP1 or are profitable)
    const profitablePositions = positions.filter(
      p => p.tp1_hit || p.realized_pnl_sol > 0 || p.unrealized_pnl_sol > 0
    );
    const winRate = totalTrades > 0 ? (profitablePositions.length / totalTrades) * 100 : 0;

    // Average multiplier (from peak P&L)
    const avgMultiplier = totalTrades > 0
      ? positions.reduce((sum, p) => sum + ((p.peak_pnl_pct / 100) + 1), 0) / totalTrades
      : 0;

    // Hold time (only for closed positions)
    const closedWithTime = positions.filter(p => p.closed_at);
    const avgHoldTimeMinutes = closedWithTime.length > 0
      ? closedWithTime.reduce((sum, p) => {
          const entryTime = new Date(p.entry_time).getTime();
          const closeTime = new Date(p.closed_at!).getTime();
          return sum + (closeTime - entryTime) / (1000 * 60);
        }, 0) / closedWithTime.length
      : 0;

    // Best and worst trades
    const bestTradePct = positions.length > 0
      ? Math.max(...positions.map(p => p.peak_pnl_pct))
      : 0;
    const worstTradePct = positions.length > 0
      ? Math.min(...positions.map(p => p.unrealized_pnl_pct))
      : 0;

    // TP hit rates
    const tp1HitRate = totalTrades > 0 ? (positions.filter(p => p.tp1_hit).length / totalTrades) * 100 : 0;
    const tp2HitRate = totalTrades > 0 ? (positions.filter(p => p.tp2_hit).length / totalTrades) * 100 : 0;
    const tp3HitRate = totalTrades > 0 ? (positions.filter(p => p.tp3_hit).length / totalTrades) * 100 : 0;

    return {
      totalTrades,
      openPositions,
      closedPositions,
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
  }, [positions]);

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
        const winningTrades = dayPositions.filter(
          p => p.tp1_hit || p.realized_pnl_sol > 0 || p.unrealized_pnl_sol > 0
        ).length;
        const losingTrades = totalTrades - winningTrades;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const totalPnlSol = dayPositions.reduce(
          (sum, p) => sum + p.realized_pnl_sol + (p.unrealized_pnl_sol || 0),
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
        const totalPnlSol = p.realized_pnl_sol + (p.unrealized_pnl_sol || 0);
        const pnlPct = p.entry_sol_value > 0 ? (totalPnlSol / p.entry_sol_value) * 100 : 0;

        let holdTimeMinutes: number | null = null;
        if (p.closed_at) {
          const entryTime = new Date(p.entry_time).getTime();
          const closeTime = new Date(p.closed_at).getTime();
          holdTimeMinutes = (closeTime - entryTime) / (1000 * 60);
        }

        return {
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
