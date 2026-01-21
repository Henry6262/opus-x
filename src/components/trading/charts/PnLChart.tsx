/**
 * P&L Over Time Chart
 *
 * Shows cumulative profit/loss and daily P&L trends.
 */

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { DailyTradingMetrics } from '@/types/trading';

interface PnLChartProps {
  dailyMetrics: DailyTradingMetrics[];
  chartType: 'cumulative' | 'daily';
}

export function PnLChart({ dailyMetrics, chartType }: PnLChartProps) {
  const chartData = useMemo(() => {
    if (chartType === 'cumulative') {
      // Calculate cumulative P&L
      let cumulativePnl = 0;
      return dailyMetrics.map(metric => {
        cumulativePnl += metric.totalPnlSol;
        return {
          date: metric.date,
          pnl: parseFloat(cumulativePnl.toFixed(4)),
          trades: metric.totalTrades,
        };
      });
    } else {
      // Daily P&L
      return dailyMetrics.map(metric => ({
        date: metric.date,
        pnl: parseFloat(metric.totalPnlSol.toFixed(4)),
        trades: metric.totalTrades,
        winningTrades: metric.winningTrades,
        losingTrades: metric.losingTrades,
      }));
    }
  }, [dailyMetrics, chartType]);

  if (dailyMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        No trading data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm text-gray-300 mb-2">
          {format(new Date(data.date), 'MMM dd, yyyy')}
        </p>
        <p className="text-sm font-semibold" style={{ color: data.pnl >= 0 ? '#10b981' : '#ef4444' }}>
          P&L: {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(4)} SOL
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {data.trades} trade{data.trades !== 1 ? 's' : ''}
        </p>
        {chartType === 'daily' && (
          <p className="text-xs text-gray-400">
            {data.winningTrades}W / {data.losingTrades}L
          </p>
        )}
      </div>
    );
  };

  if (chartType === 'cumulative') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM dd')}
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value.toFixed(2)} SOL`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="pnl"
            name="Cumulative P&L"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => format(new Date(date), 'MMM dd')}
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `${value.toFixed(2)} SOL`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="pnl"
          name="Daily P&L"
          fill="#3b82f6"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
