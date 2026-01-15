"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
    TrendingUp,
    TrendingDown,
    Target,
    Clock,
    Zap,
    CheckCircle,
    ExternalLink,
    Sparkles,
} from "lucide-react";

// ============================================
// Types for WebSocket Events
// ============================================

export interface PriceUpdateEvent {
    type: "price_update";
    mint: string;
    ticker: string;
    price: number;
    entry_price: number;
    multiplier: number;
    pnl_pct: number;
    pnl_sol: number;
    peak_pnl_pct: number;
    next_target: number | null;
    target_progress: number | null;
    timestamp: number;
}

export interface TakeProfitEvent {
    type: "take_profit_triggered";
    mint: string;
    ticker: string;
    target_multiplier: number;
    sold_quantity: number;
    sold_price: number;
    realized_pnl_sol: number;
    remaining_quantity: number;
    is_final_exit: boolean;
    timestamp: number;
}

export interface PositionData {
    mint: string;
    ticker: string;
    token_name: string;
    image_url?: string;
    entry_price: number;
    entry_sol_value: number;
    entry_time: string;
    current_price: number;
    multiplier: number;
    pnl_pct: number;
    pnl_sol: number;
    peak_pnl_pct: number;
    next_target: number | null;
    target_progress: number | null;
    targets_hit: number[];
    buy_signature?: string;
}

// ============================================
// Take Profit Targets Config
// ============================================

const TP_TARGETS = [
    { multiplier: 1.5, sellPct: 50, label: "TP1", color: "#22c55e" },
    { multiplier: 2.0, sellPct: 50, label: "TP2", color: "#06b6d4" },
    { multiplier: 3.0, sellPct: 100, label: "TP3", color: "#c4f70e" },
];

const MAX_HOLD_SECONDS = 300; // 5 minutes

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
    imageUrl?: string;
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
                className="relative flex items-center justify-center rounded-xl font-bold text-white shadow-lg flex-shrink-0"
                style={{
                    width: size,
                    height: size,
                    background: `linear-gradient(135deg, ${color1}, ${color2})`,
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
            style={{ width: size, height: size }}
        >
            <Image
                src={finalImageUrl}
                alt={symbol}
                width={size}
                height={size}
                className="object-cover"
                onError={() => setImgError(true)}
                unoptimized
            />
        </div>
    );
}

// ============================================
// Celebration Animation Component
// ============================================

interface CelebrationProps {
    show: boolean;
    pnlSol: number;
    targetHit: number;
    onComplete: () => void;
}

