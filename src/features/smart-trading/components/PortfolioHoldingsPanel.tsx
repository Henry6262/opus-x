"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, Copy, Loader2, Clock, TrendingUp, ArrowUpRight, Brain } from "lucide-react";
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
        <div className="relative h-48 overflow-hidden rounded-xl">
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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm ${className}`}>
            $<CountUp to={num} duration={0.5} decimals={0} />{suffix}
        </span>
    );
}

interface ProgressBarProps {
    currentMultiplier: number;
    goalMultiplier?: number;
    progressOverride?: number | null;
    currentMarketCap?: number;
    entryMarketCap?: number;
}

function ProgressBar({ currentMultiplier, goalMultiplier = 2, progressOverride, currentMarketCap, entryMarketCap }: ProgressBarProps) {
    const goal = Math.max(goalMultiplier, 1.01);

    let progressRaw = progressOverride ?? null;
    if (progressRaw === null || progressRaw === undefined) {
        progressRaw = currentMultiplier / goal;
    }
    const clamped = Math.min(Math.max(progressRaw, 0), 1);
    const progress = clamped > 0 && clamped < 0.02 ? 0.02 : clamped;
    const isCloseToGoal = progress > 0.8;

    // Calculate target market cap
    // If we have entry mcap, use: entryMcap × goal
    // Otherwise, derive from current: currentMcap × (goal / currentMultiplier)
    let targetMarketCap: number | undefined;
    if (entryMarketCap && entryMarketCap > 0) {
        targetMarketCap = entryMarketCap * goal;
    } else if (currentMarketCap && currentMarketCap > 0 && currentMultiplier > 0) {
        // currentMcap = entryMcap × currentMultiplier
        // targetMcap = entryMcap × goal = currentMcap × (goal / currentMultiplier)
        targetMarketCap = currentMarketCap * (goal / currentMultiplier);
    }

    // Show market cap badge if we have data
    const showMcapBadge = currentMarketCap !== undefined && currentMarketCap > 0;

    return (
        <div className="flex items-center gap-2 md:gap-3">
            {/* Progress Track - thin bar with badge on top */}
            <div className="flex-1 relative flex items-center">
                {/* Progress bar - slightly taller on desktop */}
                <div className="relative h-2 md:h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    {/* Progress Fill - Always lime green (progress toward TP target) */}
                    <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                            background: "linear-gradient(90deg, #22c55e, #c4f70e)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    />
                </div>

                {/* Market cap badge - centered on top of progress bar */}
                {showMcapBadge && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <AnimatedProgressMarketCap
                            value={currentMarketCap}
                            className="text-[11px] md:text-xs font-mono font-bold tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        />
                    </div>
                )}
            </div>

            {/* Target: MCap Goal */}
            <div className="flex items-center gap-1">
                <span className={`px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold font-mono tabular-nums ${isCloseToGoal ? "bg-[#c4f70e]/20 text-[#c4f70e]" : "bg-black/40 text-white/70"}`}>
                    {targetMarketCap !== undefined && targetMarketCap > 0
                        ? formatMarketCap(targetMarketCap)
                        : `${goal.toFixed(1)}x`
                    }
                </span>
            </div>
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
    // All data comes from backend via holdings_snapshot
    const currentPriceUsd = holding.current_price ?? 0;
    const entryPriceUsd = holding.entry_price ?? 0;
    const hasEntryPrice = entryPriceUsd > 0;

    // PnL from backend
    const pnlSol = holding.unrealized_pnl_sol;
    const pnlPct = holding.unrealized_pnl_pct;

    // Calculate multiplier for progress bar
    const currentMultiplier = hasEntryPrice && entryPriceUsd > 0 ? currentPriceUsd / entryPriceUsd : null;
    const goalMultiplier = 2; // Default 2x target

    // Market cap data for progress bar
    const currentMarketCap = holding.market_cap ?? undefined;
    const entryMarketCap = currentMarketCap && currentMultiplier && currentMultiplier > 0
        ? currentMarketCap / currentMultiplier
        : undefined;

    // For display: If no entry price, use market cap milestones as targets
    const mcapMilestones = [100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000];
    const getNextMilestone = (mcap: number) => mcapMilestones.find(m => m > mcap) ?? mcapMilestones[mcapMilestones.length - 1];

    // Show progress bar if we have market cap data
    const showProgressBar = currentMarketCap !== undefined && currentMarketCap > 0;

    // Display multiplier or milestone-based progress
    const displayMultiplier = currentMultiplier ?? (currentMarketCap && entryMarketCap
        ? currentMarketCap / entryMarketCap
        : 1);
    const displayGoal = entryMarketCap
        ? goalMultiplier
        : (currentMarketCap ? getNextMilestone(currentMarketCap) / currentMarketCap : 2);

    // Additional data from backend
    const hasPartialSells = holding.initial_quantity > holding.current_quantity;
    const quantityRemaining = hasPartialSells
        ? Math.round((holding.current_quantity / holding.initial_quantity) * 100)
        : 100;
    const hasRealizedPnl = (holding.realized_pnl_sol ?? 0) !== 0;
    const hasPeakData = holding.peak_pnl_pct > 0 && holding.peak_pnl_pct > (pnlPct ?? 0);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
            className="relative px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-[#c4f70e]/30 transition-all group cursor-pointer"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c4f70e]/5 to-transparent" />
            </div>

            {/* Main Layout: Image Left | Content Right */}
            <div className="flex gap-2 md:gap-3 items-stretch">
                {/* LEFT: Token Avatar - smaller on mobile */}
                <div className="flex-shrink-0 flex items-center">
                    <div className="hidden md:block">
                        <TokenAvatar
                            imageUrl={holding.image_url}
                            symbol={holding.symbol}
                            mint={holding.mint}
                            size={64}
                        />
                    </div>
                    <div className="md:hidden">
                        <TokenAvatar
                            imageUrl={holding.image_url}
                            symbol={holding.symbol}
                            mint={holding.mint}
                            size={44}
                        />
                    </div>
                </div>

                {/* RIGHT: All Content */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Token Info + PnL */}
                    <div className="flex items-start justify-between mb-1">
                        {/* Token name, time, copy button */}
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="font-bold text-white text-sm md:text-base">{holding.symbol}</span>
                            {/* Entry time badge */}
                            {holding.entry_time && (
                                <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatRelativeTime(holding.entry_time)}
                                </span>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(holding.mint);
                                }}
                                className="p-0.5 md:p-1 rounded hover:bg-white/10 transition-colors"
                                title="Copy Contract Address"
                            >
                                <Copy className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40 hover:text-white/70" />
                            </button>
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
                                {/* Peak PnL indicator (shows missed opportunity) - hidden on mobile */}
                                {hasPeakData && (
                                    <div className="hidden md:flex items-center gap-0.5 text-[10px] text-amber-400/70">
                                        <TrendingUp className="w-2.5 h-2.5" />
                                        <span className="font-mono">peak +{Math.round(holding.peak_pnl_pct)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Entry SOL + Progress Bar (full width) */}
                    <div className="flex items-center gap-4 md:gap-6 mt-1">
                        {/* Entry Amount (SOL invested) + Unrealized PnL attached */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
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
                                <span className={`font-mono tabular-nums text-xs md:text-sm flex-shrink-0 ${pnlSol >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    ({pnlSol >= 0 ? "+" : ""}{pnlSol.toFixed(1)})
                                </span>
                            )}
                        </div>

                        {/* Separator */}
                        <div className="w-px h-4 bg-white/20 flex-shrink-0" />

                        {/* Progress Bar - fills remaining space */}
                        {showProgressBar && (
                            <div className="flex-1 min-w-0">
                                <ProgressBar
                                    currentMultiplier={displayMultiplier}
                                    goalMultiplier={displayGoal}
                                    currentMarketCap={currentMarketCap}
                                    entryMarketCap={entryMarketCap}
                                />
                            </div>
                        )}

                        {/* Realized PnL badge (from partial sells) - hidden on mobile */}
                        {hasRealizedPnl && (
                            <>
                                <div className="hidden md:block w-px h-4 bg-white/20 flex-shrink-0" />
                                <span className={`hidden md:flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${holding.realized_pnl_sol! >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    {holding.realized_pnl_sol! >= 0 ? "+" : ""}{holding.realized_pnl_sol!.toFixed(3)} realized
                                </span>
                            </>
                        )}
                        {/* Quantity remaining badge (if partial sells) - hidden on mobile */}
                        {hasPartialSells && (
                            <>
                                <div className="hidden md:block w-px h-4 bg-white/20 flex-shrink-0" />
                                <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 flex-shrink-0">
                                    {quantityRemaining}% left
                                </span>
                            </>
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
        if (isFetchingRef.current) {
            console.log("[PortfolioHoldings] Fetch already in progress, skipping...");
            return;
        }

        isFetchingRef.current = true;
        try {
            setIsLoading(true);
            const url = buildDevprntApiUrl("/api/trading/holdings");
            console.log("[PortfolioHoldings] 📡 Fetching from:", url.toString());
            const response = await fetch(url.toString());

            if (!response.ok) {
                // If backend is down, try to use cached/mock data
                throw new Error(`Backend unavailable (${response.status})`);
            }

            const result = await response.json();
            console.log("[PortfolioHoldings] 📦 RAW API Response:", result);
            if (result?.success === false) {
                throw new Error(result.error || "Failed to load holdings");
            }

            // LOG: Status breakdown BEFORE filtering
            const rawData = (result?.data as OnChainHolding[]) || [];
            console.log("[PortfolioHoldings] 🔍 BEFORE FILTER - Total positions from API:", rawData.length);
            const statusBreakdown = rawData.reduce((acc, h) => {
                acc[h.status] = (acc[h.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            console.log("[PortfolioHoldings] 📊 Status breakdown:", statusBreakdown);
            console.log("[PortfolioHoldings] 🎯 Positions by status:", rawData.map(h => ({
                symbol: h.symbol,
                status: h.status,
                qty: h.current_quantity,
                price: h.current_price,
            })));

            // Filter open AND partially_closed positions (both have quantity) and sort by value
            const data: OnChainHolding[] = rawData
                .filter((h) => (h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0);
            // Sort by current value (quantity * price) descending
            data.sort((a, b) => (b.current_quantity * b.current_price) - (a.current_quantity * a.current_price));

            console.log("[PortfolioHoldings] ✅ AFTER FILTER - Holdings count:", data.length);

            // LOG: What got filtered out?
            const filteredOut = rawData.filter((h) =>
                !((h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0)
            );
            if (filteredOut.length > 0) {
                console.log("[PortfolioHoldings] ❌ Filtered out " + filteredOut.length + " positions:");
                filteredOut.forEach(h => {
                    const reason = h.current_quantity === 0
                        ? "quantity = 0"
                        : `status = ${h.status} (not open/partiallyclosed)`;
                    console.log(`  - ${h.symbol}: ${reason}`);
                });
            }
            console.log("[PortfolioHoldings] 🔍 Holdings details:", data.map(h => ({
                symbol: h.symbol,
                mint: h.mint.slice(0, 8) + "...",
                current_quantity: h.current_quantity,
                current_price: h.current_price,
                entry_price: h.entry_price,
                unrealized_pnl_pct: h.unrealized_pnl_pct,
                market_cap: h.market_cap,
                liquidity: h.liquidity,
                status: h.status,
            })));

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
    // No polling needed since price_update events come via trading WebSocket
    useEffect(() => {
        fetchHoldings();
    }, [fetchHoldings]);

    // Listen for position opened/closed events to refresh holdings list
    useEffect(() => {
        const unsubPositionOpened = onTradingEvent("position_opened", () => {
            console.log("[PortfolioHoldings] Position opened - refreshing holdings");
            fetchHoldings();
        });
        const unsubPositionClosed = onTradingEvent("position_closed", () => {
            console.log("[PortfolioHoldings] Position closed - refreshing holdings");
            fetchHoldings();
        });
        const unsubTakeProfit = onTradingEvent("take_profit_triggered", () => {
            console.log("[PortfolioHoldings] Take profit triggered - refreshing holdings");
            fetchHoldings();
        });

        return () => {
            unsubPositionOpened?.();
            unsubPositionClosed?.();
            unsubTakeProfit?.();
        };
    }, [onTradingEvent, fetchHoldings]);

    // Listen for holdings_snapshot events from backend WebSocket
    useEffect(() => {
        const unsubHoldingsSnapshot = onTradingEvent<{
            holdings: OnChainHolding[];
            total_unrealized_pnl_sol: number;
            total_realized_pnl_sol: number;
            open_position_count: number;
            timestamp: number;
        }>("holdings_snapshot", (data) => {
            if (!data?.holdings) return;

            console.log("[PortfolioHoldings] 📡 Received holdings_snapshot:", data.holdings.length, "positions");

            // Filter and sort holdings (same logic as fetchHoldings)
            const filteredHoldings = data.holdings
                .filter((h) => (h.status === "open" || h.status === "partially_closed" || h.status === "partiallyclosed") && h.current_quantity > 0)
                .sort((a, b) => (b.current_quantity * b.current_price) - (a.current_quantity * a.current_price));

            console.log("[PortfolioHoldings] ✅ After filter:", filteredHoldings.length, "holdings");

            setHoldings(filteredHoldings);
            setIsLoading(false);
            setError(null);
        });

        return () => {
            unsubHoldingsSnapshot?.();
        };
    }, [onTradingEvent]);

    // Calculate total value in SOL (using entry_sol_value from backend)
    const totalValueSol = useMemo(() => {
        return holdings.reduce((sum, h) => {
            // Use entry_sol_value + unrealized PnL for current value
            const entrySol = h.entry_sol_value ?? 0;
            const pnlSol = h.unrealized_pnl_sol ?? 0;
            return sum + entrySol + pnlSol;
        }, 0);
    }, [holdings]);


    // Dynamic height calculation for desktop
    // Height = header + (min(items, maxVisible) * cardHeight)
    // When 0 items, show a smaller empty state
    const visibleCount = Math.min(holdings.length, maxVisibleItems);
    const emptyStateHeight = 140; // Compact empty state
    const loadingHeight = 140; // Compact loading state

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
                height: isDesktop ? `${dynamicHeight}px` : 'auto',
                maxHeight: isDesktop ? 'none' : '400px',
            }}
        >
            {/* Header - Outside cards */}
            <SectionHeader
                icon={<Wallet className="w-6 h-6 text-[#c4f70e]" />}
                title="Portfolio"
                tooltip="Your active token positions. Click any holding to view transaction history and AI reasoning."
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
