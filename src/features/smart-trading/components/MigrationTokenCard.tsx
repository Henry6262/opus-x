"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StatusPill } from "@/components/design-system";
import { CountUp } from "@/components/animations/CountUp";
import {
  Zap,
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BarChart3,
  Droplets,
} from "lucide-react";
import type { RankedMigration, AiDecision } from "../types";
import { WalletSignalStack } from "./WalletSignalBadge";

// ============================================
// Price Flash Hook - Tracks value changes
// ============================================

type FlashDirection = "up" | "down" | null;

function usePriceFlash(value: number, threshold = 0.001): FlashDirection {
  const prevValue = useRef<number>(value);
  const [flash, setFlash] = useState<FlashDirection>(null);

  useEffect(() => {
    const diff = value - prevValue.current;
    const percentChange = prevValue.current !== 0 ? Math.abs(diff / prevValue.current) : 0;

    // Only flash if change is significant (above threshold)
    if (percentChange > threshold) {
      const direction: FlashDirection = diff > 0 ? "up" : "down";
      setFlash(direction);

      // Clear flash after animation
      const timeout = setTimeout(() => {
        setFlash(null);
      }, 600);

      return () => clearTimeout(timeout);
    }

    prevValue.current = value;
  }, [value, threshold]);

  // Update ref even when not flashing
  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  return flash;
}

// ============================================
// Flash Animation Component
// ============================================

interface FlashValueProps {
  value: React.ReactNode;
  flash: FlashDirection;
  className?: string;
}

function FlashValue({ value, flash, className = "" }: FlashValueProps) {
  return (
    <motion.span
      className={`inline-block ${className}`}
      animate={
        flash === "up"
          ? { backgroundColor: ["rgba(74, 222, 128, 0.4)", "rgba(74, 222, 128, 0)"] }
          : flash === "down"
            ? { backgroundColor: ["rgba(248, 113, 113, 0.4)", "rgba(248, 113, 113, 0)"] }
            : {}
      }
      transition={{ duration: 0.6 }}
      style={{ borderRadius: "4px", padding: "0 2px" }}
    >
      {value}
    </motion.span>
  );
}

interface MigrationTokenCardProps {
  ranked: RankedMigration;
  onAnalyze?: (tokenMint: string) => Promise<void>;
  onRefresh?: (tokenMint: string) => Promise<void>;
}

const AI_DECISION_CONFIG: Record<AiDecision, { color: string; bg: string; label: string; tone: "live" | "warn" | "neutral" }> = {
  ENTER: {
    color: "text-green-400",
    bg: "bg-green-500/20",
    label: "ENTER",
    tone: "live",
  },
  WAIT: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    label: "WAIT",
    tone: "warn",
  },
  PASS: {
    color: "text-white/40",
    bg: "bg-white/10",
    label: "PASS",
    tone: "neutral",
  },
};

