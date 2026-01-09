import { Badge } from "@/components/ui";
import type { PumpTokenWithTweet } from "../types";
import type { TokenPnL } from "@/lib/priceTracking";

interface TokenCardProps {
  token: PumpTokenWithTweet;
  isNew?: boolean;
  pnl?: TokenPnL;
}

function formatMarketCap(value: number | null) {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function TokenCard({ token, isNew = false, pnl }: TokenCardProps) {
  const labelStatus = token.labels?.[0]?.status || "unlabeled";

  // Use real PnL data if available
  const pnlPercent = pnl?.pnlPercent;
  const isProfitable = pnlPercent !== undefined && pnlPercent > 0;
  const hasPnlData = pnlPercent !== undefined;

  return (
    <div
      className="card-glass group relative overflow-hidden transition-all duration-300 hover:border-brand-primary/50"
      style={{
        animation: isNew ? "slideInFromRight 300ms ease-out" : undefined,
      }}
    >
      {/* New token indicator */}
      {isNew && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-matrix-green to-transparent animate-pulse" />
      )}

      {/* Card content */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Token info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-bold font-display text-brand-primary">
                {token.symbol}
              </div>
              <div className="text-sm text-white/50">{token.name}</div>
            </div>

            {/* PnL Badge */}
            {hasPnlData ? (
              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                  isProfitable
                    ? "bg-matrix-green/20 text-matrix-green border border-matrix-green/40"
                    : "bg-alert-red/20 text-alert-red border border-alert-red/40"
                }`}
                style={{
                  boxShadow: isProfitable
                    ? "0 0 10px rgba(0, 255, 65, 0.3)"
                    : "0 0 10px rgba(255, 0, 51, 0.3)",
                }}
              >
                {isProfitable ? "+" : ""}
                {pnlPercent!.toFixed(2)}%
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 text-white/40 border border-white/10">
                Loading...
              </div>
            )}
          </div>

          {/* Mint address (truncated) */}
          <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
            <span>Mint:</span>
            <code className="px-2 py-1 rounded bg-void-900 border border-white/10">
              {token.mint.slice(0, 8)}...{token.mint.slice(-6)}
            </code>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {/* Market Cap */}
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
              Market Cap
            </div>
            <div className="text-lg font-semibold font-mono text-solana-cyan">
              {formatMarketCap(token.market_cap)}
            </div>
          </div>

          {/* Label Status */}
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
              Label
            </div>
            <Badge tone={labelStatus === "needs_review" ? "warn" : "neutral"}>
              {labelStatus.replace("_", " ")}
            </Badge>
          </div>

          {/* Tweet Link */}
          <div className="text-center">
            {token.twitter_url ? (
              <a
                href={token.twitter_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-void-900 border border-brand-primary/30 text-brand-primary text-sm font-semibold transition-all duration-200 hover:bg-brand-primary/10 hover:border-brand-primary hover:shadow-[0_0_15px_rgba(104,172,110,0.4)]"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                View
              </a>
            ) : (
              <div className="text-xs text-white/30">No tweet</div>
            )}
          </div>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/5 to-transparent" />
      </div>
    </div>
  );
}

/* Animation for new tokens */
const slideInStyles = `
@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

// Inject animation styles
if (typeof window !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = slideInStyles;
  document.head.appendChild(styleSheet);
}
