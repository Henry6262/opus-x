"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import {
    Trophy,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Clock,
    Target,
    List,
} from "lucide-react";
import { usePositions } from "../context";
import type { Position } from "../types";
import { TransactionDrawer } from "./TransactionDrawer";
import { buildDevprntApiUrl } from "@/lib/devprnt";

// ============================================
// Types
// ============================================

type ViewMode = "trades" | "transactions";

interface HistoryPanelProps {
    maxItems?: number;
}

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
    image_url?: string;
    twitter_url?: string;
    current_price?: number;
}

interface SelectedTrade {
    mint: string;
    symbol: string;
    positionId?: string;
}

// ============================================
// Main Component
// ============================================

export function HistoryPanel({ maxItems = 50 }: HistoryPanelProps) {
    const t = useTranslations("dashboard");
    const { history } = usePositions();

    // View state
    const [viewMode, setViewMode] = useState<ViewMode>("trades");
    const [isExpanded, setIsExpanded] = useState(true);

    // Drawer state
    const [selectedTrade, setSelectedTrade] = useState<SelectedTrade | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Transactions state with caching
    const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const lastFetchTimeRef = useRef<number>(0);
    const isFetchingRef = useRef(false);

    // Cache TTL: 30 seconds before allowing refetch
    const CACHE_TTL_MS = 30_000;

    const fetchTransactions = useCallback(async (force = false) => {
        const now = Date.now();
        const cacheAge = now - lastFetchTimeRef.current;

        // Skip if already fetching, or cache is fresh (unless forced)
        if (isFetchingRef.current) return;
        if (!force && transactions.length > 0 && cacheAge < CACHE_TTL_MS) {
            return;
        }

        isFetchingRef.current = true;
        setIsLoading(true);

        try {
            const url = buildDevprntApiUrl(`/api/trading/transactions?limit=${maxItems}`);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            setTransactions(result.data || []);
            lastFetchTimeRef.current = Date.now();
        } catch (err) {
            console.error("[HistoryPanel] Failed to fetch transactions:", err);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [maxItems, transactions.length]);

    // Fetch transactions when switching to transactions view (with cache check)
    useEffect(() => {
        if (viewMode === "transactions") {
            fetchTransactions();
        }
    }, [viewMode, fetchTransactions]);

    // Trades data
    const closedTrades = [...history]
        .sort((a, b) => {
            const dateA = new Date(a.closedAt || a.updatedAt).getTime();
            const dateB = new Date(b.closedAt || b.updatedAt).getTime();
            return dateB - dateA;
        })
        .slice(0, maxItems);

    const wins = closedTrades.filter(t => (t.realizedPnlSol ?? 0) >= 0).length;
    const losses = closedTrades.length - wins;
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.realizedPnlSol ?? 0), 0);

    // Handlers
    const handleTradeClick = (trade: Position) => {
        setSelectedTrade({
            mint: trade.tokenMint,
            symbol: trade.tokenSymbol || "Unknown",
            positionId: trade.id,
        });
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedTrade(null), 300);
    };

    const itemCount = viewMode === "trades" ? closedTrades.length : transactions.length;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between px-1 py-3 mb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {/* Icon */}
                    {viewMode === "trades" ? (
                        <Trophy className="w-6 h-6 text-[#c4f70e]" />
                    ) : (
                        <List className="w-6 h-6 text-[#c4f70e]" />
                    )}

                    {/* Toggle Pills */}
                    <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode("trades")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                viewMode === "trades"
                                    ? "bg-[#c4f70e] text-black"
                                    : "text-white/60 hover:text-white"
                            }`}
                        >
                            Trades
                        </button>
                        <button
                            onClick={() => setViewMode("transactions")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                viewMode === "transactions"
                                    ? "bg-[#c4f70e] text-black"
                                    : "text-white/60 hover:text-white"
                            }`}
                        >
                            Transactions
                        </button>
                    </div>

                    {/* Count badge */}
                    <span className="px-2 py-0.5 text-[11px] font-bold tabular-nums rounded-full bg-[#c4f70e]/20 text-[#c4f70e]">
                        {itemCount}
                    </span>

                    {/* Win/Loss for trades view */}
                    {viewMode === "trades" && closedTrades.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold tabular-nums text-green-400">
                                {wins}W
                            </span>
                            <span className="text-[10px] font-bold tabular-nums text-red-400">
                                {losses}L
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Total P&L for trades */}
                    {viewMode === "trades" && closedTrades.length > 0 && (
                        <span className={`text-sm font-bold font-mono tabular-nums ${
                            totalPnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} SOL
                        </span>
                    )}

                    {/* Expand/Collapse */}
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
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {isExpanded && (
                    <motion.div
                        key={viewMode}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-hidden"
                    >
                        <div className="h-full overflow-y-auto space-y-2">
                            {viewMode === "trades" ? (
                                <TradesView
                                    trades={closedTrades}
                                    onTradeClick={handleTradeClick}
                                />
                            ) : (
                                <TransactionsView
                                    transactions={transactions}
                                    isLoading={isLoading}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transaction Drawer */}
            <TransactionDrawer
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                tokenSymbol={selectedTrade?.symbol || ""}
                tokenMint={selectedTrade?.mint || ""}
                positionId={selectedTrade?.positionId}
            />
        </div>
    );
}

// ============================================
// Trades View (Aggregated Positions)
// ============================================

interface TradesViewProps {
    trades: Position[];
    onTradeClick: (trade: Position) => void;
}

function TradesView({ trades, onTradeClick }: TradesViewProps) {
    if (trades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <Trophy className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">No completed trades yet</span>
                <span className="text-[10px] text-white/30 mt-1">
                    Closed positions appear here
                </span>
            </div>
        );
    }

    return (
        <AnimatePresence mode="popLayout">
            {trades.map((trade, index) => (
                <TradeRow
                    key={trade.id}
                    trade={trade}
                    index={index}
                    onClick={() => onTradeClick(trade)}
                />
            ))}
        </AnimatePresence>
    );
}

// ============================================
// Trade Row Component
// ============================================

interface TradeRowProps {
    trade: Position;
    index: number;
    onClick: () => void;
}

function TradeRow({ trade, index, onClick }: TradeRowProps) {
    const pnl = trade.realizedPnlSol ?? 0;
    const isProfit = pnl >= 0;
    const pnlPercent = trade.entryAmountSol > 0
        ? (pnl / trade.entryAmountSol) * 100
        : 0;

    const exitReason = isProfit ? "tp" : "sl";
    const timeHeld = getHoldTime(trade.createdAt, trade.closedAt || trade.updatedAt);
    const timeAgo = getTimeAgo(trade.closedAt || trade.updatedAt);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className={`flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border transition-colors cursor-pointer ${
                isProfit
                    ? "border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5"
                    : "border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5"
            }`}
        >
            {/* Token Image */}
            <TokenImage tokenMint={trade.tokenMint} tokenSymbol={trade.tokenSymbol} size={32} />

            {/* Token Info */}
            <div className="min-w-0 flex-1">
                <span className="font-mono font-semibold text-white text-sm block truncate">
                    {trade.tokenSymbol || shortenAddress(trade.tokenMint)}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>{timeHeld}</span>
                    <span className="text-white/20">•</span>
                    {exitReason === "tp" ? (
                        <span className="flex items-center gap-0.5 text-green-400/70">
                            <Target className="w-3 h-3" />
                            TP
                        </span>
                    ) : (
                        <span className="flex items-center gap-0.5 text-red-400/70">
                            <TrendingDown className="w-3 h-3" />
                            SL
                        </span>
                    )}
                </div>
            </div>

            {/* P&L */}
            <div className="flex-shrink-0 text-right">
                <div className={`flex items-center justify-end gap-1 font-mono font-bold tabular-nums text-sm ${
                    isProfit ? "text-green-400" : "text-red-400"
                }`}>
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(3)}
                    <Image src="/logos/solana.png" alt="SOL" width={12} height={12} className="opacity-80" />
                </div>
                <div className={`text-[10px] font-mono tabular-nums ${
                    isProfit ? "text-green-400/60" : "text-red-400/60"
                }`}>
                    {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(0)}%
                </div>
            </div>

            {/* Time ago */}
            <div className="flex-shrink-0 text-[10px] text-white/30 font-mono tabular-nums w-10 text-right">
                {timeAgo}
            </div>
        </motion.div>
    );
}

// ============================================
// Transactions View (Raw Blockchain Txs)
// ============================================

interface TransactionsViewProps {
    transactions: EnrichedTransaction[];
    isLoading: boolean;
}

function TransactionsView({ transactions, isLoading }: TransactionsViewProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#c4f70e] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <List className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">No transactions yet</span>
                <span className="text-[10px] text-white/30 mt-1">
                    Buy/sell transactions appear here
                </span>
            </div>
        );
    }

    return (
        <AnimatePresence mode="popLayout">
            {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
            ))}
        </AnimatePresence>
    );
}

// ============================================
// Transaction Row Component
// ============================================

interface TransactionRowProps {
    tx: EnrichedTransaction;
}

function TransactionRow({ tx }: TransactionRowProps) {
    const isBuy = tx.tx_type === "buy";
    const solAmount = isBuy ? tx.sol_amount : tx.sol_received;
    const tokenAmount = isBuy ? tx.tokens_received : tx.tokens_sold;

    const pnlPercent = tx.current_price && tx.price > 0
        ? ((tx.current_price / tx.price - 1) * 100)
        : null;

    const openSolscan = () => {
        window.open(`https://solscan.io/tx/${tx.signature}`, '_blank');
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            onClick={openSolscan}
        >
            <div className="flex items-center gap-2">
                {/* Avatar */}
                <TokenImage tokenMint={tx.mint} tokenSymbol={tx.ticker} size={32} />

                {/* Middle: Token info + action */}
                <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-white text-sm">
                        {tx.ticker}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {isBuy ? (
                            <span className="text-xs text-white/60">
                                <span className="text-[#c4f70e] font-medium">Bought</span>
                                {" "}{formatTokenAmount(tokenAmount)} for{" "}
                                <span className="text-white font-mono tabular-nums">{formatSol(solAmount)}</span>
                                {" "}SOL
                            </span>
                        ) : (
                            <span className="text-xs text-white/60">
                                <span className="text-red-400 font-medium">Sold</span>
                                {" "}{formatTokenAmount(tokenAmount)} for{" "}
                                <span className="text-green-400 font-mono tabular-nums">+{formatSol(solAmount)}</span>
                                {" "}SOL
                            </span>
                        )}
                    </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-mono tabular-nums text-white/40">
                        {formatTimeAgo(tx.timestamp)}
                    </span>
                    {pnlPercent !== null && (
                        <span className={`flex items-center gap-0.5 text-xs font-mono tabular-nums font-medium ${
                            pnlPercent >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                            {pnlPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(0)}%
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-white/40">
                        tx <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// Shared Components
// ============================================

interface TokenImageProps {
    tokenMint: string;
    tokenSymbol?: string | null;
    size?: number;
}

function TokenImage({ tokenMint, tokenSymbol, size = 32 }: TokenImageProps) {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return (
            <div
                className="rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0"
                style={{ width: size, height: size }}
            >
                {(tokenSymbol || tokenMint.slice(0, 2)).slice(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <Image
            src={`https://dd.dexscreener.com/ds-data/tokens/solana/${tokenMint}.png`}
            alt={tokenSymbol || "Token"}
            width={size}
            height={size}
            className="rounded-lg flex-shrink-0"
            onError={() => setImgError(true)}
            unoptimized
        />
    );
}

// ============================================
// Helper Functions
// ============================================

function getHoldTime(createdAt: string, closedAt: string): string {
    const start = new Date(createdAt).getTime();
    const end = new Date(closedAt).getTime();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
}

function getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
}

function shortenAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

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
