"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, Copy, Loader2 } from "lucide-react";
import { CountUp } from "@/components/animations/CountUp";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSearchParams } from "next/navigation";
import { useBirdeyeWebSocket, type BirdeyeTokenStats, type BirdeyeTransaction } from "../hooks/useBirdeyeWebSocket";
import { useSharedWebSocket } from "../hooks/useWebSocket";
import { usePositions } from "../context/SmartTradingContext";
import { TransactionDrawer } from "./TransactionDrawer";

// ============================================
// Types
// ============================================

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
    status: "open" | "closed" | "pending";
    market_cap: number | null;
    liquidity: number | null;
    volume_24h: number | null;
    buy_signature: string | null;
    // Computed/optional fields for compatibility
    image_url?: string | null;
}

interface LivePriceData {
    price: number;
    priceChange24h?: number;
    volume24h?: number;
    liquidity?: number;
    marketCap?: number;
    entryPrice?: number;
    pnlPct?: number;
    pnlSol?: number;
    multiplier?: number;
    targetProgress?: number | null;
    nextTarget?: number | null;
    lastUpdated: number;
}

// ============================================
// Constants
// ============================================

const SOL_PRICE_USD = 185; // Fallback SOL price
const SOLANA_ICON = "/logos/solana.png";

// Take Profit Targets (matching the backend)
const TP_TARGETS = [
    { multiplier: 1.3, sellPct: 50, label: "TP1" },
    { multiplier: 1.8, sellPct: 50, label: "TP2" },
    { multiplier: 3.0, sellPct: 100, label: "TP3" },
];

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
// Progress Bar for Take Profit Targets
// ============================================

