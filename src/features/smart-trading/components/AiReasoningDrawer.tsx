"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    X,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Brain,
    TrendingUp,
    Shield,
    Users,
    DollarSign,
    Activity,
    Zap,
    ChevronDown,
    Sparkles,
} from "lucide-react";
import DecryptedText from "@/components/DecryptedText";
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
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
        return `$${value.toFixed(0)}`;
    }
    if (lowerName.includes("holder_count")) {
        return value.toLocaleString();
    }
    if (lowerName.includes("pct") || lowerName.includes("score") || lowerName.includes("confidence") || lowerName.includes("risk")) {
        return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(1);
}

// Format the name for display
function formatName(name: string): string {
    return name
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Animated counter component
function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        const startTime = Date.now();
        const durationMs = duration * 1000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            setDisplayValue(Math.round(start + (end - start) * eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span>{displayValue}</span>;
}

// Circular progress indicator
function CircularProgress({
    passed,
    failed,
    total,
}: {
    passed: number;
    failed: number;
    total: number;
}) {
    const percentage = total > 0 ? (passed / total) * 100 : 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                />
                {/* Progress circle */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke={percentage >= 70 ? "#c4f70e" : percentage >= 40 ? "#fbbf24" : "#ef4444"}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                    style={{
                        strokeDasharray: circumference,
                    }}
                />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">
                    <AnimatedCounter value={passed} duration={1} />
                </span>
                <span className="text-[10px] text-white/50 uppercase tracking-wider">of {total}</span>
            </div>
        </div>
    );
}

// Individual criteria row with animation
function CriteriaRow({ check, index }: { check: CriteriaCheck; index: number }) {
    const Icon = getCriteriaIcon(check.name);
    const isPassed = check.passed && !check.skipped;
    const isFailed = !check.passed && !check.skipped;
    const isSkipped = check.skipped;

    const statusColor = isSkipped ? "text-zinc-500" : isPassed ? "text-emerald-400" : "text-red-400";
    const bgColor = isSkipped
        ? "bg-zinc-800/30"
        : isPassed
        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
        : "bg-red-500/5 hover:bg-red-500/10";
    const borderColor = isSkipped
        ? "border-transparent"
        : isPassed
        ? "border-emerald-500/20"
        : "border-red-500/20";

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05, duration: 0.3, ease: "easeOut" }}
            className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${bgColor} border ${borderColor} transition-all duration-200`}
        >
            <div className="flex items-center gap-2.5">
                {/* Status indicator pulse */}
                <div className="relative">
                    <motion.div
                        className={`p-1.5 rounded-lg ${isPassed ? "bg-emerald-500/20" : isFailed ? "bg-red-500/20" : "bg-zinc-700/30"}`}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.05, type: "spring", stiffness: 400 }}
                    >
                        <Icon className={`w-3.5 h-3.5 ${statusColor}`} />
                    </motion.div>
                    {isPassed && (
                        <motion.div
                            className="absolute inset-0 rounded-lg bg-emerald-400/30"
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ delay: 0.3 + index * 0.05, duration: 0.6 }}
                        />
                    )}
                </div>
                <span className="text-sm font-medium text-zinc-200">{formatName(check.name)}</span>
            </div>
            <div className="flex items-center gap-2">
                {/* Value display */}
                <div className="text-right">
                    <span className="text-sm font-mono text-zinc-300">{formatValue(check.name, check.value)}</span>
                    {!isSkipped && (
                        <span className="text-[10px] text-zinc-500 ml-1">/ {formatValue(check.name, check.threshold)}</span>
                    )}
                </div>
                {/* Status icon with animation */}
                <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + index * 0.05, type: "spring", stiffness: 300 }}
                >
                    {isSkipped ? (
                        <AlertCircle className="w-4 h-4 text-zinc-500" />
                    ) : isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}

// Expandable section component
function ExpandableSection({
    title,
    children,
    defaultOpen = false,
    delay = 0,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    delay?: number;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="rounded-xl border border-zinc-800/50 overflow-hidden"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
            >
                <span className="text-sm font-medium text-zinc-300">{title}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-zinc-900/50">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Score bar component
function ScoreBar({ label, score, delay = 0 }: { label: string; score: number; delay?: number }) {
    const percentage = score * 100;
    const color = percentage >= 70 ? "bg-emerald-400" : percentage >= 40 ? "bg-yellow-400" : "bg-red-400";

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="flex items-center gap-2"
        >
            <span className="text-xs text-zinc-500 w-16">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
                />
            </div>
            <span className="text-xs font-mono text-zinc-400 w-8 text-right">{percentage.toFixed(0)}%</span>
        </motion.div>
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

    const passedCount = checks.filter((c) => c.passed && !c.skipped).length;
    const failedCount = checks.filter((c) => !c.passed && !c.skipped).length;
    const skippedCount = checks.filter((c) => c.skipped).length;
    const totalActive = passedCount + failedCount;

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
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800/50 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header with animated gradient */}
                        <div className="relative overflow-hidden">
                            {/* Animated background glow */}
                            <motion.div
                                className={`absolute inset-0 ${buyCriteria.passed ? "bg-gradient-to-r from-emerald-500/10 via-[#c4f70e]/10 to-transparent" : "bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent"}`}
                                initial={{ opacity: 0, x: -100 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                            />

                            <div className="relative flex items-center justify-between p-4 border-b border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    {/* Animated brain icon */}
                                    <motion.div
                                        className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#c4f70e]/20 to-[#c4f70e]/5 border border-[#c4f70e]/20"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                    >
                                        <Brain className="w-5 h-5 text-[#c4f70e]" />
                                        <motion.div
                                            className="absolute inset-0 rounded-xl bg-[#c4f70e]/20"
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </motion.div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <DecryptedText
                                                text="AI Analysis"
                                                speed={30}
                                                maxIterations={6}
                                                animateOn="view"
                                                className="text-white"
                                                encryptedClassName="text-[#c4f70e]/50"
                                            />
                                            <Sparkles className="w-4 h-4 text-[#c4f70e]/60" />
                                        </h2>
                                        <p className="text-sm text-zinc-500">{tokenSymbol}</p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </motion.button>
                            </div>
                        </div>

                        {/* Summary Section - Simplified */}
                        <div className="p-4 border-b border-zinc-800/50">
                            <div className="flex items-center gap-6">
                                {/* Circular Progress */}
                                <CircularProgress passed={passedCount} failed={failedCount} total={totalActive} />

                                {/* Stats */}
                                <div className="flex-1 space-y-2">
                                    <motion.div
                                        className="flex items-center gap-2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm text-zinc-400">Passed</span>
                                        <span className="text-sm font-bold text-emerald-400 ml-auto">{passedCount}</span>
                                    </motion.div>
                                    <motion.div
                                        className="flex items-center gap-2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <XCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-sm text-zinc-400">Failed</span>
                                        <span className="text-sm font-bold text-red-400 ml-auto">{failedCount}</span>
                                    </motion.div>
                                    {skippedCount > 0 && (
                                        <motion.div
                                            className="flex items-center gap-2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            <AlertCircle className="w-4 h-4 text-zinc-500" />
                                            <span className="text-sm text-zinc-500">Skipped</span>
                                            <span className="text-sm font-bold text-zinc-500 ml-auto">{skippedCount}</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Verdict */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${
                                    buyCriteria.passed
                                        ? "bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20"
                                        : "bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20"
                                }`}
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
                                >
                                    {buyCriteria.passed ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-400" />
                                    )}
                                </motion.div>
                                <div>
                                    <p
                                        className={`font-semibold ${buyCriteria.passed ? "text-emerald-400" : "text-red-400"}`}
                                    >
                                        {buyCriteria.passed ? "Signal Approved" : "Signal Rejected"}
                                    </p>
                                    {buyCriteria.rejection_reasons && buyCriteria.rejection_reasons.length > 0 && (
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            {buyCriteria.rejection_reasons.slice(0, 2).join(", ")}
                                            {buyCriteria.rejection_reasons.length > 2 && ` +${buyCriteria.rejection_reasons.length - 2} more`}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Criteria List - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Main Criteria */}
                            <div>
                                <motion.h3
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3"
                                >
                                    Evaluation Criteria
                                </motion.h3>
                                <div className="space-y-2">
                                    {checks.map((check, index) => (
                                        <CriteriaRow key={`${check.name}-${index}`} check={check} index={index} />
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Confidence Breakdown */}
                            {buyCriteria.dynamic_confidence && (
                                <ExpandableSection title="Confidence Breakdown" defaultOpen delay={0.5}>
                                    <div className="space-y-2">
                                        <ScoreBar label="Volume" score={buyCriteria.dynamic_confidence.volume_score} delay={0} />
                                        <ScoreBar label="Holders" score={buyCriteria.dynamic_confidence.holder_score} delay={0.1} />
                                        <ScoreBar label="Price" score={buyCriteria.dynamic_confidence.price_score} delay={0.2} />
                                        <ScoreBar label="Momentum" score={buyCriteria.dynamic_confidence.momentum_score} delay={0.3} />
                                    </div>
                                </ExpandableSection>
                            )}

                            {/* Momentum Analysis */}
                            {buyCriteria.momentum_analysis && (
                                <ExpandableSection title="5-Min Momentum" delay={0.6}>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-400">Trend</span>
                                            <span
                                                className={`text-sm font-semibold px-2 py-0.5 rounded ${
                                                    buyCriteria.momentum_analysis.trend === "bullish"
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : buyCriteria.momentum_analysis.trend === "bearish"
                                                        ? "bg-red-500/20 text-red-400"
                                                        : "bg-zinc-700/50 text-zinc-400"
                                                }`}
                                            >
                                                {buyCriteria.momentum_analysis.trend.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: "Price", value: buyCriteria.momentum_analysis.price_change_5m },
                                                { label: "Volume", value: buyCriteria.momentum_analysis.volume_change_5m },
                                                { label: "Holders", value: buyCriteria.momentum_analysis.holder_change_5m },
                                            ].map((item) => (
                                                <div key={item.label} className="text-center p-2 rounded-lg bg-zinc-800/30">
                                                    <p className="text-[10px] text-zinc-500 uppercase">{item.label}</p>
                                                    <p
                                                        className={`text-sm font-mono ${
                                                            item.value >= 0 ? "text-emerald-400" : "text-red-400"
                                                        }`}
                                                    >
                                                        {item.value >= 0 ? "+" : ""}
                                                        {(item.value * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ExpandableSection>
                            )}

                            {/* Bundle Analysis */}
                            {buyCriteria.bundle_analysis && (
                                <ExpandableSection title="Bundle Analysis" delay={0.7}>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-400">Bundled</span>
                                            <span
                                                className={`text-sm font-semibold ${
                                                    buyCriteria.bundle_analysis.is_bundled ? "text-red-400" : "text-emerald-400"
                                                }`}
                                            >
                                                {buyCriteria.bundle_analysis.is_bundled ? "Yes ⚠️" : "No ✓"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 rounded-lg bg-zinc-800/30 text-center">
                                                <p className="text-[10px] text-zinc-500">Bundle %</p>
                                                <p className="text-sm font-mono text-zinc-300">
                                                    {(buyCriteria.bundle_analysis.bundle_percentage * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div className="p-2 rounded-lg bg-zinc-800/30 text-center">
                                                <p className="text-[10px] text-zinc-500">Unique Wallets</p>
                                                <p className="text-sm font-mono text-zinc-300">
                                                    {buyCriteria.bundle_analysis.unique_wallets}
                                                </p>
                                            </div>
                                        </div>
                                        {buyCriteria.bundle_analysis.suspicious_patterns.length > 0 && (
                                            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                <p className="text-xs text-red-400">
                                                    ⚠️ {buyCriteria.bundle_analysis.suspicious_patterns.join(", ")}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </ExpandableSection>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
