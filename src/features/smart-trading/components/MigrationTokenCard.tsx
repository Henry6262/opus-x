"use client";

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { StatusPill } from "@/components/design-system";
import { CountUp } from "@/components/animations/CountUp";
import {
  Zap,
  Brain,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
} from "lucide-react";
import type { RankedMigration, AiDecision, PriceHistoryPoint } from "../types";

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
  value: ReactNode;
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

export function MigrationTokenCard({ ranked }: MigrationTokenCardProps) {
  const t = useTranslations("migration");
  const tTime = useTranslations("time");

  const [copied, setCopied] = useState(false);

  // RankedMigration is a FLAT structure - all properties at root level
  const { score, isReadyToTrade } = ranked;
  const decision = ranked.lastAiDecision;
  const decisionConfig = decision ? AI_DECISION_CONFIG[decision] : null;

  const priceChange = ranked.lastPriceChange1h ?? 0;
  const marketCap = ranked.lastMarketCap ?? 0;
  const liquidity = ranked.lastLiquidity ?? 0;

  // Flash animations for live updates
  const priceFlash = usePriceFlash(priceChange, 0.5); // Flash on 0.5% change
  const marketCapFlash = usePriceFlash(marketCap, 0.02); // Flash on 2% change
  const liquidityFlash = usePriceFlash(liquidity, 0.02);
  const scoreFlash = usePriceFlash(score, 0.05);

  const timeSinceDetection = getTimeSince(ranked.detectedAt, tTime);
  const expiresIn = ranked.expiresAt ? getTimeUntil(ranked.expiresAt, tTime) : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ranked.tokenMint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error("Failed to copy token address", err);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative rounded-3xl border backdrop-blur-xl overflow-hidden
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
        <div className="flex items-start gap-4">
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
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg font-bold text-white truncate flex-1 min-w-0">
                {ranked.tokenSymbol || t("card.unknown")}
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                title={copied ? t("card.copied") : t("card.copyAddress")}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-white/60" />
                )}
              </button>
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
            <div className="flex items-center gap-4 mt-2 w-full text-[10px] whitespace-nowrap">
              <MiniStat
                label={t("card.metrics.mcap")}
                value={formatCompactNumber(marketCap)}
                flash={marketCapFlash}
              />
              <span className="text-white/20">|</span>
              <MiniStat
                label={t("card.metrics.liquidity")}
                value={formatCompactNumber(liquidity)}
                flash={liquidityFlash}
              />
              <span className="text-white/20">|</span>
              <MiniStat
                label={t("card.metrics.score")}
                value={<CountUp to={score} duration={0.5} decimals={0} />}
                valueClassName="text-[#c4f70e]"
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 min-w-[140px] text-right">
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
            <div className="text-[11px] text-white/50">
              <span>{timeSinceDetection}</span>
              {expiresIn && (
                <div className="text-amber-400/80">
                  {expiresIn}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface MiniStatProps {
  label: string;
  value: ReactNode;
  flash?: FlashDirection;
  valueClassName?: string;
}

function MiniStat({ label, value, flash, valueClassName }: MiniStatProps) {
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <span className="uppercase tracking-widest text-white/35">{label}</span>
      <FlashValue value={value} flash={flash ?? null} className={`font-mono ${valueClassName || "text-white/80"}`} />
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
