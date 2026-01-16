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

// Brand-consistent color palette
// Primary: #c4f70e (lime) - for profits/success
// Accent: #22d3ee (cyan) - for entries/neutral actions
// Danger: #ef4444 (red) - only for losses
const TX_TYPE_CONFIG: Record<Transaction["type"], { label: string; icon: typeof ArrowDownRight; color: string; bgColor: string; borderColor: string }> = {
    entry: { label: "Entry", icon: ArrowDownRight, color: "text-[#22d3ee]", bgColor: "bg-[#22d3ee]/10", borderColor: "border-[#22d3ee]/20" },
    tp1: { label: "TP1", icon: ArrowUpRight, color: "text-[#c4f70e]", bgColor: "bg-[#c4f70e]/10", borderColor: "border-[#c4f70e]/20" },
    tp2: { label: "TP2", icon: ArrowUpRight, color: "text-[#c4f70e]", bgColor: "bg-[#c4f70e]/10", borderColor: "border-[#c4f70e]/20" },
    tp3: { label: "TP3", icon: ArrowUpRight, color: "text-[#c4f70e]", bgColor: "bg-[#c4f70e]/15", borderColor: "border-[#c4f70e]/30" },
    stop_loss: { label: "Stop Loss", icon: ArrowUpRight, color: "text-[#ef4444]", bgColor: "bg-[#ef4444]/10", borderColor: "border-[#ef4444]/20" },
    manual_sell: { label: "Sell", icon: ArrowUpRight, color: "text-[#c4f70e]/80", bgColor: "bg-[#c4f70e]/8", borderColor: "border-[#c4f70e]/15" },
    unknown: { label: "Transaction", icon: ArrowDownRight, color: "text-white/50", bgColor: "bg-white/5", borderColor: "border-white/10" },
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
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`group relative p-3.5 rounded-xl border transition-all duration-200 ${config.bgColor} ${config.borderColor} hover:bg-white/[0.08]`}
        >
            {/* Type Badge + Time */}
            <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border ${config.borderColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${config.color}`}>{config.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                    {tx.status === "pending" && <Loader2 className="w-3 h-3 animate-spin text-[#c4f70e]" />}
                    {tx.status === "confirmed" && <CheckCircle2 className="w-3 h-3 text-[#c4f70e]" />}
                    {tx.status === "failed" && <AlertCircle className="w-3 h-3 text-[#ef4444]" />}
                    <Clock className="w-3 h-3 opacity-60" />
                    <span>{formatTime(tx.timestamp)}</span>
                </div>
            </div>

            {/* Amount Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold font-mono tracking-tight ${isSell ? "text-[#c4f70e]" : "text-white"}`}>
                        {isSell ? "+" : "-"}{tx.solAmount.toFixed(4)}
                    </span>
                    <Image src={SOLANA_ICON} alt="SOL" width={18} height={18} className="opacity-90" />
                </div>
                <div className="text-right">
                    <span className="text-xs text-white/50 font-mono">
                        {tx.tokenAmount >= 1_000_000
                            ? `${(tx.tokenAmount / 1_000_000).toFixed(2)}M`
                            : tx.tokenAmount >= 1_000
                                ? `${(tx.tokenAmount / 1_000).toFixed(1)}K`
                                : tx.tokenAmount.toFixed(0)
                        }
                    </span>
                    <span className="text-[10px] text-white/30 ml-1">tokens</span>
                </div>
            </div>

            {/* Price + Solscan Link */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                <span className="text-[11px] text-white/40 font-mono">
                    @ ${tx.priceUsd < 0.00001 ? tx.priceUsd.toExponential(2) : tx.priceUsd.toFixed(8)}
                </span>
                <a
                    href={`https://solscan.io/tx/${tx.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-[#c4f70e] transition-colors group/link"
                >
                    <span className="font-mono">{truncateSig(tx.signature)}</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100" />
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

        // Fetch real transactions from backend
        try {
            setIsLoading(true);
            setError(null);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const params = new URLSearchParams();
            if (positionId) params.set("position_id", positionId);
            if (tokenMint) params.set("mint", tokenMint);
            params.set("limit", "50"); // Fetch last 50 transactions

            const url = buildDevprntApiUrl(`/api/trading/transactions?${params.toString()}`);
            console.log(`[TransactionDrawer] Fetching transactions from ${url.toString()}`);

            const response = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch transactions (${response.status})`);
            }

            const result = await response.json();
            if (result?.success === false) {
                throw new Error(result.error || "Failed to load transactions");
            }

            // Map backend transaction format to frontend format
            const rawTransactions = result?.data || [];
            const mappedTransactions: Transaction[] = rawTransactions.map((tx: any) => {
                // Determine transaction type based on tx_type from backend
                let type: Transaction["type"] = "unknown";
                if (tx.tx_type === "buy") {
                    type = "entry";
                } else if (tx.tx_type === "sell") {
                    // For sells, check if it's a take profit or stop loss
                    // This is a simplification - you may want more sophisticated logic
                    type = "tp1"; // Default to tp1 for now
                }

                return {
                    signature: tx.signature,
                    type,
                    timestamp: new Date(tx.timestamp).getTime(),
                    solAmount: tx.sol_amount || tx.sol_received || 0,
                    tokenAmount: tx.tokens_received || tx.tokens_sold || 0,
                    priceUsd: tx.price || 0,
                    status: "confirmed", // All fetched transactions are confirmed
                };
            });

            mappedTransactions.sort((a, b) => b.timestamp - a.timestamp);
            console.log(`[TransactionDrawer] Loaded ${mappedTransactions.length} real transactions for ${tokenSymbol}`);
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

    // Calculate totals with proper realized PnL
    const entryTxs = transactions.filter(tx => tx.type === "entry");
    const sellTxs = transactions.filter(tx => tx.type !== "entry");

    const totalInvested = entryTxs.reduce((sum, tx) => sum + tx.solAmount, 0);
    const totalReturned = sellTxs.reduce((sum, tx) => sum + tx.solAmount, 0);

    // Calculate tokens bought and sold to determine percentage sold
    const totalTokensBought = entryTxs.reduce((sum, tx) => sum + tx.tokenAmount, 0);
    const totalTokensSold = sellTxs.reduce((sum, tx) => sum + tx.tokenAmount, 0);

    // Calculate REALIZED PnL: compare returns to proportional cost basis of sold tokens
    // If you bought 100 tokens for 1 SOL and sold 50 tokens for 0.8 SOL:
    // Cost basis of sold = 1 SOL * (50/100) = 0.5 SOL
    // Realized PnL = 0.8 - 0.5 = +0.3 SOL profit
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
                                <div className="relative">
                                    <Image
                                        src={tokenImage}
                                        alt={tokenSymbol}
                                        width={36}
                                        height={36}
                                        className="rounded-xl ring-1 ring-white/10"
                                        unoptimized
                                    />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#c4f70e] border-2 border-[#0a0a0f]" />
                                </div>
                            ) : (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c4f70e]/20 to-[#22d3ee]/20 border border-[#c4f70e]/20 flex items-center justify-center text-xs font-bold text-[#c4f70e]">
                                    {tokenSymbol.slice(0, 2)}
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                    ${tokenSymbol}
                                    <span className="text-[10px] font-normal text-white/30 uppercase tracking-wider">History</span>
                                </h3>
                                <p className="text-[11px] text-white/40">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
                            aria-label="Close drawer"
                        >
                            <X className="w-4 h-4 text-white/50" />
                        </button>
                    </div>

                    {/* Summary Stats */}
                    {transactions.length > 0 && (
                        <div className="transaction-drawer-summary">
                            <div className="grid grid-cols-3 gap-2">
                                {/* Cost Basis */}
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Cost Basis</div>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-base font-bold text-white font-mono">{costBasisOfSold.toFixed(3)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={14} height={14} className="opacity-70" />
                                    </div>
                                    <div className="text-[10px] text-white/30 mt-1">
                                        {(percentageSold * 100).toFixed(0)}% sold
                                    </div>
                                </div>

                                {/* Returned */}
                                <div className="p-3 rounded-xl bg-[#c4f70e]/[0.03] border border-[#c4f70e]/10 text-center">
                                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Returned</div>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-base font-bold text-[#c4f70e] font-mono">{totalReturned.toFixed(3)}</span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={14} height={14} className="opacity-70" />
                                    </div>
                                </div>

                                {/* Realized PnL */}
                                <div className={`p-3 rounded-xl text-center ${netPnl >= 0 ? "bg-[#c4f70e]/[0.05] border border-[#c4f70e]/20" : "bg-[#ef4444]/[0.05] border border-[#ef4444]/20"}`}>
                                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Realized PnL</div>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className={`text-base font-bold font-mono ${netPnl >= 0 ? "text-[#c4f70e]" : "text-[#ef4444]"}`}>
                                            {netPnl >= 0 ? "+" : ""}{netPnl.toFixed(3)}
                                        </span>
                                        <Image src={SOLANA_ICON} alt="SOL" width={14} height={14} className="opacity-70" />
                                    </div>
                                    {netPnl !== 0 && costBasisOfSold > 0 && (
                                        <div className={`text-[10px] mt-1 ${netPnl >= 0 ? "text-[#c4f70e]/60" : "text-[#ef4444]/60"}`}>
                                            {netPnl >= 0 ? "+" : ""}{((netPnl / costBasisOfSold) * 100).toFixed(1)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="transaction-drawer-content">
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full border-2 border-[#c4f70e]/20" />
                                    <Loader2 className="w-12 h-12 text-[#c4f70e] animate-spin absolute inset-0" />
                                </div>
                                <span className="text-sm text-white/40 mt-4">Loading transactions...</span>
                            </div>
                        )}

                        {error && !isLoading && transactions.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-14 h-14 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mb-4">
                                    <AlertCircle className="w-7 h-7 text-[#ef4444]/60" />
                                </div>
                                <div className="text-white/50 text-sm mb-3">{error}</div>
                                <button
                                    onClick={fetchTransactions}
                                    className="px-4 py-2 text-xs font-medium text-[#c4f70e] bg-[#c4f70e]/10 hover:bg-[#c4f70e]/20 border border-[#c4f70e]/20 rounded-lg transition-all"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && transactions.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-16 h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                                    <Clock className="w-8 h-8 text-white/20" />
                                </div>
                                <span className="text-sm font-medium text-white/50">No transactions yet</span>
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
                                className="group flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#c4f70e]/5 border border-[#c4f70e]/10 text-[#c4f70e]/70 hover:text-[#c4f70e] hover:bg-[#c4f70e]/10 hover:border-[#c4f70e]/20 transition-all"
                            >
                                <span className="text-sm font-medium">View on Solscan</span>
                                <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>
                    )}
                </aside>
            </div>
        </>
    );
}

export default TransactionDrawer;
