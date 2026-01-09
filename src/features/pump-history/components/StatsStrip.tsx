import type { TokenStats } from "../types";

interface StatsStripProps {
  stats: TokenStats;
  isLoading: boolean;
}

export function StatsStrip({ stats, isLoading }: StatsStripProps) {
  const metrics = [
    {
      label: "Total Tracked",
      value: stats.total,
      color: "solana-cyan",
      glowColor: "rgba(20, 241, 149, 0.5)",
    },
    {
      label: "Labeled",
      value: stats.labeled,
      color: "matrix-green",
      glowColor: "rgba(0, 255, 65, 0.5)",
    },
    {
      label: "Unlabeled",
      value: stats.unlabeled,
      color: "warning-amber",
      glowColor: "rgba(255, 170, 0, 0.5)",
    },
    {
      label: "Needs Review",
      value: stats.byStatus.needs_review,
      color: "alert-red",
      glowColor: "rgba(255, 0, 51, 0.5)",
    },
  ];

  return (
    <div className="stats-strip">
      {metrics.map((metric, index) => (
        <div key={metric.label} className="stats-strip-item">
          <div className="stats-strip-content">
            <span className="stats-strip-label">{metric.label}</span>
            <span
              className="stats-strip-value"
              style={{
                color: `var(--${metric.color})`,
                textShadow: `0 0 12px ${metric.glowColor}`,
              }}
            >
              {isLoading ? "—" : metric.value}
            </span>
            <div
              className="stats-strip-line"
              style={{
                background: `linear-gradient(90deg, var(--${metric.color}) 0%, transparent 100%)`,
                boxShadow: `0 0 8px ${metric.glowColor}`,
              }}
            />
          </div>
          {index < metrics.length - 1 && <div className="stats-strip-separator" />}
        </div>
      ))}
    </div>
  );
}
