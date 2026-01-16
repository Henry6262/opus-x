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
            console.log("[TransactionsPanel] 📡 Fetching from:", url.toString());
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            console.log("[TransactionsPanel] 📦 RAW API Response:", result);
            console.log("[TransactionsPanel] 📊 Transactions count:", result.data?.length || 0);
            if (result.data?.length > 0) {
                console.log("[TransactionsPanel] 🔍 First transaction:", JSON.stringify(result.data[0], null, 2));
                console.log("[TransactionsPanel] 🔍 Transaction signatures:", result.data.map((tx: EnrichedTransaction) => tx.signature?.slice(0, 20) + "..."));
            }
            setTransactions(result.data || []);
        } catch (err) {
            console.error("[TransactionsPanel] ❌ Failed to fetch transactions:", err);
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
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-1 py-2 flex-shrink-0">
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                >
                    <TrendingUp className="w-5 h-5 text-[#c4f70e]" />
                    <span className="text-base font-semibold text-white">History</span>
                    <span className="px-2 py-0.5 text-[11px] font-bold tabular-nums rounded-full bg-[#c4f70e]/20 text-[#c4f70e]">
                        {transactions.length}
                    </span>
                </div>
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-white/40" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-white/40" />
                    )}
                </div>
            </div>

            {/* Transaction cards - No wrapper */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-hidden"
                    >
                        <div className="h-full overflow-y-auto space-y-2">
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

function XIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
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
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
            <div className="flex items-center gap-2">
                {/* Avatar */}
                <TokenAvatar
                    imageUrl={tx.image_url}
                    symbol={tx.ticker}
                    mint={tx.mint}
                    size={32}
                />

                {/* Middle: Token info + action */}
                <div className="flex-1 min-w-0">
                    {/* Token name row with X icon on right */}
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                            {tx.ticker}
                        </span>
                        {tx.twitter_url && (
                            <a
                                href={tx.twitter_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                                title="View on X"
                            >
                                <XIcon className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                            </a>
                        )}
                    </div>

                    {/* Action text - subtle, not a badge */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {isBuy ? (
                            <span className="text-xs text-white/60 inline-flex items-center gap-1">
                                <span className="text-[#c4f70e] font-medium">Bought</span>
                                {" "}{formatTokenAmount(tokenAmount)}
                                {tx.image_url && (
                                    <Image
                                        src={tx.image_url}
                                        alt={tx.ticker}
                                        width={12}
                                        height={12}
                                        className="rounded-full inline-block"
                                        unoptimized
                                    />
                                )}
                                {" "}for{" "}
                                <span className="text-white font-mono tabular-nums">{formatSol(solAmount)}</span>
                                {" "}SOL
                            </span>
                        ) : (
                            <span className="text-xs text-white/60 inline-flex items-center gap-1">
                                <span className="text-green-400 font-medium">Sold</span>
                                {" "}{formatTokenAmount(tokenAmount)}
                                {tx.image_url && (
                                    <Image
                                        src={tx.image_url}
                                        alt={tx.ticker}
                                        width={12}
                                        height={12}
                                        className="rounded-full inline-block"
                                        unoptimized
                                    />
                                )}
                                {" "}for{" "}
                                <span className="text-green-400 font-mono tabular-nums">+{formatSol(solAmount)}</span>
                                {" "}SOL
                            </span>
                        )}
                    </div>
                </div>

                {/* Right side: Time, P&L, tx link */}
                <div className="flex flex-col items-end gap-1">
                    {/* Time ago */}
                    <span className="text-[10px] font-mono tabular-nums text-white/40">
                        {formatTimeAgo(tx.timestamp)}
                    </span>

                    {/* P&L indicator */}
                    {pnlPercent !== null && (
                        <span className={`flex items-center gap-0.5 text-xs font-mono tabular-nums font-medium ${pnlPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {pnlPercent >= 0 ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(0)}%
                        </span>
                    )}

                    {/* Tx link */}
                    <a
                        href={`https://solscan.io/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-white/40 hover:text-[#c4f70e] transition-colors"
                    >
                        <span>tx</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// Helper Functions
// ============================================

function formatSol(amount: number | undefined): string {
    if (!amount) return "0.00";
    return amount.toFixed(2);
}

function formatTokenAmount(num: number | undefined): string {
    if (!num) return "0";
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return `${Math.round(num / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${Math.round(num / 1_000_000)}M`;
    if (abs >= 1_000) return `${Math.round(num / 1_000)}K`;
    return Math.round(num).toString();
}

function formatPrice(price: number): string {
    if (!Number.isFinite(price)) return "0.00";
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.000001) return price.toFixed(6);
    return price.toFixed(8);
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
