"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, Copy, Loader2, Clock, Brain, CheckCircle, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { CountUp } from "@/components/animations/CountUp";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSharedWebSocket } from "../hooks/useWebSocket";
import { TransactionDrawer } from "./TransactionDrawer";
import { AiReasoningDrawer } from "./AiReasoningDrawer";
import { SectionHeader } from "./SectionHeader";

// ============================================
// Types
// ============================================

import type { BuyCriteriaResult } from "../types";

interface OnChainHolding {
    id: string;
    mint: string;
    symbol: string;
    name: string;
    entry_price: number;
    entry_time: string;
    entry_sol_value: number;
    initial_quantity: number;
    current_quantity: number;
    current_price: number;
    unrealized_pnl_sol: number;
    unrealized_pnl_pct: number;
    peak_price: number;
    peak_pnl_pct: number;
    realized_pnl_sol: number;
    status: "open" | "partially_closed" | "partiallyclosed" | "closed" | "pending";
    market_cap: number | null;
    liquidity: number | null;
    volume_24h: number | null;
    buy_signature: string | null;
    /** AI reasoning - why we decided to buy this token */
    buy_criteria: BuyCriteriaResult | null;
    // Computed/optional fields for compatibility
    image_url?: string | null;
    // TP milestone tracking (from backend WebSocket)
    tp1_hit?: boolean;
    tp2_hit?: boolean;
    buy_count?: number;               // Number of buy transactions
    sell_count?: number;              // Number of sell transactions
    sell_transactions?: Array<{
        signature: string;
        target_level: number;
        sol_received: number;
        quantity: number;
        timestamp: string;
        status: "pending" | "confirmed" | "failed";
    }>;
}

// ============================================
// Idle State Animation Component
// ============================================

import RotatingText from "@/components/RotatingText";

const ANALYSIS_PHRASES = [
    "Analyzing market conditions",
    "Scanning for alpha opportunities",
    "Monitoring whale movements",
    "Evaluating token metrics",
    "Tracking liquidity flows",
    "Processing on-chain signals",
    "Identifying momentum patterns",
    "Calculating risk parameters",
];

