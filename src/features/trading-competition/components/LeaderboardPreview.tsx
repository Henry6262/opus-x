"use client";

import { motion } from "motion/react";
import { CountUp } from "@/components/animations/CountUp";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { useLeaderboard } from "../hooks/useLeaderboard";

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-3.5 h-3.5 text-yellow-400" />;
    case 2:
      return <Medal className="w-3.5 h-3.5 text-gray-300" />;
    case 3:
      return <Medal className="w-3.5 h-3.5 text-amber-600" />;
    default:
      return <Award className="w-3.5 h-3.5 text-white/20" />;
  }
}

function truncateWallet(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function LeaderboardRow({
  rank,
  wallet,
  score,
  pnl,
  submissions,
  index,
}: {
  rank: number;
  wallet: string;
  score: number;
  pnl: number;
  submissions: number;
  index: number;
}) {
  const isTop3 = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
        isTop3 ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
      }`}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-6 shrink-0">
        {getRankIcon(rank)}
      </div>

      {/* Wallet */}
      <span className="text-[11px] font-mono text-white/60 flex-1 truncate">
        {truncateWallet(wallet)}
      </span>

      {/* Submissions */}
      <span className="text-[10px] text-white/25 tabular-nums shrink-0">
        {submissions}x
      </span>

      {/* PnL */}
      <span
        className={`text-[11px] font-mono tabular-nums shrink-0 ${
          pnl >= 0 ? "text-emerald-400/80" : "text-red-400/80"
        }`}
      >
        {pnl >= 0 ? "+" : ""}
        {pnl.toFixed(1)}%
      </span>

      {/* Score */}
      <div className="flex items-center gap-1 shrink-0 min-w-[48px] justify-end">
        <span className="text-[11px] font-mono font-medium text-[#c4f70e]/80 tabular-nums">
          <CountUp to={Math.round(score)} duration={0.6} delay={index * 0.06} />
        </span>
      </div>
    </motion.div>
  );
}

export function LeaderboardPreview() {
  const { entries, isLoading } = useLeaderboard(10);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[#c4f70e]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
            Top Analysts
          </span>
        </div>
        <span className="text-[10px] text-white/20 font-mono">
          Season 1
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-2.5 text-[9px] uppercase tracking-widest text-white/20 font-mono">
        <div className="w-6 shrink-0" />
        <span className="flex-1">Wallet</span>
        <span className="shrink-0">Subs</span>
        <span className="shrink-0 ml-1">PnL</span>
        <span className="shrink-0 min-w-[48px] text-right">Score</span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5"
            >
              <div className="w-6 h-4 bg-white/5 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-white/5 rounded animate-pulse" />
              <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2">
            <Trophy className="w-6 h-6 text-white/10" />
            <span className="text-[11px] text-white/25 font-mono">
              No submissions yet. Be the first!
            </span>
          </div>
        ) : (
          entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.wallet_address}
              rank={entry.rank}
              wallet={entry.wallet_address}
              score={entry.composite_score}
              pnl={entry.avg_pnl}
              submissions={entry.total_submissions}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}
