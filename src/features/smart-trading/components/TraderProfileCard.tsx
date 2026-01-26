"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { CountUp } from "@/components/animations/CountUp";
import { cn } from "@/lib/utils";
import type { DashboardStatsResponse, Position, TradingConfig } from "../types";

interface TraderProfileCardProps {
  stats: DashboardStatsResponse | null;
  config: TradingConfig | null;
  positions: Position[];
  history: Position[];
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-black/40 rounded", className)} />
  );
}

export function TraderProfileCard({
  stats,
}: TraderProfileCardProps) {
  const tProfile = useTranslations("profile");

  const performance = stats?.performance;

  // Determine loading state - stats is null when data hasn't loaded yet
  const isLoading = stats === null;

  const winRate = performance?.winRate ?? 0;
  const totalTrades = performance?.totalTrades ?? 0;
  const winningTrades = performance?.winningTrades ?? 0;
  const largestWinPercent = performance?.largestWin ?? 0;
  const dailyPnL = stats?.trading?.dailyPnL ?? 0;

  // Today's Profits: Show only positive values (0 if negative)
  const todaysProfits = Math.max(0, dailyPnL);

  const StatTrades = () => (
    <div className="flex items-baseline gap-2 min-w-[140px]">
      <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">{tProfile("trades")}:</span>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <>
          <span className="text-sm md:text-lg font-bold font-mono tabular-nums text-white">{totalTrades}</span>
          <span className="text-[10px] md:text-xs text-green-400/70 tabular-nums">({winningTrades}{tProfile("winsAbbrev")})</span>
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
    <div className="relative mt-2 md:mt-3 pt-6 md:pt-3 pb-3 md:pb-2 overflow-hidden md:overflow-visible">

      {/* Main pill container */}
      <div className="relative rounded-full bg-black/50 backdrop-blur-xl border-2 border-[#c4f70e]/30 h-12 md:h-16 ml-16 md:ml-20 w-fit max-w-[700px] overflow-visible flex items-center shadow-[0_0_20px_rgba(196,247,14,0.1)] animate-[profile-ambient-breathing_3s_ease-in-out_infinite] z-[20]">
          {/* Subtle glow effects */}
          <div className="absolute -top-20 right-1/4 w-48 h-48 bg-[#c4f70e]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content grid - 3 zones */}
        <div className="relative h-full flex items-center pl-10 md:pl-16 pr-2 md:pr-6 py-1 md:py-2 w-full">

          {/* ZONE 1: Today's Profits (24h) - Hero metric */}
          <div className="pr-3 md:pr-6 border-r border-white/10 min-w-[90px] md:min-w-[130px]">
            <div className="text-[8px] md:text-[10px] text-white/50 uppercase tracking-wider font-medium">{tProfile("todaysProfits")}</div>
            {isLoading ? (
              <div className="flex items-center gap-1 h-[20px] md:h-[24px]">
                <Skeleton className="h-4 md:h-5 w-16 md:w-20" />
                <Skeleton className="h-[12px] w-[12px] md:h-[16px] md:w-[16px] rounded-full" />
              </div>
            ) : (
              <motion.div
                key={todaysProfits}
                initial={{ backgroundColor: "rgba(34,197,94,0.2)" }}
                animate={{ backgroundColor: "transparent" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="rounded-lg"
              >
                <div className="flex items-center gap-1 text-sm md:text-xl font-bold font-mono tabular-nums tracking-tight text-green-400">
                  <CountUp to={todaysProfits} duration={1.2} decimals={2} prefix="+" />
                  <Image src="/logos/solana.png" alt="SOL" width={12} height={12} className="opacity-80 md:w-[16px] md:h-[16px]" />
                </div>
              </motion.div>
            )}
          </div>

          {/* ZONE 2: Secondary stats - Grid (desktop only) */}
          <div className="hidden md:flex md:items-center md:gap-6 pl-6 pr-4 border-l border-white/10">
            <StatTrades />
            <StatBest />
          </div>
        </div>
      </div>

      {/* Win Rate Ring - Left side with animated glow */}
      <div
        className="absolute left-[30px] top-[calc(44%+7px)] md:top-[calc(45%+7px)] -translate-y-1/2 w-16 h-16 md:w-24 md:h-24 z-[30]"
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

        {/* Inner glow behind ring */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#c4f70e]/20 to-cyan-500/20 md:from-[#c4f70e]/40 md:to-cyan-500/40 rounded-full blur-lg md:blur-xl scale-105 md:scale-110" />

        {/* Win Rate Ring container */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#c4f70e]/60 bg-black shadow-[0_0_20px_rgba(196,247,14,0.2)] md:shadow-[0_0_40px_rgba(196,247,14,0.3)] flex items-center justify-center">
          {isLoading ? (
            <Skeleton className="w-full h-full rounded-full" />
          ) : (
            <>
              <svg viewBox="0 0 56 56" className="w-full h-full transform -rotate-90 absolute inset-0">
                <circle
                  cx={28}
                  cy={28}
                  r={22}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={5}
                />
                <motion.circle
                  cx={28}
                  cy={28}
                  r={22}
                  fill="transparent"
                  stroke="url(#winRateGradientLeft)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={138.2}
                  initial={{ strokeDashoffset: 138.2 }}
                  animate={{ strokeDashoffset: 138.2 - (winRate / 100) * 138.2 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="winRateGradientLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c4f70e" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-[2px]">
                <span className="text-xs md:text-xl font-bold text-white font-mono tabular-nums leading-none">
                  {Number.isFinite(winRate) ? Math.round(winRate) : 0}%
                </span>
                <span className="text-[6px] md:text-[10px] text-white/40 uppercase tracking-wide">{tProfile("winRate")}</span>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
