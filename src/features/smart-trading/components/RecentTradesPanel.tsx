"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import {
    Trophy,
    Skull,
    ChevronDown,
    ChevronUp,
    Clock,
    Target,
    XCircle,
} from "lucide-react";
import { usePositions } from "../context";
import type { Position } from "../types";

// ============================================
// Recent Trades Panel
// Shows completed trading rounds (positions that were opened then closed)
// Different from History which shows raw blockchain transactions
// ============================================

interface RecentTradesProps {
    maxTrades?: number;
}

export function RecentTradesPanel({ maxTrades = 10 }: RecentTradesProps) {
    const t = useTranslations("dashboard");
    const { history } = usePositions();
    const [isExpanded, setIsExpanded] = useState(true);

    // Use history (closed positions) directly, sorted by most recent first
    const closedTrades = [...history]
        .sort((a, b) => {
            const dateA = new Date(a.closedAt || a.updatedAt).getTime();
            const dateB = new Date(b.closedAt || b.updatedAt).getTime();
            return dateB - dateA;
        })
        .slice(0, maxTrades);

    // Calculate summary stats
    const wins = closedTrades.filter(t => (t.realizedPnlSol ?? 0) >= 0).length;
    const losses = closedTrades.length - wins;
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.realizedPnlSol ?? 0), 0);

    return (
        <div className="h-full max-h-[350px] lg:max-h-none flex flex-col overflow-hidden">
            {/* Header - Matching other panels */}
            <div className="flex items-center justify-between px-1 py-3 mb-3 flex-shrink-0">
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                    <Trophy className="w-6 h-6 text-[#c4f70e]" />
                    <span className="text-lg font-semibold text-white">{t("recentTrades")}</span>
                    <span className="px-2 py-0.5 text-[11px] font-bold tabular-nums rounded-full bg-[#c4f70e]/20 text-[#c4f70e]">
                        {closedTrades.length}
                    </span>
                    {/* Win/Loss badges */}
                    {closedTrades.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-1">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold tabular-nums rounded bg-green-500/20 text-green-400">
                                {wins}W
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold tabular-nums rounded bg-red-500/20 text-red-400">
                                {losses}L
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Total P&L */}
                    {closedTrades.length > 0 && (
                        <span className={`text-sm font-bold font-mono tabular-nums ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} SOL
                        </span>
                    )}
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

            {/* Trade list */}
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
                            <AnimatePresence mode="popLayout">
                                {closedTrades.length > 0 ? (
                                    closedTrades.map((trade, index) => (
                                        <CompactTradeRow key={trade.id} trade={trade} index={index} />
                                    ))
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-8 text-white/40"
                                    >
                                        <Trophy className="w-8 h-8 mb-2 opacity-30" />
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
// Compact Trade Row - Horizontal layout
// ============================================

interface CompactTradeRowProps {
    trade: Position;
    index: number;
}

function CompactTradeRow({ trade, index }: CompactTradeRowProps) {
    const pnl = trade.realizedPnlSol ?? 0;
    const isProfit = pnl >= 0;
    const pnlPercent = trade.entryAmountSol > 0
        ? (pnl / trade.entryAmountSol) * 100
        : 0;

    const exitReason = trade.status === "STOPPED_OUT" ? "stop" : "tp";
    const timeHeld = getHoldTime(trade.createdAt, trade.closedAt || trade.updatedAt);
    const timeAgo = getTimeAgo(trade.closedAt || trade.updatedAt);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: index * 0.03 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/30 hover:bg-white/5 transition-colors ${
                isProfit ? "hover:bg-green-500/5" : "hover:bg-red-500/5"
            }`}
        >
            {/* Result Icon */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                isProfit ? "bg-green-500/20" : "bg-red-500/20"
            }`}>
                {isProfit ? (
                    <Trophy className="w-3.5 h-3.5 text-green-400" />
                ) : (
                    <Skull className="w-3.5 h-3.5 text-red-400" />
                )}
            </div>

            {/* Token Info */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <TokenImage tokenMint={trade.tokenMint} tokenSymbol={trade.tokenSymbol} size={24} />
                <div className="min-w-0">
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
                                <XCircle className="w-3 h-3" />
                                SL
                            </span>
                        )}
                    </div>
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
            <div className="flex-shrink-0 text-[10px] text-white/30 font-mono tabular-nums w-12 text-right">
                {timeAgo}
            </div>
        </motion.div>
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

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
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

// ============================================
// Token Image Component with fallback
// ============================================

interface TokenImageProps {
    tokenMint: string;
    tokenSymbol?: string | null;
    size?: number;
}

function TokenImage({ tokenMint, tokenSymbol, size = 24 }: TokenImageProps) {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return (
            <div
                className="rounded-lg bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60 flex-shrink-0"
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
