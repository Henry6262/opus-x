"use client";

import { motion } from "motion/react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import type { WalletSignal } from "../types";

interface WalletSignalBadgeProps {
  signal: WalletSignal;
  compact?: boolean;
}

export function WalletSignalBadge({ signal, compact = false }: WalletSignalBadgeProps) {
  const isBuy = signal.action === "BUY";
  const label = signal.walletLabel || shortenAddress(signal.walletAddress);

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
          ${isBuy ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
        `}
      >
        {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{label}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border
        ${isBuy
          ? "bg-green-500/10 border-green-500/30 text-green-400"
          : "bg-red-500/10 border-red-500/30 text-red-400"
        }
      `}
    >
      <Wallet className="w-4 h-4" />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] opacity-70">
          {isBuy ? "Bought" : "Sold"}
          {signal.amountSol && ` ${signal.amountSol.toFixed(2)} SOL`}
        </span>
      </div>
      <div className="ml-auto">
        {isBuy ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
      </div>
    </motion.div>
  );
}

interface WalletSignalStackProps {
  signals: WalletSignal[];
  maxDisplay?: number;
}

export function WalletSignalStack({ signals, maxDisplay = 3 }: WalletSignalStackProps) {
  const buySignals = signals.filter((s) => s.action === "BUY");
  const displaySignals = signals.slice(0, maxDisplay);
  const remaining = signals.length - maxDisplay;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Wallet className="w-4 h-4 text-[#c4f70e]" />
        <span className="text-xs text-white/60">
          {buySignals.length} wallet{buySignals.length !== 1 ? "s" : ""} bought
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {displaySignals.map((signal, idx) => (
          <WalletSignalBadge key={idx} signal={signal} compact />
        ))}
        {remaining > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/50">
            +{remaining} more
          </span>
        )}
      </div>
    </div>
  );
}

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
