"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  ChevronRight,
  Users,
  Target,
  Zap,
  Brain,
} from "lucide-react";
import DecryptedText from "@/components/DecryptedText";
import ElectricBorder from "@/components/ElectricBorder";
import { SubmissionModal } from "./SubmissionModal";

interface CompetitionSectionProps {
  walletAddress?: string;
}

// Steps to train the AI
const TRAINING_STEPS = [
  { num: "01", text: "Enter wallet + token address", icon: Target },
  { num: "02", text: "We pull your trade history", icon: Zap },
  { num: "03", text: "Add your analysis & reasoning", icon: Brain },
];

export function CompetitionSection({ walletAddress }: CompetitionSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Auto-rotate steps every 3.5 seconds (slower)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % TRAINING_STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative pt-5">
      {/* Epic floating badge - absolutely positioned above container */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="absolute -top-1 left-6 z-20"
      >
        <div className="relative">
          {/* Glow effect behind badge */}
          <div className="absolute inset-0 bg-[#c4f70e]/30 blur-xl rounded-full" />
          <div className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c4f70e] to-[#a8d90c] rounded-full shadow-[0_4px_20px_rgba(196,247,14,0.4)]">
            <Trophy className="w-5 h-5 text-black" />
            <span className="text-sm uppercase tracking-[0.15em] font-mono text-black font-bold">
              Analyst Competition
            </span>
          </div>
        </div>
      </motion.div>

      <ElectricBorder
        color="#c4f70e"
        speed={0.8}
        chaos={0.08}
        borderRadius={16}
        className="w-full"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full overflow-hidden rounded-2xl bg-black/80 backdrop-blur-xl pt-6"
        >
          {/* Entry count badge - absolute top right */}
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <Users className="w-3 h-3 text-white/50" />
              <span className="text-[9px] font-mono text-white/50">127 entries</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-5 md:p-6 flex flex-col gap-5">

            {/* Header */}
            <div className="flex flex-col gap-3">
            {/* Title with DecryptedText effect */}
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              <DecryptedText
                text="Train SuperRouter AI"
                speed={40}
                maxIterations={15}
                animateOn="view"
                sequential
                revealDirection="start"
                className="text-white"
                encryptedClassName="text-[#c4f70e]/60"
              />
            </h2>

            {/* Description */}
            <p className="text-[12px] md:text-[13px] text-white/40 font-mono leading-relaxed max-w-lg">
              Submit your best trades with reasoning. Top 10 analysts get exclusive early access to new features.
            </p>
          </div>

          {/* Steps - auto-rotating carousel */}
          <div className="flex items-stretch gap-2.5">
            {/* Vertical step indicators */}
            <div className="flex flex-col justify-center gap-1.5 py-1">
              {TRAINING_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-1.5 rounded-full transition-all duration-300 ${
                    idx === activeStep
                      ? "bg-[#c4f70e] h-4"
                      : "bg-white/15 h-1.5 hover:bg-white/25"
                  }`}
                />
              ))}
            </div>

            {/* Step card */}
            <div className="relative h-14 flex-1 max-w-[300px] overflow-hidden rounded-lg bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08]">
              {/* Animated gradient border glow */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#c4f70e]/5 via-transparent to-[#c4f70e]/5 opacity-50" />

              <AnimatePresence mode="wait">
                {(() => {
                  const Icon = TRAINING_STEPS[activeStep].icon;
                  return (
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, x: 30, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute inset-0 flex items-center px-4 gap-3"
                    >
                      {/* Background icon - large and faded */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Icon className="w-12 h-12 text-white/[0.03]" strokeWidth={1} />
                      </div>

                      {/* Step number - no bg/border, bigger with # prefix */}
                      <span className="text-base font-mono text-[#c4f70e] font-bold shrink-0">
                        #{TRAINING_STEPS[activeStep].num}
                      </span>

                      {/* Step text */}
                      <span className="text-[11px] md:text-[12px] font-mono text-white/80 leading-tight relative z-10">
                        {TRAINING_STEPS[activeStep].text}
                      </span>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>

          {/* CTA Button - Green Glass Style */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setModalOpen(true)}
              className="cursor-pointer group relative overflow-hidden rounded-lg bg-gradient-to-r from-[#c4f70e]/20 to-[#c4f70e]/10 border border-[#c4f70e]/30 backdrop-blur-sm transition-all duration-300 hover:from-[#c4f70e]/30 hover:to-[#c4f70e]/20 hover:border-[#c4f70e]/50 hover:shadow-[0_0_20px_rgba(196,247,14,0.3)]"
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#c4f70e]/5 to-[#c4f70e]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-center gap-3 px-4 py-2.5">
                <Trophy className="w-4 h-4 text-[#c4f70e]" />
                <span className="text-[13px] font-mono font-bold text-[#c4f70e] tracking-wide">
                  SUBMIT YOUR TRADE
                </span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <ChevronRight className="w-4 h-4 text-[#c4f70e]/70" />
                </motion.div>
              </div>
            </button>

            <span className="text-[10px] font-mono text-white/25 hidden sm:block">
              Takes ~30 seconds
            </span>
          </div>
        </div>
        </motion.div>
      </ElectricBorder>

      {/* Submission modal */}
      <SubmissionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        walletAddress={walletAddress}
      />
    </div>
  );
}
