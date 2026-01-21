"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, Brain } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DecryptedText from "@/components/DecryptedText";
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
// Conviction Ring Component
// ============================================

function ConvictionRing({ conviction, size = 56 }: { conviction: number; size?: number }) {
  const percentage = conviction * 100;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (conviction * circumference);

  // Color based on conviction level
  const getColor = () => {
    if (conviction >= 0.85) return { stroke: "#4ade80", glow: "rgba(74, 222, 128, 0.4)" };
    if (conviction >= 0.7) return { stroke: "#facc15", glow: "rgba(250, 204, 21, 0.4)" };
    if (conviction >= 0.5) return { stroke: "#fb923c", glow: "rgba(251, 146, 60, 0.4)" };
    return { stroke: "#f87171", glow: "rgba(248, 113, 113, 0.4)" };
  };

  const color = getColor();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-md opacity-60"
        style={{ backgroundColor: color.glow }}
      />

      {/* SVG Ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none"
          style={{ color: color.stroke, fontSize: size * 0.28 }}
        >
          {percentage.toFixed(0)}
        </span>
        <span className="text-[6px] text-white/40 uppercase tracking-wider">conf</span>
      </div>
    </div>
  );
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
      <div className="flex items-center justify-center w-9 h-9 rounded-lg font-bold text-xs text-white bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
        {initials}
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
      <Image
        src={dexScreenerUrl}
        alt={symbol}
        width={36}
        height={36}
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

function extractShortReasoning(reasoning: string): string {
  if (reasoning.includes("REJECTED:")) {
    const rejectMatch = reasoning.match(/REJECTED:\s*([^|]+)/);
    if (rejectMatch) {
      const reason = rejectMatch[1].trim();
      if (reason.length > 50) return reason.slice(0, 47) + "...";
      return reason;
    }
  }

  if (reasoning.includes("❌")) {
    const firstIssue = reasoning.match(/❌\s*([^.❌✅]+)/);
    if (firstIssue) {
      const issue = firstIssue[1].trim();
      if (issue.length > 50) return issue.slice(0, 47) + "...";
      return issue;
    }
  }

  const firstSentence = reasoning.split(/[.!]/)
    .map(s => s.trim())
    .filter(s => s.length > 10)[0];

  if (firstSentence && firstSentence.length <= 50) return firstSentence;
  return reasoning.slice(0, 47) + "...";
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getConvictionColor(conviction: number): string {
  if (conviction >= 0.85) return "text-green-400";
  if (conviction >= 0.7) return "text-yellow-400";
  if (conviction >= 0.5) return "text-orange-400";
  return "text-red-400";
}

// ============================================
// AI Insight Display
// ============================================

function AiInsightDisplay({
  reasoning,
  isLoading
}: {
  reasoning: string;
  isLoading: boolean;
}) {
  const [displayReasoning, setDisplayReasoning] = useState(reasoning);
  const [key, setKey] = useState(0);

  // Re-trigger animation when reasoning changes
  useEffect(() => {
    if (reasoning !== displayReasoning) {
      setDisplayReasoning(reasoning);
      setKey(prev => prev + 1);
    }
  }, [reasoning, displayReasoning]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <motion.div
          className="w-2.5 h-2.5 rounded-full bg-purple-400"
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.9, 1.1, 0.9]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-sm text-white/50 italic">Analyzing...</span>
      </div>
    );
  }

  return (
    <div className="truncate">
      <DecryptedText
        key={key}
        text={reasoning}
        speed={30}
        maxIterations={8}
        animateOn="view"
        className="text-white/80"
        encryptedClassName="text-purple-400/60"
        parentClassName="text-[11px] leading-tight"
      />
    </div>
  );
}

// ============================================
// WatchlistCard
// ============================================

export function WatchlistCard({ token, aiReasonings = [] }: WatchlistCardProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const latestReasoning = aiReasonings[0];
  const hasReasoning = !!latestReasoning;
  const shortReasoning = hasReasoning
    ? extractShortReasoning(latestReasoning.reasoning)
    : "Awaiting AI analysis...";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(token.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative flex-shrink-0 w-[280px] rounded-xl overflow-hidden"
      data-cursor-target
    >
      {/* Glow border on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 197, 94, 0.2))",
          filter: "blur(8px)",
        }}
      />

      {/* Card content */}
      <div className="relative p-3 bg-gradient-to-br from-zinc-900/95 to-black/95 border border-white/10 rounded-xl backdrop-blur-sm">
        {/* Top section: Token info + Conviction ring */}
        <div className="flex items-center justify-between mb-2">
          {/* Left: Avatar + Symbol */}
          <div className="flex items-center gap-2.5">
            <TokenAvatar symbol={token.symbol} mint={token.mint} />

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">{token.symbol}</span>
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

              {/* Checks badge */}
              <span className="text-[10px] text-white/40 mt-0.5">{token.check_count} checks</span>
            </div>
          </div>

          {/* Right: Conviction Ring */}
          {hasReasoning && (
            <ConvictionRing conviction={latestReasoning.conviction} size={44} />
          )}
        </div>

        {/* AI Insight Section - Brain on left, text on right */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className="relative p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer group overflow-hidden"
              whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              {/* Main layout: Brain icon left, content right */}
              <div className="flex items-start gap-2">
                {/* Brain Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <Brain className="w-4 h-4 text-white/70" />
                </div>

                {/* Right side content */}
                <div className="flex-1 min-w-0">
                  {/* AI Text */}
                  <AiInsightDisplay
                    reasoning={shortReasoning}
                    isLoading={!hasReasoning}
                  />

                  {/* Will trade indicator + timestamp */}
                  {hasReasoning && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          latestReasoning.will_trade
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {latestReasoning.will_trade ? "TRADE" : "PASS"}
                      </span>
                      <span className="text-[9px] text-white/30">
                        {formatTimeAgo(latestReasoning.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </TooltipTrigger>

          {/* Tooltip with full history */}
          <TooltipContent
            side="bottom"
            className="w-[380px] p-0 bg-zinc-900/95 border border-white/10 backdrop-blur-xl"
            sideOffset={8}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                <Brain className="w-4 h-4 text-white/80" />
                <span className="text-sm font-semibold text-white">AI Analysis History</span>
                <span className="text-[10px] text-white/40 ml-auto">
                  {aiReasonings.length} evaluation{aiReasonings.length !== 1 ? "s" : ""}
                </span>
              </div>

              {aiReasonings.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Brain className="w-5 h-5 text-white/60" />
                  </motion.div>
                  <p className="text-xs text-white/50">Waiting for AI analysis...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  <AnimatePresence>
                    {aiReasonings.slice(0, 5).map((entry, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`${idx > 0 ? "pt-3 border-t border-white/5" : ""}`}
                      >
                        {/* Entry header */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[11px] font-mono font-bold ${getConvictionColor(entry.conviction)}`}>
                            {(entry.conviction * 100).toFixed(0)}%
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              entry.will_trade
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {entry.will_trade ? "TRADE" : "PASS"}
                          </span>
                          <span className="text-[10px] text-white/40 ml-auto">
                            {formatTimeAgo(entry.timestamp)}
                          </span>
                        </div>

                        {/* Reasoning text */}
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          {entry.reasoning}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

export default WatchlistCard;
