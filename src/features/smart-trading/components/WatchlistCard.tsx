"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Clock, Copy, TrendingUp, TrendingDown, AlertCircle, Check, Eye } from "lucide-react";
import type { WatchlistToken } from "../types";

// ============================================
// Constants
// ============================================

const AVATAR_COLORS: [string, string][] = [
  ["#c4f70e", "#22d3ee"],
  ["#f97316", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#14b8a6"],
];

function getAvatarColors(symbol: string): [string, string] {
  const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ============================================
// Token Avatar Component
// ============================================

interface TokenAvatarProps {
  symbol: string;
  mint: string;
  size?: number;
}

function TokenAvatar({ symbol, mint, size = 48 }: TokenAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [color1, color2] = getAvatarColors(symbol);
  const initials = symbol.slice(0, 2).toUpperCase();

  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;

  if (imgError) {
    return (
      <div
        className="relative flex items-center justify-center rounded-xl font-bold text-white shadow-lg flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
          fontSize: size * 0.35,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Image
        src={dexScreenerUrl}
        alt={symbol}
        fill
        sizes={`${size}px`}
        className="object-cover w-full h-full"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  );
}

// ============================================
// Format Helpers
// ============================================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDuration(addedAt: string): string {
  const now = Date.now();
  const added = new Date(addedAt).getTime();
  const diffSecs = Math.floor((now - added) / 1000);

  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  }

  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

// ============================================
// Status Badge
// ============================================

type WatchlistStatus = "READY" | "IMPROVING" | "STALE" | "WATCHING";

function getStatus(token: WatchlistToken): WatchlistStatus {
  if (token.last_result.passed) return "READY";
  if (token.last_result.improving) return "IMPROVING";
  if (!token.last_result.improving && !token.last_result.passed && token.check_count > 3) return "STALE";
  return "WATCHING";
}

interface StatusBadgeProps {
  status: WatchlistStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<WatchlistStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    READY: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      icon: <Check className="w-3 h-3" />,
      label: "READY",
    },
    IMPROVING: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      icon: <TrendingUp className="w-3 h-3" />,
      label: "IMPROVING",
    },
    STALE: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      icon: <TrendingDown className="w-3 h-3" />,
      label: "STALE",
    },
    WATCHING: {
      bg: "bg-white/10",
      text: "text-white/60",
      icon: <Eye className="w-3 h-3" />,
      label: "WATCHING",
    },
  };

  const { bg, text, icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
}

// ============================================
// Metric Display
// ============================================

interface MetricProps {
  label: string;
  value: string;
  passed?: boolean;
  improving?: boolean;
}

function Metric({ label, value, passed, improving }: MetricProps) {
  let colorClass = "text-white/60";
  let icon = null;

  if (passed) {
    colorClass = "text-green-400";
    icon = <Check className="w-2.5 h-2.5" />;
  } else if (improving) {
    colorClass = "text-yellow-400";
    icon = <TrendingUp className="w-2.5 h-2.5" />;
  }

  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-white/40 uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-mono font-medium ${colorClass} flex items-center gap-0.5`}>
        {value}
        {icon}
      </span>
    </div>
  );
}

// ============================================
// Main WatchlistCard Component
// ============================================

interface WatchlistCardProps {
  token: WatchlistToken;
  index: number;
  isGraduating?: boolean;
}

export function WatchlistCard({ token, index, isGraduating = false }: WatchlistCardProps) {
  const status = getStatus(token);
  const hasFailedChecks = token.last_result.failed_checks.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{
        opacity: isGraduating ? 0 : 1,
        scale: isGraduating ? 1.05 : 1,
        y: 0,
        borderColor: isGraduating ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.1)",
      }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 200, damping: 20 }}
      className="relative flex-shrink-0 w-[200px] p-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all group"
    >
      {/* Graduating glow effect */}
      {isGraduating && (
        <div className="absolute inset-0 bg-green-500/10 animate-pulse" />
      )}

      {/* Header: Token + Status */}
      <div className="flex items-center gap-2 mb-2">
        <TokenAvatar symbol={token.symbol} mint={token.mint} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm truncate">{token.symbol}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(token.mint);
              }}
              className="p-0.5 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Copy Contract"
            >
              <Copy className="w-3 h-3 text-white/40 hover:text-white/70" />
            </button>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <Metric
          label="Liq"
          value={formatCurrency(token.metrics.liquidity_usd)}
          passed={!token.last_result.failed_checks.some(c => c.toLowerCase().includes("liquidity"))}
          improving={token.last_result.improving}
        />
        <Metric
          label="Vol"
          value={formatCurrency(token.metrics.volume_24h_usd)}
          passed={!token.last_result.failed_checks.some(c => c.toLowerCase().includes("volume"))}
          improving={token.last_result.improving}
        />
        <Metric
          label="Holders"
          value={token.metrics.holder_count.toLocaleString()}
          passed={!token.last_result.failed_checks.some(c => c.toLowerCase().includes("holder"))}
          improving={token.last_result.improving}
        />
      </div>

      {/* Footer: Time + Check Count */}
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(token.added_at)}
        </span>
        <span className="flex items-center gap-1">
          {token.check_count} checks
        </span>
      </div>

      {/* Failed checks tooltip on hover */}
      {hasFailedChecks && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/90 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex items-start gap-1.5 text-[10px] text-red-400/80">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{token.last_result.failed_checks.slice(0, 2).join(", ")}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default WatchlistCard;
