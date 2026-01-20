"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Copy, Brain, ChevronRight, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WatchlistToken } from "../types";

// ============================================
// Types
// ============================================

export interface AiReasoningEntry {
  reasoning: string;
  conviction: number;
  will_trade: boolean;
  timestamp: number;
}

interface WatchlistCardProps {
  token: WatchlistToken;
  aiReasonings?: AiReasoningEntry[];
}

// ============================================
// Token Avatar
// ============================================

function TokenAvatar({ symbol, mint }: { symbol: string; mint: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = symbol.slice(0, 2).toUpperCase();
  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;

  if (imgError) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm text-white bg-white/10">
        {initials}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
      <Image
        src={dexScreenerUrl}
        alt={symbol}
        width={40}
        height={40}
        className="object-cover w-full h-full"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  );
}

// ============================================
// Helpers
// ============================================

// Extract a short summary from AI reasoning (first sentence or key insight)
function extractShortReasoning(reasoning: string): string {
  // Check for common patterns and extract key info
  if (reasoning.includes("REJECTED:")) {
    // Extract the rejection reason
    const rejectMatch = reasoning.match(/REJECTED:\s*([^|]+)/);
    if (rejectMatch) {
      const reason = rejectMatch[1].trim();
      // Take first part if too long
      if (reason.length > 60) {
        return reason.slice(0, 57) + "...";
      }
      return reason;
    }
  }

  // Check for key patterns
  if (reasoning.includes("❌")) {
    const firstIssue = reasoning.match(/❌\s*([^.❌✅]+)/);
    if (firstIssue) {
      return firstIssue[1].trim();
    }
  }

  // Fall back to first sentence
  const firstSentence = reasoning.split(/[.!]/)
    .map(s => s.trim())
    .filter(s => s.length > 10)[0];

  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence;
  }

  // Truncate if too long
  return reasoning.slice(0, 57) + "...";
}

// Format relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Get conviction color
function getConvictionColor(conviction: number): string {
  if (conviction >= 0.85) return "text-green-400";
  if (conviction >= 0.7) return "text-yellow-400";
  if (conviction >= 0.5) return "text-orange-400";
  return "text-red-400";
}

// ============================================
// WatchlistCard
// ============================================

export function WatchlistCard({ token, aiReasonings = [] }: WatchlistCardProps) {
  const [copied, setCopied] = useState(false);

  const latestReasoning = aiReasonings[0];
  const hasReasoning = !!latestReasoning;
  const shortReasoning = hasReasoning
    ? extractShortReasoning(latestReasoning.reasoning)
    : "Awaiting AI analysis...";

  const handleCopy = () => {
    navigator.clipboard.writeText(token.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-shrink-0 w-[300px] p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-colors"
    >
      {/* Top Row: Avatar + Symbol + Copy */}
      <div className="flex items-center gap-2.5 mb-2">
        <TokenAvatar symbol={token.symbol} mint={token.mint} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-sm truncate">{token.symbol}</span>
            <button
              onClick={handleCopy}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 text-white/40 hover:text-white/70" />
              )}
            </button>
          </div>

          {/* Conviction + Check count */}
          <div className="flex items-center gap-2 mt-0.5">
            {hasReasoning && (
              <span className={`text-[10px] font-mono font-bold ${getConvictionColor(latestReasoning.conviction)}`}>
                {(latestReasoning.conviction * 100).toFixed(0)}% conf
              </span>
            )}
            <span className="text-[10px] text-white/40">
              {token.check_count} checks
            </span>
          </div>
        </div>
      </div>

      {/* AI Reasoning Row */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
            <Brain className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 leading-relaxed line-clamp-2">
                {shortReasoning}
              </p>
              {hasReasoning && (
                <span className="text-[10px] text-white/40 mt-1 block">
                  {formatTimeAgo(latestReasoning.timestamp)}
                </span>
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 flex-shrink-0 mt-0.5 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[400px] p-0 bg-zinc-900 border border-white/10"
          sideOffset={5}
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">AI Analysis History</span>
              <span className="text-[10px] text-white/40 ml-auto">{aiReasonings.length} evaluations</span>
            </div>

            {aiReasonings.length === 0 ? (
              <p className="text-xs text-white/50 italic">No AI analysis yet</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {aiReasonings.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className={idx > 0 ? "pt-2 border-t border-white/5" : ""}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono font-bold ${getConvictionColor(entry.conviction)}`}>
                        {(entry.conviction * 100).toFixed(0)}% confidence
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${entry.will_trade ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {entry.will_trade ? "WILL TRADE" : "PASS"}
                      </span>
                      <span className="text-[10px] text-white/40 ml-auto">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      {entry.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export default WatchlistCard;
