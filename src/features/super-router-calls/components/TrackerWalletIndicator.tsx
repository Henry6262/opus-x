"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown, User } from "lucide-react";
import type { WalletEntry } from "../types";

interface TrackerWalletIndicatorProps {
  entries: WalletEntry[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { avatar: 20, ring: 2, overlap: 6 },
  md: { avatar: 28, ring: 3, overlap: 8 },
  lg: { avatar: 36, ring: 3, overlap: 10 },
};

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
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

function formatMarketCap(mc: number): string {
  if (mc >= 1_000_000) return `${(mc / 1_000_000).toFixed(1)}M`;
  if (mc >= 1_000) return `${(mc / 1_000).toFixed(0)}K`;
  return mc.toFixed(0);
}

interface WalletAvatarProps {
  entry: WalletEntry;
  size: "sm" | "md" | "lg";
  index: number;
}

function WalletAvatar({ entry, size, index }: WalletAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { avatar: avatarSize, ring: ringWidth, overlap } = sizeMap[size];
  const { wallet } = entry;

  const initials = (wallet.label || wallet.address.slice(0, 2)).slice(0, 2).toUpperCase();

  const ringColor = wallet.isGodWallet
    ? "ring-yellow-500"
    : "ring-purple-500";

  const bgGradient = wallet.isGodWallet
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
          {wallet.isGodWallet && (
            <div className="absolute -top-1.5 -right-1 z-20">
              <Crown className="w-3 h-3 text-yellow-500" />
            </div>
          )}

          {/* Avatar */}
          {wallet.pfpUrl && !imgError ? (
            <Image
              src={wallet.pfpUrl}
              alt={wallet.label || wallet.address}
              width={avatarSize}
              height={avatarSize}
              className="rounded-full object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} text-white font-bold`}
              style={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.35 }}
            >
              {initials}
            </div>
          )}
        </motion.div>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        className="p-3 bg-zinc-900/95 border border-white/10 backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          {/* Larger avatar in tooltip */}
          <div className="relative flex-shrink-0">
            {wallet.pfpUrl && !imgError ? (
              <Image
                src={wallet.pfpUrl}
                alt={wallet.label || wallet.address}
                width={40}
                height={40}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${bgGradient} text-white font-bold`}>
                <User className="w-5 h-5" />
              </div>
            )}
            {wallet.isGodWallet && (
              <div className="absolute -top-1 -right-1">
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">
                {wallet.label || `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`}
              </span>
              {wallet.isGodWallet && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
                  GOD
                </span>
              )}
            </div>

            {wallet.twitterHandle && (
              <a
                href={`https://twitter.com/${wallet.twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                @{wallet.twitterHandle}
              </a>
            )}

            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/60">
              <span>Entry: {formatUsd(entry.amountUsd)}</span>
              <span>@ {formatMarketCap(entry.entryMarketCap)} MC</span>
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
    if (a.wallet.isGodWallet !== b.wallet.isGodWallet) {
      return a.wallet.isGodWallet ? -1 : 1;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const displayEntries = sortedEntries.slice(0, maxDisplay);
  const remainingCount = entries.length - maxDisplay;

  return (
    <div className="flex items-center">
      {displayEntries.map((entry, index) => (
        <WalletAvatar
          key={`${entry.wallet.id}-${entry.txHash}`}
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
