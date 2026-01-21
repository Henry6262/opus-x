/**
 * Trading Analytics Dashboard
 *
 * Overall trading performance dashboard using real position data.
 * Shows metrics, charts, and rankings for all trades.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { subDays } from 'date-fns';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { TradeOutcomesChart } from './charts/TradeOutcomesChart';
import { TokenPerformanceTable } from './charts/TokenPerformanceTable';

export function TradingAnalyticsDashboard() {
  const [dateRange] = useState({
    start: subDays(new Date(), 30).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { analytics, tokenPerformance, loading, error } =
    useTradingAnalytics(dateRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-gray-400">Loading trading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Overall Trading Analytics</h2>
        </div>
      </div>

      {/* Trade Outcomes */}
      <div>
        <TradeOutcomesChart analytics={analytics} />
      </div>

      {/* Token Performance Table */}
      <div className="rounded-lg border border-white/10 px-6 py-5">
        <h3 className="text-lg font-semibold text-white mb-6">Token Performance Rankings</h3>
        <TokenPerformanceTable tokenPerformance={tokenPerformance} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-white/10 px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">Total Invested</div>
          <div className="text-lg font-semibold text-white">
            {analytics.totalInvestedSol.toFixed(4)} SOL
          </div>
        </div>
        <div className="rounded-lg border border-white/10 px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">Avg Hold Time</div>
          <div className="text-lg font-semibold text-white">
            {Math.floor(analytics.avgHoldTimeMinutes / 60)}h {Math.floor(analytics.avgHoldTimeMinutes % 60)}m
          </div>
        </div>
        <div className="rounded-lg border border-white/10 px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">Best Trade</div>
          <div className="text-lg font-semibold text-green-400">
            +{analytics.bestTradePct.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg border border-white/10 px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">Worst Trade</div>
          <div className="text-lg font-semibold text-red-400">
            {analytics.worstTradePct.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