// Format market cap for display (no decimals)
function formatMarketCap(mcap: number): string {
    if (mcap >= 1_000_000_000) return `$${Math.round(mcap / 1_000_000_000)}B`;
    if (mcap >= 1_000_000) return `$${Math.round(mcap / 1_000_000)}M`;
    if (mcap >= 1_000) return `$${Math.round(mcap / 1_000)}K`;
    return `$${Math.round(mcap)}`;
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
        <div className="mt-1 pt-1 flex items-center gap-2">
            {/* Progress Track */}
            <div className="flex-1 relative">
                <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
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

                    {/* Current Position Indicator (pulsing dot) - Always lime */}
                    <motion.div
                        className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                            top: "50%",
                            left: `${progress * 100}%`,
                            background: "#c4f70e",
                            boxShadow: "0 0 10px #c4f70e",
                        }}
                        animate={{ scale: [0.95, 1.08, 0.95] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                    />
                </div>

                {/* Floating MCap Value Badge at Progress Tip */}
                {showMcapBadge && (
                    <motion.div
                        className="absolute -translate-x-1/2 pointer-events-none"
                        style={{ left: `${progress * 100}%`, top: "-16px" }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="relative">
                            <div className="px-1.5 py-0.5 rounded bg-black/95 border border-[#c4f70e]/60 whitespace-nowrap">
                                <span className="text-[10px] font-mono font-bold tabular-nums text-[#c4f70e]">
                                    {formatMarketCap(currentMarketCap)}
                                </span>
                            </div>
                            {/* Arrow pointing down */}
                            <div
                                className="absolute left-1/2 -translate-x-1/2 -bottom-[4px] w-0 h-0"
                                style={{
                                    borderLeft: "3px solid transparent",
                                    borderRight: "3px solid transparent",
                                    borderTop: "4px solid #c4f70e",
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Target: MCap Goal */}
            <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-lg text-sm font-bold font-mono tabular-nums ${isCloseToGoal ? "bg-[#c4f70e]/20 text-[#c4f70e]" : "bg-white/10 text-white/70"}`}>
                    {targetMarketCap !== undefined && targetMarketCap > 0
                        ? formatMarketCap(targetMarketCap)
                        : `${goal.toFixed(1)}x`
                    }
                </span>
                <span className="text-[11px] font-medium text-white/50">mcap</span>
            </div>
        </div>
    );
}

// ============================================
// SOL Value Display Component
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
// Holding Card Component
// ============================================

interface HoldingCardProps {
    holding: OnChainHolding;
    livePrice: LivePriceData | null;
    solPrice: number;
    index: number;
    positionEntryPrice?: number; // Entry price from position data (USD)
    onClick?: () => void;
}

function HoldingCard({ holding, livePrice, solPrice, index, positionEntryPrice, onClick }: HoldingCardProps) {
    // Use live price if available, otherwise fallback to holding data
    const currentPriceUsd = livePrice?.price ?? holding.current_price ?? 0;
    // Use entry_price directly from the API response
    const entryPriceUsd = holding.entry_price ?? positionEntryPrice ?? livePrice?.entryPrice ?? 0;
    const hasEntryPrice = entryPriceUsd > 0;
    const valueUsd = holding.current_quantity * currentPriceUsd;
    const entryValueUsd = hasEntryPrice ? holding.current_quantity * entryPriceUsd : 0;
    const valueSol = valueUsd / solPrice;
    const entryValueSol = entryValueUsd / solPrice;

    // PnL calculations - use API values first, then calculate if needed
    const pnlSol = livePrice?.pnlSol ?? holding.unrealized_pnl_sol ?? (hasEntryPrice && entryValueSol > 0 ? valueSol - entryValueSol : null);
    const pnlPct = livePrice?.pnlPct ?? holding.unrealized_pnl_pct ?? (hasEntryPrice && entryPriceUsd > 0 ? ((currentPriceUsd - entryPriceUsd) / entryPriceUsd) * 100 : null);

    const currentMultiplier = livePrice?.multiplier ?? (hasEntryPrice && entryPriceUsd > 0 ? currentPriceUsd / entryPriceUsd : null);
    const goalMultiplier = livePrice?.nextTarget ?? 2;

    // Market cap data for progress bar
    // Priority: Birdeye live > holding.market_cap > estimated from price (assumes 1B supply for meme tokens)
    const estimatedMcap = currentPriceUsd > 0 ? currentPriceUsd * 1_000_000_000 : undefined;
    const currentMarketCap = livePrice?.marketCap ?? holding.market_cap ?? estimatedMcap;
    // Calculate entry market cap: currentMCap / multiplier (if we have both)
    const entryMarketCap = currentMarketCap && currentMultiplier && currentMultiplier > 0
        ? currentMarketCap / currentMultiplier
        : undefined;

    // For display: If no entry price, use market cap milestones as targets
    // Common meme coin milestones: 100K, 1M, 10M, 100M, 1B
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

    // Check if we have live data (updated within last 10 seconds)
    const hasLiveData = Boolean(livePrice && (Date.now() - livePrice.lastUpdated) < 10000);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
            className="relative p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-[#c4f70e]/30 transition-all group cursor-pointer"
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
            <div className="flex gap-3 items-stretch">
                {/* LEFT: Token Avatar - fills full height */}
                <div className="flex-shrink-0 flex items-center">
                    <TokenAvatar
                        imageUrl={holding.image_url}
                        symbol={holding.symbol}
                        mint={holding.mint}
                        size={64}
                    />
                </div>

                {/* RIGHT: All Content */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Token Info + PnL */}
                    <div className="flex items-start justify-between mb-1">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-base">{holding.symbol}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(holding.mint);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                    title="Copy Contract Address"
                                >
                                    <Copy className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                                </button>
                            </div>
                            {/* Token Amount */}
                            <div className="flex items-center gap-1.5 text-xs mt-1">
                                <span className="font-mono font-semibold tabular-nums text-white/60">
                                    {holding.current_quantity >= 1_000_000
                                        ? `${Math.round(holding.current_quantity / 1_000_000)}M`
                                        : holding.current_quantity >= 1_000
                                            ? `${Math.round(holding.current_quantity / 1_000)}K`
                                            : Math.round(holding.current_quantity)
                                    } tokens
                                </span>
                                {holding.image_url && (
                                    <Image
                                        src={holding.image_url}
                                        alt={holding.symbol}
                                        width={14}
                                        height={14}
                                        className="rounded-full"
                                        unoptimized
                                    />
                                )}
                            </div>
                        </div>

                        {/* PnL Section (right side) - Percentage + SOL below */}
                        <div className="flex flex-col items-end">
                            {/* PnL Percentage */}
                            {pnlPct !== null ? (
                                <motion.div
                                    className={`text-xl font-bold font-mono tabular-nums ${pnlPct >= 0 ? "text-[#c4f70e]" : "text-red-400"}`}
                                    style={{
                                        textShadow: pnlPct >= 0
                                            ? "0 0 8px rgba(196,247,14,0.3)"
                                            : "0 0 8px rgba(239,68,68,0.3)",
                                    }}
                                >
                                    <CountUp
                                        to={pnlPct}
                                        duration={0.8}
                                        decimals={0}
                                        prefix={pnlPct >= 0 ? "+" : ""}
                                        suffix="%"
                                    />
                                </motion.div>
                            ) : (
                                <div className="text-base font-bold font-mono tabular-nums text-white/40">
                                    —
                                </div>
                            )}
                            {/* SOL Value/Profit */}
                            <div className={`flex items-center gap-1 text-xs font-mono tabular-nums ${pnlSol !== null ? (pnlSol >= 0 ? "text-green-400/80" : "text-red-400/80") : "text-white/60"}`}>
                                <span>
                                    {pnlSol !== null
                                        ? `${pnlSol >= 0 ? "+" : ""}${pnlSol.toFixed(2)}`
                                        : `${valueSol.toFixed(2)}`
                                    }
                                </span>
                                <Image
                                    src="/logos/solana.png"
                                    alt="SOL"
                                    width={14}
                                    height={14}
                                    className="opacity-70"
                                />
                                {hasLiveData && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar - Show market cap progress (with or without entry price) */}
                    {showProgressBar && (
                        <ProgressBar
                            currentMultiplier={displayMultiplier}
                            progressOverride={livePrice?.targetProgress}
                            goalMultiplier={displayGoal}
                            currentMarketCap={currentMarketCap}
                            entryMarketCap={entryMarketCap}
                        />
                    )}
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
    walletAddress?: string;
    minValueUsd?: number;
}

// Selected holding state for drawer
interface SelectedHolding {
    symbol: string;
    mint: string;
    imageUrl: string | null;
}

export function PortfolioHoldingsPanel({ walletAddress, minValueUsd = 0.01 }: PortfolioHoldingsPanelProps) {
    const [holdings, setHoldings] = useState<OnChainHolding[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [livePrices, setLivePrices] = useState<Map<string, LivePriceData>>(new Map());
    const [solPrice, setSolPrice] = useState(SOL_PRICE_USD);
    const [selectedHolding, setSelectedHolding] = useState<SelectedHolding | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const searchParams = useSearchParams();
    const walletFromQuery = searchParams?.get("wallet") || undefined;
    const effectiveWallet = useMemo(() => walletAddress ?? walletFromQuery, [walletAddress, walletFromQuery]);
    const subscribedRef = useRef(false);
    const isFetchingRef = useRef(false);
    const { status: tradingWsStatus, on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });

    // Get positions from context to access entry prices
    const { positions } = usePositions();

    // Log positions data
    useEffect(() => {
        console.log("[PortfolioHoldings] 📍 Positions from context:", positions.length);
        if (positions.length > 0) {
            console.log("[PortfolioHoldings] 📍 Position details:", positions.map(p => ({
                symbol: p.tokenSymbol,
                mint: p.tokenMint?.slice(0, 8) + "...",
                entryPriceSol: p.entryPriceSol,
                currentPrice: p.currentPrice,
                unrealizedPnl: p.unrealizedPnl,
                status: p.status,
            })));
        }
    }, [positions]);

    // Create a map of mint -> entry price from positions
    const positionEntryPrices = useMemo(() => {
        const map = new Map<string, number>();
        for (const pos of positions) {
            if (pos.tokenMint && pos.entryPriceSol > 0) {
                // entryPriceSol is actually in USD (see service.ts:268 comment)
                map.set(pos.tokenMint, pos.entryPriceSol);
            }
        }
        console.log("[PortfolioHoldings] 🔑 Position entry prices map:", Object.fromEntries(map));
        return map;
    }, [positions]);

    // Handle holding card click - open transaction drawer
    const handleHoldingClick = useCallback((holding: OnChainHolding) => {
        setSelectedHolding({
            symbol: holding.symbol,
            mint: holding.mint,
            imageUrl: holding.image_url ?? null,
        });
        setIsDrawerOpen(true);
    }, []);

    // Close drawer
    const handleCloseDrawer = useCallback(() => {
        setIsDrawerOpen(false);
    }, []);

    // Handle token stats from WebSocket
    const handleTokenStats = useCallback((stats: BirdeyeTokenStats) => {
        // Check if this is SOL price update
        if (stats.address === "So11111111111111111111111111111111111111112") {
            if (stats.price > 0) {
                setSolPrice(stats.price);
            }
            return;
        }

        setLivePrices((prev) => {
            const newMap = new Map(prev);
            const prevEntry = newMap.get(stats.address);
            newMap.set(stats.address, {
                price: stats.price,
                priceChange24h: stats.priceChange24h,
                volume24h: stats.volume24h,
                liquidity: stats.liquidity,
                marketCap: stats.marketCap,
                entryPrice: prevEntry?.entryPrice,
                pnlPct: prevEntry?.pnlPct,
                pnlSol: prevEntry?.pnlSol,
                multiplier: prevEntry?.multiplier,
                targetProgress: prevEntry?.targetProgress,
                nextTarget: prevEntry?.nextTarget,
                lastUpdated: Date.now(),
            });
            return newMap;
        });
    }, []);

    // Handle transaction updates (real-time price from trades)
    const handleTransaction = useCallback((tx: { address: string; price: number; side: "buy" | "sell" }) => {
        // Update SOL price if it's a SOL transaction
        if (tx.address === "So11111111111111111111111111111111111111112") {
            if (tx.price > 0) {
                setSolPrice(tx.price);
            }
            return;
        }

        // Update live prices with transaction data
        setLivePrices((prev) => {
            const newMap = new Map(prev);
            const prevEntry = newMap.get(tx.address);
            newMap.set(tx.address, {
                price: tx.price,
                priceChange24h: prevEntry?.priceChange24h,
                volume24h: prevEntry?.volume24h,
                liquidity: prevEntry?.liquidity,
                marketCap: prevEntry?.marketCap,
                entryPrice: prevEntry?.entryPrice,
                pnlPct: prevEntry?.pnlPct,
                pnlSol: prevEntry?.pnlSol,
                multiplier: prevEntry?.multiplier,
                targetProgress: prevEntry?.targetProgress,
                nextTarget: prevEntry?.nextTarget,
                lastUpdated: Date.now(),
            });
            return newMap;
        });
    }, []);

    // Initialize Birdeye WebSocket (now connects to secure proxy)
    const { isConnected, subscribeTokenStats, subscribeTransactions } = useBirdeyeWebSocket({
        onTokenStats: handleTokenStats,
        onTransaction: handleTransaction,
    });

    // Listen to trading WebSocket price updates as a secondary live source
    useEffect(() => {
        const unsubscribe = onTradingEvent<{
            mint?: string;
            price?: number;
            entry_price?: number;
            pnl_pct?: number;
            pnl_sol?: number;
            multiplier?: number;
            target_progress?: number | null;
            next_target?: number | null;
        }>("price_update", (data, event) => {
            const payload = (data ?? (event as unknown as { mint?: string; price?: number })) as {
                mint?: string;
                price?: number;
                entry_price?: number;
                pnl_pct?: number;
                pnl_sol?: number;
                multiplier?: number;
                target_progress?: number | null;
                next_target?: number | null;
            };
            if (!payload?.mint || payload.price === undefined) return;

            setLivePrices((prev) => {
                const next = new Map(prev);
                next.set(payload.mint as string, {
                    price: payload.price as number,
                    entryPrice: payload.entry_price,
                    pnlPct: payload.pnl_pct,
                    pnlSol: payload.pnl_sol,
                    multiplier: payload.multiplier,
                    targetProgress: payload.target_progress,
                    nextTarget: payload.next_target,
                    lastUpdated: Date.now(),
                });
                return next;
            });
        });

        return () => {
            unsubscribe?.();
        };
    }, [onTradingEvent]);

    useEffect(() => {
        if (!isConnected) return;
        console.log("[Portfolio] Birdeye WebSocket connected");
        subscribeTokenStats(["So11111111111111111111111111111111111111112"]);
    }, [isConnected, subscribeTokenStats]);

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
                .filter((h) => (h.status === "open" || h.status === "partially_closed") && h.current_quantity > 0);
            // Sort by current value (quantity * price) descending
            data.sort((a, b) => (b.current_quantity * b.current_price) - (a.current_quantity * a.current_price));

            console.log("[PortfolioHoldings] ✅ AFTER FILTER - Holdings count:", data.length);

            // LOG: What got filtered out?
            const filteredOut = rawData.filter((h) =>
                !((h.status === "open" || h.status === "partially_closed") && h.current_quantity > 0)
            );
            if (filteredOut.length > 0) {
                console.log("[PortfolioHoldings] ❌ Filtered out " + filteredOut.length + " positions:");
                filteredOut.forEach(h => {
                    const reason = h.current_quantity === 0
                        ? "quantity = 0"
                        : `status = ${h.status} (not open/partially_closed)`;
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
                status: h.status,
            })));

            setHoldings(data);
            setError(null);

            // Subscribe to price updates for all holdings
            if (data.length > 0 && !subscribedRef.current) {
                const mints = data.map((h) => h.mint);
                // Subscribe to token stats (5-10s updates)
                subscribeTokenStats(mints);
                // Subscribe to transactions (real-time trade updates)
                subscribeTransactions(mints);
                subscribedRef.current = true;
                console.log(`[PortfolioHoldings] 💱 Subscribed to TXS for ${mints.length} tokens`);
            }
        } catch (err) {
            console.error("[PortfolioHoldings] ❌ Failed to fetch holdings:", err);
            setError(err instanceof Error ? err.message : "Failed to load holdings");
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [subscribeTokenStats, subscribeTransactions]);

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

    // Calculate total value
    const totalValueSol = useMemo(() => {
        return holdings.reduce((sum, h) => {
            const livePrice = livePrices.get(h.mint);
            const priceUsd = livePrice?.price ?? h.current_price ?? 0;
            return sum + (h.current_quantity * priceUsd / solPrice);
        }, 0);
    }, [holdings, livePrices, solPrice]);

    // Calculate total value in USD
    const totalValueUsd = useMemo(() => {
        return holdings.reduce((sum, h) => {
            const livePrice = livePrices.get(h.mint);
            const priceUsd = livePrice?.price ?? h.current_price ?? 0;
            return sum + (h.current_quantity * priceUsd);
        }, 0);
    }, [holdings, livePrices]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header - Outside cards */}
            <div className="flex items-center justify-between px-1 py-3 mb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-[#c4f70e]" />
                    <span className="text-lg font-semibold text-white">Portfolio</span>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#c4f70e]/20 text-[#c4f70e]">
                        {holdings.length}
                    </span>
                </div>
                <div className="flex items-center">
                    {totalValueSol > 0 && (
                        <span className="text-white text-[15px] font-semibold">
                            <SolValue solAmount={totalValueSol} size="sm" />
                        </span>
                    )}
                </div>
            </div>

            {/* Cards - With visual separators */}
            <div className="flex-1 overflow-y-auto space-y-3">
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
                    <div className="flex flex-col items-center justify-center py-16 text-white/40">
                        <Wallet className="w-12 h-12 mb-4 opacity-50" />
                        <span className="text-sm font-medium">No holdings found</span>
                        <span className="text-xs text-white/30 mt-1">
                            Tokens will appear when in your wallet
                        </span>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {holdings.map((holding, index) => (
                        <HoldingCard
                            key={holding.mint}
                            holding={holding}
                            livePrice={livePrices.get(holding.mint) || null}
                            solPrice={solPrice}
                            index={index}
                            positionEntryPrice={positionEntryPrices.get(holding.mint)}
                            onClick={() => handleHoldingClick(holding)}
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
        </div>
    );
}

export default PortfolioHoldingsPanel;
