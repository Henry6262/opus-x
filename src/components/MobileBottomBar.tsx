"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check } from "lucide-react";

// ============================================
// Social Links Bar
// Mobile: Fixed bottom-left
// Desktop: Fixed top-left, below wallet pill
// Icon-only buttons: Twitter (X) + DexScreener + CA Copy
// ============================================

// Contract Address - Update this with actual CA
const CONTRACT_ADDRESS = "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump";
const TWITTER_URL = "https://x.com/SuperRouterSol";
const DEXSCREENER_URL = `https://dexscreener.com/solana/${CONTRACT_ADDRESS}`;

// X (Twitter) Icon
function XIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

// DexScreener Icon
function DexScreenerIcon({ className }: { className?: string }) {
    return (
        <img
            src="/logos/dexscreener.png"
            alt="DexScreener"
            className={className}
        />
    );
}

export function MobileBottomBar() {
    const [copied, setCopied] = useState(false);

    const handleCopyCA = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(CONTRACT_ADDRESS);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, []);

    return (
        <div className="social-links-bar fixed z-[200] bottom-[6px] left-[26px] md:bottom-auto md:top-[26px] md:left-[26px]">
            {/* Icon buttons container - horizontal on mobile, vertical on desktop */}
            <div className="relative flex items-center gap-3 md:flex-col md:gap-0">
                {/* Backdrop pill behind buttons - mobile: horizontal, desktop: vertical glass pill */}
                <div className="absolute -inset-3 rounded-full bg-black/60 backdrop-blur-sm md:hidden" />
                <div className="hidden md:block absolute -inset-2.5 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]" />

                {/* Twitter/X Icon Button */}
                <motion.a
                    href={TWITTER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center md:py-2.5"
                    whileHover={{ scale: 1.15, opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <XIcon className="w-9 h-9 md:w-4 md:h-4 text-white/70 hover:text-white transition-colors" />
                </motion.a>

                {/* Separator - desktop only */}
                <div className="hidden md:block w-4 h-px bg-white/10 mx-auto" />

                {/* DexScreener Icon Button */}
                <motion.a
                    href={DEXSCREENER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center md:py-2.5"
                    whileHover={{ scale: 1.15, opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <DexScreenerIcon className="w-9 h-9 md:w-4 md:h-4 text-white/70 hover:text-white transition-colors" />
                </motion.a>

                {/* Separator - desktop only */}
                <div className="hidden md:block w-4 h-px bg-white/10 mx-auto" />

                {/* CA Copy Icon Button - Highlighted with pulsing glow */}
                <motion.button
                    onClick={handleCopyCA}
                    className="relative flex items-center justify-center cursor-pointer md:py-2.5"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {/* Pulsing glow ring behind icon */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-[#c4f70e]/20 blur-md"
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.4, 0.15, 0.4],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    {/* Animated icon swap */}
                    <AnimatePresence mode="wait">
                        {copied ? (
                            <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Check className="w-9 h-9 md:w-4 md:h-4 text-[#c4f70e]" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Copy className="w-9 h-9 md:w-4 md:h-4 text-[#c4f70e]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>

            {/* Floating "Copied!" toast - Branded & Premium */}
            <AnimatePresence>
                {copied && (
                    <motion.div
                        className="absolute -top-14 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-full md:ml-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/90 backdrop-blur-xl border border-[#c4f70e]/40 shadow-[0_8px_32px_rgba(196,247,14,0.25),0_0_0_1px_rgba(196,247,14,0.1)] whitespace-nowrap"
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        {/* Glow background */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c4f70e]/10 via-transparent to-[#c4f70e]/10 pointer-events-none" />

                        {/* Check icon with glow */}
                        <motion.div
                            className="relative"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5, repeat: 2 }}
                        >
                            <div className="absolute inset-0 bg-[#c4f70e] rounded-full blur-md opacity-50" />
                            <Check className="relative w-4 h-4 text-[#c4f70e]" />
                        </motion.div>

                        {/* Text */}
                        <div className="flex flex-col">
                            <span className="text-[#c4f70e] text-sm font-bold tracking-wide">$SR CA COPIED</span>
                            <span className="text-white/50 text-[10px] font-mono">{CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-4)}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MobileBottomBar;
