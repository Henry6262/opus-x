"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import {
    X,
    ExternalLink,
    ArrowDownRight,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    TrendingUp,
    TrendingDown,
    Users,
    Droplets,
    BarChart3,
    Globe,
} from "lucide-react";
import { buildDevprntApiUrl } from "@/lib/devprnt";

// ============================================
// Types
// ============================================

interface Transaction {
    signature: string;
    type: "entry" | "tp1" | "tp2" | "tp3" | "stop_loss" | "manual_sell" | "unknown";
    timestamp: number;
    solAmount: number;
    tokenAmount: number;
    priceUsd: number;
    status: "confirmed" | "pending" | "failed";
}

interface TokenInfo {
    marketCap: number | null;
    liquidity: number | null;
    volume24h: number | null;
    holders: number | null;
    priceChange24h: number | null;
    twitterUrl: string | null;
    websiteUrl: string | null;
}

interface TransactionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    tokenSymbol: string;
    tokenMint: string;
    tokenImage?: string | null;
    positionId?: string;
}

// ============================================
// Constants
// ============================================

const SOLANA_ICON = "/logos/solana.png";

// X (Twitter) Icon
function XIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

// ============================================
// Compact Transaction Row Component
// ============================================

interface TransactionRowProps {
    tx: Transaction;
    index: number;
}

function TransactionRow({ tx, index }: TransactionRowProps) {
    const isBuy = tx.type === "entry";
    const isTP = tx.type.startsWith("tp");
    const isSL = tx.type === "stop_loss";

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return "now";
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${Math.floor(diffHours / 24)}d`;
    };

    const truncateSig = (sig: string) => `${sig.slice(0, 4)}...${sig.slice(-3)}`;

    const getTypeLabel = () => {
        if (isBuy) return "BUY";
        if (tx.type === "tp1") return "TP1";
        if (tx.type === "tp2") return "TP2";
        if (tx.type === "tp3") return "TP3";
        if (isSL) return "SL";
        if (tx.type === "manual_sell") return "SELL";
        return "TX";
    };

    const getTypeColor = () => {
        if (isBuy) return "text-[#22d3ee]";
        if (isTP) return "text-[#c4f70e]";
        if (isSL) return "text-red-400";
        return "text-white/50";
    };

    return (
        <motion.a
            href={`https://solscan.io/tx/${tx.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
        >
            {/* Type badge */}
            <span className={`text-[10px] font-bold uppercase w-8 ${getTypeColor()}`}>
                {getTypeLabel()}
            </span>

            {/* Amount */}
            <span className={`text-xs font-mono tabular-nums font-semibold flex-1 ${isBuy ? "text-white" : "text-[#c4f70e]"}`}>
                {isBuy ? "-" : "+"}{tx.solAmount.toFixed(3)} SOL
            </span>

            {/* Tokens */}
            <span className="text-[10px] text-white/40 font-mono tabular-nums">
                {tx.tokenAmount >= 1_000_000
                    ? `${(tx.tokenAmount / 1_000_000).toFixed(1)}M`
                    : tx.tokenAmount >= 1_000
                        ? `${(tx.tokenAmount / 1_000).toFixed(0)}K`
                        : tx.tokenAmount.toFixed(0)
                }
            </span>

            {/* Time + status */}
            <div className="flex items-center gap-1 text-[10px] text-white/30">
                {tx.status === "confirmed" && <CheckCircle2 className="w-2.5 h-2.5 text-[#c4f70e]/60" />}
                {tx.status === "pending" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#c4f70e]" />}
                {tx.status === "failed" && <AlertCircle className="w-2.5 h-2.5 text-red-400" />}
                <span>{formatTime(tx.timestamp)}</span>
            </div>

            {/* Solscan link */}
            <span className="text-[9px] text-white/20 font-mono group-hover:text-[#c4f70e]/60 transition-colors flex items-center gap-0.5">
                {truncateSig(tx.signature)}
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
        </motion.a>
    );
}

