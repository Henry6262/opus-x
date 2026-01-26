"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Copy, Wallet } from "lucide-react";
import { CountUp } from "@/components/animations/CountUp";
import { cn } from "@/lib/utils";
import type { DashboardStatsResponse, Position, TradingConfig } from "../types";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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
  config,
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

  // Wallet address from config
  const walletAddress = config?.wallet_address || "";
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "";

  // Today's Profits: Show only positive values (0 if negative)
  const todaysProfits = Math.max(0, dailyPnL);

  // Balance: prefer real wallet balance if available, else paper balance
  const walletBalance = stats?.trading?.realWalletBalance ?? stats?.trading?.walletBalance ?? 0;

  // Total value including positions (walletBalance + totalExposure + unrealizedPnL)
  const totalExposure = stats?.trading?.totalExposure ?? 0;
  const unrealizedPnL = stats?.trading?.unrealizedPnL ?? 0;
  const totalValue = walletBalance + totalExposure + unrealizedPnL;

  const StatBalance = () => (
    <div className="flex items-center gap-2 min-w-[140px]">
      {isLoading ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <>
          <div className="flex items-center gap-1">
            <span className="text-sm md:text-lg font-bold font-mono tabular-nums text-white">
              {walletBalance.toFixed(2)}
            </span>
            <Image src="/logos/solana.png" alt="SOL" width={12} height={12} className="opacity-60 md:w-[14px] md:h-[14px]" />
          </div>
          <span className="text-[10px] md:text-xs text-white/50 font-mono">
            ({totalValue.toFixed(2)})
          </span>
        </>
      )}
    </div>
  );

  const StatTrades = () => (
    <div className="flex flex-col items-center justify-center px-3 py-1 rounded-lg bg-white/[0.03]">
      <span className="text-[8px] md:text-[10px] text-white/40 uppercase tracking-wider">{tProfile("trades")}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-16 mt-0.5" />
      ) : (
        <div className="flex items-baseline gap-1 justify-center">
          <span className="text-sm md:text-lg font-bold font-mono tabular-nums text-white">{totalTrades}</span>
          <span className="text-[9px] md:text-[10px] text-green-400/70 tabular-nums">({winningTrades}{tProfile("winsAbbrev")})</span>
        </div>
      )}
    </div>
  );

  const StatBest = () => (
    <div className="flex flex-col items-center justify-center px-3 py-1 rounded-lg bg-white/[0.03]">
      <span className="text-[8px] md:text-[10px] text-white/40 uppercase tracking-wider">{tProfile("bestTrade")}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-14 mt-0.5" />
      ) : (
        <span className="text-sm md:text-lg font-bold font-mono tabular-nums text-green-400">
          +{Number.isFinite(largestWinPercent) ? Math.round(largestWinPercent) : 0}%
        </span>
      )}
    </div>
  );

  return (
    <div className="relative mt-0 md:mt-3 pt-2 md:pt-3 pb-3 md:pb-2 overflow-hidden md:overflow-visible">

      {/* Main pill container */}
      <div className="relative mt-2 md:mt-5 rounded-full bg-black/50 backdrop-blur-xl border-2 border-[#c4f70e]/30 h-12 md:h-16 ml-16 md:ml-20 w-fit max-w-[700px] overflow-visible flex items-center shadow-[0_0_20px_rgba(196,247,14,0.1)] animate-[profile-ambient-breathing_3s_ease-in-out_infinite] z-[20]">
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

          {/* ZONE 2 Mobile: Balance / Total */}
          <div className="flex md:hidden items-center gap-1.5 pl-3 pr-2">
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <>
                <span className="text-xs font-bold font-mono tabular-nums text-white">
                  {walletBalance.toFixed(2)}
                </span>
                <Image src="/logos/solana.png" alt="SOL" width={14} height={14} className="opacity-70" />
                <span className="text-[9px] text-white/50 font-mono">
                  (tot: {totalValue.toFixed(2)})
                </span>
              </>
            )}
          </div>

          {/* ZONE 2 Desktop: Full stats */}
          <div className="hidden md:flex md:items-center md:gap-6 pl-6 pr-4 border-l border-white/10">
            <StatBalance />
            <StatTrades />
            <StatBest />
          </div>
        </div>
      </div>

      {/* Wallet & Twitter - Below pill, high z-index to stay visible */}
      <motion.div
        className="relative mt-2.5 ml-0 mr-5 md:mr-0 md:ml-32 flex items-center gap-2 md:gap-3 z-[25] bg-black/60 backdrop-blur-md rounded-full px-3 py-1 w-fit"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {/* Wallet address */}
        {shortWallet && (
          <button
            onClick={() => walletAddress && navigator.clipboard.writeText(walletAddress)}
            className="flex items-center gap-1 text-[10px] md:text-xs font-mono text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <Wallet className="w-3 h-3 text-white/60" />
            <span>{shortWallet}</span>
            <Copy className="w-2.5 h-2.5 text-white/40" />
          </button>
        )}

        {/* Divider */}
        <span className="text-white/40 text-[10px]">•</span>

        {/* X/Twitter Handle */}
        <a
          href="https://x.com/SuperRouterSol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] md:text-xs font-mono text-white/70 hover:text-white transition-colors"
        >
          <XIcon className="w-3 h-3 text-white/60" />
          <span>@SuperRouterSol</span>
        </a>
      </motion.div>

      {/* Win Rate Ring - Left side with animated glow */}
      <div
        className="absolute left-[30px] top-[calc(44%-10px)] md:top-[calc(45%+7px)] -translate-y-1/2 w-16 h-16 md:w-24 md:h-24 z-[30]"
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