export function MigrationTokenCard({ ranked, onAnalyze, onRefresh }: MigrationTokenCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { migration, score, breakdown, isReadyToTrade } = ranked;
  const decision = migration.lastAiDecision;
  const decisionConfig = decision ? AI_DECISION_CONFIG[decision] : null;

  const priceChange = migration.lastPriceChange1h ?? 0;
  const marketCap = migration.lastMarketCap ?? 0;
  const liquidity = migration.lastLiquidity ?? 0;
  const volume = migration.lastVolume24h ?? 0;

  // Flash animations for live updates
  const priceFlash = usePriceFlash(priceChange, 0.5); // Flash on 0.5% change
  const marketCapFlash = usePriceFlash(marketCap, 0.02); // Flash on 2% change
  const liquidityFlash = usePriceFlash(liquidity, 0.02);
  const scoreFlash = usePriceFlash(score, 0.05);

  const handleAnalyze = async () => {
    if (!onAnalyze || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      await onAnalyze(migration.tokenMint);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh(migration.tokenMint);
    } finally {
      setIsRefreshing(false);
    }
  };

  const timeSinceDetection = getTimeSince(migration.detectedAt);
  const expiresIn = migration.expiresAt ? getTimeUntil(migration.expiresAt) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative rounded-xl border backdrop-blur-xl overflow-hidden
        ${isReadyToTrade
          ? "bg-green-500/5 border-green-500/30"
          : "bg-black/40 border-white/10"
        }
      `}
    >
      {/* Ready to trade glow */}
      {isReadyToTrade && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent pointer-events-none" />
      )}

      {/* Main content */}
      <div className="relative p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          {/* Token info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white truncate">
                {migration.tokenSymbol || "Unknown"}
              </span>
              {isReadyToTrade && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <StatusPill tone="live" className="text-[10px]">
                    READY
                  </StatusPill>
                </motion.div>
              )}
            </div>
            <p className="text-xs text-white/40 truncate mt-0.5">
              {migration.tokenName || shortenAddress(migration.tokenMint)}
            </p>
          </div>

          {/* AI Decision badge */}
          {decisionConfig && (
            <div className={`px-3 py-1.5 rounded-lg ${decisionConfig.bg} flex items-center gap-2`}>
              <Brain className={`w-4 h-4 ${decisionConfig.color}`} />
              <span className={`text-sm font-bold ${decisionConfig.color}`}>
                {decisionConfig.label}
              </span>
              {migration.lastAiConfidence && (
                <span className="text-xs text-white/40">
                  {Math.round(migration.lastAiConfidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {/* Price Change */}
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">1h</span>
            <div className={`flex items-center gap-1 ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {priceChange >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <FlashValue
                value={`${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%`}
                flash={priceFlash}
                className="font-mono font-medium"
              />
            </div>
          </div>

          {/* Market Cap */}
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">MCap</span>
            <div className="flex items-center gap-1 text-white">
              <BarChart3 className="w-3.5 h-3.5 text-white/40" />
              <FlashValue
                value={formatCompactNumber(marketCap)}
                flash={marketCapFlash}
                className="font-mono font-medium text-sm"
              />
            </div>
          </div>

          {/* Liquidity */}
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Liq</span>
            <div className="flex items-center gap-1 text-white">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <FlashValue
                value={formatCompactNumber(liquidity)}
                flash={liquidityFlash}
                className="font-mono font-medium text-sm"
              />
            </div>
          </div>

          {/* Priority Score */}
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Score</span>
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#c4f70e]" />
              <FlashValue
                value={<CountUp to={score} duration={0.5} decimals={0} />}
                flash={scoreFlash}
                className="font-mono font-bold text-[#c4f70e]"
              />
            </div>
          </div>
        </div>

        {/* Wallet signals */}
        {migration.walletSignalCount > 0 && migration.walletSignals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <WalletSignalStack signals={migration.walletSignals} maxDisplay={3} />
          </div>
        )}

        {/* Time info & Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeSinceDetection} ago</span>
            </div>
            {expiresIn && (
              <div className="flex items-center gap-1 text-amber-400/70">
                <span>Expires {expiresIn}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Refresh market data"
            >
              <RefreshCw className={`w-4 h-4 text-white/60 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="p-1.5 rounded-md bg-[#c4f70e]/10 hover:bg-[#c4f70e]/20 transition-colors disabled:opacity-50"
              title="Trigger AI analysis"
            >
              <Brain className={`w-4 h-4 text-[#c4f70e] ${isAnalyzing ? "animate-pulse" : ""}`} />
            </button>

            {/* Expand button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-white/60" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/60" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                {/* AI Reasoning */}
                {migration.lastAiReasoning && (
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">AI Reasoning</span>
                    <p className="text-sm text-white/70 mt-1">{migration.lastAiReasoning}</p>
                  </div>
                )}

                {/* Signal Breakdown */}
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Signal Breakdown</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <SignalBar label="Fresh" value={breakdown.migrationFreshness} max={30} />
                    <SignalBar label="Wallets" value={breakdown.walletSignals} max={50} />
                    <SignalBar label="AI" value={breakdown.aiConfidence} max={25} />
                    <SignalBar label="Price" value={breakdown.priceAction} max={15} />
                    <SignalBar label="Liquidity" value={breakdown.liquidity} max={10} />
                  </div>
                </div>

                {/* Token address */}
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Token Mint</span>
                  <p className="text-xs text-white/50 font-mono mt-1 break-all">
                    {migration.tokenMint}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SignalBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = Math.min((value / max) * 100, 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 font-mono">{value.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-[#c4f70e] to-cyan-400 rounded-full"
        />
      </div>
    </div>
  );
}

function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function getTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function getTimeUntil(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "expired";

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `in ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  return `in ${diffHours}h`;
}
