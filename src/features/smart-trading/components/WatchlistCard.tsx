"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Copy, Users } from "lucide-react";
import type { WatchlistToken } from "../types";

// ============================================
// Token Avatar
// ============================================

function TokenAvatar({ symbol, mint }: { symbol: string; mint: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = symbol.slice(0, 2).toUpperCase();
  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;

  if (imgError) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm text-white bg-white/10">
        {initials}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
      <Image
        src={dexScreenerUrl}
        alt={symbol}
        width={40}
        height={40}
        className="object-cover"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

type Status = "READY" | "IMPROVING" | "STALE" | "WATCHING";

function getStatus(token: WatchlistToken): Status {
  if (token.last_result.passed) return "READY";
  if (token.last_result.improving) return "IMPROVING";
  if (token.check_count > 3) return "STALE";
  return "WATCHING";
}

const STATUS_STYLES: Record<Status, string> = {
  READY: "bg-green-500/20 text-green-400",
  IMPROVING: "bg-yellow-500/20 text-yellow-400",
  STALE: "bg-red-500/20 text-red-400",
  WATCHING: "bg-white/10 text-white/50",
};

// ============================================
// WatchlistCard
// ============================================

interface WatchlistCardProps {
  token: WatchlistToken;
}

export function WatchlistCard({ token }: WatchlistCardProps) {
  const status = getStatus(token);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-shrink-0 w-[260px] p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3"
    >
      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-2 min-w-0">
        <TokenAvatar symbol={token.symbol} mint={token.mint} />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm truncate">{token.symbol}</span>
            <button
              onClick={() => navigator.clipboard.writeText(token.mint)}
              className="p-0.5 rounded hover:bg-white/10"
            >
              <Copy className="w-3 h-3 text-white/40" />
            </button>
          </div>
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_STYLES[status]}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Right: Metrics stacked */}
      <div className="ml-auto text-[10px] space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="text-white/40">MCap</span>
          <span className="text-white/70 font-mono">{formatCurrency(token.metrics.market_cap_usd)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/40">Vol</span>
          <span className="text-white/70 font-mono">{formatCurrency(token.metrics.volume_24h_usd)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-white/40" />
          <span className="text-white/70 font-mono">{token.metrics.holder_count.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default WatchlistCard;
