"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Twitter,
    Globe,
    RefreshCw,
} from "lucide-react";
import { buildDevprntApiUrl } from "@/lib/devprnt";

// ============================================
// Types - Matching devprnt enriched API
// ============================================

interface EnrichedTransaction {
    id: string;
    tx_type: "buy" | "sell";
    signature: string;
    mint: string;
    ticker: string;
    token_name: string;
    sol_amount?: number;
    tokens_received?: number;
    tokens_sold?: number;
    sol_received?: number;
    price: number;
    timestamp: string;
    // Token metadata (enriched)
    image_url?: string;
    twitter_url?: string;
    website_url?: string;
    description?: string;
    // Market data (enriched)
    current_price?: number;
    market_cap?: number;
    liquidity?: number;
    volume_24h?: number;
}

// ============================================
// Token Avatar with Image
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

function TokenAvatar({ imageUrl, symbol, mint, size = 36 }: TokenAvatarProps) {
    const [imgError, setImgError] = useState(false);
    const [color1, color2] = getAvatarColors(symbol);
    const initials = symbol.slice(0, 2).toUpperCase();

    // Try DexScreener image as fallback
    const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
    const finalImageUrl = imageUrl || dexScreenerUrl;

    if (imgError || !finalImageUrl) {
        return (
            <div
                className="relative flex items-center justify-center rounded-full font-bold text-white shadow-lg flex-shrink-0"
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
            className="relative rounded-full overflow-hidden flex-shrink-0 shadow-lg"
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
// Transactions Panel Component
// ============================================

interface TransactionsPanelProps {
    maxTransactions?: number;
}

export function TransactionsPanel({ maxTransactions = 15 }: TransactionsPanelProps) {
    const t = useTranslations("dashboard");
    const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const url = buildDevprntApiUrl(`/api/trading/transactions?limit=${maxTransactions}`);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            setTransactions(result.data || []);
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
            setError("Failed to load transactions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        // Refresh every 30 seconds
        const interval = setInterval(fetchTransactions, 30000);
        return () => clearInterval(interval);
    }, [maxTransactions]);

    return (
        <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#c4f70e]" />
                    <span className="text-sm font-medium text-white">Transaction History</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#c4f70e]/20 text-[#c4f70e]">
                        {transactions.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            fetchTransactions();
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                </div>
            </button>

            {/* Transaction list */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
                            {error && (
                                <div className="text-center py-4 text-red-400 text-sm">{error}</div>
                            )}
                            {!error && transactions.length === 0 && !isLoading && (
                                <div className="flex flex-col items-center justify-center py-8 text-white/40">
                                    <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-xs">No transactions yet</span>
                                    <span className="text-[10px] text-white/30 mt-1">
                                        Trades will appear here
                                    </span>
                                </div>
                            )}
                            <AnimatePresence mode="popLayout">
                                {transactions.map((tx) => (
                                    <TransactionCard key={tx.id} tx={tx} />
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// Transaction Card - Individual transaction
// ============================================

interface TransactionCardProps {
    tx: EnrichedTransaction;
}

function TransactionCard({ tx }: TransactionCardProps) {
    const isBuy = tx.tx_type === "buy";
    const solAmount = isBuy ? tx.sol_amount : tx.sol_received;
    const tokenAmount = isBuy ? tx.tokens_received : tx.tokens_sold;

    // Calculate P&L if we have current price
    const pnlPercent = tx.current_price && tx.price > 0
        ? ((tx.current_price / tx.price - 1) * 100)
        : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
            {/* Top row: Token + Type badge */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <TokenAvatar
                        imageUrl={tx.image_url}
                        symbol={tx.ticker}
                        mint={tx.mint}
                        size={32}
                    />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">
                                {tx.ticker}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isBuy
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}>
                                {isBuy ? "BUY" : "SELL"}
                            </span>
                        </div>
                        <span className="text-[10px] text-white/40 truncate max-w-[120px]">
                            {tx.token_name}
                        </span>
                    </div>
                </div>

                {/* Social links */}
                <div className="flex items-center gap-1">
                    {tx.twitter_url && (
                        <a
                            href={tx.twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        >
                            <Twitter className="w-3.5 h-3.5 text-blue-400" />
                        </a>
                    )}
                    {tx.website_url && (
                        <a
                            href={tx.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5 text-white/60" />
                        </a>
                    )}
                    <a
                        href={`https://solscan.io/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                    </a>
                </div>
            </div>

            {/* Middle row: Amounts */}
            <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-3 text-white/60">
                    <span>{formatSol(solAmount)} SOL</span>
                    <span className="text-white/30">→</span>
                    <span>{formatNumber(tokenAmount)} tokens</span>
                </div>
                <span className="font-mono text-white/80">
                    @ ${formatPrice(tx.price)}
                </span>
            </div>

            {/* Bottom row: Market data */}
            <div className="flex items-center justify-between text-[10px] text-white/50">
                <div className="flex items-center gap-3">
                    {tx.market_cap && (
                        <span>MCap: {formatCompact(tx.market_cap)}</span>
                    )}
                    {tx.liquidity && (
                        <span>Liq: {formatCompact(tx.liquidity)}</span>
                    )}
                    {tx.volume_24h && (
                        <span>Vol: {formatCompact(tx.volume_24h)}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {pnlPercent !== null && (
                        <span className={`flex items-center gap-1 ${pnlPercent >= 0 ? "text-green-400" : "text-red-400"
                            }`}>
                            {pnlPercent >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
                        </span>
                    )}
                    <span className="text-white/40">{formatTimeAgo(tx.timestamp)}</span>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// Helper Functions
// ============================================

function formatSol(amount: number | undefined): string {
    if (!amount) return "0";
    return amount.toFixed(4);
}

function formatNumber(num: number | undefined): string {
    if (!num) return "0";
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
}

function formatPrice(price: number): string {
    if (price < 0.0001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
}

function formatCompact(num: number): string {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}
