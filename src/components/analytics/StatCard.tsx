"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CountUp } from "@/components/animations/CountUp";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    suffixIcon?: ReactNode;
    decimals?: number;
    icon?: LucideIcon;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    className?: string;
    delay?: number;
    glowColor?: string;
    tooltipText?: string;
}

export function StatCard({
    label,
    value,
    prefix = "",
    suffix = "",
    suffixIcon,
    decimals = 1,
    icon: Icon,
    trend,
    trendValue,
    className,
    delay = 0,
    glowColor = "rgba(196, 247, 14, 0.4)",
    tooltipText,
}: StatCardProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isIncreasing, setIsIncreasing] = useState(false);
    const prevValueRef = useRef(value);
    const isInitialRef = useRef(true);

    useEffect(() => {
        if (isInitialRef.current) {
            isInitialRef.current = false;
            setIsIncreasing(value > 0);
        } else if (value !== prevValueRef.current) {
            setIsIncreasing(value > prevValueRef.current);
        }
        prevValueRef.current = value;
    }, [value]);

    const card = (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ scale: 1.015, y: -1 }}
            className={cn(
                "group relative overflow-hidden rounded-xl cursor-default",
                className
            )}
        >
            {/* Animated gradient border */}
            <motion.div
                className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: `linear-gradient(135deg, ${glowColor}, transparent 40%, transparent 60%, ${glowColor})`,
                }}
                animate={{
                    backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Pulse glow effect */}
            <motion.div
                className="absolute -inset-2 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-700"
                style={{ background: glowColor }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Card content */}
            <div className="relative bg-black/60 backdrop-blur-xl rounded-xl transition-colors duration-300 p-2 md:p-2.5">
                {/* Inner gradient overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01] pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 flex flex-col gap-1">
                    {/* Label row with icon */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 group-hover:text-[#c4f70e]/70 transition-colors duration-300">
                            {label}
                        </span>
                        {Icon && (
                            <motion.div
                                className="text-white/30 group-hover:text-[#c4f70e] transition-colors duration-300"
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                            </motion.div>
                        )}
                    </div>

                    {/* Value */}
                    <div className="flex items-baseline gap-2">
                        <span
                            className={cn(
                                "text-lg md:text-xl font-bold tracking-tight transition-colors duration-200",
                                isAnimating && isIncreasing ? "text-emerald-400" : "text-white"
                            )}
                        >
                            {prefix}
                            <CountUp
                                to={value}
                                decimals={decimals}
                                duration={1.5}
                                onStart={() => setIsAnimating(true)}
                                onEnd={() => setIsAnimating(false)}
                            />
                            {suffix}
                            {suffixIcon}
                        </span>
                        {isAnimating && isIncreasing && (
                            <span className="text-xs font-semibold text-emerald-400">▲</span>
                        )}

                        {/* Trend indicator */}
                        {trend && trendValue && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: delay + 0.3 }}
                                className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                    trend === "up" && "bg-emerald-500/20 text-emerald-400",
                                    trend === "down" && "bg-red-500/20 text-red-400",
                                    trend === "neutral" && "bg-white/10 text-white/60"
                                )}
                            >
                                {trend === "up" && "↑"}
                                {trend === "down" && "↓"}
                                {trendValue}
                            </motion.span>
                        )}
                    </div>
                </div>

                {/* Bottom accent line */}
                <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c4f70e]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    animate={{
                        scaleX: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>
        </motion.div>
    );

    if (!tooltipText) {
        return card;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{card}</TooltipTrigger>
            <TooltipContent side="top" sideOffset={10} className="max-w-[220px] text-center">
                {tooltipText}
            </TooltipContent>
        </Tooltip>
    );
}

// Preset variants for common metric types
import { SolIcon } from "@/components/SolIcon";

export function PnLStatCard({ value, ...props }: Omit<StatCardProps, "label" | "prefix" | "suffix" | "suffixIcon" | "decimals">) {
    return (
        <StatCard
            label="Total PnL"
            value={value}
            prefix={value >= 0 ? "+" : ""}
            suffixIcon={<SolIcon size={16} className="ml-1.5" />}
            decimals={2}
            glowColor={value >= 0 ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}
            {...props}
        />
    );
}

export function WinRateStatCard({ value, ...props }: Omit<StatCardProps, "label" | "suffix" | "decimals">) {
    return (
        <StatCard
            label="Win Rate"
            value={value}
            suffix="%"
            decimals={1}
            glowColor="rgba(196, 247, 14, 0.4)"
            {...props}
        />
    );
}

export function TradesStatCard({ value, ...props }: Omit<StatCardProps, "label" | "decimals">) {
    return (
        <StatCard
            label="Trades"
            value={value}
            decimals={0}
            glowColor="rgba(59, 130, 246, 0.4)"
            {...props}
        />
    );
}
