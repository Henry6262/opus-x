"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { CountUp } from "@/components/animations/CountUp";
import { SmartMoneyAnimation } from "@/components/animations";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import type { DashboardStatsResponse, Position, TradingConfig } from "../types";

type ActiveView = "smart-trading" | "simulation-twitter";

interface TraderProfileCardProps {
  stats: DashboardStatsResponse | null;
  config: TradingConfig | null;
  positions: Position[];
  history: Position[];
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
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
  activeView,
  onViewChange,
}: TraderProfileCardProps) {
  const t = useTranslations();
  const tProfile = useTranslations("profile");
  const tNav = useTranslations("nav");

  const streak = calculateStreak(history);
  const performance = stats?.performance;

  const winRate = performance?.winRate ?? 0;
  const totalTrades = performance?.totalTrades ?? 0;
  const winningTrades = performance?.winningTrades ?? 0;
  const largestWin = performance?.largestWin ?? 0;
  const netPnl = performance?.netPnlSol ?? 0;
  const isOnStreak = streak.current >= 2 && streak.type === "win";

  const tabs = [
    { id: "smart-trading" as const, label: tNav("smartMoney"), iconType: "smart-money" as const },
    { id: "simulation-twitter" as const, label: tNav("twitter"), iconType: "twitter" as const },
  ];

  return (
    <div className="relative pt-4 pb-16">
      {/* SUPER ROUTER floating title - above avatar */}
      <motion.div
        className="absolute -top-6 left-4 z-30"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <span className="super-router-title">{tProfile("superRouter")}</span>
      </motion.div>

      {/* Language Switcher - top right */}
      <motion.div
        className="absolute -top-6 right-4 z-30"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <LanguageSwitcher />
      </motion.div>

      {/* X/Twitter Handle - below pill, right of avatar */}
      <motion.a
        href="https://x.com/SuperRouterSol"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-[88px] left-[140px] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group z-10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
      >
        <XIcon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
        <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">@SuperRouterSol</span>
      </motion.a>

      {/* Main pill container */}
      <div className="relative rounded-full bg-black/50 backdrop-blur-xl border border-white/10 h-20 ml-16 overflow-visible">
        {/* Subtle glow effects */}
        <div className="absolute -top-20 right-1/4 w-48 h-48 bg-[#c4f70e]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content grid - 3 zones */}
        <div className="relative h-full flex items-center pl-24 pr-6">

          {/* ZONE 1: Hero P&L - The main attraction */}
          <div className="pr-6 border-r border-white/10">
            <div className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{tProfile("allTimePnl")}</div>
            <div className={`flex items-center gap-1.5 text-2xl font-bold font-mono tracking-tight ${netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              <CountUp to={netPnl} duration={1.2} decimals={2} prefix={netPnl >= 0 ? "+" : ""} />
              <Image src="/logos/solana.png" alt="SOL" width={18} height={18} className="opacity-80" />
            </div>
          </div>

          {/* ZONE 2: Win Rate Ring - Visual anchor */}
          <div className="flex items-center justify-center px-6 border-r border-white/10">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg width={56} height={56} className="transform -rotate-90">
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
                <span className="text-sm font-bold text-white font-mono leading-none">
                  <CountUp to={winRate} duration={1} suffix="%" />
                </span>
                <span className="text-[7px] text-white/40 uppercase tracking-wide">{tProfile("winRate")}</span>
              </div>
            </div>
          </div>

          {/* ZONE 3: Secondary stats - Clean labels and values */}
          <div className="flex items-center gap-6 pl-6">
            {/* Streak */}
            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">{tProfile("streak")}</div>
              <div className="flex items-baseline gap-0.5">
                <span className={`text-lg font-bold font-mono ${isOnStreak ? "text-orange-400" : "text-white"}`}>
                  {streak.current}
                </span>
                <span className="text-xs text-white/30">/{streak.best}</span>
              </div>
            </div>

            {/* Trades */}
            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">{tProfile("trades")}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-white">{totalTrades}</span>
                <span className="text-xs text-green-400/70">({winningTrades}W)</span>
              </div>
            </div>

            {/* Best Trade */}
            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">{tProfile("bestTrade")}</div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold font-mono text-green-400">
                  +<CountUp to={largestWin} duration={0.8} decimals={2} />
                </span>
                <Image src="/logos/solana.png" alt="SOL" width={14} height={14} className="opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - centered on screen */}
      <motion.div
        className="absolute -bottom-6 left-0 right-0 z-10 flex items-center justify-center gap-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className="relative flex flex-col items-center gap-2 py-3 px-4 group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Icon + Label */}
            <div className={cn(
              "flex items-center gap-3 transition-colors duration-200",
              activeView === tab.id
                ? "text-[#c4f70e]"
                : "text-white/40 group-hover:text-white/70"
            )}>
              <TabIcon type={tab.iconType} />
              <span className="text-sm font-semibold uppercase tracking-wide">{tab.label}</span>
            </div>

            {/* Underline indicator */}
            {activeView === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c4f70e] to-transparent"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}

            {/* Glow effect for active */}
            {activeView === tab.id && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute -bottom-1 left-1/4 right-1/4 h-[2px] blur-sm bg-[#c4f70e]"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Avatar with animated glow rings */}
      <motion.div
        className="absolute left-0 top-[calc(50%-16px)] -translate-y-1/2 w-32 h-32 z-20"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Outer rotating ring - conic gradient */}
        <motion.div
          className="absolute inset-[-10px] rounded-full opacity-60"
          style={{
            background: "conic-gradient(from 0deg, transparent, rgba(196,247,14,0.4), transparent, rgba(34,211,238,0.4), transparent)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Middle pulsing ring */}
        <motion.div
          className="absolute inset-[-5px] rounded-full border-2 border-[#c4f70e]/30"
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />

        {/* Inner glow behind avatar */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#c4f70e]/40 to-cyan-500/40 rounded-full blur-xl scale-110" />

        {/* Avatar container */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#c4f70e]/60 bg-black shadow-[0_0_40px_rgba(196,247,14,0.3)]">
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
