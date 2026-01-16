"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import {
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from "lucide-react";
import { usePositions } from "../context";
import type { Position } from "../types";

// ============================================
// Recent Trades Panel
// Shows the most recent closed positions as "trades"
// ============================================

interface RecentTradesProps {
    maxTrades?: number;
}

export function RecentTradesPanel({ maxTrades = 10 }: RecentTradesProps) {
    const t = useTranslations("dashboard");
    const { history, isLoading } = usePositions();
    const [isExpanded, setIsExpanded] = useState(true);

    // Use history (closed positions) directly, sorted by most recent first
    const closedTrades = [...history]
        .sort((a, b) => {
            const dateA = new Date(a.closedAt || a.updatedAt).getTime();
            const dateB = new Date(b.closedAt || b.updatedAt).getTime();
            return dateB - dateA; // Most recent first
        })
        .slice(0, maxTrades);

    return (
        <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#c4f70e]" />
                    <span className="text-sm font-medium text-white">{t("recentTrades")}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold tabular-nums rounded bg-[#c4f70e]/20 text-[#c4f70e]">
                        {closedTrades.length}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                )}
            </button>

            {/* Trade list */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-[300px] overflow-y-auto p-3 space-y-2">
                            <AnimatePresence mode="popLayout">
                                {closedTrades.length > 0 ? (
                                    closedTrades.map((trade) => (
                                        <TradeCard key={trade.id} trade={trade} t={t} />
                                    ))
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-8 text-white/40"
                                    >
                                        <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs">{t("noRecentTrades")}</span>
                                        <span className="text-[10px] text-white/30 mt-1">
                                            {t("tradesAppearHere")}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// Trade Card - Individual trade item
// ============================================

interface TradeCardProps {
    trade: Position;
    t: (key: string) => string;
}

function TradeCard({ trade, t }: TradeCardProps) {
    const pnlPercent = trade.entryPriceSol
        ? ((trade.currentPrice || trade.entryPriceSol) / trade.entryPriceSol - 1) * 100
        : 0;

    const isProfit = (trade.realizedPnlSol ?? 0) >= 0;
    const exitReason = trade.status === "STOPPED_OUT" ? "Stop Loss" : "Take Profit";

    const timeHeld = getHoldTime(trade.createdAt, trade.closedAt || trade.updatedAt);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
            {/* Top row: Symbol + P&L */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {isProfit ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    {/* Token image */}
                    <TokenImage tokenMint={trade.tokenMint} tokenSymbol={trade.tokenSymbol} />
                    <span className="font-mono font-medium text-white text-sm">
                        {trade.tokenSymbol || shortenAddress(trade.tokenMint)}
                    </span>
                    <a
                        href={`https://solscan.io/token/${trade.tokenMint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <ExternalLink className="w-3 h-3 text-white/40" />
                    </a>
                </div>
                <div className="text-right">
                    <div className={`flex items-center justify-end gap-1 font-mono font-bold tabular-nums text-sm ${isProfit ? "text-green-400" : "text-red-400"}`}>
                        {formatPnLValue(trade.realizedPnlSol ?? 0)}
                        <Image src="/logos/solana.png" alt="SOL" width={14} height={14} />
                    </div>
                    <div className={`text-xs font-mono tabular-nums min-w-[5ch] ${isProfit ? "text-green-400/60" : "text-red-400/60"}`}>
                        {formatPercent(pnlPercent)}
                    </div>
                </div>
            </div>

            {/* Bottom row: Details */}
            <div className="flex items-center justify-between text-[10px] text-white/50">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                        {t("entry")}: {formatSolValue(trade.entryAmountSol)}
                        <Image src="/logos/solana.png" alt="SOL" width={10} height={10} />
                    </span>
                    <span>•</span>
                    <span className="text-white/35">{exitReason}</span>
                </div>
                <span className="font-mono tabular-nums">{timeHeld}</span>
            </div>
        </motion.div>
    );
}

// ============================================
// Helper Functions
// ============================================

function formatSolValue(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return "—";
    return amount.toFixed(2);
}

function formatPnLValue(pnl: number): string {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}${pnl.toFixed(2)}`;
}

function formatPercent(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

function shortenAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getHoldTime(createdAt: string, closedAt: string): string {
    const start = new Date(createdAt).getTime();
    const end = new Date(closedAt).getTime();
    const diffMs = end - start;

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
}

// ============================================
// Token Image Component with fallback
// ============================================

interface TokenImageProps {
    tokenMint: string;
    tokenSymbol?: string | null;
    size?: number;
}

function TokenImage({ tokenMint, tokenSymbol, size = 20 }: TokenImageProps) {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return (
            <div
                className="rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60"
                style={{ width: size, height: size }}
            >
                {(tokenSymbol || tokenMint.slice(0, 2)).slice(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <Image
            src={`https://img.fotofolio.xyz/?url=https://dd.dexscreener.com/ds-data/tokens/solana/${tokenMint}.png`}
            alt={tokenSymbol || "Token"}
            width={size}
            height={size}
            className="rounded-full"
            onError={() => setImgError(true)}
        />
    );
}
