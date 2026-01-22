"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    Loader2,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// Infinite scroll settings
const TRADES_PAGE_SIZE = 15;           // For local trades pagination
const INITIAL_TXN_FETCH = 15;          // First fetch for transactions
const TXN_BATCH_SIZE = 35;             // Subsequent fetches for transactions
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
// Feature Flag: Enable/disable Trades view (buggy, disabled by default)
// Set NEXT_PUBLIC_ENABLE_TRADES_VIEW=true in .env.local to enable
// ============================================
const TRADES_VIEW_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRADES_VIEW === "true";

// ============================================
// Main Component
// ============================================

export function HistoryPanel({ maxItems = 50 }: HistoryPanelProps) {
    const t = useTranslations("dashboard");
    const tHistory = useTranslations("history");
    const tTime = useTranslations("time");
    const { history } = usePositions();

    // View state - default to transactions if trades view is disabled
    const [viewMode, setViewMode] = useState<ViewMode>(TRADES_VIEW_ENABLED ? "trades" : "transactions");
    const [isExpanded, setIsExpanded] = useState(true);

    // Infinite scroll state for trades (local pagination)
    const [visibleTradesCount, setVisibleTradesCount] = useState(TRADES_PAGE_SIZE);

    // Drawer state
    const [selectedTrade, setSelectedTrade] = useState<SelectedTrade | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Transactions state with server-side pagination
    const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
    const [txnsHasMore, setTxnsHasMore] = useState(true);
    const [txnsTotal, setTxnsTotal] = useState(0);
    const [isLoadingTxns, setIsLoadingTxns] = useState(false);
    const [isLoadingMoreTxns, setIsLoadingMoreTxns] = useState(false);
    const isFetchingRef = useRef(false);

    // Fetch transactions with pagination
    const fetchTransactions = useCallback(async (offset: number = 0, isInitial: boolean = true) => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        if (isInitial) {
            setIsLoadingTxns(true);
        } else {
            setIsLoadingMoreTxns(true);
        }

        try {
            const limit = isInitial ? INITIAL_TXN_FETCH : TXN_BATCH_SIZE;
            const url = buildDevprntApiUrl(`/api/trading/transactions?limit=${limit}&offset=${offset}`);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            const data = result.data;
            if (data && typeof data === 'object') {
                const { items, has_more, total } = data;
                if (isInitial) {
                    setTransactions(items || []);
                } else {
                    setTransactions(prev => [...prev, ...(items || [])]);
                }
                setTxnsHasMore(has_more ?? false);
                setTxnsTotal(total ?? 0);
            }
        } catch (err) {
            console.error("[HistoryPanel] Failed to fetch transactions:", err);
        } finally {
            setIsLoadingTxns(false);
            setIsLoadingMoreTxns(false);
            isFetchingRef.current = false;
        }
    }, []);

    // Load more transactions
    const loadMoreTransactions = useCallback(() => {
        if (!txnsHasMore || isFetchingRef.current) return;
        fetchTransactions(transactions.length, false);
    }, [txnsHasMore, transactions.length, fetchTransactions]);

    // Reset and fetch when switching to transactions view
    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        if (mode === "trades") {
            setVisibleTradesCount(TRADES_PAGE_SIZE);
        } else if (mode === "transactions" && transactions.length === 0) {
            // Initial fetch when switching to transactions
            fetchTransactions(0, true);
        }
    };

    // Initial fetch when component mounts and transactions view is active
    useEffect(() => {
        if (viewMode === "transactions" && transactions.length === 0) {
            fetchTransactions(0, true);
        }
    }, [viewMode, transactions.length, fetchTransactions]);

    // Trades data - sorted and memoized
    const allClosedTrades = useMemo(() => {
        return [...history]
            .sort((a, b) => {
                const dateA = new Date(a.closedAt || a.updatedAt).getTime();
                const dateB = new Date(b.closedAt || b.updatedAt).getTime();
                return dateB - dateA;
            })
            .slice(0, maxItems);
    }, [history, maxItems]);

    // Visible trades (local pagination)
    const visibleTrades = useMemo(() => {
        return allClosedTrades.slice(0, visibleTradesCount);
    }, [allClosedTrades, visibleTradesCount]);

    const hasMoreTrades = visibleTradesCount < allClosedTrades.length;

    // Load more trades (local)
    const loadMoreTrades = useCallback(() => {
        setVisibleTradesCount(prev => Math.min(prev + TRADES_PAGE_SIZE, allClosedTrades.length));
    }, [allClosedTrades.length]);

    // Stats based on all trades (not just visible)
    const wins = allClosedTrades.filter(t => (t.realizedPnlSol ?? 0) >= 0).length;
    const losses = allClosedTrades.length - wins;
    const totalPnl = allClosedTrades.reduce((sum, t) => sum + (t.realizedPnlSol ?? 0), 0);

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

    const itemCount = viewMode === "trades" ? allClosedTrades.length : (txnsTotal || transactions.length);

    return (
        <div className="h-full flex flex-col overflow-hidden max-h-[420px] md:max-h-none rounded-xl border border-white/10 p-3">
            {/* Header with SectionHeader component */}
            <SectionHeader
                icon={<TrendingUp className="w-6 h-6 text-[#c4f70e]" />}
                title={tHistory("title")}
                tooltip={tHistory("tooltip")}
                rightContent={
                    TRADES_VIEW_ENABLED ? (
                        <div className="flex items-center bg-white/5 rounded-full p-0.5">
                            <button
                                onClick={() => handleViewModeChange("trades")}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                                    viewMode === "trades"
                                        ? "bg-[#c4f70e] text-black"
                                        : "text-white/60 hover:text-white"
                                }`}
                            >
                                {tHistory("trades")}
                            </button>
                            <button
                                onClick={() => handleViewModeChange("transactions")}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                                    viewMode === "transactions"
                                        ? "bg-[#c4f70e] text-black"
                                        : "text-white/60 hover:text-white"
                                }`}
                            >
                                {tHistory("txns")}
                            </button>
                        </div>
                    ) : undefined
                }
            />

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
                        <div className="h-full max-h-[320px] md:max-h-none overflow-y-auto space-y-2 pr-1">
                            {TRADES_VIEW_ENABLED && viewMode === "trades" ? (
                                <TradesView
                                    trades={visibleTrades}
                                    onTradeClick={handleTradeClick}
                                    hasMore={hasMoreTrades}
                                    onLoadMore={loadMoreTrades}
                                />
                            ) : (
                                <TransactionsView
                                    transactions={transactions}
                                    isLoading={isLoadingTxns}
                                    isLoadingMore={isLoadingMoreTxns}
                                    hasMore={txnsHasMore}
                                    onLoadMore={loadMoreTransactions}
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
// Trades View (Aggregated Positions) with Infinite Scroll
// ============================================

interface TradesViewProps {
    trades: Position[];
    onTradeClick: (trade: Position) => void;
    hasMore: boolean;
    onLoadMore: () => void;
}

function TradesView({ trades, onTradeClick, hasMore, onLoadMore }: TradesViewProps) {
    const tHistory = useTranslations("history");
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Infinite scroll with IntersectionObserver
    useEffect(() => {
        if (!hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    if (trades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <Trophy className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">{tHistory("noTrades")}</span>
                <span className="text-[10px] text-white/30 mt-1">
                    {tHistory("closedPositionsAppear")}
                </span>
            </div>
        );
    }

    return (
        <>
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
            {/* Infinite scroll trigger */}
            {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-3">
                    <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                </div>
            )}
        </>
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
    const tHistory = useTranslations("history");
    const tTime = useTranslations("time");
    const pnl = trade.realizedPnlSol ?? 0;
    const isProfit = pnl >= 0;
    const pnlPercent = trade.entryAmountSol > 0
        ? (pnl / trade.entryAmountSol) * 100
        : 0;

    const exitReason = isProfit ? "tp" : "sl";
    const timeHeld = getHoldTime(trade.createdAt, trade.closedAt || trade.updatedAt);
    const timeAgo = formatTimeAgoTranslated(trade.closedAt || trade.updatedAt, tTime);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-2">
                {/* Token Image */}
                <TokenImage tokenMint={trade.tokenMint} tokenSymbol={trade.tokenSymbol} size={32} />

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-white text-sm">
                        {trade.tokenSymbol || shortenAddress(trade.tokenMint)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-white/60">
                            {exitReason === "tp" ? (
                                <span className="text-green-400 font-medium">{tHistory("won")}</span>
                            ) : (
                                <span className="text-red-400 font-medium">{tHistory("lost")}</span>
                            )}
                            {" "}<span className={`font-mono tabular-nums ${isProfit ? "text-green-400" : "text-red-400"}`}>
                                {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                            </span>{" "}SOL
                            <span className="text-white/40 ml-1">({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(0)}%)</span>
                        </span>
                    </div>
                </div>

                {/* Right side - time and hold duration */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-mono tabular-nums text-white/40">
                        {timeAgo}
                    </span>
                    <span className="text-[10px] text-white/30">
                        {tHistory("held")} {timeHeld}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// Transactions View (Raw Blockchain Txs) with Server-Side Pagination
// ============================================

interface TransactionsViewProps {
    transactions: EnrichedTransaction[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
}

function TransactionsView({ transactions, isLoading, isLoadingMore, hasMore, onLoadMore }: TransactionsViewProps) {
    const tHistory = useTranslations("history");
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Infinite scroll with IntersectionObserver
    useEffect(() => {
        if (!hasMore || isLoading || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

    if (isLoading && transactions.length === 0) {
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
                <span className="text-xs">{tHistory("noTransactions")}</span>
                <span className="text-[10px] text-white/30 mt-1">
                    {tHistory("transactionsAppear")}
                </span>
            </div>
        );
    }

    return (
        <>
            <AnimatePresence mode="popLayout">
                {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                ))}
            </AnimatePresence>
            {/* Infinite scroll trigger / loading more indicator */}
            {(hasMore || isLoadingMore) && (
                <div ref={loadMoreRef} className="flex justify-center py-3">
                    <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                </div>
            )}
        </>
    );
}

// ============================================
// Transaction Row Component
// ============================================

interface TransactionRowProps {
    tx: EnrichedTransaction;
}

function TransactionRow({ tx }: TransactionRowProps) {
    const tHistory = useTranslations("history");
    const tTime = useTranslations("time");
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
            data-cursor-target
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
                                <span className="text-[#c4f70e] font-medium">{tHistory("bought")}</span>
                                {" "}{formatTokenAmount(tokenAmount)}{" "}
                                <span className="text-white font-mono tabular-nums">{formatSol(solAmount)}</span>
                                {" "}SOL
                            </span>
                        ) : (
                            <span className="text-xs text-white/60">
                                <span className="text-red-400 font-medium">{tHistory("sold")}</span>
                                {" "}{formatTokenAmount(tokenAmount)}{" "}
                                <span className="text-green-400 font-mono tabular-nums">+{formatSol(solAmount)}</span>
                                {" "}SOL
                            </span>
                        )}
                    </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-mono tabular-nums text-white/40">
                        {formatTimeAgoTranslated(tx.timestamp, tTime)}
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
                        {tHistory("tx")} <ExternalLink className="w-2.5 h-2.5" />
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

function formatTimeAgoTranslated(dateStr: string, t: (key: string, params?: Record<string, string | number | Date>) => string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t("justNow");
    if (diffMins < 60) return t("minutesAgo", { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t("hoursAgo", { count: diffHours });
    return t("daysAgo", { count: Math.floor(diffHours / 24) });
}
