"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle2, XCircle, AlertCircle, Brain, TrendingUp, Shield, Users, DollarSign, Activity, Zap } from "lucide-react";
import type { BuyCriteriaResult, CriteriaCheck } from "../types";

interface AiReasoningDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    tokenSymbol: string;
    tokenName: string;
    buyCriteria: BuyCriteriaResult | null;
}

// Get icon for criteria type
function getCriteriaIcon(name: string) {
    switch (name.toLowerCase()) {
        case "confidence":
        case "signal_strength":
            return Brain;
        case "market_cap":
            return DollarSign;
        case "liquidity":
            return Activity;
        case "volume":
        case "volume_24h":
            return TrendingUp;
        case "holder_count":
        case "holder_concentration":
            return Users;
        case "dev_risk":
        case "security":
            return Shield;
        case "bundle":
            return AlertCircle;
        case "trend":
        case "momentum":
            return Zap;
        default:
            return CheckCircle2;
    }
}

// Format value based on criteria type
function formatValue(name: string, value: number): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("market_cap") || lowerName.includes("liquidity") || lowerName.includes("volume")) {
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
        if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
        return `$${value.toFixed(0)}`;
    }
    if (lowerName.includes("holder_count")) {
        return value.toLocaleString();
    }
    if (lowerName.includes("pct") || lowerName.includes("score") || lowerName.includes("confidence") || lowerName.includes("risk")) {
        return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
}

