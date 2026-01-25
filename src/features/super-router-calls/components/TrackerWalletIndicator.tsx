"use client";

import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown, User } from "lucide-react";
import type { WalletEntryPoint } from "../hooks/useWalletEntries";

interface TrackerWalletIndicatorProps {
  entries: WalletEntryPoint[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { avatar: 20, ring: 2, overlap: 6 },
  md: { avatar: 28, ring: 3, overlap: 8 },
  lg: { avatar: 36, ring: 3, overlap: 10 },
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatUsd(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

interface WalletAvatarProps {
  entry: WalletEntryPoint;
  size: "sm" | "md" | "lg";
  index: number;
}

function WalletAvatar({ entry, size, index }: WalletAvatarProps) {
  const { avatar: avatarSize, ring: ringWidth, overlap } = sizeMap[size];

  const initials = entry.wallet_label.slice(0, 2).toUpperCase();

  const ringColor = entry.is_god_wallet
    ? "ring-yellow-500"
    : "ring-purple-500";

  const bgGradient = entry.is_god_wallet
    ? "from-yellow-500/20 to-yellow-600/10"
    : "from-purple-500/20 to-purple-600/10";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`relative cursor-pointer ring-${ringWidth} ${ringColor} rounded-full`}
          style={{
            width: avatarSize,
            height: avatarSize,
            marginLeft: index > 0 ? -overlap : 0,
            zIndex: 10 - index,
          }}
        >
          {/* God wallet crown */}
          {entry.is_god_wallet && (
            <div className="absolute -top-1.5 -right-1 z-20">
              <Crown className="w-3 h-3 text-yellow-500" />
            </div>
          )}

          {/* Avatar - use initials since we don't have PFP URL from this endpoint */}
          <div
            className={`flex items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} text-white font-bold`}
            style={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.35 }}
          >
            {entry.is_god_wallet ? "🐋" : initials}
          </div>
        </motion.div>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        className="p-3 bg-zinc-900/95 border border-white/10 backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          {/* Avatar in tooltip */}
          <div className="relative flex-shrink-0">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${bgGradient} text-white font-bold text-lg`}>
              {entry.is_god_wallet ? "🐋" : <User className="w-5 h-5" />}
            </div>
            {entry.is_god_wallet && (
              <div className="absolute -top-1 -right-1">
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">
                {entry.wallet_label}
              </span>
              {entry.is_god_wallet && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
                  GOD
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/60">
              <span>Entry: {formatUsd(entry.amount_usd)}</span>
              <span>{entry.amount_sol.toFixed(2)} SOL</span>
            </div>

            <span className="text-[10px] text-white/40 mt-1">
              {formatTimeAgo(entry.timestamp)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TrackerWalletIndicator({
  entries,
  maxDisplay = 5,
  size = "md",
}: TrackerWalletIndicatorProps) {
  if (entries.length === 0) return null;

  // Sort by god wallets first, then by entry time
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.is_god_wallet !== b.is_god_wallet) {
      return a.is_god_wallet ? -1 : 1;
    }
    return b.timestamp - a.timestamp;
  });

  const displayEntries = sortedEntries.slice(0, maxDisplay);
  const remainingCount = entries.length - maxDisplay;

  return (
    <div className="flex items-center">
      {displayEntries.map((entry, index) => (
        <WalletAvatar
          key={`${entry.tx_hash}-${index}`}
          entry={entry}
          size={size}
          index={index}
        />
      ))}

      {remainingCount > 0 && (
        <div
          className="flex items-center justify-center rounded-full bg-white/10 text-white/60 text-xs font-medium"
          style={{
            width: sizeMap[size].avatar,
            height: sizeMap[size].avatar,
            marginLeft: -sizeMap[size].overlap,
            zIndex: 0,
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
