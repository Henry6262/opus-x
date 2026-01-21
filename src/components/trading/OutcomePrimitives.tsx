"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { CountUp } from "@/components/animations/CountUp";
import { cn } from "@/lib/utils";

interface PulseRingProps {
    value: number; // 0-100
    label: string;
    sublabel?: string;
    size?: number;
    strokeWidth?: number;
    className?: string;
    glowColor?: string;
    delay?: number;
}

export function PulseRing({
    value,
    label,
    sublabel,
    size = 160,
    strokeWidth = 8,
    className,
    glowColor = "rgba(196, 247, 14, 0.5)",
    delay = 0,
}: PulseRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            {/* Outer glow pulse */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                }}
                animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Background ring */}
            <svg
                width={size}
                height={size}
                className="absolute"
                style={{ transform: "rotate(-90deg)" }}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={strokeWidth}
                />
            </svg>

            {/* Progress ring with gradient */}
            <svg
                width={size}
                height={size}
                className="absolute"
                style={{ transform: "rotate(-90deg)" }}
            >
                <defs>
                    <linearGradient id="pulseRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c4f70e" />
                        <stop offset="50%" stopColor="#a8e000" />
                        <stop offset="100%" stopColor="#c4f70e" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#pulseRingGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ delay: delay + 0.2, duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                    filter="url(#glow)"
                />
            </svg>

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-white tracking-tight">
                    <CountUp to={value} decimals={1} duration={1.5} suffix="%" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 mt-1">
                    {label}
                </span>
                {sublabel && (
                    <span className="text-[9px] text-white/40 mt-0.5">{sublabel}</span>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// METRIC BAR COMPONENT
// ============================================

interface MetricBarProps {
    label: string;
    value: number; // 0-100
    color?: string;
    delay?: number;
    showValue?: boolean;
    className?: string;
}

export function MetricBar({
    label,
    value,
    color = "#c4f70e",
    delay = 0,
    showValue = true,
    className,
}: MetricBarProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={cn("space-y-1.5", className)}
        >
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">
                    {label}
                </span>
                {showValue && (
                    <span className="text-sm font-bold" style={{ color }}>
                        <CountUp to={value} decimals={0} duration={1} suffix="%" />
                    </span>
                )}
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, value)}%` }}
                    transition={{ delay: delay + 0.1, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                />
                {/* Shine effect */}
                <motion.div
                    className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["0%", "400%"] }}
                    transition={{
                        delay: delay + 0.5,
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut",
                    }}
                />
            </div>
        </motion.div>
    );
}

// ============================================
// STAT ROW COMPONENT
// ============================================

interface StatRowProps {
    label: string;
    value: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
    valueColor?: string;
    subValue?: string;
    delay?: number;
}

export function StatRow({
    label,
    value,
    suffix = "",
    prefix = "",
    decimals = 0,
    valueColor = "white",
    subValue,
    delay = 0,
}: StatRowProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="flex items-center justify-between py-2"
        >
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-white/50">
                {label}
            </span>
            <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold" style={{ color: valueColor }}>
                    {prefix}
                    <CountUp to={value} decimals={decimals} duration={1.2} />
                    {suffix}
                </span>
                {subValue && (
                    <span className="text-xs text-white/40">({subValue})</span>
                )}
            </div>
        </motion.div>
    );
}
