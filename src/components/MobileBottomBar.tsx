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
const CONTRACT_ADDRESS = "VibrPump111111111111111111111111111111111";
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
        <div className="social-links-bar fixed z-[10001] bottom-4 left-8 md:bottom-auto md:top-[72px] md:left-4">
            {/* Icon buttons container with local backdrop - mobile only */}
            <div className="relative flex items-center gap-3">
                {/* Backdrop pill behind buttons - mobile only */}
                <div className="absolute -inset-3 rounded-full bg-black/60 backdrop-blur-sm md:hidden" />
                {/* Twitter/X Icon Button */}
                <motion.a
                    href={TWITTER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center"
                    whileHover={{ scale: 1.15, opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <XIcon className="w-5 h-5 md:w-4 md:h-4 text-white/70 hover:text-white transition-colors" />
                </motion.a>

                {/* DexScreener Icon Button */}
                <motion.a
                    href={DEXSCREENER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center"
                    whileHover={{ scale: 1.15, opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <DexScreenerIcon className="w-5 h-5 md:w-4 md:h-4 text-white/70 hover:text-white transition-colors" />
                </motion.a>

                {/* CA Copy Icon Button */}
                <motion.button
                    onClick={handleCopyCA}
                    className="relative flex items-center justify-center"
                    whileHover={{ scale: 1.15, opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                >
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
                                <Check className="w-5 h-5 md:w-4 md:h-4 text-green-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Copy className="w-5 h-5 md:w-4 md:h-4 text-white/70 hover:text-white transition-colors" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>

            {/* Floating "Copied!" toast */}
            <AnimatePresence>
                {copied && (
                    <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-full md:ml-2 px-2.5 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold whitespace-nowrap shadow-lg"
                        initial={{ opacity: 0, y: 8, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        Copied!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MobileBottomBar;
