"use client";

import { useRef, useEffect, useMemo } from "react";
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
    WifiOff,
    Zap,
} from "lucide-react";
import { RotatingScrambleText } from "@/components/animations";
import { useActivityFeed, useConnectionStatus } from "../context";
import type { ActivityItem } from "../context";

// ============================================
// AI Decision Types
// ============================================

type DecisionType = "BUY" | "REJECT" | "SELL" | "ANALYZING" | "SIGNAL" | "PROFIT" | "LOSS";

// Idle state messages for when AI is waiting
const IDLE_MESSAGES = [
    "Scanning token launches...",
    "Monitoring smart wallets...",
    "Analyzing market conditions...",
    "Evaluating entry signals...",
    "Filtering by criteria...",
];

// Helper to extract rejection badge from reasoning
function getRejectBadge(reasoning: string | undefined): string | null {
    if (!reasoning) return null;
    const lower = reasoning.toLowerCase();
    if (lower.includes("liquidity")) return "low-liq";
    if (lower.includes("volume")) return "low-vol";
    if (lower.includes("market data") || lower.includes("no data")) return "no-data";
    if (lower.includes("risk")) return "high-risk";
    if (lower.includes("age") || lower.includes("too new") || lower.includes("too old")) return "age";
    if (lower.includes("holder")) return "holders";
    return "criteria";
}

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

        case "ai_reasoning": {
            // AI reasoning event - shows real-time AI thought process
            const willTrade = data?.will_trade as boolean;
            const decisionType: DecisionType = willTrade ? "BUY" : "REJECT";

            return {
                id: item.id,
                type: decisionType,
                tokenSymbol: (data?.symbol as string) || "Token",
                tokenMint: data?.mint as string,
                confidence: (data?.conviction as number) ?? undefined,
                reasoning: data?.reasoning as string,
                timestamp: item.timestamp,
            };
        }

        case "no_market_data": {
            // No market data available - skipping token
            return {
                id: item.id,
                type: "REJECT",
                tokenSymbol: (data?.symbol as string) || "Token",
                tokenMint: data?.mint as string,
                reasoning: (data?.reason as string) || "No market data available",
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
    const config = getDecisionConfig(decision.type);

    // Format timestamp as HH:MM:SS
    const timestamp = useMemo(() => {
        return decision.timestamp.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }, [decision.timestamp]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="group hover:bg-white/[0.02] transition-colors font-mono text-[11px] leading-relaxed"
        >
            {/* Log line */}
            <div className="flex items-start gap-2 py-1.5 px-2">
                {/* Timestamp */}
                <span className="text-white/30 flex-shrink-0">[{timestamp}]</span>

                {/* Log level / Decision type */}
                <span className={`flex-shrink-0 font-bold ${config.textClass}`}>
                    [{config.label}]
                </span>

                {/* Token symbol */}
                <span className="text-white font-semibold flex-shrink-0">
                    ${decision.tokenSymbol}
                </span>

                {/* PnL if available */}
                {decision.pnl !== undefined && (
                    <span className={`flex-shrink-0 ${decision.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {decision.pnl >= 0 ? "+" : ""}{decision.pnl.toFixed(4)} SOL
                    </span>
                )}

                {/* Confidence if available */}
                {decision.confidence !== undefined && (
                    <span className="text-white/40 flex-shrink-0">
                        conf:{Math.round(decision.confidence * 100)}%
                    </span>
                )}

                {/* Solscan link */}
                {decision.tokenMint && (
                    <a
                        href={`https://solscan.io/token/${decision.tokenMint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                    >
                        <ExternalLink className="w-3 h-3 text-white/30 hover:text-[#c4f70e]" />
                    </a>
                )}
            </div>

            {/* Reasoning - always visible */}
            {decision.reasoning && (
                <div className="pl-[72px] pr-2 pb-2 text-white/50">
                    <span className="text-[#c4f70e]/60">→</span> {decision.reasoning}

                    {/* Rejection badge for REJECT decisions */}
                    {decision.type === "REJECT" && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/60 border border-red-500/20">
                            {getRejectBadge(decision.reasoning)}
                        </span>
                    )}

                    {/* Additional details as inline tags */}
                    {decision.details && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {decision.details.entryPrice && (
                                <span className="text-white/30">
                                    entry=${decision.details.entryPrice.toFixed(8)}
                                </span>
                            )}
                            {decision.details.amountSol && (
                                <span className="text-white/30">
                                    size={decision.details.amountSol.toFixed(4)}sol
                                </span>
                            )}
                            {decision.details.multiplier && (
                                <span className="text-[#c4f70e]/70">
                                    {decision.details.multiplier}x
                                </span>
                            )}
                            {decision.details.walletLabel && (
                                <span className="text-purple-400/70">
                                    wallet={decision.details.walletLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
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

export function AiDecisionFeed({ maxItems = 50, className = "" }: AiDecisionFeedProps) {
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
        <div className={`h-full flex flex-col rounded-lg bg-black/80 border border-white/5 overflow-hidden ${className}`}>
            {/* Terminal-style Header */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-white/[0.02] border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#c4f70e]" />
                    <span className="text-sm font-mono font-medium text-white/80">ai.log</span>
                </div>
                <LiveIndicator />
            </div>

            {/* Decision list - terminal style */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto py-2 font-mono"
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
                            className="flex flex-col items-center justify-center py-12 text-white/40 font-mono"
                        >
                            {isConnected ? (
                                <>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-[#c4f70e]">$</span>
                                        <RotatingScrambleText
                                            messages={IDLE_MESSAGES}
                                            interval={3500}
                                            speed={35}
                                            className="text-white/50"
                                        />
                                    </div>
                                    {/* Subtle animated dots */}
                                    <div className="flex items-center gap-1 mt-3">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <motion.span
                                                key={i}
                                                className="w-1 h-1 rounded-full bg-[#c4f70e]/40"
                                                animate={{
                                                    opacity: [0.2, 0.8, 0.2],
                                                    scale: [0.8, 1.2, 0.8],
                                                }}
                                                transition={{
                                                    duration: 1.5,
                                                    repeat: Infinity,
                                                    delay: i * 0.2,
                                                    ease: "easeInOut",
                                                }}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-5 h-5 mb-2 opacity-30" />
                                    <span className="text-[11px] text-white/30">connecting...</span>
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
