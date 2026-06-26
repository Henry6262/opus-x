"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Wallet,
  Check,
} from "lucide-react";
import { useState } from "react";

// =============================================================================
// REPLACE THIS DATA WITH REAL V1 AGENT HISTORY
// =============================================================================
const V1_DATA = {
  walletAddress: "8jN1ovhpGjT8piSkTqXfZJuSqo2S7KETGTm9jrJLB7r",
  startDate: "2024-09-01",
  endDate: "2024-12-15",
  summary: {
    totalTrades: 47,
    winningTrades: 34,
    losingTrades: 13,
    winRate: 72.3,
    totalPnlUsd: 12480.5,
    totalPnlSol: 86.4,
    bestTradeUsd: 3210.0,
    worstTradeUsd: -890.0,
    avgHoldTimeHours: 18.5,
  },
  explanation: [
    "V1 was a fully autonomous Solana trading agent running 24/7 on-chain.",
    "It scanned new pump.fun launches, whale wallet flows, and Twitter momentum in real time.",
    "Entries were sized by conviction. Exits were governed by trailing stops and profit targets.",
    "Every trade was executed from a single public wallet, fully verifiable on-chain.",
  ],
  dailyPnl: [120, 450, -80, 320, 880, 210, -150, 560, 420, 180, 640, -90, 310, 720, 190],
  trades: [
    { token: "BONK", type: "buy", entryUsd: 0.000012, exitUsd: 0.000018, pnlUsd: 1240, pnlPct: 50, date: "2024-09-12", tx: "mock-sig-bonk" },
    { token: "PEPE", type: "buy", entryUsd: 0.0000085, exitUsd: 0.0000072, pnlUsd: -410, pnlPct: -15.3, date: "2024-09-18", tx: "mock-sig-pepe" },
    { token: "FWOG", type: "buy", entryUsd: 0.0021, exitUsd: 0.0045, pnlUsd: 3210, pnlPct: 114.3, date: "2024-10-03", tx: "mock-sig-fwog" },
    { token: "PENGU", type: "buy", entryUsd: 0.015, exitUsd: 0.019, pnlUsd: 580, pnlPct: 26.7, date: "2024-10-22", tx: "mock-sig-pengu" },
    { token: "MOODENG", type: "buy", entryUsd: 0.08, exitUsd: 0.11, pnlUsd: 890, pnlPct: 37.5, date: "2024-11-05", tx: "mock-sig-moodeng" },
    { token: "WIF", type: "buy", entryUsd: 1.85, exitUsd: 1.62, pnlUsd: -620, pnlPct: -12.4, date: "2024-11-14", tx: "mock-sig-wif" },
  ],
};
// =============================================================================

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function V1ProofPage() {
  const [copied, setCopied] = useState(false);
  const isPositive = V1_DATA.summary.totalPnlUsd >= 0;

  const copyAddress = () => {
    navigator.clipboard.writeText(V1_DATA.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const solscanUrl = `https://solscan.io/account/${V1_DATA.walletAddress}`;

  return (
    <div className="relative min-h-screen bg-[var(--void-black)] text-white overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[160px] bg-[var(--brand-primary)]/8" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <a
          href="/"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-mono uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to waitlist
        </a>
        <div className="flex items-center gap-2">
          <img
            src="/character/super-router.png"
            alt="SuperRouter"
            className="w-8 h-8 object-contain"
          />
          <span className="text-lg font-black tracking-tight">SUPERROUTER</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-12 pb-20 md:pt-20 md:pb-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 mb-6 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-mono uppercase tracking-widest">
            Verifiable on-chain
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6">
            SuperRouter <span className="text-[var(--brand-primary)]">V1</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto">
            Proof of work for the first autonomous trading agent deployment.
            Every trade below was executed from a single public wallet.
          </p>
        </motion.div>
      </section>

      {/* Wallet Card */}
      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-[var(--brand-primary)]" />
              <span className="text-xs font-mono uppercase tracking-widest text-white/40">
                Agent wallet
              </span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="font-mono text-sm md:text-base text-white break-all">
                {V1_DATA.walletAddress}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors text-xs font-mono uppercase"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--brand-primary)] text-[var(--void-black)] hover:bg-[var(--brand-primary-light)] transition-colors text-xs font-semibold uppercase"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Solscan
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: isPositive ? TrendingUp : TrendingDown,
              label: "Total PnL",
              value: formatUsd(V1_DATA.summary.totalPnlUsd),
              sub: `${V1_DATA.summary.totalPnlSol.toFixed(1)} SOL`,
              positive: isPositive,
            },
            {
              icon: Target,
              label: "Win rate",
              value: formatPct(V1_DATA.summary.winRate),
              sub: `${V1_DATA.summary.winningTrades}W / ${V1_DATA.summary.losingTrades}L`,
              positive: true,
            },
            {
              icon: Activity,
              label: "Total trades",
              value: V1_DATA.summary.totalTrades.toString(),
              sub: `${V1_DATA.summary.avgHoldTimeHours}h avg hold`,
              positive: true,
            },
            {
              icon: TrendingUp,
              label: "Best trade",
              value: formatUsd(V1_DATA.summary.bestTradeUsd),
              sub: `Worst: ${formatUsd(V1_DATA.summary.worstTradeUsd)}`,
              positive: true,
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stat.positive ? "bg-[var(--brand-primary)]/10" : "bg-red-500/10"
                  }`}
                >
                  <stat.icon
                    className={`w-4 h-4 ${
                      stat.positive ? "text-[var(--brand-primary)]" : "text-red-400"
                    }`}
                  />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  {stat.label}
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-xs text-white/40">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Performance Chart */}
      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02]"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Daily PnL curve</h2>
                <p className="text-sm text-white/40">Cumulative USD performance over V1 runtime</p>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-white/30">
                {V1_DATA.startDate} → {V1_DATA.endDate}
              </span>
            </div>
            <div className="flex items-end gap-1 md:gap-2 h-48 md:h-64">
              {V1_DATA.dailyPnl.map((pnl, index) => {
                const max = Math.max(...V1_DATA.dailyPnl.map(Math.abs));
                const height = `${Math.max(4, (Math.abs(pnl) / max) * 100)}%`;
                return (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height }}
                    transition={{ delay: 0.4 + index * 0.03, duration: 0.5 }}
                    className={`flex-1 rounded-t-sm ${
                      pnl >= 0 ? "bg-[var(--brand-primary)]" : "bg-red-500"
                    }`}
                    title={`Day ${index + 1}: ${formatUsd(pnl)}`}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Explanation */}
      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02]"
          >
            <h2 className="text-2xl font-bold text-white mb-6">How V1 worked</h2>
            <ul className="space-y-4">
              {V1_DATA.explanation.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-white/70">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[var(--brand-primary)] text-xs font-bold">{index + 1}</span>
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Trade History */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Selected trades</h2>
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.02]">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Date</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Token</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Entry</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Exit</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">PnL</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {V1_DATA.trades.map((trade) => (
                    <tr key={trade.tx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-sm text-white/60">{trade.date}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">{trade.token}</td>
                      <td className="px-6 py-4 text-sm text-white/60">${trade.entryUsd.toFixed(6)}</td>
                      <td className="px-6 py-4 text-sm text-white/60">${trade.exitUsd.toFixed(6)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={trade.pnlUsd >= 0 ? "text-[var(--brand-primary)]" : "text-red-400"}>
                          {trade.pnlUsd >= 0 ? "+" : ""}
                          {formatUsd(trade.pnlUsd)} ({trade.pnlPct >= 0 ? "+" : ""}
                          {trade.pnlPct.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <a
                          href={`https://solscan.io/tx/${trade.tx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 hover:text-[var(--brand-primary)] transition-colors inline-flex items-center gap-1"
                        >
                          {shortenAddress(trade.tx)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-white/50 mb-6">
            V2 is being rebuilt from the ground up for public access.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--brand-primary)] text-[var(--void-black)] rounded-full font-semibold text-sm uppercase tracking-widest hover:bg-[var(--brand-primary-light)] transition-colors"
          >
            Join the V2 waitlist
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </a>
        </div>
      </section>
    </div>
  );
}
