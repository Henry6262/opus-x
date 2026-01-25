"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Crown, ExternalLink, Copy, Check, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGodWallets } from "../hooks/useGodWallets";
import type { GodWalletBuy } from "../types";

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatAmount(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

interface GodWalletBuyCardProps {
  buy: GodWalletBuy;
}

function GodWalletBuyCard({ buy }: GodWalletBuyCardProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(buy.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${buy.mint}.png`;
  const chartUrl = `https://dexscreener.com/solana/${buy.mint}`;
  const solscanUrl = `https://solscan.io/tx/${buy.txHash}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
    >
      {/* Copied by system indicator */}
      {buy.copiedBySystem && (
        <div className="absolute -top-2 -right-2 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-black text-[9px] font-bold">
                <Zap className="w-3 h-3" />
                COPIED
              </div>
            </TooltipTrigger>
            <TooltipContent>System automatically copied this trade</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Wallet avatar */}
      <div className="relative flex-shrink-0">
        {buy.wallet.pfpUrl ? (
          <Image
            src={buy.wallet.pfpUrl}
            alt={buy.wallet.label || "God Wallet"}
            width={40}
            height={40}
            className="rounded-full object-cover ring-2 ring-yellow-500"
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 ring-2 ring-yellow-500 flex items-center justify-center text-yellow-500 font-bold text-sm">
            {(buy.wallet.label || buy.wallet.address.slice(0, 2)).slice(0, 2).toUpperCase()}
          </div>
        )}
        <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500" />
      </div>

      {/* Wallet info */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-white truncate">
          {buy.wallet.label || `${buy.wallet.address.slice(0, 4)}...${buy.wallet.address.slice(-4)}`}
        </span>
        <span className="text-[10px] text-white/40">bought</span>
      </div>

      {/* Token info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Token avatar */}
        {buy.imageUrl && !imgError ? (
          <Image
            src={buy.imageUrl}
            alt={buy.symbol}
            width={28}
            height={28}
            className="rounded-lg"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <Image
            src={dexScreenerUrl}
            alt={buy.symbol}
            width={28}
            height={28}
            className="rounded-lg"
            onError={() => setImgError(true)}
            unoptimized
          />
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-sm">{buy.symbol}</span>
            <button onClick={handleCopy} className="p-0.5 rounded hover:bg-white/10">
              {copied ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 text-white/40 hover:text-white/70" />
              )}
            </button>
          </div>
          <span className="text-[10px] text-white/50 truncate">{buy.name}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end">
        <span className="text-sm font-bold text-yellow-400">{formatAmount(buy.amountUsd)}</span>
        <span className="text-[10px] text-white/40">{buy.amountSol.toFixed(2)} SOL</span>
      </div>

      {/* Time & Links */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] text-white/40">{formatTimeAgo(buy.timestamp)}</span>
        <div className="flex items-center gap-1">
          <a
            href={chartUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title="View chart"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export function GodWalletActivity() {
  const { godWallets, recentBuys, isLoading } = useGodWallets();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full"
        />
      </div>
    );
  }

  if (godWallets.length === 0) {
    return (
      <div className="text-center py-4">
        <Crown className="w-8 h-8 text-yellow-500/30 mx-auto mb-2" />
        <p className="text-sm text-white/50">No god wallets configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with god wallet count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-semibold text-white">God Wallet Activity</span>
        </div>
        <span className="text-xs text-white/40">{godWallets.length} god wallet{godWallets.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Recent buys */}
      {recentBuys.length === 0 ? (
        <div className="text-center py-6 rounded-lg bg-white/5 border border-white/10">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-6 h-6 text-yellow-500/50 mx-auto mb-2" />
          </motion.div>
          <p className="text-sm text-white/50">Watching for god wallet buys...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {recentBuys.slice(0, 5).map((buy) => (
              <GodWalletBuyCard key={`${buy.mint}-${buy.txHash}`} buy={buy} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
