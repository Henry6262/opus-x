/**
 * Trading Analytics Dashboard
 *
 * Overall trading performance dashboard using real position data.
 * Shows metrics, charts, and rankings for all trades.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radar } from 'lucide-react';
import { subDays } from 'date-fns';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { TradeOutcomesChart } from './charts/TradeOutcomesChart';

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
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Radar className="w-6 h-6 text-[#c4f70e]" />
            Outcome Pulse
          </h2>
        </div>
      </div>

      {/* Trade Outcomes */}
      <div>
        <TradeOutcomesChart analytics={analytics} />
      </div>
    </div>
  );
}