function IdleStateAnimation() {
    return (
        <div className="relative h-[200px] overflow-hidden rounded-xl">
            {/* GIF as full-width background */}
            <div className="absolute inset-0">
                <Image
                    src="/videos/gif.gif"
                    alt="Analyzing"
                    fill
                    className="object-cover opacity-60"
                    unoptimized
                />
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50" />
            </div>

            {/* Content overlay - centered */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
                {/* Pulsing rings animation */}
                <div className="relative mb-5">
                    <div className="absolute -inset-4 animate-ping rounded-full bg-[#c4f70e]/20" style={{ animationDuration: '2s' }} />
                    <div className="absolute -inset-6 animate-ping rounded-full bg-[#c4f70e]/10" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#c4f70e]/40 to-[#c4f70e]/10 flex items-center justify-center backdrop-blur-sm border border-[#c4f70e]/30 shadow-[0_0_30px_rgba(196,247,14,0.3)]">
                        <div className="w-5 h-5 rounded-full bg-[#c4f70e] animate-pulse shadow-[0_0_25px_rgba(196,247,14,0.8)]" />
                    </div>
                </div>

                {/* Rotating analysis text with 3D effect */}
                <div className="text-center h-8 flex items-center justify-center overflow-hidden">
                    <RotatingText
                        texts={ANALYSIS_PHRASES}
                        rotationInterval={2500}
                        staggerDuration={0.02}
                        staggerFrom="center"
                        mainClassName="text-sm font-medium text-white/90 justify-center"
                        elementLevelClassName="drop-shadow-[0_0_8px_rgba(196,247,14,0.4)]"
                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    />
                </div>

                {/* Subtitle with animated dots */}
                <div className="flex items-center justify-center gap-1 mt-3">
                    <span className="text-xs text-white/50 font-medium">Waiting for positions</span>
                    <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#c4f70e] animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                        <span className="w-1 h-1 rounded-full bg-[#c4f70e] animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
                        <span className="w-1 h-1 rounded-full bg-[#c4f70e] animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Constants
// ============================================

const SOLANA_ICON = "/logos/solana.png";

// Format relative time (e.g., "2h ago", "3d ago")
function formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) return `${diffDay}d`;
    if (diffHour > 0) return `${diffHour}h`;
    if (diffMin > 0) return `${diffMin}m`;
    return "now";
}

// ============================================
// Token Avatar Component
// ============================================

const AVATAR_COLORS: [string, string][] = [
    ["#c4f70e", "#22d3ee"],
    ["#f97316", "#ef4444"],
    ["#8b5cf6", "#ec4899"],
    ["#06b6d4", "#3b82f6"],
    ["#10b981", "#14b8a6"],
];

function getAvatarColors(symbol: string): [string, string] {
    const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface TokenAvatarProps {
    imageUrl?: string | null;
    symbol: string;
    mint: string;
    size?: number;
}

function TokenAvatar({ imageUrl, symbol, mint, size = 48 }: TokenAvatarProps) {
    const [imgError, setImgError] = useState(false);
    const [color1, color2] = getAvatarColors(symbol);
    const initials = symbol.slice(0, 2).toUpperCase();

    const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
    const finalImageUrl = imageUrl || dexScreenerUrl;

    if (imgError || !finalImageUrl) {
        return (
            <div
                className="relative flex items-center justify-center rounded-xl font-bold text-white shadow-lg flex-shrink-0 bg-zinc-800"
                style={{
                    width: size,
                    height: size,
                    fontSize: size * 0.35,
                }}
            >
                {initials}
            </div>
        );
    }

    return (
        <div
            className="relative rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
            style={{ width: size, height: size, minWidth: size, minHeight: size }}
        >
            <Image
                src={finalImageUrl}
                alt={symbol}
                fill
                sizes={`${size}px`}
                className="object-cover w-full h-full"
                onError={() => setImgError(true)}
                unoptimized
            />
        </div>
    );
}

// ============================================
// Progress Bar for Take Profit Targets
// ============================================

// Format market cap for display (no decimals)
function formatMarketCap(mcap: number): string {
    if (mcap >= 1_000_000_000) return `$${Math.round(mcap / 1_000_000_000)}B`;
    if (mcap >= 1_000_000) return `$${Math.round(mcap / 1_000_000)}M`;
    if (mcap >= 1_000) return `$${Math.round(mcap / 1_000)}K`;
    return `$${Math.round(mcap)}`;
}

// Animated market cap for progress bar (simplified, no flash - just smooth transitions)
interface AnimatedProgressMarketCapProps {
    value: number;
    className?: string;
}

function AnimatedProgressMarketCap({ value, className = "" }: AnimatedProgressMarketCapProps) {
    // Format market cap with animation
    const formatValue = () => {
        if (value >= 1_000_000_000) return { num: value / 1_000_000_000, suffix: "B" };
        if (value >= 1_000_000) return { num: value / 1_000_000, suffix: "M" };
        if (value >= 1_000) return { num: value / 1_000, suffix: "K" };
        return { num: value, suffix: "" };
    };

    const { num, suffix } = formatValue();

    return (
        <span className={className}>
            $<CountUp to={num} duration={0.5} decimals={0} />{suffix}
        </span>
    );
}

interface ProgressBarProps {
    currentMarketCap?: number;
    // Current PnL percentage for progress calculation
    pnlPct?: number;
    // TP milestone tracking from WebSocket
    tp1Hit?: boolean;
    tp2Hit?: boolean;
}

// TP target thresholds (percentage gain)
const TP1_THRESHOLD = 50;  // 50% gain = 1.5x
const TP2_THRESHOLD = 100; // 100% gain = 2x
const TP3_THRESHOLD = 200; // 200% gain = 3x

function ProgressBar({
    currentMarketCap,
    pnlPct = 0,
    tp1Hit = false,
    tp2Hit = false,
}: ProgressBarProps) {
    // TP Visual positioning: evenly spread across the bar
    const tpPositions = [
        { label: "TP1", position: 33, isHit: tp1Hit, threshold: TP1_THRESHOLD },
        { label: "TP2", position: 66, isHit: tp2Hit, threshold: TP2_THRESHOLD },
        { label: "TP3", position: 95, isHit: false, threshold: TP3_THRESHOLD },
    ];

    // Progress calculation based on current PnL percentage
    // Map PnL% to visual position: 0% -> 0, 50% -> 33%, 100% -> 66%, 200% -> 95%
    let progress = 0;
    if (pnlPct <= 0) {
        progress = 0;
    } else if (pnlPct >= TP3_THRESHOLD) {
        progress = 0.95;
    } else if (pnlPct >= TP2_THRESHOLD) {
        // Between TP2 (100%) and TP3 (200%): interpolate between 66% and 95%
        const ratio = (pnlPct - TP2_THRESHOLD) / (TP3_THRESHOLD - TP2_THRESHOLD);
        progress = 0.66 + ratio * (0.95 - 0.66);
    } else if (pnlPct >= TP1_THRESHOLD) {
        // Between TP1 (50%) and TP2 (100%): interpolate between 33% and 66%
        const ratio = (pnlPct - TP1_THRESHOLD) / (TP2_THRESHOLD - TP1_THRESHOLD);
        progress = 0.33 + ratio * (0.66 - 0.33);
    } else {
        // Before TP1 (0% to 50%): interpolate between 0% and 33%
        const ratio = pnlPct / TP1_THRESHOLD;
        progress = ratio * 0.33;
    }

    // Show market cap badge if we have data
    const showMcapBadge = currentMarketCap !== undefined && currentMarketCap > 0;

    return (
        <div className="relative py-1 overflow-visible">
            {/* Market cap badge - ABOVE the progress bar, aligned with it */}
            {showMcapBadge && (
                <div className="flex items-center gap-1 mb-1 ml-[67px] md:ml-[77px]">
                    <span className="text-[9px] md:text-[10px] font-medium text-white/50 uppercase">mcap:</span>
                    <AnimatedProgressMarketCap
                        value={currentMarketCap!}
                        className="text-[10px] md:text-[11px] font-mono font-bold tabular-nums text-white/90"
                    />
                </div>
            )}

            {/* Progress Track with TP milestones - compact layout */}
            <div className="flex items-center gap-2 overflow-visible">
                {/* TP's Label with target icon */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                    <span className="text-xs md:text-sm font-semibold text-white/80 uppercase tracking-wide">TP&apos;s</span>
                </div>

                <div className="flex-1 relative overflow-visible">
                    {/* Progress bar track */}
                    <div className="relative h-4 md:h-5 w-full rounded-full bg-white/10 overflow-visible">
                        {/* Progress Fill */}
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                                background: "linear-gradient(90deg, #22c55e, #c4f70e)",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ type: "spring", stiffness: 120, damping: 18 }}
                        />

                        {/* Glow effect at progress edge */}
                        <motion.div
                            className="absolute inset-y-0 w-3 blur-sm rounded-full"
                            style={{
                                left: `calc(${progress * 100}% - 6px)`,
                                background: "#c4f70e",
                                opacity: 0.5,
                            }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />

                        {/* TP Milestone markers - centered on the progress bar */}
                        {tpPositions.map((tp, idx) => {
                        const isNextTarget = !tp.isHit && tpPositions.slice(0, idx).every(t => t.isHit);

                        return (
                            <motion.div
                                key={tp.label}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                                style={{ left: `${tp.position}%` }}
                                animate={tp.isHit ? { scale: [1, 1.15, 1] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {tp.isHit ? (
                                    /* TP Hit - Green filled circle with checkmark */
                                    <div
                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(196,247,14,0.7)]"
                                        style={{ backgroundColor: "#c4f70e" }}
                                    >
                                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-black" />
                                    </div>
                                ) : isNextTarget ? (
                                    /* Next target - Pulsing border with label */
                                    <motion.div
                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center"
                                        style={{
                                            borderColor: "#c4f70e",
                                            backgroundColor: "rgba(0,0,0,0.85)",
                                        }}
                                        animate={{
                                            boxShadow: ["0 0 0px rgba(196,247,14,0.3)", "0 0 8px rgba(196,247,14,0.6)", "0 0 0px rgba(196,247,14,0.3)"]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <span className="text-[8px] md:text-[9px] font-bold text-[#c4f70e]">
                                            {tp.label}
                                        </span>
                                    </motion.div>
                                ) : (
                                    /* Future target - Dimmed */
                                    <div
                                        className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                                        style={{
                                            borderColor: "rgba(255,255,255,0.25)",
                                            backgroundColor: "rgba(20,20,20,0.9)",
                                            backdropFilter: "blur(4px)"
                                        }}
                                    >
                                        <span className="text-[7px] md:text-[8px] font-bold text-white/40">
                                            {tp.label}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Buy/Sell Transaction Counter Badge
// ============================================

interface TxCountBadgeProps {
    buyCount?: number;
    sellCount?: number;
}

function TxCountBadge({ buyCount = 1, sellCount = 0 }: TxCountBadgeProps) {
    return (
        <div className="flex items-center gap-2">
            {/* Buy count - no background */}
            <div className="flex items-center gap-0.5 text-green-400">
                <ArrowUpRight className="w-3 h-3" />
                <span className="text-[10px] font-bold tabular-nums">{buyCount}</span>
            </div>
            {/* Sell count - no background (only show if > 0) */}
            {sellCount > 0 && (
                <div className="flex items-center gap-0.5 text-red-400">
                    <ArrowDownRight className="w-3 h-3" />
                    <span className="text-[10px] font-bold tabular-nums">{sellCount}</span>
                </div>
            )}
        </div>
    );
}

// ============================================
// SOL Value Display Component (Animated)
// ============================================

interface SolValueProps {
    solAmount: number;
    size?: "sm" | "lg";
}

function SolValue({ solAmount, size = "lg" }: SolValueProps) {
    const formatSol = (val: number) => {
        if (val >= 1000) return `${(val / 1000).toFixed(2)}K`;
        if (val >= 0.01) return val.toFixed(2);
        return val.toFixed(2);
    };

    return (
        <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${size === "lg" ? "text-xl font-bold" : "text-sm"}`}>
            {formatSol(solAmount)}
            <Image src={SOLANA_ICON} alt="SOL" width={size === "lg" ? 18 : 14} height={size === "lg" ? 18 : 14} />
        </span>
    );
}

// ============================================
// Animated Percent Display with Flash Effect
// ============================================

interface AnimatedPercentProps {
    value: number;
    className?: string;
}

function AnimatedPercent({ value, className = "" }: AnimatedPercentProps) {
    const [flash, setFlash] = useState<"up" | "down" | null>(null);
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (Math.abs(prevValueRef.current - value) > 0.5) { // Only flash if >0.5% change
            const direction = value > prevValueRef.current ? "up" : "down";
            setFlash(direction);
            prevValueRef.current = value;

            const timer = setTimeout(() => setFlash(null), 600);
            return () => clearTimeout(timer);
        }
        prevValueRef.current = value;
    }, [value]);

    const flashClass = flash === "up"
        ? "animate-flash-green"
        : flash === "down"
            ? "animate-flash-red"
            : "";

    const isPositive = value >= 0;

    return (
        <span className={`inline-flex items-center transition-all duration-200 ${flashClass} ${className}`}>
            <CountUp
                to={value}
                duration={0.8}
                decimals={0}
                prefix={isPositive ? "+" : ""}
                suffix="%"
            />
        </span>
    );
}


// ============================================
// Holding Card Component
// ============================================

interface HoldingCardProps {
    holding: OnChainHolding;
    index: number;
    onClick?: () => void;
    onAiClick?: () => void;
}

function HoldingCard({ holding, index, onClick, onAiClick }: HoldingCardProps) {
    // PnL from backend
    const pnlSol = holding.unrealized_pnl_sol;
    const pnlPct = holding.unrealized_pnl_pct;

    // Market cap data for progress bar
    const currentMarketCap = holding.market_cap ?? undefined;

    // Always show progress bar (TP tracking)
    const showProgressBar = true;


    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
            className="relative px-3 md:px-4 py-2.5 md:py-3 pb-5 md:pb-6 rounded-xl bg-black/25 backdrop-blur-xl border border-white/10 overflow-visible hover:border-[#c4f70e]/30 transition-all group cursor-pointer"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c4f70e]/5 to-transparent" />
            </div>

            {/* Entry Time Badge - Absolute Top Left */}
            {holding.entry_time && (
                <div className="absolute top-1.5 left-1.5 z-20">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-medium text-white/70 border border-white/10">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(holding.entry_time)}
                    </span>
                </div>
            )}

            {/* Main Layout: Image Left | Content Right */}
            <div className="flex gap-2 md:gap-3 items-stretch">
                {/* LEFT: Token Avatar - smaller on mobile */}
                <div className="flex-shrink-0 flex items-center">
                    <div className="hidden md:block">
                        <TokenAvatar
                            imageUrl={holding.image_url}
                            symbol={holding.symbol}
                            mint={holding.mint}
                            size={72}
                        />
                    </div>
                    <div className="md:hidden">
                        <TokenAvatar
                            imageUrl={holding.image_url}
                            symbol={holding.symbol}
                            mint={holding.mint}
                            size={52}
                        />
                    </div>
                </div>

                {/* RIGHT: All Content */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Token name + Copy + Buy/Sell + AI | PnL% */}
                    <div className="flex items-start justify-between mb-1">
                        {/* Token name + Copy button + Buy/Sell counts + AI button */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm md:text-base">{holding.symbol}</span>
                            {/* Copy button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(holding.mint);
                                }}
                                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                                title="Copy Contract Address"
                            >
                                <Copy className="w-3 h-3 text-white/40 hover:text-white/70" />
                            </button>
                            {/* Buy/Sell transaction counts */}
                            <TxCountBadge
                                buyCount={holding.buy_count ?? 1}
                                sellCount={holding.sell_count ?? ((holding.tp1_hit ? 1 : 0) + (holding.tp2_hit ? 1 : 0))}
                            />
                            {/* AI Reasoning button */}
                            {holding.buy_criteria && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAiClick?.();
                                    }}
                                    className="p-0.5 md:p-1 rounded hover:bg-[#c4f70e]/20 transition-colors"
                                    title="View AI Reasoning"
                                >
                                    <Brain className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#c4f70e]/60 hover:text-[#c4f70e]" />
                                </button>
                            )}
                        </div>

                        {/* PnL Percentage Section (right side) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* PnL Percentage - Animated with flash on change */}
                            <div className="flex flex-col items-end">
                                {pnlPct !== null ? (
                                    <motion.div
                                        className={`text-lg md:text-2xl font-bold font-mono tabular-nums ${pnlPct >= 0 ? "text-[#c4f70e]" : "text-red-400"}`}
                                        style={{
                                            textShadow: pnlPct >= 0
                                                ? "0 0 10px rgba(196,247,14,0.4)"
                                                : "0 0 10px rgba(239,68,68,0.4)",
                                        }}
                                    >
                                        <AnimatedPercent value={pnlPct} />
                                    </motion.div>
                                ) : (
                                    <div className="text-base md:text-xl font-bold font-mono tabular-nums text-white/40">
                                        —
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Entry SOL + Progress Bar (full width) */}
                    <div className="flex items-center gap-4 md:gap-6 -mt-0.5 overflow-visible">
                        {/* Left side: SOL entry value */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                            {/* Entry Amount (SOL invested) + Unrealized PnL */}
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 text-white">
                                    <span className="font-mono font-bold tabular-nums text-sm md:text-base">
                                        {holding.entry_sol_value?.toFixed(2) ?? "0.00"}
                                    </span>
                                    <Image
                                        src="/logos/solana.png"
                                        alt="SOL"
                                        width={14}
                                        height={14}
                                        className="opacity-80 md:w-[16px] md:h-[16px]"
                                    />
                                </div>
                                {/* Unrealized PnL - only show if >= 0.1 SOL */}
                                {pnlSol !== null && Math.abs(pnlSol) >= 0.1 && (
                                    <span className={`font-mono tabular-nums text-[10px] md:text-xs flex-shrink-0 tracking-tight ${pnlSol >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        ({pnlSol >= 0 ? "+" : ""}{pnlSol.toFixed(1)})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-8 bg-white/20 flex-shrink-0" />

                        {/* Progress Bar with TP milestones + Market Cap badge inside */}
                        {showProgressBar && (
                            <div className="flex-1 min-w-0 overflow-visible">
                                <ProgressBar
                                    currentMarketCap={currentMarketCap}
                                    pnlPct={pnlPct ?? 0}
                                    tp1Hit={holding.tp1_hit}
                                    tp2Hit={holding.tp2_hit}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fading separator line */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>
    );
}

// ============================================
// Main Portfolio Holdings Panel
// ============================================

interface PortfolioHoldingsPanelProps {
    maxVisibleItems?: number; // Max items visible before scrolling (desktop dynamic height)
}

// Selected holding state for drawer
interface SelectedHolding {
    symbol: string;
    mint: string;
    imageUrl: string | null;
}

// Height per holding card (including gap)
const CARD_HEIGHT_PX = 100; // ~88px card + 6px gap
const HEADER_HEIGHT_PX = 60; // Header section

export function PortfolioHoldingsPanel({ maxVisibleItems = 3 }: PortfolioHoldingsPanelProps) {
    const [holdings, setHoldings] = useState<OnChainHolding[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedHolding, setSelectedHolding] = useState<SelectedHolding | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // AI Reasoning drawer state
    const [aiReasoningHolding, setAiReasoningHolding] = useState<OnChainHolding | null>(null);
    const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
    const isFetchingRef = useRef(false);
    const hasFetchedRef = useRef(false); // Prevent double fetch on mount
    const apiLoadedRef = useRef(false); // Track if initial API load has completed
    // Store market_cap data separately - this is the source of truth for market caps
    // Since WebSocket might not send market_cap, we preserve values from API
    const marketCapCacheRef = useRef<Map<string, number>>(new Map());
    const { on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });

    // Handle holding card click - open transaction drawer
    const handleHoldingClick = useCallback((holding: OnChainHolding) => {
        setSelectedHolding({
            symbol: holding.symbol,
            mint: holding.mint,
            imageUrl: holding.image_url ?? null,
        });
        setIsDrawerOpen(true);
    }, []);

    // Handle AI reasoning button click
    const handleAiClick = useCallback((holding: OnChainHolding) => {
        setAiReasoningHolding(holding);
        setIsAiDrawerOpen(true);
    }, []);

    // Close transaction drawer
    const handleCloseDrawer = useCallback(() => {
        setIsDrawerOpen(false);
    }, []);

    // Close AI reasoning drawer
    const handleCloseAiDrawer = useCallback(() => {
        setIsAiDrawerOpen(false);
    }, []);

    // Fetch initial holdings (one-time from Helius via backend, or direct if available)
    const fetchHoldings = useCallback(async () => {
        // Prevent overlapping fetches
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        try {
            setIsLoading(true);
            const url = buildDevprntApiUrl("/api/trading/holdings");
            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Backend unavailable (${response.status})`);
            }

            const result = await response.json();
            if (result?.success === false) {
                throw new Error(result.error || "Failed to load holdings");
            }

            const rawData = (result?.data as OnChainHolding[]) || [];

            // Filter open AND partially_closed positions (both have quantity) and sort by PnL
            const data: OnChainHolding[] = rawData
                .filter((h) => (h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0);
            // Sort by unrealized PnL percentage (highest profit first)
            data.sort((a, b) => (b.unrealized_pnl_pct ?? 0) - (a.unrealized_pnl_pct ?? 0));

            // Cache market_cap values from API - these are the source of truth
            data.forEach(h => {
                if (h.market_cap && h.market_cap > 0) {
                    marketCapCacheRef.current.set(h.mint, h.market_cap);
                }
            });

            apiLoadedRef.current = true; // Mark API as loaded
            setHoldings(data);
            setError(null);
        } catch (err) {
            console.error("[PortfolioHoldings] ❌ Failed to fetch holdings:", err);
            setError(err instanceof Error ? err.message : "Failed to load holdings");
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    // Fetch holdings on mount only - WebSocket provides real-time price updates
    useEffect(() => {
        // Prevent double fetch in React StrictMode or multiple mounts
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchHoldings();
    }, [fetchHoldings]);


    // Listen for holdings_snapshot events from backend WebSocket
    // Preserve order when same items exist, only re-sort when items change
    useEffect(() => {
        const unsubHoldingsSnapshot = onTradingEvent<{
            holdings: OnChainHolding[];
            total_unrealized_pnl_sol: number;
            total_realized_pnl_sol: number;
            open_position_count: number;
            timestamp: number;
        }>("holdings_snapshot", (data) => {
            if (!data?.holdings) return;

            // Skip WebSocket updates until API has loaded initial data with market_cap
            if (!apiLoadedRef.current) {
                return;
            }

            // Filter holdings from WebSocket
            const wsHoldings = data.holdings
                .filter((h) => (h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0);

            // Apply cached market_cap to all WebSocket holdings before processing
            const wsHoldingsWithCachedMcap = wsHoldings.map(h => {
                const cachedMcap = marketCapCacheRef.current.get(h.mint);
                const finalMcap = (h.market_cap && h.market_cap > 0) ? h.market_cap : cachedMcap ?? null;

                // Update cache if WS has valid market_cap
                if (h.market_cap && h.market_cap > 0) {
                    marketCapCacheRef.current.set(h.mint, h.market_cap);
                }

                return {
                    ...h,
                    market_cap: finalMcap,
                };
            });

            setHoldings((prevHoldings) => {
                // Create a map of previous holdings for merging cached data
                const prevHoldingsMap = new Map(prevHoldings.map(h => [h.mint, h]));

                // WebSocket snapshot is the source of truth - only keep holdings that are in the snapshot
                const updatedHoldings = wsHoldingsWithCachedMcap.map(wsH => {
                    const prevH = prevHoldingsMap.get(wsH.mint);

                    // Merge with previous state to preserve cached values if WS doesn't have them
                    if (prevH) {
                        return {
                            ...wsH,
                            market_cap: (wsH.market_cap && wsH.market_cap > 0) ? wsH.market_cap : prevH.market_cap,
                            liquidity: (wsH.liquidity && wsH.liquidity > 0) ? wsH.liquidity : prevH.liquidity,
                            volume_24h: (wsH.volume_24h && wsH.volume_24h > 0) ? wsH.volume_24h : prevH.volume_24h,
                        };
                    }

                    return wsH;
                });

                // Sort by unrealized PnL percentage (highest profit first)
                updatedHoldings.sort((a, b) => (b.unrealized_pnl_pct ?? 0) - (a.unrealized_pnl_pct ?? 0));

                return updatedHoldings;
            });

            setIsLoading(false);
            setError(null);
        });

        return () => {
            unsubHoldingsSnapshot?.();
        };
    }, [onTradingEvent]);

    // Calculate total invested SOL (sum of entry values only)
    const totalValueSol = useMemo(() => {
        return holdings.reduce((sum, h) => sum + (h.entry_sol_value ?? 0), 0);
    }, [holdings]);


    // Dynamic height calculation for desktop
    // Height = header + (min(items, maxVisible) * cardHeight)
    // When 0 items, show a taller empty state for visual balance
    const visibleCount = Math.min(holdings.length, maxVisibleItems);
    const emptyStateHeight = 220; // Taller empty state (~40% more)
    const loadingHeight = 220; // Taller loading state (~40% more)

    // Calculate cards area height
    const cardsAreaHeight = holdings.length === 0
        ? (isLoading ? loadingHeight : emptyStateHeight)
        : visibleCount * CARD_HEIGHT_PX;

    const dynamicHeight = HEADER_HEIGHT_PX + cardsAreaHeight;

    // Check if we're on desktop (will be false during SSR, then correct on hydration)
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    return (
        <div
            className="flex flex-col overflow-hidden transition-[height] duration-300 ease-out rounded-xl border border-white/10 p-3"
            style={{
                // On desktop: dynamic height based on items
                // On mobile: use max-height constraint
                minHeight: '280px',
                height: isDesktop ? `${dynamicHeight}px` : 'auto',
                maxHeight: isDesktop ? 'none' : '450px',
            }}
        >
            {/* Header - Outside cards */}
            <SectionHeader
                icon={<Wallet className="w-6 h-6 text-[#c4f70e]" />}
                title="Portfolio"
                tooltip="Your active token positions. Click any holding to view transaction history and AI reasoning."
                count={holdings.length}
                countColor="lime"
                rightContent={
                    totalValueSol > 0 ? (
                        <span className="text-white text-[15px] font-semibold">
                            <SolValue solAmount={totalValueSol} size="sm" />
                        </span>
                    ) : undefined
                }
            />

            {/* Cards - With visual separators */}
            <div className="flex-1 overflow-y-auto space-y-1.5">
                {isLoading && holdings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#c4f70e] animate-spin mb-3" />
                        <span className="text-sm text-white/50">Loading portfolio...</span>
                    </div>
                )}

                {error && (
                    <div className="text-center py-8">
                        <div className="text-red-400 text-sm mb-2">{error}</div>
                        <button
                            onClick={fetchHoldings}
                            className="text-xs text-white/40 hover:text-white underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!error && holdings.length === 0 && !isLoading && (
                    <IdleStateAnimation />
                )}

                <AnimatePresence mode="popLayout">
                    {holdings.map((holding, index) => (
                        <HoldingCard
                            key={`${holding.mint}-${index}`}
                            holding={holding}
                            index={index}
                            onClick={() => handleHoldingClick(holding)}
                            onAiClick={() => handleAiClick(holding)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Transaction History Drawer */}
            <TransactionDrawer
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                tokenSymbol={selectedHolding?.symbol || ""}
                tokenMint={selectedHolding?.mint || ""}
                tokenImage={selectedHolding?.imageUrl}
            />

            {/* AI Reasoning Drawer */}
            <AiReasoningDrawer
                isOpen={isAiDrawerOpen}
                onClose={handleCloseAiDrawer}
                tokenSymbol={aiReasoningHolding?.symbol || ""}
                tokenName={aiReasoningHolding?.name || ""}
                buyCriteria={aiReasoningHolding?.buy_criteria || null}
            />
        </div>
    );
}

export default PortfolioHoldingsPanel;