function CelebrationOverlay({ show, pnlSol, targetHit, onComplete }: CelebrationProps) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onComplete, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, rgba(196, 247, 14, 0.2), rgba(34, 197, 94, 0.2))",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-center"
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: 3, duration: 0.3 }}
                        >
                            <Sparkles className="w-12 h-12 text-[#c4f70e] mx-auto mb-2" />
                        </motion.div>
                        <div className="text-2xl font-bold text-white mb-1">
                            TP{targetHit} HIT!
                        </div>
                        <div className="text-lg font-mono tabular-nums text-[#c4f70e]">
                            +{pnlSol.toFixed(4)} SOL
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                            Transaction Submitted
                        </div>
                    </motion.div>

                    {/* Particle effects */}
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-[#c4f70e]"
                            initial={{
                                x: 0,
                                y: 0,
                                scale: 0,
                                opacity: 1,
                            }}
                            animate={{
                                x: (Math.random() - 0.5) * 200,
                                y: (Math.random() - 0.5) * 200,
                                scale: [0, 1, 0],
                                opacity: [1, 1, 0],
                            }}
                            transition={{
                                duration: 1,
                                delay: i * 0.05,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// Progress Bar Component
// ============================================

interface ProgressBarProps {
    progress: number; // 0-1
    nextTarget: number | null;
    targetsHit: number[];
    pnlPct: number;
}

function ProgressBar({ progress, nextTarget, targetsHit, pnlPct }: ProgressBarProps) {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    const isPositive = pnlPct >= 0;

    // Calculate positions for TP dots
    const tpPositions = useMemo(() => {
        if (!nextTarget) return [];

        // Find which target we're heading towards
        const targetIndex = TP_TARGETS.findIndex(t => t.multiplier === nextTarget);
        if (targetIndex === -1) return [];

        // Calculate relative positions based on current target range
        const prevMultiplier = targetIndex > 0 ? TP_TARGETS[targetIndex - 1].multiplier : 1.0;
        const range = nextTarget - prevMultiplier;

        return TP_TARGETS.map((target, i) => {
            const isHit = targetsHit.includes(i + 1);
            const isCurrent = target.multiplier === nextTarget;
            const isPast = target.multiplier < (prevMultiplier + (progress * range));

            return {
                ...target,
                position: i <= targetIndex ? ((i / (targetIndex + 1)) * 100) : 100,
                isHit,
                isCurrent,
                isPast,
            };
        });
    }, [nextTarget, targetsHit, progress]);

    return (
        <div className="relative mt-4">
            {/* Target labels */}
            <div className="flex justify-between mb-2 text-[10px]">
                {TP_TARGETS.map((target, i) => {
                    const isHit = targetsHit.includes(i + 1);
                    const isCurrent = target.multiplier === nextTarget;
                    return (
                        <div
                            key={target.label}
                            className={`flex flex-col items-center transition-colors ${isHit ? "text-[#c4f70e]" : isCurrent ? "text-white" : "text-white/40"
                                }`}
                        >
                            <span className="font-bold">{target.label}</span>
                            <span className="font-mono">{target.multiplier}x</span>
                            <span className="text-[9px]">+{((target.multiplier - 1) * 100).toFixed(0)}%</span>
                        </div>
                    );
                })}
            </div>

            {/* Progress track */}
            <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
                {/* Progress fill */}
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: isPositive
                            ? "linear-gradient(90deg, #22c55e, #c4f70e)"
                            : "linear-gradient(90deg, #ef4444, #f97316)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedProgress * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />

                {/* Glow effect at edge */}
                <motion.div
                    className="absolute inset-y-0 w-4 blur-sm"
                    style={{
                        left: `calc(${clampedProgress * 100}% - 8px)`,
                        background: isPositive ? "#c4f70e" : "#ef4444",
                        opacity: 0.6,
                    }}
                    animate={{
                        opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                    }}
                />
            </div>

            {/* TP milestone dots */}
            <div className="relative h-0">
                {TP_TARGETS.map((target, i) => {
                    const isHit = targetsHit.includes(i + 1);
                    const positionPct = ((i + 1) / TP_TARGETS.length) * 100;

                    return (
                        <motion.div
                            key={target.label}
                            className="absolute -top-2 transform -translate-x-1/2"
                            style={{ left: `${positionPct}%` }}
                            animate={isHit ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            {isHit ? (
                                <CheckCircle
                                    className="w-5 h-5"
                                    style={{ color: target.color }}
                                />
                            ) : (
                                <div
                                    className="w-3 h-3 rounded-full border-2"
                                    style={{
                                        borderColor: target.color,
                                        backgroundColor: "rgba(0,0,0,0.5)",
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// Time Remaining Component
// ============================================

interface TimeRemainingProps {
    entryTime: string;
    maxHoldSeconds: number;
}

function TimeRemaining({ entryTime, maxHoldSeconds }: TimeRemainingProps) {
    const [remaining, setRemaining] = useState(maxHoldSeconds);

    useEffect(() => {
        const entry = new Date(entryTime).getTime();
        const updateRemaining = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - entry) / 1000);
            setRemaining(Math.max(0, maxHoldSeconds - elapsed));
        };

        updateRemaining();
        const interval = setInterval(updateRemaining, 1000);
        return () => clearInterval(interval);
    }, [entryTime, maxHoldSeconds]);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const progress = remaining / maxHoldSeconds;
    const isUrgent = remaining < 60;

    return (
        <div className={`flex items-center gap-1 text-xs ${isUrgent ? "text-red-400" : "text-white/50"}`}>
            <Clock className="w-3 h-3" />
            <span className="font-mono tabular-nums min-w-[4ch]">
                {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            {isUrgent && (
                <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-red-400"
                >
                    !
                </motion.span>
            )}
        </div>
    );
}

// ============================================
// Main Position Progress Card
// ============================================

interface PositionProgressCardProps {
    position: PositionData;
    onPriceUpdate?: (event: PriceUpdateEvent) => void;
    onTakeProfitHit?: (event: TakeProfitEvent) => void;
}

export function PositionProgressCard({
    position,
    onPriceUpdate,
    onTakeProfitHit,
}: PositionProgressCardProps) {
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationData, setCelebrationData] = useState({ pnlSol: 0, targetHit: 1 });
    const [liveData, setLiveData] = useState({
        price: position.current_price,
        multiplier: position.multiplier,
        pnlPct: position.pnl_pct,
        pnlSol: position.pnl_sol,
        peakPnlPct: position.peak_pnl_pct,
        nextTarget: position.next_target,
        targetProgress: position.target_progress,
    });

    const isPositive = liveData.pnlPct >= 0;
    const targetsHit = position.targets_hit || [];

    // Calculate projected PnL when next target hits
    const projectedPnl = useMemo(() => {
        if (!liveData.nextTarget) return null;
        const pnlAtTarget = position.entry_sol_value * (liveData.nextTarget - 1);
        const targetConfig = TP_TARGETS.find(t => t.multiplier === liveData.nextTarget);
        const sellPct = targetConfig?.sellPct || 50;
        return (pnlAtTarget * sellPct) / 100;
    }, [liveData.nextTarget, position.entry_sol_value]);

    // Handle price update from WebSocket
    const handlePriceUpdate = (event: PriceUpdateEvent) => {
        if (event.mint !== position.mint) return;

        setLiveData({
            price: event.price,
            multiplier: event.multiplier,
            pnlPct: event.pnl_pct,
            pnlSol: event.pnl_sol,
            peakPnlPct: event.peak_pnl_pct,
            nextTarget: event.next_target,
            targetProgress: event.target_progress,
        });

        onPriceUpdate?.(event);
    };

    // Handle take profit event
    const handleTakeProfit = (event: TakeProfitEvent) => {
        if (event.mint !== position.mint) return;

        const targetIndex = TP_TARGETS.findIndex(t => t.multiplier === event.target_multiplier);

        setCelebrationData({
            pnlSol: event.realized_pnl_sol,
            targetHit: targetIndex + 1,
        });
        setShowCelebration(true);

        onTakeProfitHit?.(event);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden"
        >
            {/* Celebration Overlay */}
            <CelebrationOverlay
                show={showCelebration}
                pnlSol={celebrationData.pnlSol}
                targetHit={celebrationData.targetHit}
                onComplete={() => setShowCelebration(false)}
            />

            {/* Header: Token + Current P&L */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <TokenAvatar
                        imageUrl={position.image_url}
                        symbol={position.ticker}
                        mint={position.mint}
                        size={44}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg">{position.ticker}</span>
                            {position.buy_signature && (
                                <a
                                    href={`https://solscan.io/tx/${position.buy_signature}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3 text-white/40" />
                                </a>
                            )}
                        </div>
                        <div className="text-xs text-white/50">{position.token_name}</div>
                    </div>
                </div>

                {/* Current P&L */}
                <div className="text-right">
                    <motion.div
                        className={`text-2xl font-bold font-mono tabular-nums min-w-[5ch] ${isPositive ? "text-green-400" : "text-red-400"}`}
                        key={liveData.pnlPct}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                    >
                        {isPositive ? "+" : ""}{liveData.pnlPct.toFixed(1)}%
                    </motion.div>
                    <div className={`text-xs font-mono tabular-nums ${isPositive ? "text-green-400/70" : "text-red-400/70"}`}>
                        {isPositive ? "+" : ""}{liveData.pnlSol.toFixed(4)} SOL
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs mb-2 px-1">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-white/50">
                        <span>Entry:</span>
                        <span className="font-mono tabular-nums text-white/80">${formatPrice(position.entry_price)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/50">
                        <span>Current:</span>
                        <motion.span
                            className="font-mono tabular-nums text-white"
                            key={liveData.price}
                            initial={{ backgroundColor: isPositive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }}
                            animate={{ backgroundColor: "transparent" }}
                            transition={{ duration: 0.5 }}
                        >
                            ${formatPrice(liveData.price)}
                        </motion.span>
                    </div>
                    <div className="flex items-center gap-1 text-white/50">
                        <TrendingUp className="w-3 h-3" />
                        <span className="font-mono tabular-nums text-[#c4f70e]">{liveData.peakPnlPct.toFixed(1)}%</span>
                    </div>
                </div>
                <TimeRemaining entryTime={position.entry_time} maxHoldSeconds={MAX_HOLD_SECONDS} />
            </div>

            {/* Progress Bar */}
            <ProgressBar
                progress={liveData.targetProgress || 0}
                nextTarget={liveData.nextTarget}
                targetsHit={targetsHit}
                pnlPct={liveData.pnlPct}
            />

            {/* Projected PnL at Target */}
            {projectedPnl && liveData.nextTarget && (
                <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white/60">
                        <Target className="w-3 h-3 text-[#c4f70e]" />
                        <span>
                            At <span className="tabular-nums">{liveData.nextTarget}x</span> (<span className="tabular-nums">{((liveData.nextTarget - 1) * 100).toFixed(0)}%</span>):
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-[#c4f70e]" />
                        <span className="font-mono tabular-nums font-bold text-[#c4f70e]">
                            +{projectedPnl.toFixed(4)} SOL
                        </span>
                    </div>
                </div>
            )}

            {/* Targets Hit Summary */}
            {targetsHit.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>
                            Realized: {targetsHit.map(t => `TP${t}`).join(", ")}
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ============================================
// Helper Functions
// ============================================

function formatPrice(price: number): string {
    if (price < 0.0001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
}

export default PositionProgressCard;
