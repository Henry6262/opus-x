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

const TX_TYPE_CONFIG: Record<Transaction["type"], { label: string; icon: typeof ArrowDownRight; color: string; bgColor: string }> = {
    entry: { label: "Entry", icon: ArrowDownRight, color: "text-blue-400", bgColor: "bg-blue-500/20" },
    tp1: { label: "TP1", icon: ArrowUpRight, color: "text-green-400", bgColor: "bg-green-500/20" },
    tp2: { label: "TP2", icon: ArrowUpRight, color: "text-green-400", bgColor: "bg-green-500/20" },
    tp3: { label: "TP3", icon: ArrowUpRight, color: "text-[#c4f70e]", bgColor: "bg-[#c4f70e]/20" },
    stop_loss: { label: "Stop Loss", icon: ArrowUpRight, color: "text-red-400", bgColor: "bg-red-500/20" },
    manual_sell: { label: "Sell", icon: ArrowUpRight, color: "text-orange-400", bgColor: "bg-orange-500/20" },
    unknown: { label: "Transaction", icon: ArrowDownRight, color: "text-white/60", bgColor: "bg-white/10" },
};

// ============================================
// Transaction Row Component
// ============================================

interface TransactionRowProps {
    tx: Transaction;
    index: number;
}

function TransactionRow({ tx, index }: TransactionRowProps) {
    const config = TX_TYPE_CONFIG[tx.type];
    const Icon = config.icon;
    const isSell = tx.type !== "entry";

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const truncateSig = (sig: string) => `${sig.slice(0, 6)}...${sig.slice(-4)}`;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className="group relative p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
        >
            {/* Type Badge + Time */}
            <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                    {tx.status === "pending" && <Loader2 className="w-3 h-3 animate-spin" />}
                    {tx.status === "confirmed" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                    {tx.status === "failed" && <AlertCircle className="w-3 h-3 text-red-400" />}
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(tx.timestamp)}</span>
                </div>
            </div>

            {/* Amount Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold font-mono ${isSell ? "text-green-400" : "text-white"}`}>
                        {isSell ? "+" : "-"}{tx.solAmount.toFixed(3)}
                    </span>
                    <Image src={SOLANA_ICON} alt="SOL" width={16} height={16} className="opacity-80" />
                </div>
                <span className="text-xs text-white/40 font-mono">
                    {tx.tokenAmount >= 1_000_000
                        ? `${(tx.tokenAmount / 1_000_000).toFixed(2)}M`
                        : tx.tokenAmount >= 1_000
                            ? `${(tx.tokenAmount / 1_000).toFixed(1)}K`
                            : tx.tokenAmount.toFixed(0)
                    } tokens
                </span>
            </div>

            {/* Price + Solscan Link */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-xs text-white/30">
                    @ ${tx.priceUsd.toFixed(8)}
                </span>
                <a
                    href={`https://solscan.io/tx/${tx.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#c4f70e]/60 hover:text-[#c4f70e] transition-colors"
                >
                    <span className="font-mono">{truncateSig(tx.signature)}</span>
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </motion.div>
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

    // Fetch transactions when drawer opens
    const fetchTransactions = useCallback(async () => {
        if (!tokenMint && !positionId) {
            setError("No position data available");
            return;
        }

        // Use mock data directly for now (API endpoint not implemented yet)
        // When the backend endpoint is ready, uncomment the fetch logic below
        setIsLoading(true);

        // Simulate network delay for demo
        await new Promise(resolve => setTimeout(resolve, 800));

        setTransactions([
            {
                signature: "5Kx9nJpTmY2wB4zXcV8mF7aQ3rD1eS6hN0uL",
                type: "entry",
                timestamp: Date.now() - 3600000 * 2,
                solAmount: 0.5,
                tokenAmount: 125000,
                priceUsd: 0.00000412,
                status: "confirmed",
            },
            {
                signature: "7Yz3kLpWmX8vB2cN4aS6mQ9rT1eD5hU0jF",
                type: "tp1",
                timestamp: Date.now() - 3600000,
                solAmount: 0.325,
                tokenAmount: 62500,
                priceUsd: 0.00000536,
                status: "confirmed",
            },
        ]);
        setError(null);
        setIsLoading(false);

        /* TODO: Enable when backend endpoint is ready
        try {
            setIsLoading(true);
            setError(null);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const params = new URLSearchParams();
            if (positionId) params.set("position_id", positionId);
            if (tokenMint) params.set("mint", tokenMint);

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

            const data: Transaction[] = result?.data || [];
            data.sort((a, b) => b.timestamp - a.timestamp);
            setTransactions(data);
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
            setError(err instanceof Error ? err.message : "Failed to load transactions");
        } finally {
            setIsLoading(false);
        }
        */
    }, [tokenMint, positionId]);

    useEffect(() => {
        if (isOpen) {
            fetchTransactions();
        }
    }, [isOpen, fetchTransactions]);

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
    const totalInvested = transactions
        .filter(tx => tx.type === "entry")
        .reduce((sum, tx) => sum + tx.solAmount, 0);

    const totalReturned = transactions
        .filter(tx => tx.type !== "entry")
        .reduce((sum, tx) => sum + tx.solAmount, 0);

    const netPnl = totalReturned - totalInvested;

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer Panel */}
            <div className={`transaction-drawer ${isOpen ? "" : "collapsed"}`}>
                <aside className="transaction-drawer-panel">
                    {/* Header */}
                    <div className="transaction-drawer-header">
                        <div className="flex items-center gap-3">
                            {tokenImage ? (
                                <Image
                                    src={tokenImage}
                                    alt={tokenSymbol}
                                    width={32}
                                    height={32}
                                    className="rounded-lg"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c4f70e] to-[#22d3ee] flex items-center justify-center text-xs font-bold text-black">
                                    {tokenSymbol.slice(0, 2)}
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-bold text-white">${tokenSymbol}</h3>
                                <p className="text-xs text-white/40">Transaction History</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Summary Stats */}
                    {transactions.length > 0 && (
                        <div className="transaction-drawer-summary">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-center">
                                    <div className="text-xs text-white/40 mb-1">Invested</div>
                                    <div className="flex items-center gap-1 text-sm font-bold text-white">
                                        <span>{totalInvested.toFixed(3)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={14} height={14} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-white/40 mb-1">Returned</div>
                                    <div className="flex items-center gap-1 text-sm font-bold text-green-400">
                                        <span>{totalReturned.toFixed(3)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={14} height={14} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-white/40 mb-1">Net PnL</div>
                                    <div className={`flex items-center gap-1 text-sm font-bold ${netPnl >= 0 ? "text-[#c4f70e]" : "text-red-400"}`}>
                                        <span>{netPnl >= 0 ? "+" : ""}{netPnl.toFixed(3)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={14} height={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="transaction-drawer-content">
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#c4f70e] animate-spin mb-3" />
                                <span className="text-sm text-white/50">Loading transactions...</span>
                            </div>
                        )}

                        {error && !isLoading && transactions.length === 0 && (
                            <div className="text-center py-8">
                                <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
                                <div className="text-white/40 text-sm mb-2">{error}</div>
                                <button
                                    onClick={fetchTransactions}
                                    className="text-xs text-[#c4f70e]/60 hover:text-[#c4f70e] underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && transactions.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center py-16 text-white/40">
                                <Clock className="w-12 h-12 mb-4 opacity-50" />
                                <span className="text-sm font-medium">No transactions yet</span>
                                <span className="text-xs text-white/30 mt-1">
                                    Transactions will appear here
                                </span>
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
                        <div className="transaction-drawer-footer">
                            <a
                                href={`https://solscan.io/token/${tokenMint}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-[#c4f70e] hover:border-[#c4f70e]/30 transition-all"
                            >
                                <span className="text-sm font-medium">View Token on Solscan</span>
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    )}
                </aside>
            </div>
        </>
    );
}

export default TransactionDrawer;
