"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
    Bot,
    TrendingUp,
    TrendingDown,
    X,
    ShoppingCart,
    DollarSign,
    Target,
    ExternalLink,
    ChevronDown,
    WifiOff,
    Zap,
} from "lucide-react";
import { useActivityFeed, useConnectionStatus } from "../context";
import type { ActivityItem } from "../context";

// ============================================
// AI Decision Types
// ============================================

type DecisionType = "BUY" | "REJECT" | "SELL" | "ANALYZING" | "SIGNAL" | "PROFIT" | "LOSS";

interface AiDecision {
    id: string;
    type: DecisionType;
    tokenSymbol: string;
    tokenMint?: string;
    tokenImage?: string;
    confidence?: number;
    reasoning?: string;
    pnl?: number;
    pnlPercent?: number;
    timestamp: Date;
    details?: {
        entryPrice?: number;
        exitPrice?: number;
        amountSol?: number;
        multiplier?: number;
        riskScore?: number;
        walletLabel?: string;
    };
}

// ============================================
// Helper: Parse activity item to AI Decision
// ============================================

function parseActivityToDecision(item: ActivityItem): AiDecision | null {
    const data = item.data as Record<string, unknown> | undefined;

    switch (item.type) {
        case "ai_analysis": {
            const decision = data?.decision as string;
            const decisionType: DecisionType =
                decision === "ENTER" || decision === "BUY" ? "BUY" :
                decision === "PASS" || decision === "REJECT" ? "REJECT" : "ANALYZING";

            return {
                id: item.id,
                type: decisionType,
                tokenSymbol: (data?.tokenSymbol as string) || "Unknown",
                tokenMint: data?.tokenMint as string,
                confidence: data?.confidence as number,
                reasoning: data?.reasoning as string,
                timestamp: item.timestamp,
                details: {
                    riskScore: data?.riskScore as number,
                },
            };
        }

        case "position_opened": {
            return {
                id: item.id,
                type: "BUY",
                tokenSymbol: (data?.symbol as string) || (data?.ticker as string) || (data?.tokenSymbol as string) || "Token",
                tokenMint: data?.mint as string,
                confidence: 0.85,
                reasoning: "AI analysis complete. Entry conditions met.",
                timestamp: item.timestamp,
                details: {
                    entryPrice: data?.entry_price as number,
                    amountSol: data?.amount_sol as number,
                },
            };
        }

        case "take_profit_triggered":
        case "position_closed": {
            const pnl = (data?.total_pnl_sol as number) ?? (data?.realized as number) ?? 0;
            const isProfit = pnl >= 0;

            return {
                id: item.id,
                type: isProfit ? "PROFIT" : "LOSS",
                tokenSymbol: (data?.ticker as string) || "Token",
                tokenMint: data?.mint as string,
                pnl,
                pnlPercent: data?.pnl_pct as number,
                reasoning: isProfit
                    ? `Take profit hit! ${data?.target_multiplier || "Target"}x reached.`
                    : `Position closed: ${data?.reason || "stop loss"}`,
                timestamp: item.timestamp,
                details: {
                    exitPrice: data?.sell_price as number,
                    multiplier: data?.target_multiplier as number,
                },
            };
        }

        case "wallet_buy_detected":
        case "wallet_signal": {
            const wallet = data?.wallet as Record<string, unknown>;
            const token = data?.token as Record<string, unknown>;

            return {
                id: item.id,
                type: "SIGNAL",
                tokenSymbol: (token?.symbol as string) || (data?.tokenSymbol as string) || "Token",
                tokenMint: data?.tokenMint as string,
                reasoning: `Smart money detected: ${(wallet?.label as string) || (data?.walletLabel as string) || "Whale"} activity`,
                timestamp: item.timestamp,
                details: {
                    walletLabel: (wallet?.label as string) || (data?.walletLabel as string),
                    amountSol: (token?.buy_size_usd as number),
                },
            };
        }

        case "signal_detected": {
            const signal = data?.signal as Record<string, unknown>;
            return {
                id: item.id,
                type: "SIGNAL",
                tokenSymbol: (signal?.symbol as string) || "Token",
                reasoning: `Signal detected from ${(signal?.source as string) || "analysis"}`,
                confidence: signal?.signal_strength as number,
                timestamp: item.timestamp,
            };
        }

        default:
            return null;
    }
}

// ============================================
// Decision Card Component
// ============================================

