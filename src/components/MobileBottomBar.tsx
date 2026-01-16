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
const TWITTER_URL = "https://twitter.com/VibrAI";
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
        <svg viewBox="0 0 252 300" className={className} fill="currentColor">
            <path d="M151.818 106.866c9.177-4.576 20.854-11.312 32.545-20.541 2.465 5.119 2.735 9.586 1.465 13.193-.9 2.542-2.596 4.753-4.826 6.512-2.415 1.901-5.431 3.285-8.765 4.033-6.326 1.425-13.712.593-20.419-3.197m1.591 46.886l12.148 7.017c-24.804 13.902-31.547 39.716-39.557 64.859-8.009-25.143-14.753-50.957-39.556-64.859l12.148-7.017a5.95 5.95 0 003.84-5.845c-1.113-23.547 5.245-33.96 13.821-40.498 3.076-2.342 6.434-4.178 9.834-5.588a52.69 52.69 0 0011.132 5.462c17.157 6.209 33.298.039 37.408-6.93a5.937 5.937 0 00-2.896-8.534 5.926 5.926 0 00-8.021 4.238c-1.144 5.729-8.267 8.09-16.894 6.039a38.96 38.96 0 01-7.424-2.658c-.56-.263-1.11-.537-1.65-.823-6.5-3.429-11.498-8.238-11.498-14.451 0-9.164 13.874-17.025 31.767-17.025.233 0 .466.002.697.006 16.147.248 29.387 7.634 31.011 16.681a5.94 5.94 0 007.693 4.468 5.95 5.95 0 003.836-7.025c-2.713-14.347-19.932-25.049-42.771-25.413a109.03 109.03 0 00-1.081-.004c-23.399 0-43.631 10.894-43.631 27.337 0 8.346 5.532 15.808 14.456 21.147-.768.335-1.527.684-2.277 1.049-9.267 4.523-16.065 12.141-18.413 22.678-.094.424-.188.848-.282 1.275l-.197.915c-.237 1.115-.46 2.248-.667 3.404l-.021.131c-.087.519-.174 1.044-.259 1.578a176.64 176.64 0 00-.476 3.309 5.94 5.94 0 003.838 5.845m36.204-21.044c-8.012-25.143-14.756-50.957-39.557-64.859l12.148-7.017a5.95 5.95 0 003.838-5.845c-1.109-23.397 5.181-33.862 13.673-40.432a41.69 41.69 0 019.098-5.392 52.69 52.69 0 0011.131 5.462c17.157 6.209 33.299.039 37.409-6.93a5.937 5.937 0 00-2.896-8.534 5.926 5.926 0 00-8.021 4.238c-1.144 5.729-8.267 8.09-16.894 6.039a38.96 38.96 0 01-7.424-2.658c-.56-.263-1.11-.537-1.65-.823-6.5-3.429-11.498-8.238-11.498-14.451 0-9.164 13.874-17.025 31.767-17.025.233 0 .466.002.697.006 16.147.248 29.387 7.634 31.011 16.681a5.94 5.94 0 007.693 4.468 5.95 5.95 0 003.836-7.025c-2.713-14.347-19.932-25.049-42.771-25.413a109.03 109.03 0 00-1.081-.004c-23.399 0-43.631 10.894-43.631 27.337 0 8.346 5.532 15.808 14.456 21.147-.768.335-1.527.684-2.277 1.049-9.267 4.523-16.065 12.141-18.413 22.678-.094.424-.188.848-.282 1.275l-.197.915c-.237 1.115-.46 2.248-.667 3.404l-.021.131c-.087.519-.174 1.044-.259 1.578a176.64 176.64 0 00-.476 3.309 5.94 5.94 0 003.838 5.845l12.148 7.017c-24.804 13.902-31.547 39.716-39.557 64.859" />
        </svg>
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
        <div className="social-links-bar fixed z-[99] bottom-4 left-4 md:bottom-auto md:top-[72px] md:left-4">
            {/* Icon buttons container - always horizontal */}
            <div className="flex items-center gap-3">
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
