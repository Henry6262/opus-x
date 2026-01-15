"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, RefreshCw } from "lucide-react";
import { CountUp } from "@/components/animations/CountUp";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSearchParams } from "next/navigation";
import { useBirdeyeWebSocket, type BirdeyeTokenStats } from "../hooks/useBirdeyeWebSocket";
import { useSharedWebSocket } from "../hooks/useWebSocket";
import { TransactionDrawer } from "./TransactionDrawer";

// ============================================
// Types
// ============================================

interface OnChainHolding {
    mint: string;
    symbol: string;
    name: string;
    amount: number;
    decimals: number;
    image_url: string | null;
    price_usd: number | null;
    value_usd: number | null;
    market_cap: number | null;
    liquidity: number | null;
    volume_24h: number | null;
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
const BIRDEYE_API_KEY = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || "";

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

    // Calculate target market cap (entry mcap × goal multiplier)
    const targetMarketCap = entryMarketCap ? entryMarketCap * goal : undefined;

    // Show market cap badge if we have data
    const showMcapBadge = currentMarketCap !== undefined && currentMarketCap > 0;

    return (
        <div className="mt-3 pt-6 border-t border-white/10 flex items-center gap-3">
            {/* Progress Track - extra pt-6 to make room for floating MCap badge */}
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

                {/* Floating MCap Badge at Progress Tip - Speech bubble with arrow */}
                {showMcapBadge && (
                    <motion.div
                        className="absolute -translate-x-1/2 pointer-events-none"
                        style={{ left: `${progress * 100}%`, top: "-22px" }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="relative">
                            {/* Compact pill */}
                            <div className="px-1.5 py-0.5 rounded bg-black/95 border border-[#c4f70e]/60 whitespace-nowrap">
                                <span className="text-[10px] font-mono font-bold text-[#c4f70e]">
                                    {formatMarketCap(currentMarketCap)}
                                </span>
                            </div>
                            {/* Arrow pointing down - more visible */}
                            <div
                                className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-0 h-0"
                                style={{
                                    borderLeft: "4px solid transparent",
                                    borderRight: "4px solid transparent",
                                    borderTop: "5px solid #c4f70e",
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Target MCap + Multiplier Badge */}
            <div className="relative min-w-[60px]">
                {targetMarketCap !== undefined && targetMarketCap > 0 ? (
                    <>
                        <span className={`text-base font-bold font-mono ${isCloseToGoal ? "text-[#c4f70e]" : "text-white/90"}`}>
                            {formatMarketCap(targetMarketCap)}
                        </span>
                        {/* Small multiplier badge */}
                        <span className="absolute -top-2 -right-1 px-1 py-0.5 text-[8px] font-bold font-mono rounded bg-white/10 text-white/50">
                            {goal.toFixed(1)}x
                        </span>
                    </>
                ) : (
                    <span className={`text-lg font-bold font-mono ${isCloseToGoal ? "text-[#c4f70e]" : "text-white/80"}`}>
                        {goal.toFixed(1)}x
                    </span>
                )}
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
        <span className={`inline-flex items-center gap-1 font-mono ${size === "lg" ? "text-xl font-bold" : "text-sm"}`}>
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
    onClick?: () => void;
}

function HoldingCard({ holding, livePrice, solPrice, index, onClick }: HoldingCardProps) {
    // Use live price if available, otherwise fallback to holding data
    const currentPriceUsd = livePrice?.price ?? holding.price_usd ?? 0;
    const entryPriceUsd = livePrice?.entryPrice ?? holding.price_usd ?? 0;
    const valueUsd = holding.amount * currentPriceUsd;
    const entryValueUsd = holding.amount * entryPriceUsd;
    const valueSol = valueUsd / solPrice;
    const entryValueSol = entryValueUsd / solPrice;

    const pnlSol = livePrice?.pnlSol ?? (entryValueSol > 0 ? valueSol - entryValueSol : 0);
    const pnlPct = livePrice?.pnlPct ?? (entryPriceUsd > 0 ? ((currentPriceUsd - entryPriceUsd) / entryPriceUsd) * 100 : 0);

    const currentMultiplier = livePrice?.multiplier ?? (entryPriceUsd > 0 ? currentPriceUsd / entryPriceUsd : 1);
    const goalMultiplier = livePrice?.nextTarget ?? 2;

    // Market cap data for progress bar
    // Priority: Birdeye live > holding.market_cap > estimated from price (assumes 1B supply for meme tokens)
    const estimatedMcap = currentPriceUsd > 0 ? currentPriceUsd * 1_000_000_000 : undefined;
    const currentMarketCap = livePrice?.marketCap ?? holding.market_cap ?? estimatedMcap;
    // Calculate entry market cap: currentMCap / multiplier (if we have both)
    const entryMarketCap = currentMarketCap && currentMultiplier > 0
        ? currentMarketCap / currentMultiplier
        : undefined;

    // Twitter search link
    const twitterSearchUrl = `https://twitter.com/search?q=$${holding.symbol}&src=typed_query&f=live`;

    // Check if we have live data (updated within last 10 seconds)
    const hasLiveData = Boolean(livePrice && (Date.now() - livePrice.lastUpdated) < 10000);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
            className="relative p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-[#c4f70e]/30 transition-all group cursor-pointer"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c4f70e]/5 to-transparent" />
            </div>

            {/* Row 1: Token Identity + PnL % */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <TokenAvatar
                        imageUrl={holding.image_url}
                        symbol={holding.symbol}
                        mint={holding.mint}
                        size={40}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">{holding.symbol}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(holding.mint);
                                }}
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                                title="Copy Contract Address"
                            >
                                CA
                            </button>
                        </div>
                        {/* Buy value + Tokens (compact, horizontal) */}
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                            <div className="flex items-center gap-1">
                                <span className="text-white/40 text-[10px]">Buy</span>
                                <span className="font-mono font-semibold text-white/90">
                                    {valueSol.toFixed(2)}
                                </span>
                                <Image src={SOLANA_ICON} alt="SOL" width={12} height={12} className="opacity-70" />
                            </div>
                            <span className="text-white/20">•</span>
                            <div className="flex items-center gap-1">
                                <Image
                                    src={holding.image_url || `https://dd.dexscreener.com/ds-data/tokens/solana/${holding.mint}.png`}
                                    alt={holding.symbol}
                                    width={14}
                                    height={14}
                                    className="rounded-full"
                                    unoptimized
                                />
                                <span className="font-mono font-semibold text-white/80">
                                    {holding.amount >= 1_000_000
                                        ? `${(holding.amount / 1_000_000).toFixed(1)}M`
                                        : holding.amount >= 1_000
                                            ? `${(holding.amount / 1_000).toFixed(1)}K`
                                            : holding.amount.toFixed(0)
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PnL Section (right side) - Percentage + SOL below */}
                <div className="flex flex-col items-end">
                    {/* PnL Percentage - Hero */}
                    <motion.div
                        className={`text-2xl font-bold font-mono ${pnlPct >= 0 ? "text-[#c4f70e]" : "text-red-400"}`}
                        style={{
                            textShadow: pnlPct >= 0
                                ? "0 0 10px rgba(196,247,14,0.35)"
                                : "0 0 10px rgba(239,68,68,0.35)",
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
                    {/* SOL Profit - Smaller, below percentage */}
                    <div className={`flex items-center gap-1 text-sm font-mono ${pnlSol >= 0 ? "text-green-400/80" : "text-red-400/80"}`}>
                        <span>{pnlSol >= 0 ? "+" : ""}{pnlSol.toFixed(2)}</span>
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

            {/* Progress Bar for Take Profit */}
            <ProgressBar
                currentMultiplier={currentMultiplier}
                progressOverride={livePrice?.targetProgress}
                goalMultiplier={goalMultiplier}
                currentMarketCap={currentMarketCap}
                entryMarketCap={entryMarketCap}
            />
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
    const { status: tradingWsStatus, on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });

    // Handle holding card click - open transaction drawer
    const handleHoldingClick = useCallback((holding: OnChainHolding) => {
        setSelectedHolding({
            symbol: holding.symbol,
            mint: holding.mint,
            imageUrl: holding.image_url,
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

    // Initialize Birdeye WebSocket
    const { isConnected, subscribeTokenStats } = useBirdeyeWebSocket({
        apiKey: BIRDEYE_API_KEY,
        onTokenStats: handleTokenStats,
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
        if (!effectiveWallet) {
            setHoldings([]);
            setError("Connect wallet or provide ?wallet= parameter");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            params.set("wallet", effectiveWallet);
            params.set("min_value_usd", minValueUsd.toString());

            const url = buildDevprntApiUrl(`/api/trading/holdings?${params.toString()}`);
            const response = await fetch(url.toString());

            if (!response.ok) {
                // If backend is down, try to use cached/mock data
                throw new Error(`Backend unavailable (${response.status})`);
            }

            const result = await response.json();
            if (result?.success === false) {
                throw new Error(result.error || "Failed to load holdings");
            }

            const data: OnChainHolding[] = ((result?.data as OnChainHolding[]) || []).filter((h) => (h.value_usd ?? 0) > 0.01);
            data.sort((a, b) => (b.value_usd || 0) - (a.value_usd || 0));

            setHoldings(data);
            setError(null);

            // Subscribe to price updates for all holdings
            if (data.length > 0 && !subscribedRef.current) {
                const mints = data.map((h) => h.mint);
                subscribeTokenStats(mints);
                subscribedRef.current = true;
            }
        } catch (err) {
            console.error("Failed to fetch holdings:", err);
            setError(err instanceof Error ? err.message : "Failed to load holdings");
        } finally {
            setIsLoading(false);
        }
    }, [effectiveWallet, minValueUsd, subscribeTokenStats]);

    // Fetch holdings on mount
    useEffect(() => {
        fetchHoldings();
    }, [fetchHoldings]);

    // Calculate total value
    const totalValueSol = useMemo(() => {
        return holdings.reduce((sum, h) => {
            const livePrice = livePrices.get(h.mint);
            const priceUsd = livePrice?.price ?? h.price_usd ?? 0;
            return sum + (h.amount * priceUsd / solPrice);
        }, 0);
    }, [holdings, livePrices, solPrice]);

    return (
        <div className="overflow-hidden">
            {/* Header - Outside cards */}
            <div className="flex items-center justify-between px-1 py-3 mb-3">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#c4f70e]" />
                    <span className="text-base font-semibold text-white">Portfolio</span>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#c4f70e]/20 text-[#c4f70e]">
                        {holdings.length}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {totalValueSol > 0 && (
                        <span className="text-[#c4f70e]">
                            <SolValue solAmount={totalValueSol} size="sm" />
                        </span>
                    )}
                    <button
                        onClick={fetchHoldings}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-white/40 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Cards - No wrapper */}
            <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {isLoading && holdings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-[#c4f70e] animate-spin mb-3" />
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