interface DecisionCardProps {
    decision: AiDecision;
}

function DecisionCard({ decision }: DecisionCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const config = getDecisionConfig(decision.type);

    const timeAgo = useMemo(() => {
        const seconds = Math.floor((Date.now() - decision.timestamp.getTime()) / 1000);
        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }, [decision.timestamp]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`
                relative overflow-hidden rounded-xl border backdrop-blur-sm
                ${config.bgClass} ${config.borderClass}
                transition-all duration-200 cursor-pointer
                hover:scale-[1.01] hover:shadow-lg
            `}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Glow effect */}
            <div className={`absolute inset-0 ${config.glowClass} opacity-20 blur-xl pointer-events-none`} />

            {/* Main content */}
            <div className="relative p-3">
                {/* Header row */}
                <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`
                        flex items-center justify-center w-10 h-10 rounded-lg
                        ${config.iconBgClass}
                    `}>
                        <config.Icon className={`w-5 h-5 ${config.iconClass}`} />
                    </div>

                    {/* Token + Decision */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${config.textClass}`}>
                                {config.label}
                            </span>
                            <span className="font-mono font-semibold text-white text-sm">
                                ${decision.tokenSymbol}
                            </span>
                            {decision.tokenMint && (
                                <a
                                    href={`https://solscan.io/token/${decision.tokenMint}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3 text-white/40" />
                                </a>
                            )}
                        </div>

                        {/* Confidence or PnL */}
                        <div className="flex items-center gap-2 mt-0.5">
                            {decision.confidence !== undefined && (
                                <div className="flex items-center gap-1">
                                    <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <motion.div
                                            className={`h-full ${config.progressClass}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${decision.confidence * 100}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-white/50 font-mono">
                                        {Math.round(decision.confidence * 100)}%
                                    </span>
                                </div>
                            )}
                            {decision.pnl !== undefined && (
                                <span className={`text-sm font-bold font-mono ${decision.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {decision.pnl >= 0 ? "+" : ""}{decision.pnl.toFixed(4)} SOL
                                </span>
                            )}
                            <span className="text-[10px] text-white/30">{timeAgo}</span>
                        </div>
                    </div>

                    {/* Expand indicator */}
                    {decision.reasoning && (
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="text-white/30"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </motion.div>
                    )}
                </div>

                {/* Expanded reasoning */}
                <AnimatePresence>
                    {isExpanded && decision.reasoning && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-start gap-2">
                                    <Bot className="w-4 h-4 text-[#c4f70e] mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-white/70 leading-relaxed">
                                        {decision.reasoning}
                                    </p>
                                </div>

                                {/* Additional details */}
                                {decision.details && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {decision.details.entryPrice && (
                                            <span className="px-2 py-0.5 text-[10px] font-mono bg-white/5 rounded text-white/50">
                                                Entry: ${decision.details.entryPrice.toFixed(8)}
                                            </span>
                                        )}
                                        {decision.details.amountSol && (
                                            <span className="px-2 py-0.5 text-[10px] font-mono bg-white/5 rounded text-white/50">
                                                Size: {decision.details.amountSol.toFixed(4)} SOL
                                            </span>
                                        )}
                                        {decision.details.multiplier && (
                                            <span className="px-2 py-0.5 text-[10px] font-mono bg-[#c4f70e]/20 rounded text-[#c4f70e]">
                                                {decision.details.multiplier}x
                                            </span>
                                        )}
                                        {decision.details.walletLabel && (
                                            <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 rounded text-purple-400">
                                                {decision.details.walletLabel}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ============================================
// Decision Config
// ============================================

function getDecisionConfig(type: DecisionType) {
    switch (type) {
        case "BUY":
            return {
                Icon: ShoppingCart,
                label: "BOUGHT",
                bgClass: "bg-green-500/10",
                borderClass: "border-green-500/30",
                glowClass: "bg-green-500",
                iconBgClass: "bg-green-500/20",
                iconClass: "text-green-400",
                textClass: "text-green-400",
                progressClass: "bg-gradient-to-r from-green-500 to-[#c4f70e]",
            };
        case "REJECT":
            return {
                Icon: X,
                label: "REJECTED",
                bgClass: "bg-red-500/10",
                borderClass: "border-red-500/30",
                glowClass: "bg-red-500",
                iconBgClass: "bg-red-500/20",
                iconClass: "text-red-400",
                textClass: "text-red-400",
                progressClass: "bg-gradient-to-r from-red-500 to-orange-500",
            };
        case "SELL":
            return {
                Icon: DollarSign,
                label: "SOLD",
                bgClass: "bg-yellow-500/10",
                borderClass: "border-yellow-500/30",
                glowClass: "bg-yellow-500",
                iconBgClass: "bg-yellow-500/20",
                iconClass: "text-yellow-400",
                textClass: "text-yellow-400",
                progressClass: "bg-gradient-to-r from-yellow-500 to-orange-500",
            };
        case "PROFIT":
            return {
                Icon: Target,
                label: "PROFIT",
                bgClass: "bg-[#c4f70e]/10",
                borderClass: "border-[#c4f70e]/30",
                glowClass: "bg-[#c4f70e]",
                iconBgClass: "bg-[#c4f70e]/20",
                iconClass: "text-[#c4f70e]",
                textClass: "text-[#c4f70e]",
                progressClass: "bg-gradient-to-r from-[#c4f70e] to-green-400",
            };
        case "LOSS":
            return {
                Icon: TrendingDown,
                label: "LOSS",
                bgClass: "bg-red-500/10",
                borderClass: "border-red-500/30",
                glowClass: "bg-red-500",
                iconBgClass: "bg-red-500/20",
                iconClass: "text-red-400",
                textClass: "text-red-400",
                progressClass: "bg-red-500",
            };
        case "SIGNAL":
            return {
                Icon: Zap,
                label: "SIGNAL",
                bgClass: "bg-purple-500/10",
                borderClass: "border-purple-500/30",
                glowClass: "bg-purple-500",
                iconBgClass: "bg-purple-500/20",
                iconClass: "text-purple-400",
                textClass: "text-purple-400",
                progressClass: "bg-gradient-to-r from-purple-500 to-pink-500",
            };
        case "ANALYZING":
        default:
            return {
                Icon: Bot,
                label: "ANALYZING",
                bgClass: "bg-cyan-500/10",
                borderClass: "border-cyan-500/30",
                glowClass: "bg-cyan-500",
                iconBgClass: "bg-cyan-500/20",
                iconClass: "text-cyan-400",
                textClass: "text-cyan-400",
                progressClass: "bg-gradient-to-r from-cyan-500 to-blue-500",
            };
    }
}

// ============================================
// Live Status Indicator
// ============================================

function LiveIndicator() {
    const { isConnected } = useConnectionStatus();

    return (
        <motion.div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
            animate={isConnected ? {
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1],
            } : {}}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

// ============================================
// Main AI Decision Feed Component
// ============================================

interface AiDecisionFeedProps {
    maxItems?: number;
    className?: string;
}

export function AiDecisionFeed({ maxItems = 15, className = "" }: AiDecisionFeedProps) {
    const { activityFeed } = useActivityFeed();
    const { isConnected } = useConnectionStatus();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Parse activity items to AI decisions
    const decisions = useMemo(() => {
        const parsed: AiDecision[] = [];

        for (const item of activityFeed) {
            const decision = parseActivityToDecision(item);
            if (decision) {
                parsed.push(decision);
            }
        }

        return parsed.slice(0, maxItems);
    }, [activityFeed, maxItems]);

    // Auto-scroll to top when new items arrive
    useEffect(() => {
        if (scrollRef.current && decisions.length > 0) {
            scrollRef.current.scrollTop = 0;
        }
    }, [decisions.length]);

    return (
        <div className={`h-full flex flex-col rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#c4f70e]" />
                    <span className="text-sm font-semibold text-white">AI Decisions</span>
                </div>
                <LiveIndicator />
            </div>

            {/* Decision list */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-2"
            >
                <AnimatePresence mode="popLayout">
                    {decisions.length > 0 ? (
                        decisions.map((decision) => (
                            <DecisionCard key={decision.id} decision={decision} />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-white/40"
                        >
                            {isConnected ? (
                                <>
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    >
                                        <Bot className="w-12 h-12 mb-3 text-[#c4f70e]/50" />
                                    </motion.div>
                                    <span className="text-sm font-medium">AI is analyzing markets...</span>
                                    <span className="text-xs text-white/30 mt-1">Decisions will appear here</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-12 h-12 mb-3 opacity-50" />
                                    <span className="text-sm">Connecting to AI feed...</span>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default AiDecisionFeed;
