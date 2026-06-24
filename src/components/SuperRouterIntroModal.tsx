"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import ScrambleText from "./animations/ScrambleText";

const STORAGE_KEY = "superrouter-intro-seen";
const AUTO_DISMISS_MS = 3000;
const REVEAL_DELAY_MS = 300;

export function SuperRouterIntroModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (seen) return;

    const timer = setTimeout(() => setIsOpen(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setIsOpen(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[var(--void-black)]"
          aria-modal="true"
          role="dialog"
        >
          {/* Soft brand glow behind character */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute z-0 w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full blur-[140px] bg-[var(--brand-primary)]/10 pointer-events-none"
          />

          {/* Subtle vignette */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.95) 100%)",
            }}
          />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
            {/* SuperRouter character */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="relative mb-8"
            >
              <motion.img
                src="/character/super-router.png"
                alt="SuperRouter"
                animate={{
                  y: [0, -6, 0],
                  filter: [
                    "drop-shadow(0 0 25px rgba(104,172,110,0.25))",
                    "drop-shadow(0 0 45px rgba(104,172,110,0.45))",
                    "drop-shadow(0 0 25px rgba(104,172,110,0.25))",
                  ],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-32 h-32 md:w-48 md:h-48 object-contain"
              />

              {/* Orbital ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 m-auto w-44 h-44 md:w-64 md:h-64 rounded-full border border-[var(--brand-primary)]/20 pointer-events-none"
                style={{ borderStyle: "dashed" }}
              />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-3"
            >
              SUPERROUTER
            </motion.h1>

            {/* Storytelling tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="h-8 md:h-10 flex items-center justify-center"
            >
              <span className="text-base md:text-xl text-white/70 font-mono tracking-wide">
                <ScrambleText
                  text="The autonomous trading agent is awakening..."
                  speed={35}
                />
              </span>
            </motion.div>

            {/* Status line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 flex items-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-primary)]" />
              </span>
              <span className="text-[11px] md:text-xs font-mono uppercase tracking-[0.2em] text-white/50">
                Systems online
              </span>
            </motion.div>

            {/* Progress bar */}
            <div className="mt-10 w-56 md:w-72 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--brand-primary)]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: AUTO_DISMISS_MS / 1000,
                  ease: "linear",
                }}
              />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono"
            >
              Initializing experience
            </motion.p>
          </div>

          {/* Enter button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={handleClose}
            className="absolute bottom-8 z-10 px-8 py-2.5 text-xs font-mono font-semibold uppercase tracking-widest text-[var(--void-black)] bg-[var(--brand-primary)] rounded-full hover:bg-[var(--brand-primary-light)] transition-colors"
          >
            Enter Dashboard
          </motion.button>

          {/* Top-right close */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleClose}
            className="absolute top-6 right-6 z-10 p-2 rounded-full text-white/30 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Close intro"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
