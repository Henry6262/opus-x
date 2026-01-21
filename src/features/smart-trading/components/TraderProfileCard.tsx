"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Wallet } from "lucide-react";
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

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-black/40 rounded", className)} />
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
  const [copied, setCopied] = useState(false);

  const streak = calculateStreak(history);
  const performance = stats?.performance;

  // Determine loading state - stats is null when data hasn't loaded yet
  const isLoading = stats === null;

  const winRate = performance?.winRate ?? 0;
  const totalTrades = performance?.totalTrades ?? 0;
  const winningTrades = performance?.winningTrades ?? 0;
  const largestWinPercent = performance?.largestWin ?? 0;
  const netPnl = performance?.netPnlSol ?? 0;
  const dailyPnL = stats?.trading?.dailyPnL ?? 0;

  const isOnStreak = streak.current >= 2 && streak.type === "win";
  const walletAddress = "DwFkx11rhxBCxosphwVSgkG1HcQTCmxPyTgMeSHXUjrB";
  const shortWallet =
    walletAddress && walletAddress.length > 8
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : walletAddress;
  const mobileShortWallet =
    walletAddress && walletAddress.length > 4
      ? `...${walletAddress.slice(-4)}`
      : walletAddress;

  const isHotStreak = streak.current >= 3 && streak.type === "win";
  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const StatStreak = () => (
    <div className="flex items-baseline gap-2 min-w-[90px]">
      <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">Streak:</span>
      {isLoading ? (
        <Skeleton className="h-5 w-12" />
      ) : (
        <div className="flex items-center gap-1">
          {isHotStreak && (
            <span className="animate-[streak-fire-flicker_0.5s_ease-in-out_infinite_alternate]">🔥</span>
          )}
          <span className={`text-sm md:text-lg font-bold font-mono tabular-nums ${
            streak.type === "win" ? "text-green-400" : "text-red-400"
          }`}>
            {streak.current}
          </span>
          <span className="text-xs text-white/30">/{streak.best}</span>
        </div>
      )}
    </div>
  );

  const StatTrades = () => (
    <div className="flex items-baseline gap-2 min-w-[140px]">
      <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">{tProfile("trades")}:</span>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <>
          <span className="text-sm md:text-lg font-bold font-mono tabular-nums text-white">{totalTrades}</span>
          <span className="text-[10px] md:text-xs text-green-400/70 tabular-nums">({winningTrades}W)</span>
        </>
      )}
    </div>
  );

  const StatBest = () => (
    <div className="flex items-baseline gap-2 min-w-[140px]">
      <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">{tProfile("bestTrade")}:</span>
      {isLoading ? (
        <Skeleton className="h-5 w-14" />
      ) : (
        <span className="text-sm md:text-lg font-bold font-mono tabular-nums text-green-400">
          +{Number.isFinite(largestWinPercent) ? Math.round(largestWinPercent) : 0}%
        </span>
      )}
    </div>
  );

  return (
    <div className="relative pt-20 md:pt-12 pb-16 overflow-hidden md:overflow-visible">

      {/* Wallet & Twitter - Positioned above pill using absolute */}
      <motion.div
        className="absolute top-[52px] md:top-[20px] left-28 md:left-52 flex items-center gap-3 md:gap-4 h-5 z-[25]"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {/* Wallet address */}
        <div
          className="relative flex items-center gap-1.5 text-[11px] md:text-xs font-mono text-white/60 min-w-[60px] md:min-w-[100px] cursor-pointer hover:text-white/80 transition-colors"
          onClick={handleCopyWallet}
        >
          <Wallet className="w-3 h-3 md:w-4 md:h-4 text-white/50" />
          <span className="hidden md:inline">{shortWallet}</span>
          <span className="md:hidden">{mobileShortWallet}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyWallet();
            }}
            className="text-white/40 hover:text-white transition-colors cursor-pointer"
            aria-label="Copy wallet address"
            type="button"
          >
            <Copy className="w-3 h-3 md:w-4 md:h-4" />
          </button>
          <AnimatePresence>
            {copied && (
              <motion.div
                className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg"
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                Super Router trading address copied
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <span className="text-white/20">•</span>

        {/* X/Twitter Handle */}
        <a
          href="https://x.com/SuperRouterSol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] md:text-xs font-mono text-white/60 hover:text-white transition-colors"
        >
          <XIcon className="w-3 h-3 md:w-4 md:h-4 text-white/50" />
          <span>@SuperRouterSol</span>
        </a>
      </motion.div>

      {/* Main pill container */}
      <div className="relative rounded-full bg-black/50 backdrop-blur-xl border-[3px] border-[#c4f70e]/30 h-16 md:h-28 ml-16 md:ml-20 mr-2 md:mr-4 max-w-[1100px] mx-auto overflow-visible flex items-center shadow-[0_0_20px_rgba(196,247,14,0.1)] animate-[profile-ambient-breathing_3s_ease-in-out_infinite] z-[20]">
          {/* Subtle glow effects */}
          <div className="absolute -top-20 right-1/4 w-48 h-48 bg-[#c4f70e]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content grid - 3 zones */}
        <div className="relative h-full flex items-center pl-14 md:pl-36 pr-3 md:pr-8 w-full">

          {/* ZONE 1: Hero P&L - The main attraction */}
          <div className="pr-4 md:pr-10 border-r border-white/10 min-w-[100px] md:min-w-[160px]">
            <div className="text-[9px] md:text-[11px] text-white/50 uppercase tracking-wider font-medium">{tProfile("allTimePnl")}</div>
            {isLoading ? (
              <div className="flex items-center gap-1 md:gap-1.5 h-[28px] md:h-[36px]">
                <Skeleton className="h-6 md:h-8 w-20 md:w-28" />
                <Skeleton className="h-[14px] w-[14px] md:h-[22px] md:w-[22px] rounded-full" />
              </div>
            ) : (
              <motion.div
                key={netPnl}
                initial={{ backgroundColor: netPnl >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)" }}
                animate={{ backgroundColor: "transparent" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="rounded-lg"
              >
                <div className={`flex items-center gap-1 md:gap-1.5 text-lg md:text-3xl font-bold font-mono tabular-nums tracking-tight ${netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  <CountUp to={netPnl} duration={1.2} decimals={2} prefix={netPnl >= 0 ? "+" : ""} />
                  <Image src="/logos/solana.png" alt="SOL" width={14} height={14} className="opacity-80 md:w-[22px] md:h-[22px]" />
                </div>
              </motion.div>
            )}
            {/* Daily P&L - Desktop only */}
            {!isLoading && (
              <div className="hidden md:flex items-center gap-1 mt-1">
                <span className="text-[8px] text-white/30 uppercase">Today:</span>
                <span className={`text-xs font-mono tabular-nums ${dailyPnL >= 0 ? "text-green-400/70" : "text-red-400/70"}`}>
                  {dailyPnL >= 0 ? "+" : ""}{dailyPnL.toFixed(3)}
                </span>
              </div>
            )}
          </div>

          {/* ZONE 2: Win Rate Ring - Visual anchor */}
          <div className="flex items-center justify-center px-5 md:px-10">
            <div className="relative w-12 h-12 md:w-20 md:h-20 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : (
                <>
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
                    <span className="text-xs md:text-xl font-bold text-white font-mono tabular-nums leading-none">
                      {Number.isFinite(winRate) ? Math.round(winRate) : 0}%
                    </span>
                    <span className="text-[5px] md:text-[9px] text-white/40 uppercase tracking-wide">{tProfile("winRate")}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ZONE 3: Secondary stats - Grid (desktop only) */}
          <div className="hidden md:grid grid-cols-2 gap-x-6 gap-y-1.5 pl-6 pr-4 border-l border-white/10">
            <StatTrades />
            <StatBest />
            <StatStreak />
          </div>
        </div>
      </div>

      {/* Avatar with animated glow rings - offset on mobile to avoid overlapping fixed wallet pill */}
      <motion.div
        className="absolute left-0 top-[44%] md:top-[45%] -translate-y-1/2 w-28 h-28 md:w-44 md:h-44 z-[30]"
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
