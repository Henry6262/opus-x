/**
 * MetricSelector Component
 *
 * Dropdown selector for switching between different metrics (Win Rate, P&L, etc.).
 * Used in analytics charts to change the displayed metric.
 */

import { METRIC_OPTIONS, type MetricType } from '@/types/versioning';

interface MetricSelectorProps {
  selectedMetric: MetricType;
  onChange: (metric: MetricType) => void;
  className?: string;
}

/**
 * MetricSelector - Dropdown for selecting chart metrics
 *
 * @example
 * ```tsx
 * <MetricSelector
 *   selectedMetric={selectedMetric}
 *   onChange={setSelectedMetric}
 * />
 * ```
 */
export function MetricSelector({
  selectedMetric,
  onChange,
  className = '',
}: MetricSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-white/60 font-medium">
        Metric:
      </label>
      <select
        value={selectedMetric}
        onChange={(e) => onChange(e.target.value as MetricType)}
        className="
          bg-white/[0.05]
          border border-white/[0.1]
          rounded-lg
          px-4 py-2
          text-white
          text-sm
          font-medium
          hover:bg-white/[0.08]
          focus:outline-none
          focus:ring-2
          focus:ring-[#68ac6e]/50
          transition-colors
          cursor-pointer
        "
      >
        {METRIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
