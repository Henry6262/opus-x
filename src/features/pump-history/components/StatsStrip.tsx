import type { TokenStats } from "../types";

interface StatsStripProps {
  stats: TokenStats;
  isLoading: boolean;
}

export function StatsStrip({ stats, isLoading }: StatsStripProps) {
  const cards = [
    {
      label: "Total Tracked",
      value: stats.total,
      icon: "📊",
      color: "solana-cyan",
      glowColor: "rgba(20, 241, 149, 0.3)",
    },
    {
      label: "Labeled",
      value: stats.labeled,
      icon: "✓",
      color: "matrix-green",
      glowColor: "rgba(0, 255, 65, 0.3)",
    },
    {
      label: "Unlabeled",
      value: stats.unlabeled,
      icon: "◯",
      color: "warning-amber",
      glowColor: "rgba(255, 170, 0, 0.3)",
    },
    {
      label: "Needs Review",
      value: stats.byStatus.needs_review,
      icon: "⚠",
      color: "alert-red",
      glowColor: "rgba(255, 0, 51, 0.3)",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card-glass relative overflow-hidden group hover:border-brand-primary/50 transition-all duration-300"
        >
          {/* Background glow effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at center, ${card.glowColor} 0%, transparent 70%)`,
            }}
          />

          {/* Content */}
          <div className="relative space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40 font-semibold">
                {card.label}
              </span>
              <span className="text-2xl opacity-50">{card.icon}</span>
            </div>

            <div
              className="text-4xl font-bold font-mono"
              style={{
                color: `var(--${card.color})`,
                textShadow: `0 0 10px ${card.glowColor}`,
              }}
            >
              {isLoading ? (
                <span className="opacity-30">—</span>
              ) : (
                card.value
              )}
            </div>

            {/* Bottom indicator line */}
            <div
              className="h-1 rounded-full"
              style={{
                background: `linear-gradient(90deg, var(--${card.color}) 0%, transparent 100%)`,
                boxShadow: `0 0 8px ${card.glowColor}`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