// ============================================
// Token Info Section
// ============================================

interface TokenInfoSectionProps {
    tokenInfo: TokenInfo | null;
    isLoading: boolean;
}

function TokenInfoSection({ tokenInfo, isLoading }: TokenInfoSectionProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!tokenInfo) return null;

    const formatValue = (val: number | null, prefix = "", suffix = "") => {
        if (val === null || val === undefined) return "—";
        if (val >= 1_000_000_000) return `${prefix}${(val / 1_000_000_000).toFixed(1)}B${suffix}`;
        if (val >= 1_000_000) return `${prefix}${(val / 1_000_000).toFixed(1)}M${suffix}`;
        if (val >= 1_000) return `${prefix}${(val / 1_000).toFixed(1)}K${suffix}`;
        return `${prefix}${val.toFixed(0)}${suffix}`;
    };

    return (
        <div className="space-y-2 mb-3">
            {/* Market Data Grid */}
            <div className="grid grid-cols-4 gap-1.5">
                {/* Market Cap */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <BarChart3 className="w-3 h-3 text-white/30 mx-auto mb-1" />
                    <div className="text-[10px] text-white/40 mb-0.5">MCap</div>
                    <div className="text-xs font-bold text-white font-mono">
                        {formatValue(tokenInfo.marketCap, "$")}
                    </div>
                </div>

                {/* Liquidity */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <Droplets className="w-3 h-3 text-white/30 mx-auto mb-1" />
                    <div className="text-[10px] text-white/40 mb-0.5">Liq</div>
                    <div className="text-xs font-bold text-white font-mono">
                        {formatValue(tokenInfo.liquidity, "$")}
                    </div>
                </div>

                {/* Volume */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <TrendingUp className="w-3 h-3 text-white/30 mx-auto mb-1" />
                    <div className="text-[10px] text-white/40 mb-0.5">24h Vol</div>
                    <div className="text-xs font-bold text-white font-mono">
                        {formatValue(tokenInfo.volume24h, "$")}
                    </div>
                </div>

                {/* Holders */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <Users className="w-3 h-3 text-white/30 mx-auto mb-1" />
                    <div className="text-[10px] text-white/40 mb-0.5">Holders</div>
                    <div className="text-xs font-bold text-white font-mono">
                        {formatValue(tokenInfo.holders)}
                    </div>
                </div>
            </div>

            {/* Social Links */}
            {(tokenInfo.twitterUrl || tokenInfo.websiteUrl) && (
                <div className="flex items-center gap-2">
                    {tokenInfo.twitterUrl && (
                        <a
                            href={tokenInfo.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs text-white/60 hover:text-white"
                        >
                            <XIcon className="w-3 h-3" />
                            <span>Twitter</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </a>
                    )}
                    {tokenInfo.websiteUrl && (
                        <a
                            href={tokenInfo.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs text-white/60 hover:text-white"
                        >
                            <Globe className="w-3 h-3" />
                            <span>Website</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// Main Transaction Drawer Component
// ============================================

export function TransactionDrawer({
    isOpen,
    onClose,
    tokenSymbol,
    tokenMint,
    tokenImage,
    positionId,
}: TransactionDrawerProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false);

    // Fetch token info from DexScreener or backend
    const fetchTokenInfo = useCallback(async () => {
        if (!tokenMint) return;

        setIsLoadingTokenInfo(true);
        try {
            // Try to fetch from our holdings API which has this data
            const holdingsUrl = buildDevprntApiUrl("/api/trading/holdings");
            const holdingsResponse = await fetch(holdingsUrl.toString());

            if (holdingsResponse.ok) {
                const holdingsResult = await holdingsResponse.json();
                const holdings = holdingsResult?.data || [];
                const holding = holdings.find((h: any) => h.mint === tokenMint);

                if (holding) {
                    setTokenInfo({
                        marketCap: holding.market_cap,
                        liquidity: holding.liquidity,
                        volume24h: holding.volume_24h,
                        holders: null, // Not available from holdings
                        priceChange24h: null,
                        twitterUrl: holding.twitter_url || null,
                        websiteUrl: holding.website_url || null,
                    });
                    return;
                }
            }

            // Fallback: Try DexScreener API
            const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`;
            const dexResponse = await fetch(dexUrl);

            if (dexResponse.ok) {
                const dexData = await dexResponse.json();
                const pair = dexData?.pairs?.[0];

                if (pair) {
                    setTokenInfo({
                        marketCap: pair.marketCap || pair.fdv || null,
                        liquidity: pair.liquidity?.usd || null,
                        volume24h: pair.volume?.h24 || null,
                        holders: null,
                        priceChange24h: pair.priceChange?.h24 || null,
                        twitterUrl: pair.info?.socials?.find((s: any) => s.type === "twitter")?.url || null,
                        websiteUrl: pair.info?.websites?.[0]?.url || null,
                    });
                }
            }
        } catch (err) {
            console.error("[TransactionDrawer] Failed to fetch token info:", err);
        } finally {
            setIsLoadingTokenInfo(false);
        }
    }, [tokenMint]);

    // Fetch transactions when drawer opens
    const fetchTransactions = useCallback(async () => {
        if (!tokenMint && !positionId) {
            setError("No position data available");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const params = new URLSearchParams();
            if (positionId) params.set("position_id", positionId);
            if (tokenMint) params.set("mint", tokenMint);
            params.set("limit", "50");

            const url = buildDevprntApiUrl(`/api/trading/transactions?${params.toString()}`);
            const response = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch transactions (${response.status})`);
            }

            const result = await response.json();
            if (result?.success === false) {
                throw new Error(result.error || "Failed to load transactions");
            }

            const rawTransactions = result?.data || [];
            const mappedTransactions: Transaction[] = rawTransactions.map((tx: any) => {
                let type: Transaction["type"] = "unknown";
                if (tx.tx_type === "buy") {
                    type = "entry";
                } else if (tx.tx_type === "sell") {
                    type = "tp1";
                }

                return {
                    signature: tx.signature,
                    type,
                    timestamp: new Date(tx.timestamp).getTime(),
                    solAmount: tx.sol_amount || tx.sol_received || 0,
                    tokenAmount: tx.tokens_received || tx.tokens_sold || 0,
                    priceUsd: tx.price || 0,
                    status: "confirmed",
                };
            });

            mappedTransactions.sort((a, b) => b.timestamp - a.timestamp);
            setTransactions(mappedTransactions);
        } catch (err) {
            console.error("[TransactionDrawer] Failed to fetch transactions:", err);
            if (err instanceof Error && err.name === "AbortError") {
                setError("Request timed out. Please try again.");
            } else {
                setError(err instanceof Error ? err.message : "Failed to load transactions");
            }
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [tokenMint, positionId]);

    useEffect(() => {
        if (isOpen) {
            fetchTransactions();
            fetchTokenInfo();
        }
    }, [isOpen, fetchTransactions, fetchTokenInfo]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Calculate totals
    const entryTxs = transactions.filter(tx => tx.type === "entry");
    const sellTxs = transactions.filter(tx => tx.type !== "entry");
    const totalInvested = entryTxs.reduce((sum, tx) => sum + tx.solAmount, 0);
    const totalReturned = sellTxs.reduce((sum, tx) => sum + tx.solAmount, 0);
    const totalTokensBought = entryTxs.reduce((sum, tx) => sum + tx.tokenAmount, 0);
    const totalTokensSold = sellTxs.reduce((sum, tx) => sum + tx.tokenAmount, 0);
    const percentageSold = totalTokensBought > 0 ? totalTokensSold / totalTokensBought : 0;
    const costBasisOfSold = totalInvested * percentageSold;
    const netPnl = totalReturned - costBasisOfSold;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-sheet-backdrop)]"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer Panel */}
            <div className={`transaction-drawer ${isOpen ? "" : "collapsed"}`}>
                <aside className="transaction-drawer-panel">
                    {/* Header - Compact */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            {tokenImage ? (
                                <Image
                                    src={tokenImage}
                                    alt={tokenSymbol}
                                    width={36}
                                    height={36}
                                    className="rounded-lg ring-1 ring-white/10"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c4f70e]/20 to-[#22d3ee]/20 border border-[#c4f70e]/20 flex items-center justify-center text-xs font-bold text-[#c4f70e]">
                                    {tokenSymbol.slice(0, 2)}
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    $ <span className="text-[#c4f70e]">{tokenSymbol}</span>
                                </h3>
                                <p className="text-[10px] text-white/40">{transactions.length} txns</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                            aria-label="Close drawer"
                        >
                            <X className="w-4 h-4 text-white/40" />
                        </button>
                    </div>

                    {/* Token Info Section */}
                    <div className="px-4 py-3 border-b border-white/5">
                        <TokenInfoSection tokenInfo={tokenInfo} isLoading={isLoadingTokenInfo} />

                        {/* Summary Stats - More compact */}
                        {transactions.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                                    <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">Cost</div>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-sm font-bold text-white font-mono">{costBasisOfSold.toFixed(2)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={12} height={12} className="opacity-70" />
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-[#c4f70e]/[0.03] border border-[#c4f70e]/10 text-center">
                                    <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">Returned</div>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-sm font-bold text-[#c4f70e] font-mono">{totalReturned.toFixed(2)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={12} height={12} className="opacity-70" />
                                    </div>
                                </div>
                                <div className={`p-2 rounded-lg text-center ${netPnl >= 0 ? "bg-[#c4f70e]/[0.05] border border-[#c4f70e]/20" : "bg-red-500/[0.05] border border-red-500/20"}`}>
                                    <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">PnL</div>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className={`text-sm font-bold font-mono ${netPnl >= 0 ? "text-[#c4f70e]" : "text-red-400"}`}>
                                            {netPnl >= 0 ? "+" : ""}{netPnl.toFixed(2)}
                                        </span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={12} height={12} className="opacity-70" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transactions List - Compact */}
                    <div className="flex-1 overflow-y-auto px-2 py-2">
                        {isLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-[#c4f70e] animate-spin" />
                            </div>
                        )}

                        {error && !isLoading && transactions.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <AlertCircle className="w-8 h-8 text-red-400/40 mb-2" />
                                <div className="text-white/40 text-xs mb-2">{error}</div>
                                <button
                                    onClick={fetchTransactions}
                                    className="px-3 py-1.5 text-[10px] font-medium text-[#c4f70e] bg-[#c4f70e]/10 hover:bg-[#c4f70e]/20 border border-[#c4f70e]/20 rounded-lg transition-all"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && transactions.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Clock className="w-8 h-8 text-white/20 mb-2" />
                                <span className="text-xs text-white/40">No transactions yet</span>
                            </div>
                        )}

                        <AnimatePresence mode="popLayout">
                            {transactions.map((tx, index) => (
                                <TransactionRow key={tx.signature} tx={tx} index={index} />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Footer - View on Solscan */}
                    {tokenMint && (
                        <div className="px-4 py-3 border-t border-white/5">
                            <a
                                href={`https://solscan.io/token/${tokenMint}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#c4f70e]/5 border border-[#c4f70e]/10 text-[#c4f70e]/70 hover:text-[#c4f70e] hover:bg-[#c4f70e]/10 transition-all text-xs"
                            >
                                <span className="font-medium">View on Solscan</span>
                                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                            </a>
                        </div>
                    )}
                </aside>
            </div>
        </>
    );
}

export default TransactionDrawer;
