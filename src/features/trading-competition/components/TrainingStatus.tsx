"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Clock } from "lucide-react";

// Training session interval (3 hours)
const TRAINING_INTERVAL_MS = 3 * 60 * 60 * 1000;

export function TrainingStatus() {
  const [timeUntilNext, setTimeUntilNext] = useState({ h: 0, m: 0, s: 0 });
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [sessionPhase, setSessionPhase] = useState<"training" | "waiting">("training");

  // Calculate countdown and progress
  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const msIntoSession = now % TRAINING_INTERVAL_MS;
      const msUntilNext = TRAINING_INTERVAL_MS - msIntoSession;
      const progress = (msIntoSession / TRAINING_INTERVAL_MS) * 100;

      setTrainingProgress(progress);
      setSessionPhase(progress < 70 ? "training" : "waiting");

      const h = Math.floor(msUntilNext / (60 * 60 * 1000));
      const m = Math.floor((msUntilNext % (60 * 60 * 1000)) / (60 * 1000));
      const s = Math.floor((msUntilNext % (60 * 1000)) / 1000);
      setTimeUntilNext({ h, m, s });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col gap-4 p-4 md:p-5 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/[0.08]"
    >
      {/* Status header */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-white/30">
          AI Training
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#c4f70e]/10 border border-[#c4f70e]/20">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#c4f70e]"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[8px] uppercase tracking-wider font-mono text-[#c4f70e] font-medium">
            {sessionPhase === "training" ? "Active" : "Processing"}
          </span>
        </div>
      </div>

      {/* Circular progress + percentage */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          {/* Background ring */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="5"
            />
            {/* Progress ring */}
            <motion.circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="#c4f70e"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(trainingProgress / 100) * 163} 163`}
              initial={{ strokeDasharray: "0 163" }}
              animate={{ strokeDasharray: `${(trainingProgress / 100) * 163} 163` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 4px rgba(196, 247, 14, 0.4))" }}
            />
          </svg>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: sessionPhase === "training" ? 360 : 0 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-5 h-5 text-[#c4f70e]/80" />
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white tabular-nums">
              {Math.round(trainingProgress)}
            </span>
            <span className="text-[10px] text-white/40 font-mono">%</span>
          </div>
          <span className="text-[9px] text-white/30 font-mono">
            session progress
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/[0.06]" />

      {/* Countdown timer */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-white/30" />
          <span className="text-[9px] uppercase tracking-wider font-mono text-white/30">
            Next Session
          </span>
        </div>

        {/* Time display */}
        <div className="flex items-center justify-center gap-1.5">
          <TimeBlock value={timeUntilNext.h} label="H" />
          <span className="text-white/20 text-sm font-mono">:</span>
          <TimeBlock value={timeUntilNext.m} label="M" />
          <span className="text-white/20 text-sm font-mono">:</span>
          <TimeBlock value={timeUntilNext.s} label="S" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider font-mono text-white/25">
            Today
          </span>
          <span className="text-[12px] font-mono font-semibold text-white/70">
            23 trades
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-wider font-mono text-white/25">
            Avg P&L
          </span>
          <span className="text-[12px] font-mono font-semibold text-emerald-400">
            +47%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Time block component for countdown
function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="text-lg font-bold text-[#c4f70e] tabular-nums font-mono"
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </AnimatePresence>
      <span className="text-[7px] uppercase tracking-wider font-mono text-white/25">
        {label}
      </span>
    </div>
  );
}
