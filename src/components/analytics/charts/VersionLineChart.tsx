/**
 * VersionLineChart Component
 *
 * Multi-line chart comparing metrics across multiple agent versions.
 * Each version gets its own line with a unique color.
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type {
  AgentVersion,
  VersionMetrics,
  MetricType,
  ChartDataPoint,
} from '@/types/versioning';
import { getMetricValue, formatMetricValue } from '@/types/versioning';

interface VersionLineChartProps {
  versions: AgentVersion[];
  metricsByVersion: Record<string, VersionMetrics[]>;
  selectedMetric: MetricType;
  height?: number;
}

// Color palette for version lines
const VERSION_COLORS = [
  '#68ac6e', // Brand green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
];

/**
 * Transform version metrics into chart-friendly format.
 * Groups data by date with each version as a separate key.
 */
function transformDataForChart(
  metricsByVersion: Record<string, VersionMetrics[]>,
  selectedMetric: MetricType
): ChartDataPoint[] {
  const dateMap = new Map<string, ChartDataPoint>();

  Object.entries(metricsByVersion).forEach(([versionId, metrics]) => {
    metrics.forEach((m) => {
      if (!dateMap.has(m.date)) {
        dateMap.set(m.date, { date: m.date });
      }

      const point = dateMap.get(m.date)!;
      point[versionId] = getMetricValue(m, selectedMetric);
    });
  });

  // Sort by date ascending
  return Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Custom tooltip for the line chart.
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-xl">
      <p className="text-white/80 text-xs font-medium mb-2">
        {format(new Date(label), 'MMM dd, yyyy')}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/60">{entry.name}:</span>
          <span className="text-white font-semibold">{entry.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * VersionLineChart - Multi-line comparison chart
 *
 * @example
 * ```tsx
 * <VersionLineChart
 *   versions={versions}
 *   metricsByVersion={comparisonData.metricsByVersion}
 *   selectedMetric="winRate"
 *   height={400}
 * />
 * ```
 */
export function VersionLineChart({
  versions,
  metricsByVersion,
  selectedMetric,
  height = 400,
}: VersionLineChartProps) {
  const chartData = useMemo(
    () => transformDataForChart(metricsByVersion, selectedMetric),
    [metricsByVersion, selectedMetric]
  );

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white/[0.02] border border-white/[0.08] rounded-xl"
        style={{ height }}
      >
        <p className="text-white/40">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.4)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
            tickFormatter={(date) => format(new Date(date), 'MMM dd')}
          />

          <YAxis
            stroke="rgba(255,255,255,0.4)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
            tickFormatter={(value) => value.toFixed(1)}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
            iconType="line"
            formatter={(value) => {
              const version = versions.find((v) => v.id === value);
              return (
                <span className="text-white/80 text-sm font-medium">
                  {version?.versionName || value}
                </span>
              );
            }}
          />

          {versions.map((version, index) => (
            <Line
              key={version.id}
              type="monotone"
              dataKey={version.id}
              name={version.id}
              stroke={VERSION_COLORS[index % VERSION_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
