"use client";

import { motion } from "motion/react";
import { Panel, StatusPill } from "@/components/design-system";
import { CountUp } from "@/components/animations/CountUp";
import {
  Flame,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  Zap,
} from "lucide-react";
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

function WinRateRing({ percentage }: { percentage: number }) {
  const radius = 28;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="transparent"
          stroke="url(#winRateGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c4f70e" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold text-white font-mono">
          <CountUp to={percentage} duration={1} suffix="%" />
        </span>
      </div>
    </div>
  );
}

export function TraderProfileCard({ stats, config, history }: TraderProfileCardProps) {
  const streak = calculateStreak(history);
  const performance = stats?.performance;
  const trading = stats?.trading;

  const winRate = performance?.winRate ?? 0;
  const totalTrades = performance?.totalTrades ?? 0;
  const winningTrades = performance?.winningTrades ?? 0;
  const largestWin = performance?.largestWin ?? 0;
  const profitFactor = performance?.profitFactor ?? 0;
  const netPnl = performance?.netPnlSol ?? 0;
  const isOnStreak = streak.current >= 2 && streak.type === "win";

  return (
    <Panel className="relative overflow-hidden !p-4">
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#c4f70e]/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />

      <div className="relative flex gap-5">
        {/* LEFT: Character + Name */}
        <div className="flex flex-col items-center shrink-0 w-28">
          <motion.div
            className="relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#c4f70e]/25 to-cyan-500/25 rounded-xl blur-lg" />
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#c4f70e]/40 bg-black/60">
              <img
                src="/character/super-router.png"
                alt="SuperRouter"
                className="w-full h-full object-cover"
              />
              {config?.tradingEnabled && (
                <motion.div
                  className="absolute top-1 right-1"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <StatusPill tone="live" className="text-[7px] px-1 py-0">
                    LIVE
                  </StatusPill>
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="mt-2 text-center">
            <h3 className="text-xs font-bold text-white flex items-center gap-1 justify-center">
              <Sparkles className="w-2.5 h-2.5 text-[#c4f70e]" />
              SuperRouter
            </h3>
            <p className="text-[8px] text-white/40 uppercase tracking-wider">
              Smart Money Agent
            </p>
          </div>
        </div>

        {/* MIDDLE: Hero Metrics */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Top row: Win Rate Ring + P&L + Streak */}
          <div className="flex items-center gap-4">
            {/* Win Rate Ring */}
            <div className="flex flex-col items-center">
              <WinRateRing percentage={winRate} />
              <span className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">Win Rate</span>
            </div>

            {/* P&L - Hero stat */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                {netPnl >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className="text-[8px] text-white/40 uppercase tracking-wider">All-Time P&L</span>
              </div>
              <div className={`text-xl font-bold font-mono ${netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {netPnl >= 0 ? "+" : ""}<CountUp to={netPnl} duration={1.2} />
                <span className="text-sm ml-1 text-white/50">SOL</span>
              </div>
            </div>

            {/* Streak with fire */}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-0.5">
                <motion.div
                  animate={isOnStreak ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                >
                  <Flame className={`w-4 h-4 ${isOnStreak ? "text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]" : "text-white/30"}`} />
                </motion.div>
                <span className="text-[8px] text-white/40 uppercase tracking-wider">Streak</span>
              </div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-lg font-bold font-mono ${isOnStreak ? "text-orange-400" : "text-white"}`}>
                  <CountUp to={streak.current} duration={0.6} />
                </span>
                <span className="text-[10px] text-white/30">/ {streak.best}</span>
              </div>
            </div>
          </div>

          {/* Bottom row: Supporting metrics */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] text-white/40">Trades</span>
              <span className="text-xs font-mono font-medium text-white">
                {totalTrades}
                <span className="text-green-400/70 text-[9px]"> ({winningTrades}W)</span>
              </span>
            </div>

            <div className="w-px h-3 bg-white/10" />

            <div className="flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-[9px] text-white/40">Best</span>
              <span className="text-xs font-mono font-medium text-green-400">
                +<CountUp to={largestWin} duration={0.8} />
              </span>
            </div>

            <div className="w-px h-3 bg-white/10" />

            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] text-white/40">PF</span>
              <span className="text-xs font-mono font-medium text-white">
                <CountUp to={profitFactor} duration={0.8} />x
              </span>
            </div>

            <div className="w-px h-3 bg-white/10" />

            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] text-white/40">Open</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {trading?.openPositions ?? 0}/{trading?.maxOpenPositions ?? 5}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
