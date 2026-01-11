"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import type { WalletSignal } from "../types";

// Generate consistent colors for wallet avatars
const AVATAR_COLORS: [string, string][] = [
  ["#c4f70e", "#22d3ee"],
  ["#f97316", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#14b8a6"],
];

function getAvatarColors(address: string): [string, string] {
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface WalletAvatarProps {
  signal: WalletSignal;
  size?: number;
}

function WalletAvatar({ signal, size = 20 }: WalletAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [color1, color2] = getAvatarColors(signal.walletAddress);
  const initials = (signal.walletLabel || signal.walletAddress.slice(0, 2)).slice(0, 2).toUpperCase();

  if (signal.twitterAvatar && !imgError) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/20"
        style={{ width: size, height: size }}
      >
        <Image
          src={signal.twitterAvatar}
          alt={signal.twitterUsername || signal.walletLabel || "Wallet"}
          width={size}
          height={size}
          className="object-cover"
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-white/20"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
        fontSize: size * 0.4,
      }}
    >
      <span className="text-white font-bold">{initials}</span>
    </div>
  );
}

interface WalletSignalBadgeProps {
  signal: WalletSignal;
  compact?: boolean;
}

export function WalletSignalBadge({ signal, compact = false }: WalletSignalBadgeProps) {
  const isBuy = signal.action === "BUY";
  const displayName = signal.twitterUsername
    ? `@${signal.twitterUsername}`
    : signal.walletLabel || shortenAddress(signal.walletAddress);

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
          ${isBuy ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
        `}
      >
        <WalletAvatar signal={signal} size={16} />
        <span className="truncate max-w-[80px]">{displayName}</span>
        {isBuy ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
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
      <WalletAvatar signal={signal} size={24} />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{displayName}</span>
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
