"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Clock, Copy, TrendingUp, Check, Eye } from "lucide-react";
import type { WatchlistToken } from "../types";

// ============================================
// Token Avatar
// ============================================

function TokenAvatar({ symbol, mint, size = 36 }: { symbol: string; mint: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = symbol.slice(0, 2).toUpperCase();
  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;

  if (imgError) {
    return (
      <div
        className="flex items-center justify-center rounded-lg font-bold text-white bg-white/10 flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
      <Image
        src={dexScreenerUrl}
        alt={symbol}
        width={size}
        height={size}
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

function formatDuration(addedAt: string): string {
  const diffSecs = Math.floor((Date.now() - new Date(addedAt).getTime()) / 1000);
  const mins = Math.floor(diffSecs / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m ${(diffSecs % 60).toString().padStart(2, "0")}s`;
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
      className="flex-shrink-0 w-[180px] p-3 rounded-xl bg-black/40 border border-white/10"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <TokenAvatar symbol={token.symbol} mint={token.mint} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm truncate">{token.symbol}</span>
            <button
              onClick={() => navigator.clipboard.writeText(token.mint)}
              className="p-0.5 rounded hover:bg-white/10"
            >
              <Copy className="w-3 h-3 text-white/40" />
            </button>
          </div>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_STYLES[status]}`}>
            {status === "READY" && <Check className="w-2.5 h-2.5" />}
            {status === "IMPROVING" && <TrendingUp className="w-2.5 h-2.5" />}
            {status === "WATCHING" && <Eye className="w-2.5 h-2.5" />}
            {status}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1 mb-2 text-[10px]">
        <div>
          <div className="text-white/40">Liq</div>
          <div className="text-white/70 font-mono">{formatCurrency(token.metrics.liquidity_usd)}</div>
        </div>
        <div>
          <div className="text-white/40">Vol</div>
          <div className="text-white/70 font-mono">{formatCurrency(token.metrics.volume_24h_usd)}</div>
        </div>
        <div>
          <div className="text-white/40">Holders</div>
          <div className="text-white/70 font-mono">{token.metrics.holder_count}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(token.added_at)}
        </span>
        <span>{token.check_count} checks</span>
      </div>
    </motion.div>
  );
}

export default WatchlistCard;
