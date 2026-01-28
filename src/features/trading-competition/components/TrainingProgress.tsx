"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CountUp } from "@/components/animations/CountUp";
import { Trophy, Zap, Target, TrendingUp, Clock, ChevronRight } from "lucide-react";

interface TrainingStage {
  label: string;
  icon: React.ReactNode;
  durationMs: number;
  detail: string;
}

const TRAINING_STAGES: TrainingStage[] = [
  {
    label: "SCANNING WALLET",
    icon: <Target className="w-4 h-4" />,
    durationMs: 2800,
    detail: "Analyzing on-chain activity...",
  },
  {
    label: "PULLING TRADE DATA",
    icon: <TrendingUp className="w-4 h-4" />,
    durationMs: 3200,
    detail: "Fetching entry/exit positions...",
  },
  {
    label: "CALCULATING PNL",
    icon: <Zap className="w-4 h-4" />,
    durationMs: 2400,
    detail: "Computing realized & unrealized gains...",
  },
  {
    label: "SCORING ANALYSIS",
    icon: <Trophy className="w-4 h-4" />,
    durationMs: 2000,
    detail: "Evaluating composite ranking...",
  },
];

const TOTAL_DURATION = TRAINING_STAGES.reduce((sum, s) => sum + s.durationMs, 0);

interface TrainingProgressProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function TrainingProgress({ isActive, onComplete }: TrainingProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const runSimulation = useCallback(() => {
    startTimeRef.current = performance.now();
    setIsComplete(false);
    setCurrentStage(0);
    setStageProgress(0);
    setOverallProgress(0);

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const overall = Math.min(1, elapsed / TOTAL_DURATION);
      setOverallProgress(overall * 100);

      // Determine current stage
      let accumulated = 0;
      for (let i = 0; i < TRAINING_STAGES.length; i++) {
        const stageEnd = accumulated + TRAINING_STAGES[i].durationMs;
        if (elapsed < stageEnd) {
          setCurrentStage(i);
          setStageProgress(((elapsed - accumulated) / TRAINING_STAGES[i].durationMs) * 100);
          break;
        }
        accumulated = stageEnd;
      }

      if (overall < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setIsComplete(true);
        setCurrentStage(TRAINING_STAGES.length - 1);
        setStageProgress(100);
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [onComplete]);

  useEffect(() => {
    if (isActive) {
      runSimulation();
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isActive, runSimulation]);

  const stage = TRAINING_STAGES[currentStage];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
            Training Session
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#c4f70e]/80 tabular-nums">
          <CountUp to={Math.round(overallProgress)} duration={0.3} suffix="%" />
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: isComplete
              ? "linear-gradient(90deg, #c4f70e, #a8d800)"
              : "linear-gradient(90deg, #c4f70e33, #c4f70e)",
          }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
        {/* Glow effect */}
        {!isComplete && isActive && (
          <motion.div
            className="absolute top-0 h-full w-8 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, #c4f70e80, transparent)",
              left: `${Math.max(0, overallProgress - 4)}%`,
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Stage indicators */}
      <div className="flex gap-1">
        {TRAINING_STAGES.map((s, i) => (
          <div
            key={i}
            className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
              i < currentStage
                ? "bg-[#c4f70e]"
                : i === currentStage
                ? "bg-[#c4f70e]/50"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Current stage info */}
      <AnimatePresence mode="wait">
        {isActive && stage && (
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded bg-[#c4f70e]/10 text-[#c4f70e]">
              {stage.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-medium text-white/90 tracking-wide">
                {stage.label}
              </span>
              <span className="text-[10px] text-white/30">{stage.detail}</span>
            </div>
            {!isComplete && (
              <motion.div
                className="ml-auto"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <ChevronRight className="w-3 h-3 text-[#c4f70e]/40" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion badge */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#c4f70e]/10 border border-[#c4f70e]/20 rounded-md"
          >
            <Trophy className="w-3.5 h-3.5 text-[#c4f70e]" />
            <span className="text-[11px] font-mono text-[#c4f70e] font-medium">
              ANALYSIS COMPLETE
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
