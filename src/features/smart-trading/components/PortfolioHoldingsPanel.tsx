"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
    Wallet,
    RefreshCw,
    ExternalLink,
    Target,
    CheckCircle,
    Zap,
} from "lucide-react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSearchParams } from "next/navigation";
import { useBirdeyeWebSocket, type BirdeyeTokenStats } from "../hooks/useBirdeyeWebSocket";

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

interface ProgressBarProps {
    currentMultiplier: number;
    targetsHit: number[];
}

function ProgressBar({ currentMultiplier, targetsHit }: ProgressBarProps) {
    const nextTargetIndex = targetsHit.length;
    const nextTarget = TP_TARGETS[nextTargetIndex];
    const prevMultiplier = nextTargetIndex > 0 ? TP_TARGETS[nextTargetIndex - 1].multiplier : 1.0;

    let progress = 0;
    if (nextTarget) {
        const range = nextTarget.multiplier - prevMultiplier;
        progress = Math.min(Math.max((currentMultiplier - prevMultiplier) / range, 0), 1);
    } else {
        progress = 1;
    }

    const isPositive = currentMultiplier >= 1;

    return (
        <div className="mt-3">
            <div className="flex justify-between mb-1.5 text-[10px]">
                {TP_TARGETS.map((target, i) => {
                    const isHit = targetsHit.includes(i + 1);
                    const isCurrent = i === nextTargetIndex;
                    return (
                        <div
                            key={target.label}
                            className={`flex flex-col items-center transition-colors ${isHit ? "text-[#c4f70e]" : isCurrent ? "text-white" : "text-white/40"
                                }`}
                        >
                            <span className="font-bold">{target.label}</span>
                            <span className="font-mono">{target.multiplier}x</span>
                        </div>
                    );
                })}
            </div>

            <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: isPositive
                            ? "linear-gradient(90deg, #22c55e, #c4f70e)"
                            : "linear-gradient(90deg, #ef4444, #f97316)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
            </div>

            <div className="relative h-0 -mt-2">
                {TP_TARGETS.map((target, i) => {
                    const isHit = targetsHit.includes(i + 1);
                    const positionPct = ((i + 1) / TP_TARGETS.length) * 100;

                    return (
                        <div
                            key={target.label}
                            className="absolute transform -translate-x-1/2"
                            style={{ left: `${positionPct}%`, top: "-2px" }}
                        >
                            {isHit ? (
                                <CheckCircle className="w-4 h-4 text-[#c4f70e]" />
                            ) : (
                                <div
                                    className="w-2.5 h-2.5 rounded-full border-2 border-white/30"
                                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                                />
                            )}
                        </div>
                    );
                })}
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
        if (val >= 1) return val.toFixed(4);
        return val.toFixed(6);
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
}

function HoldingCard({ holding, livePrice, solPrice, index }: HoldingCardProps) {
    // Use live price if available, otherwise fallback to holding data
    const currentPriceUsd = livePrice?.price ?? holding.price_usd ?? 0;
    const valueUsd = holding.amount * currentPriceUsd;
    const valueSol = valueUsd / solPrice;
    const priceInSol = currentPriceUsd / solPrice;

    // Calculate multiplier (would need entry price tracking for real P&L)
    const currentMultiplier = 1.0; // Placeholder - needs entry price
    const targetsHit: number[] = [];

    // Twitter search link
    const twitterSearchUrl = `https://twitter.com/search?q=$${holding.symbol}&src=typed_query&f=live`;

    // Price update indicator
    const isLive = livePrice && (Date.now() - livePrice.lastUpdated) < 30000;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
            className="relative p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-[#c4f70e]/30 transition-all group"
        >
            {/* Live indicator */}
            {isLive && (
                <div className="absolute top-2 right-2">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-green-500/20 text-green-400">
                        <Zap className="w-2.5 h-2.5" />LIVE
                    </span>
                </div>
            )}

            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c4f70e]/5 to-transparent" />
            </div>

            {/* Header: Token + Value */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                    <TokenAvatar
                        imageUrl={holding.image_url}
                        symbol={holding.symbol}
                        mint={holding.mint}
                        size={44}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg">{holding.symbol}</span>
                            <a
                                href={`https://solscan.io/token/${holding.mint}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title="View on Solscan"
                            >
                                <ExternalLink className="w-3 h-3 text-white/40" />
                            </a>
                            <a
                                href={`https://dexscreener.com/solana/${holding.mint}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                                title="View on DexScreener"
                            >
                                DEX
                            </a>
                            <a
                                href={twitterSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/30 transition-colors"
                                title="Search on Twitter"
                            >
                                𝕏
                            </a>
                        </div>
                        {/* Current Price */}
                        <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
                            <span>Price:</span>
                            <motion.span
                                key={priceInSol}
                                initial={{ backgroundColor: "rgba(196,247,14,0.3)" }}
                                animate={{ backgroundColor: "transparent" }}
                                transition={{ duration: 0.5 }}
                                className="rounded px-1"
                            >
                                <SolValue solAmount={priceInSol} size="sm" />
                            </motion.span>
                            {livePrice?.priceChange24h !== undefined && (
                                <span className={livePrice.priceChange24h >= 0 ? "text-green-400" : "text-red-400"}>
                                    {livePrice.priceChange24h >= 0 ? "+" : ""}{livePrice.priceChange24h.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Total Value in SOL */}
                <div className="text-right">
                    <motion.div
                        key={valueSol}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        className="text-[#c4f70e]"
                    >
                        <SolValue solAmount={valueSol} size="lg" />
                    </motion.div>
                    <div className="text-xs text-white/40 font-mono">
                        {holding.amount >= 1_000_000
                            ? `${(holding.amount / 1_000_000).toFixed(2)}M`
                            : holding.amount >= 1_000
                                ? `${(holding.amount / 1_000).toFixed(2)}K`
                                : holding.amount.toFixed(2)
                        } tokens
                    </div>
                </div>
            </div>

            {/* Progress Bar for Take Profit */}
            <ProgressBar currentMultiplier={currentMultiplier} targetsHit={targetsHit} />
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

export function PortfolioHoldingsPanel({ walletAddress, minValueUsd = 0.01 }: PortfolioHoldingsPanelProps) {
    const [holdings, setHoldings] = useState<OnChainHolding[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [livePrices, setLivePrices] = useState<Map<string, LivePriceData>>(new Map());
    const [solPrice, setSolPrice] = useState(SOL_PRICE_USD);
    const searchParams = useSearchParams();
    const walletFromQuery = searchParams?.get("wallet") || undefined;
    const effectiveWallet = useMemo(() => walletAddress ?? walletFromQuery, [walletAddress, walletFromQuery]);
    const subscribedRef = useRef(false);

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
            newMap.set(stats.address, {
                price: stats.price,
                priceChange24h: stats.priceChange24h,
                volume24h: stats.volume24h,
                liquidity: stats.liquidity,
                marketCap: stats.marketCap,
                lastUpdated: Date.now(),
            });
            return newMap;
        });
    }, []);

    // Initialize Birdeye WebSocket
    const { isConnected, subscribeTokenStats } = useBirdeyeWebSocket({
        apiKey: BIRDEYE_API_KEY,
        onTokenStats: handleTokenStats,
        onConnect: () => {
            console.log("[Portfolio] Birdeye WebSocket connected");
            // Subscribe to SOL price
            subscribeTokenStats(["So11111111111111111111111111111111111111112"]);
        },
    });

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

            const data: OnChainHolding[] = (result?.data as OnChainHolding[]) || [];
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
        <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#c4f70e]" />
                    <span className="text-sm font-medium text-white">Portfolio</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#c4f70e]/20 text-[#c4f70e]">
                        {holdings.length}
                    </span>
                    {isConnected && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-green-500/20 text-green-400">
                            <Zap className="w-2.5 h-2.5" />WS
                        </span>
                    )}
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
                        <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 max-h-[700px] overflow-y-auto">
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
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default PortfolioHoldingsPanel;
