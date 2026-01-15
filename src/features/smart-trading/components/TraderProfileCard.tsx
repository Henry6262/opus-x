"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { CountUp } from "@/components/animations/CountUp";
import { SmartMoneyAnimation } from "@/components/animations";
import { cn } from "@/lib/utils";
import type { DashboardStatsResponse, Position, TradingConfig } from "../types";

interface TraderProfileCardProps {
  stats: DashboardStatsResponse | null;
  config: TradingConfig | null;
  positions: Position[];
  history: Position[];
}

function calculateStreak(history: Position[]): { current: number; best: number; type: "win" | "loss" } {
  if (history.length === 0) return { current: 0, best: 0, type: "win" };

  const sorted = [...history]
    .filter((p) => p.closedAt)
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());

  if (sorted.length === 0) return { current: 0, best: 0, type: "win" };

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  const firstTradeWin = sorted[0].realizedPnlSol >= 0;

  for (let i = 0; i < sorted.length; i++) {
    const isWin = sorted[i].realizedPnlSol >= 0;
    if (i === 0 || isWin === firstTradeWin) {
      if (isWin === firstTradeWin) currentStreak++;
      else break;
    }
    if (isWin) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { current: currentStreak, best: bestStreak, type: firstTradeWin ? "win" : "loss" };
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TabIcon({ type, className }: { type: "smart-money" | "twitter"; className?: string }) {
  if (type === "smart-money") {
    // Smart money lottie is wider than tall, use larger size with constrained container
    return (
      <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
        <SmartMoneyAnimation className={className} size={56} />
      </div>
    );
  }
  return <XIcon className={cn("w-7 h-7", className)} />;
}

export function TraderProfileCard({
  stats,
  config,
  history,
}: TraderProfileCardProps) {
  const t = useTranslations();
  const tProfile = useTranslations("profile");

  const streak = calculateStreak(history);
  const performance = stats?.performance;

  const winRate = performance?.winRate ?? 0;
  const totalTrades = performance?.totalTrades ?? 0;
  const winningTrades = performance?.winningTrades ?? 0;
  const largestWinPercent = performance?.largestWin ?? 0;
  const netPnl = performance?.netPnlSol ?? 0;
  const isOnStreak = streak.current >= 2 && streak.type === "win";
  const walletAddress = config?.wallet_address || "N/A";
  const shortWallet =
    walletAddress && walletAddress.length > 8
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : walletAddress;

  const StatStreak = () => (
    <div className="flex flex-col gap-1 text-center md:text-left">
      <div className="text-[9px] text-white/40 uppercase tracking-wider">{tProfile("streak")}</div>
      <div className="flex items-baseline gap-0.5 justify-center md:justify-start">
        <span className={`text-lg font-bold font-mono ${isOnStreak ? "text-orange-400" : "text-white"}`}>
          {streak.current}
        </span>
        <span className="text-xs text-white/30">/{streak.best}</span>
      </div>
    </div>
  );

  const StatTrades = () => (
    <div className="flex flex-col gap-1 text-center md:text-left">
      <div className="text-[9px] text-white/40 uppercase tracking-wider">{tProfile("trades")}</div>
      <div className="flex items-baseline gap-1 justify-center md:justify-start">
        <span className="text-lg font-bold font-mono text-white">{totalTrades}</span>
        <span className="text-xs text-green-400/70">({winningTrades}W)</span>
      </div>
    </div>
  );

  const StatBest = () => (
    <div className="flex flex-col gap-1 text-center md:text-left">
      <div className="text-[9px] text-white/40 uppercase tracking-wider">{tProfile("bestTrade")}</div>
      <div className="flex items-center gap-1 justify-center md:justify-start">
        <span className="text-lg font-bold font-mono text-green-400">
          +{Number.isFinite(largestWinPercent) ? Math.round(largestWinPercent) : 0}
        </span>
        <span className="text-xs text-green-400/70">%</span>
        <span
          className="text-[10px] text-white/50 border border-white/10 rounded-full px-2 py-0.5 cursor-help"
          title="Best realized trade percentage (performance.best_trade_pct from trading stats)"
        >
          ?
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative pt-20 md:pt-12 pb-16 overflow-hidden md:overflow-visible">

      {/* Wallet address badge - Desktop only (absolute positioned) */}
      <div className="hidden md:flex absolute left-[160px] top-5 items-center gap-2 text-[11px] font-mono text-white/85">
        <span>{shortWallet}</span>
        {walletAddress !== "N/A" && (
          <button
            onClick={() => navigator.clipboard.writeText(walletAddress)}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Copy wallet address"
            type="button"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* X/Twitter Handle - Desktop only (absolute positioned) */}
      <motion.a
        href="https://x.com/SuperRouterSol"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden md:flex absolute top-[104px] left-[140px] items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors z-10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
      >
        <XIcon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
        <span className="transition-colors">@SuperRouterSol</span>
      </motion.a>

      {/* Main pill container */}
      <div className="relative rounded-full bg-black/50 backdrop-blur-xl border border-white/10 h-16 md:h-20 ml-16 md:ml-16 mr-2 md:mr-4 max-w-[960px] mx-auto overflow-visible flex items-center">
        {/* Subtle glow effects */}
        <div className="absolute -top-20 right-1/4 w-48 h-48 bg-[#c4f70e]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content grid - 3 zones */}
        <div className="relative h-full flex items-center pl-16 md:pl-32 pr-3 md:pr-6 w-full">

          {/* ZONE 1: Hero P&L - The main attraction */}
          <div className="pr-4 md:pr-6 border-r border-white/10">
            <div className="text-[9px] md:text-[10px] text-white/50 uppercase tracking-wider font-medium">{tProfile("allTimePnl")}</div>
            <div className={`flex items-center gap-1.5 md:gap-1.5 text-xl md:text-2xl font-bold font-mono tracking-tight ${netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              <CountUp to={netPnl} duration={1.2} decimals={2} prefix={netPnl >= 0 ? "+" : ""} />
              <Image src="/logos/solana.png" alt="SOL" width={16} height={16} className="opacity-80 md:w-[18px] md:h-[18px]" />
            </div>
          </div>

          {/* ZONE 2: Win Rate Ring - Visual anchor */}
          <div className="flex items-center justify-center px-4 md:px-6">
            <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
              <svg viewBox="0 0 56 56" className="w-full h-full transform -rotate-90">
                <circle
                  cx={28}
                  cy={28}
                  r={24}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={4}
                />
                <motion.circle
                  cx={28}
                  cy={28}
                  r={24}
                  fill="transparent"
                  stroke="url(#winRateGradient)"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={150.8}
                  initial={{ strokeDashoffset: 150.8 }}
                  animate={{ strokeDashoffset: 150.8 - (winRate / 100) * 150.8 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c4f70e" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs md:text-sm font-bold text-white font-mono leading-none">
                  {Number.isFinite(winRate) ? Math.round(winRate) : 0}%
                </span>
                <span className="text-[5px] md:text-[7px] text-white/40 uppercase tracking-wide">{tProfile("winRate")}</span>
              </div>
            </div>
          </div>

          {/* ZONE 3: Secondary stats - Clean labels and values (desktop only) */}
          <div className="hidden md:flex items-center gap-6 pl-6 border-l border-white/10">
            <StatStreak />
            <StatTrades />
            <StatBest />
          </div>
        </div>
      </div>

      {/* Mobile: X handle & wallet below pill */}
      <div className="md:hidden mt-4 px-6 flex flex-col items-center gap-2">
        {/* X/Twitter Handle */}
        <a
          href="https://x.com/SuperRouterSol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <XIcon className="w-4 h-4 text-white/60" />
          <span>@SuperRouterSol</span>
        </a>
        {/* Wallet address */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/60">
          <span>{shortWallet}</span>
          {walletAddress !== "N/A" && (
            <button
              onClick={() => navigator.clipboard.writeText(walletAddress)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Copy wallet address"
              type="button"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Avatar with animated glow rings */}
      <motion.div
        className="absolute left-0 top-[48%] md:top-[calc(50%)] -translate-y-1/2 w-28 h-28 md:w-32 md:h-32 z-20"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Outer rotating ring - conic gradient (hidden on mobile to reduce glow bleed) */}
        <motion.div
          className="absolute inset-[-10px] rounded-full opacity-0 md:opacity-60"
          style={{
            background: "conic-gradient(from 0deg, transparent, rgba(196,247,14,0.4), transparent, rgba(34,211,238,0.4), transparent)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Middle pulsing ring (reduced on mobile) */}
        <motion.div
          className="absolute inset-[-3px] md:inset-[-5px] rounded-full border border-[#c4f70e]/20 md:border-2 md:border-[#c4f70e]/30"
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />

        {/* Inner glow behind avatar (reduced on mobile) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#c4f70e]/20 to-cyan-500/20 md:from-[#c4f70e]/40 md:to-cyan-500/40 rounded-full blur-lg md:blur-xl scale-105 md:scale-110" />

        {/* Avatar container */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#c4f70e]/60 bg-black shadow-[0_0_20px_rgba(196,247,14,0.2)] md:shadow-[0_0_40px_rgba(196,247,14,0.3)]">
          <img
            src="/character/super-router.png"
            alt="SuperRouter"
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>
    </div>
  );
}