// Individual criteria row component
function CriteriaRow({ check }: { check: CriteriaCheck }) {
    const Icon = getCriteriaIcon(check.name);
    const statusColor = check.skipped
        ? "text-zinc-500"
        : check.passed
            ? "text-emerald-400"
            : "text-red-400";
    const StatusIcon = check.skipped
        ? AlertCircle
        : check.passed
            ? CheckCircle2
            : XCircle;

    // Format the name for display
    const displayName = check.name
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    return (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md ${check.passed ? "bg-emerald-500/20" : check.skipped ? "bg-zinc-600/20" : "bg-red-500/20"}`}>
                    <Icon className={`w-4 h-4 ${statusColor}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-zinc-200">{displayName}</p>
                    {check.reason && (
                        <p className="text-xs text-zinc-500 mt-0.5">{check.reason}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-sm font-mono text-zinc-300">{formatValue(check.name, check.value)}</p>
                    {!check.skipped && (
                        <p className="text-xs text-zinc-500">req: {formatValue(check.name, check.threshold)}</p>
                    )}
                </div>
                <StatusIcon className={`w-5 h-5 ${statusColor}`} />
            </div>
        </div>
    );
}

export function AiReasoningDrawer({
    isOpen,
    onClose,
    tokenSymbol,
    tokenName,
    buyCriteria,
}: AiReasoningDrawerProps) {
    if (!buyCriteria) {
        return null;
    }

    const checks: CriteriaCheck[] = [
        buyCriteria.confidence_check,
        buyCriteria.market_cap_check,
        buyCriteria.liquidity_check,
        buyCriteria.volume_check,
        buyCriteria.holder_count_check,
        buyCriteria.holder_check,
        buyCriteria.dev_risk_check,
        buyCriteria.security_check,
        buyCriteria.bundle_check,
        buyCriteria.trend_check,
        buyCriteria.dynamic_confidence_check,
        buyCriteria.momentum_check,
    ].filter(Boolean);

    const passedCount = checks.filter(c => c.passed && !c.skipped).length;
    const failedCount = checks.filter(c => !c.passed && !c.skipped).length;
    const skippedCount = checks.filter(c => c.skipped).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#c4f70e]/20">
                                    <Brain className="w-5 h-5 text-[#c4f70e]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">AI Reasoning</h2>
                                    <p className="text-sm text-zinc-400">{tokenSymbol} - {tokenName}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-2xl font-bold text-emerald-400">{passedCount}</p>
                                    <p className="text-xs text-emerald-400/70">Passed</p>
                                </div>
                                <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-2xl font-bold text-red-400">{failedCount}</p>
                                    <p className="text-xs text-red-400/70">Failed</p>
                                </div>
                                <div className="flex-1 p-3 rounded-lg bg-zinc-700/30 border border-zinc-700">
                                    <p className="text-2xl font-bold text-zinc-400">{skippedCount}</p>
                                    <p className="text-xs text-zinc-500">Skipped</p>
                                </div>
                            </div>

                            {/* Overall verdict */}
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${buyCriteria.passed
                                ? "bg-emerald-500/10 border border-emerald-500/20"
                                : "bg-red-500/10 border border-red-500/20"
                                }`}>
                                {buyCriteria.passed ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-400" />
                                )}
                                <div>
                                    <p className={`font-medium ${buyCriteria.passed ? "text-emerald-400" : "text-red-400"}`}>
                                        {buyCriteria.passed ? "Signal Approved" : "Signal Rejected"}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {buyCriteria.passed
                                            ? "All critical criteria passed"
                                            : `Failed: ${buyCriteria.rejection_reasons?.join(", ") || "Multiple criteria"}`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Criteria List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Evaluation Criteria</h3>
                            <div className="space-y-2">
                                {checks.map((check, index) => (
                                    <CriteriaRow key={`${check.name}-${index}`} check={check} />
                                ))}
                            </div>

                            {/* Dynamic Confidence Breakdown */}
                            {buyCriteria.dynamic_confidence && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Dynamic Confidence Breakdown</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg bg-zinc-800/50">
                                            <p className="text-xs text-zinc-500">Volume</p>
                                            <p className="text-sm font-mono text-zinc-300">
                                                {(buyCriteria.dynamic_confidence.volume_score * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-800/50">
                                            <p className="text-xs text-zinc-500">Holders</p>
                                            <p className="text-sm font-mono text-zinc-300">
                                                {(buyCriteria.dynamic_confidence.holder_score * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-800/50">
                                            <p className="text-xs text-zinc-500">Price</p>
                                            <p className="text-sm font-mono text-zinc-300">
                                                {(buyCriteria.dynamic_confidence.price_score * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-800/50">
                                            <p className="text-xs text-zinc-500">Momentum</p>
                                            <p className="text-sm font-mono text-zinc-300">
                                                {(buyCriteria.dynamic_confidence.momentum_score * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Momentum Analysis */}
                            {buyCriteria.momentum_analysis && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-zinc-400 mb-3">5-Min Momentum</h3>
                                    <div className="p-3 rounded-lg bg-zinc-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-zinc-400">Trend</span>
                                            <span className={`text-sm font-medium ${buyCriteria.momentum_analysis.trend === "bullish"
                                                ? "text-emerald-400"
                                                : buyCriteria.momentum_analysis.trend === "bearish"
                                                    ? "text-red-400"
                                                    : "text-zinc-400"
                                                }`}>
                                                {buyCriteria.momentum_analysis.trend.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <p className="text-zinc-500">Price</p>
                                                <p className={buyCriteria.momentum_analysis.price_change_5m >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                    {buyCriteria.momentum_analysis.price_change_5m >= 0 ? "+" : ""}
                                                    {(buyCriteria.momentum_analysis.price_change_5m * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">Volume</p>
                                                <p className={buyCriteria.momentum_analysis.volume_change_5m >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                    {buyCriteria.momentum_analysis.volume_change_5m >= 0 ? "+" : ""}
                                                    {(buyCriteria.momentum_analysis.volume_change_5m * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">Holders</p>
                                                <p className={buyCriteria.momentum_analysis.holder_change_5m >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                    {buyCriteria.momentum_analysis.holder_change_5m >= 0 ? "+" : ""}
                                                    {(buyCriteria.momentum_analysis.holder_change_5m * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bundle Analysis */}
                            {buyCriteria.bundle_analysis && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Bundle/Bot Analysis</h3>
                                    <div className="p-3 rounded-lg bg-zinc-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-zinc-400">Bundled</span>
                                            <span className={`text-sm font-medium ${buyCriteria.bundle_analysis.is_bundled ? "text-red-400" : "text-emerald-400"}`}>
                                                {buyCriteria.bundle_analysis.is_bundled ? "Yes" : "No"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-zinc-500">Bundle %</p>
                                                <p className="text-zinc-300">{(buyCriteria.bundle_analysis.bundle_percentage * 100).toFixed(1)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">Unique Wallets</p>
                                                <p className="text-zinc-300">{buyCriteria.bundle_analysis.unique_wallets}</p>
                                            </div>
                                        </div>
                                        {buyCriteria.bundle_analysis.suspicious_patterns.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-zinc-700">
                                                <p className="text-xs text-red-400">
                                                    Suspicious: {buyCriteria.bundle_analysis.suspicious_patterns.join(", ")}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
