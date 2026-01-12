"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
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
import type { RankedMigration, AiDecision, PriceHistoryPoint } from "../types";
import { WalletSignalStack } from "./WalletSignalBadge";

// ============================================
// Token Image - Real image with gradient fallback
// ============================================

const AVATAR_COLORS: [string, string][] = [
  ["#c4f70e", "#22d3ee"], // lime to cyan
  ["#f97316", "#ef4444"], // orange to red
  ["#8b5cf6", "#ec4899"], // purple to pink
  ["#06b6d4", "#3b82f6"], // cyan to blue
  ["#10b981", "#14b8a6"], // emerald to teal
  ["#f59e0b", "#eab308"], // amber to yellow
  ["#6366f1", "#8b5cf6"], // indigo to violet
  ["#ec4899", "#f43f5e"], // pink to rose
];

function getAvatarColors(symbol: string): [string, string] {
  const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface TokenImageProps {
  imageUrl: string | null;
  symbol: string;
  tokenMint: string;
  size?: number;
}

function TokenImage({ imageUrl, symbol, tokenMint, size = 44 }: TokenImageProps) {
  const [imgError, setImgError] = useState(false);
  const [color1, color2] = getAvatarColors(symbol);
  const initials = symbol.slice(0, 2).toUpperCase();

  // Try DexScreener image if no imageUrl provided
  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${tokenMint}.png`;
  const finalImageUrl = imageUrl || dexScreenerUrl;

  if (imgError || !finalImageUrl) {
    return (
      <div
        className="relative flex items-center justify-center rounded-xl font-bold text-white shadow-lg flex-shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
          fontSize: size * 0.35,
        }}
      >
        {initials}
        <div
          className="absolute inset-0 rounded-xl opacity-30"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
      style={{ width: size, height: size }}
    >
      <Image
        src={finalImageUrl}
        alt={symbol}
        width={size}
        height={size}
        className="object-cover"
        onError={() => setImgError(true)}
        unoptimized
      />
      <div
        className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}

// ============================================
// Mini Sparkline Chart
// ============================================

interface SparklineProps {
  data: PriceHistoryPoint[] | null;
  width?: number;
  height?: number;
  tokenMint: string;
}

function Sparkline({ data, width = 60, height = 28, tokenMint }: SparklineProps) {
  const chartData = useMemo(() => {
    if (!data || data.length < 2) return null;
    return data.map((point, i) => ({ value: point.priceUsd, index: i }));
  }, [data]);

  const isPositive = useMemo(() => {
    if (!data || data.length < 2) return true;
    return data[data.length - 1].priceUsd >= data[0].priceUsd;
  }, [data]);

  if (!chartData) return null;

  const gradientId = `spark-${tokenMint.slice(0, 8)}`;
  const strokeColor = isPositive ? "#4ade80" : "#f87171";

  return (
    <div style={{ width, height }} className="flex-shrink-0 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

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
  const t = useTranslations("migration");
  const tTime = useTranslations("time");

  const [expanded, setExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // RankedMigration is a FLAT structure - all properties at root level
  const { score, breakdown, isReadyToTrade } = ranked;
  const decision = ranked.lastAiDecision;
  const decisionConfig = decision ? AI_DECISION_CONFIG[decision] : null;

  const priceChange = ranked.lastPriceChange1h ?? 0;
  const marketCap = ranked.lastMarketCap ?? 0;
  const liquidity = ranked.lastLiquidity ?? 0;
  const volume = ranked.lastVolume24h ?? 0;

  // Flash animations for live updates
  const priceFlash = usePriceFlash(priceChange, 0.5); // Flash on 0.5% change
  const marketCapFlash = usePriceFlash(marketCap, 0.02); // Flash on 2% change
  const liquidityFlash = usePriceFlash(liquidity, 0.02);
  const scoreFlash = usePriceFlash(score, 0.05);

  const handleAnalyze = async () => {
    if (!onAnalyze || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      await onAnalyze(ranked.tokenMint);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh(ranked.tokenMint);
    } finally {
      setIsRefreshing(false);
    }
  };

  const timeSinceDetection = getTimeSince(ranked.detectedAt, tTime);
  const expiresIn = ranked.expiresAt ? getTimeUntil(ranked.expiresAt, tTime) : null;

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
        <div className="flex items-start gap-3">
          {/* Token Image with DexScreener fallback */}
          <TokenImage
            imageUrl={ranked.tokenImageUrl}
            symbol={ranked.tokenSymbol || "??"}
            tokenMint={ranked.tokenMint}
            size={48}
          />

          {/* Sparkline chart - next to token image */}
          <Sparkline
            data={ranked.priceHistory}
            tokenMint={ranked.tokenMint}
            width={64}
            height={44}
          />

          {/* Token info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white truncate">
                {ranked.tokenSymbol || t("card.unknown")}
              </span>
              {isReadyToTrade && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <StatusPill tone="live" className="text-[10px]">
                    {t("card.ready")}
                  </StatusPill>
                </motion.div>
              )}
            </div>
            <p className="text-xs text-white/40 truncate mt-0.5">
              {ranked.tokenName || shortenAddress(ranked.tokenMint)}
            </p>
          </div>

          {/* AI Decision badge */}
          {decisionConfig && (
            <div className={`px-3 py-1.5 rounded-lg ${decisionConfig.bg} flex items-center gap-2`}>
              <Brain className={`w-4 h-4 ${decisionConfig.color}`} />
              <span className={`text-sm font-bold ${decisionConfig.color}`}>
                {decisionConfig.label}
              </span>
              {ranked.lastAiConfidence && (
                <span className="text-xs text-white/40">
                  {Math.round(ranked.lastAiConfidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-3 mt-4">
          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-3 flex-1">
            {/* Price Change */}
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.metrics.priceChange1h")}</span>
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
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.metrics.mcap")}</span>
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
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.metrics.liquidity")}</span>
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
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.metrics.score")}</span>
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
        </div>

        {/* Wallet signals */}
        {ranked.walletSignalCount > 0 && ranked.walletSignals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <WalletSignalStack signals={ranked.walletSignals} maxDisplay={3} />
          </div>
        )}

        {/* Time info & Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeSinceDetection}</span>
            </div>
            {expiresIn && (
              <div className="flex items-center gap-1 text-amber-400/70">
                <span>{expiresIn}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title={t("card.refreshData")}
            >
              <RefreshCw className={`w-4 h-4 text-white/60 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="p-1.5 rounded-md bg-[#c4f70e]/10 hover:bg-[#c4f70e]/20 transition-colors disabled:opacity-50"
              title={t("card.triggerAi")}
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
                {ranked.lastAiReasoning && (
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.aiReasoning")}</span>
                    <p className="text-sm text-white/70 mt-1">{ranked.lastAiReasoning}</p>
                  </div>
                )}

                {/* Signal Breakdown */}
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.signalBreakdown")}</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <SignalBar label={t("card.breakdown.age")} value={breakdown.migrationAge} max={30} />
                    <SignalBar label={t("card.breakdown.wallets")} value={breakdown.walletSignals} max={50} />
                    <SignalBar label={t("card.breakdown.ai")} value={breakdown.aiConfidence} max={25} />
                    <SignalBar label={t("card.breakdown.momentum")} value={breakdown.priceMomentum} max={15} />
                    <SignalBar label={t("card.breakdown.multiWallet")} value={breakdown.multipleWallets} max={10} />
                  </div>
                </div>

                {/* Token address */}
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("card.tokenMint")}</span>
                  <p className="text-xs text-white/50 font-mono mt-1 break-all">
                    {ranked.tokenMint}
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

function getTimeSince(dateStr: string, t: (key: string, params?: Record<string, string | number | Date>) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return t("justNow");
  if (diffMins < 60) return t("minutesAgo", { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t("hoursAgo", { count: diffHours });
  return t("daysAgo", { count: Math.floor(diffHours / 24) });
}

function getTimeUntil(dateStr: string, t: (key: string, params?: Record<string, string | number | Date>) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return t("expired");

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return t("inMinutes", { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  return t("inHours", { count: diffHours });
}
