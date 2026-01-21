/**
 * Trade Outcomes Distribution Chart
 *
 * Pie chart showing win/loss distribution and TP hit rates.
 */

'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import type { TradingAnalytics } from '@/types/trading';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface TradeOutcomesChartProps {
  analytics: TradingAnalytics;
}

type OutcomeView = 'win-loss' | 'tp-hits' | 'target-efficiency';

const BRAND = '#c4f70e';
const MUTED = 'rgba(196, 247, 14, 0.2)';
const BRAND_TONES = [BRAND, 'rgba(196, 247, 14, 0.6)', 'rgba(196, 247, 14, 0.35)'];

export function TradeOutcomesChart({ analytics }: TradeOutcomesChartProps) {
  const [view, setView] = useState<OutcomeView>('win-loss');

  const winLossData = useMemo(() => {
    const totalTrades = analytics.totalTrades;
    const wins = Math.round((analytics.winRate / 100) * totalTrades);
    const losses = totalTrades - wins;

    return [
      { key: 'wins', name: 'Wins', value: wins, percentage: analytics.winRate },
      { key: 'losses', name: 'Losses', value: losses, percentage: 100 - analytics.winRate },
    ];
  }, [analytics]);

  const tpHitData = useMemo(() => {
    return [
      { key: 'tp1', name: 'TP1 Hit', value: analytics.tp1HitRate },
      { key: 'tp2', name: 'TP2 Hit', value: analytics.tp2HitRate },
      { key: 'tp3', name: 'TP3 Hit', value: analytics.tp3HitRate },
    ];
  }, [analytics]);

  const avgTargetEfficiency = useMemo(() => {
    return (analytics.tp1HitRate + analytics.tp2HitRate + analytics.tp3HitRate) / 3;
  }, [analytics]);

  const efficiencyData = useMemo(() => {
    return [
      { key: 'hit', name: 'Hit', value: avgTargetEfficiency, percentage: avgTargetEfficiency },
      { key: 'miss', name: 'Miss', value: Math.max(0, 100 - avgTargetEfficiency), percentage: Math.max(0, 100 - avgTargetEfficiency) },
    ];
  }, [avgTargetEfficiency]);

  const chartConfig = useMemo<ChartConfig>(() => {
    if (view === 'tp-hits') {
      return {
        tp1: { label: 'TP1 Hit', color: BRAND_TONES[0] },
        tp2: { label: 'TP2 Hit', color: BRAND_TONES[1] },
        tp3: { label: 'TP3 Hit', color: BRAND_TONES[2] },
      };
    }
    if (view === 'target-efficiency') {
      return {
        hit: { label: 'Target Hit', color: BRAND },
        miss: { label: 'Target Miss', color: MUTED },
      };
    }
    return {
      wins: { label: 'Wins', color: BRAND },
      losses: { label: 'Losses', color: MUTED },
    };
  }, [view]);

  const activeData = view === 'win-loss' ? winLossData : view === 'tp-hits' ? tpHitData : efficiencyData;
  const totalValue = view === 'tp-hits'
    ? avgTargetEfficiency
    : activeData.reduce((sum, item) => sum + item.value, 0);
  const centerLabel = view === 'win-loss'
    ? `${analytics.totalTrades.toLocaleString()}`
    : view === 'target-efficiency'
      ? `${Math.round(avgTargetEfficiency)}%`
      : `${Math.round(totalValue)}%`;
  const centerSubLabel = view === 'win-loss'
    ? 'Trades'
    : view === 'target-efficiency'
      ? 'Accuracy'
      : 'Avg TP Hit';

  if (analytics.totalTrades === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No trading data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr] gap-6 items-center">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex w-full items-center justify-center"
      >
        <ChartContainer config={chartConfig} className="mx-auto h-[175px] w-full max-w-[360px]">
          <RadialBarChart
            data={activeData}
            endAngle={180}
            cx="50%"
            cy="58%"
            innerRadius={80}
            outerRadius={125}
          >
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  className="bg-slate-900/90 text-white border-white/10"
                />
              }
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 8}
                          className="fill-white/90 text-2xl font-bold"
                        >
                          {centerLabel}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 12}
                          className="fill-white/50 text-xs"
                        >
                          {centerSubLabel}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            {activeData.map((item) => (
              <RadialBar
                key={item.key}
                dataKey="value"
                data={[item]}
                stackId="a"
                cornerRadius={6}
                fill={`var(--color-${item.key})`}
                className="stroke-transparent stroke-2"
              />
            ))}
          </RadialBarChart>
        </ChartContainer>
      </motion.div>
      <div className="hidden md:block h-[180px] w-px bg-gradient-to-b from-white/0 via-white/15 to-white/0" />

      <motion.div
        key={`${view}-details`}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <div className="flex flex-wrap justify-center gap-2 md:flex-nowrap">
          {[
            { id: 'win-loss', label: 'Win/Loss' },
            { id: 'tp-hits', label: 'TP Hits' },
            { id: 'target-efficiency', label: 'Accuracy' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setView(option.id as OutcomeView)}
              className={`rounded-full px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition whitespace-nowrap cursor-pointer ${
                view === option.id
                  ? 'bg-[#c4f70e]/25 text-[#c4f70e] shadow-[0_0_18px_rgba(196,247,14,0.2)]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/15 to-white/0" />

        <div className="space-y-4 px-2 md:px-4">
          {view === 'win-loss' && (
            <>
              {winLossData.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-base">
                  <span className="text-white/70 uppercase tracking-[0.2em] text-[12px]">
                    {item.name}
                  </span>
                  <span className="text-lg font-semibold text-white">
                    {item.value} <span className="text-white/50 text-sm">({Math.round(item.percentage)}%)</span>
                  </span>
                </div>
              ))}
              <p className="text-sm text-white/40">
                {Math.round(analytics.winRate)}% win rate over {analytics.totalTrades} total trades.
              </p>
            </>
          )}
          {view === 'tp-hits' && (
            <>
              {tpHitData.map((item, index) => (
                <div key={item.key} className="flex items-center justify-between text-base">
                  <span className="text-white/70 uppercase tracking-[0.2em] text-[12px]">
                    {item.name}
                  </span>
                  <span className="text-lg font-semibold" style={{ color: BRAND_TONES[index] }}>
                    {Math.round(item.value)}%
                  </span>
                </div>
              ))}
              <p className="text-sm text-white/40">
                Higher tiers use the same brand tone, just quieter.
              </p>
            </>
          )}
          {view === 'target-efficiency' && (
            <>
              {efficiencyData.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-base">
                  <span className="text-white/70 uppercase tracking-[0.2em] text-[12px]">
                    {item.name}
                  </span>
                  <span className="text-lg font-semibold text-white">
                    {Math.round(item.value)}%
                  </span>
                </div>
              ))}
              <p className="text-sm text-white/40">
                Average efficiency across TP1, TP2, and TP3 hit rates.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
