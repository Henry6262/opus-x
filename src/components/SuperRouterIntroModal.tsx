"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { BackgroundParticles } from "./BackgroundParticles";
import ScrambleText from "./animations/ScrambleText";
import GradientText from "./GradientText";

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
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
          aria-modal="true"
          role="dialog"
        >
          {/* Animated particle network background */}
          <div className="absolute inset-0 z-0">
            <BackgroundParticles mood="executing" intensity={0.8} />
          </div>

          {/* Cinematic vignette & scanline overlay */}
          <div className="absolute inset-0 z-[1] pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.95) 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent 0px, rgba(0,255,106,0.03) 1px, transparent 2px)",
              }}
            />
          </div>

          {/* Radial glow behind character */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute z-[2] w-[600px] h-[600px] rounded-full blur-[120px] bg-[#00ff6a]/20 pointer-events-none"
          />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
            {/* SuperRouter character */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="relative mb-8"
            >
              <motion.img
                src="/character/super-router.png"
                alt="SuperRouter"
                animate={{
                  y: [0, -8, 0],
                  filter: [
                    "drop-shadow(0 0 30px rgba(0,255,106,0.3))",
                    "drop-shadow(0 0 60px rgba(0,255,106,0.6))",
                    "drop-shadow(0 0 30px rgba(0,255,106,0.3))",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-36 h-36 md:w-56 md:h-56 object-contain"
              />

              {/* Orbital ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 m-auto w-48 h-48 md:w-72 md:h-72 rounded-full border border-[#00ff6a]/20 pointer-events-none"
                style={{ borderStyle: "dashed" }}
              />
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-4"
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                <GradientText
                  colors={["#00ff6a", "#14f195", "#9945ff", "#00ff6a"]}
                  animationSpeed={3}
                >
                  SUPERROUTER
                </GradientText>
              </h1>
            </motion.div>

            {/* Storytelling tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="h-8 md:h-10 flex items-center justify-center"
            >
              <span className="text-base md:text-xl text-white/90 font-mono tracking-wide">
                <ScrambleText
                  text="The autonomous trading agent is awakening..."
                  speed={35}
                />
              </span>
            </motion.div>

            {/* Status pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              {["NEURAL NET: ONLINE", "SOLANA: CONNECTED", "AGENT: READY"].map(
                (label, i) => (
                  <motion.span
                    key={label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + i * 0.15 }}
                    className="px-3 py-1 text-[10px] md:text-xs font-mono font-semibold uppercase tracking-widest rounded-full border border-[#00ff6a]/30 bg-[#00ff6a]/10 text-[#00ff6a] shadow-[0_0_15px_rgba(0,255,106,0.15)]"
                  >
                    {label}
                  </motion.span>
                )
              )}
            </motion.div>

            {/* Progress bar */}
            <div className="mt-10 w-64 md:w-80 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00ff6a] to-[#14f195] shadow-[0_0_10px_#00ff6a]"
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
              transition={{ delay: 1.2 }}
              className="mt-3 text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono"
            >
              Initializing experience
            </motion.p>
          </div>

          {/* Skip / enter button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={handleClose}
            className="absolute bottom-8 z-10 px-6 py-2.5 text-xs font-mono font-semibold uppercase tracking-widest text-black bg-[#00ff6a] rounded-full hover:bg-[#14f195] transition-colors shadow-[0_0_25px_rgba(0,255,106,0.4)]"
          >
            Enter Dashboard
          </motion.button>

          {/* Top-right close */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleClose}
            className="absolute top-6 right-6 z-10 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close intro"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
