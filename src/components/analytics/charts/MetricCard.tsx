/**
 * MetricCard Component - REDESIGNED
 *
 * Modern glassmorphism design with sparklines, gradient accents, and animations.
 * Way more compact and visually appealing than the previous version.
 */

import { motion } from 'motion/react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  format?: 'number' | 'percentage' | 'currency';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  color?: string;
  subtext?: string;
  sparklineData?: number[];  // Mini chart data
  className?: string;
}

const BRAND_COLORS = {
  primary: '#68ac6e',
  red: '#ff0033',
  amber: '#ffaa00',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  neutral: '#888888',
};

function getTrendIcon(trend?: 'up' | 'down' | 'neutral') {
  switch (trend) {
    case 'up':
      return <ArrowUp className="w-3.5 h-3.5" />;
    case 'down':
      return <ArrowDown className="w-3.5 h-3.5" />;
    case 'neutral':
      return <Minus className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

function getTrendColor(trend?: 'up' | 'down' | 'neutral') {
  switch (trend) {
    case 'up':
      return BRAND_COLORS.primary;
    case 'down':
      return BRAND_COLORS.red;
    case 'neutral':
      return BRAND_COLORS.neutral;
    default:
      return BRAND_COLORS.neutral;
  }
}

function formatValue(value: number, format: MetricCardProps['format'], decimals: number): string {
  switch (format) {
    case 'percentage':
      return value.toFixed(decimals);
    case 'currency':
      return value.toFixed(decimals);
    case 'number':
    default:
      return value.toFixed(decimals);
  }
}

/**
 * Mini Sparkline Chart Component
 */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = useMemo(() => {
    if (data.length < 2) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const width = 100;
    const height = 24;
    const step = width / (data.length - 1);

    return data
      .map((value, i) => {
        const x = i * step;
        const y = height - ((value - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [data]);

  if (data.length < 2) return null;

  return (
    <svg width="100" height="24" className="absolute bottom-0 right-3 opacity-20">
      <motion.path
        d={points}
        stroke={color}
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  );
}

/**
 * MetricCard - Ultra-modern animated card with glassmorphism
 */
export function MetricCard({
  label,
  value,
  suffix = '',
  decimals = 0,
  format = 'number',
  trend,
  trendValue,
  color = BRAND_COLORS.primary,
  subtext,
  sparklineData,
  className = '',
}: MetricCardProps) {
  const formattedValue = formatValue(value, format, decimals);

  return (
    <motion.div
      className={`
        relative group
        rounded-2xl overflow-hidden
        bg-gradient-to-br from-white/[0.08] to-white/[0.02]
        backdrop-blur-xl
        border border-white/[0.12]
        p-4
        ${className}
      `}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        scale: 1.02,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.2)',
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut"
      }}
    >
      {/* Gradient Glow on Hover */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${color}30, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Label & Trend */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">
            {label}
          </div>
          {trend && (
            <motion.div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm"
              style={{
                backgroundColor: `${getTrendColor(trend)}20`,
                color: getTrendColor(trend),
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              {getTrendIcon(trend)}
              {trendValue !== undefined && (
                <span>{Math.abs(trendValue).toFixed(1)}%</span>
              )}
            </motion.div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <div
            className="text-3xl font-black tracking-tight"
            style={{
              color,
              textShadow: `0 0 20px ${color}40`
            }}
          >
            <AnimatedCounter
              value={parseFloat(formattedValue)}
              decimals={decimals}
            />
          </div>
          <span
            className="text-xl font-bold opacity-80"
            style={{ color }}
          >
            {suffix}
          </span>
        </div>

        {/* Subtext */}
        {subtext && (
          <div className="text-xs text-white/40 font-medium">
            {subtext}
          </div>
        )}
      </div>

      {/* Sparkline Background Chart */}
      {sparklineData && sparklineData.length > 0 && (
        <Sparkline data={sparklineData} color={color} />
      )}

      {/* Border Gradient on Hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color}40, transparent 50%, ${color}20)`,
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
