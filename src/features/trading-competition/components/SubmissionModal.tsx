"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Trophy,
  Wallet,
  Coins,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useSubmission } from "../hooks/useSubmission";

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress?: string;
}

export function SubmissionModal({
  open,
  onOpenChange,
  walletAddress: initialWallet = "",
}: SubmissionModalProps) {
  const { state, analyze, reset } = useSubmission();

  // Local form state
  const [currentFormStep, setCurrentFormStep] = useState(0);
  const [walletAddress, setWalletAddress] = useState(initialWallet);
  const [tokenMint, setTokenMint] = useState("");
  const [reasoning, setReasoning] = useState("");

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setCurrentFormStep(0);
      setWalletAddress(initialWallet);
      setTokenMint("");
      setReasoning("");
    }
    onOpenChange(isOpen);
  };

  const handleNext = () => {
    if (currentFormStep === 0 && walletAddress.length > 30) {
      setCurrentFormStep(1);
    } else if (currentFormStep === 1 && tokenMint.length > 30) {
      setCurrentFormStep(2);
    } else if (currentFormStep === 2) {
      // Submit
      analyze({
        wallet_address: walletAddress,
        traded_wallet_address: walletAddress,
        token_mint: tokenMint,
        reasoning,
      });
    }
  };

  const handleBack = () => {
    if (currentFormStep > 0) {
      setCurrentFormStep(currentFormStep - 1);
    }
  };

  const canProceed =
    (currentFormStep === 0 && walletAddress.length > 30) ||
    (currentFormStep === 1 && tokenMint.length > 30) ||
    (currentFormStep === 2);

  const steps = [
    { icon: Wallet, label: "Wallet" },
    { icon: Coins, label: "Token" },
    { icon: Sparkles, label: "Submit" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-[#0a0a0a] border-[#c4f70e]/30 backdrop-blur-2xl sm:max-w-md p-0 overflow-hidden shadow-[0_0_60px_rgba(196,247,14,0.1)]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
          <button
            onClick={() => handleClose(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-[#c4f70e]/15 border border-[#c4f70e]/30">
              <Trophy className="w-5 h-5 text-[#c4f70e]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono">Submit Trade</h2>
              <p className="text-xs text-white/50 font-mono">Train the AI with your best calls</p>
            </div>
          </div>

          {/* Step indicators - centered with floating effect */}
          {state.step === "form" && (
            <div className="flex items-center justify-center gap-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === currentFormStep;
                const isComplete = idx < currentFormStep;
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <motion.div
                      animate={isActive ? {
                        y: [0, -4, 0],
                        boxShadow: ["0 0 0 rgba(196,247,14,0)", "0 8px 20px rgba(196,247,14,0.3)", "0 0 0 rgba(196,247,14,0)"]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`flex flex-col items-center gap-1.5`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                          isActive
                            ? "bg-[#c4f70e] text-black shadow-[0_0_20px_rgba(196,247,14,0.4)]"
                            : isComplete
                            ? "bg-[#c4f70e]/25 text-[#c4f70e] border border-[#c4f70e]/30"
                            : "bg-white/10 text-white/40 border border-white/10"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${
                        isActive ? "text-[#c4f70e]" : isComplete ? "text-[#c4f70e]/60" : "text-white/30"
                      }`}>
                        {step.label}
                      </span>
                    </motion.div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`w-8 h-0.5 rounded-full ${
                          isComplete ? "bg-[#c4f70e]/50" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            {/* FORM STEPS */}
            {state.step === "form" && (
              <motion.div
                key={`form-${currentFormStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 0: Wallet */}
                {currentFormStep === 0 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-mono text-white/80 mb-2.5 block font-medium">
                        Your Wallet Address
                      </label>
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value.trim())}
                        placeholder="Paste your Solana wallet..."
                        autoFocus
                        className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-base font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#c4f70e]/60 focus:bg-white/15 focus:ring-2 focus:ring-[#c4f70e]/20 transition-all"
                      />
                      <p className="text-xs text-white/40 font-mono mt-2.5">
                        This identifies you on the leaderboard
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 1: Token */}
                {currentFormStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-mono text-white/80 mb-2.5 block font-medium">
                        Token Contract Address
                      </label>
                      <input
                        type="text"
                        value={tokenMint}
                        onChange={(e) => setTokenMint(e.target.value.trim())}
                        placeholder="Paste token mint address..."
                        autoFocus
                        className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-base font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#c4f70e]/60 focus:bg-white/15 focus:ring-2 focus:ring-[#c4f70e]/20 transition-all"
                      />
                      <p className="text-xs text-white/40 font-mono mt-2.5">
                        The token you traded (from DexScreener)
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Reasoning */}
                {currentFormStep === 2 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-mono text-white/80 mb-2.5 block font-medium">
                        Why did you buy? <span className="text-white/40 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder="Chart pattern, social momentum, whale activity..."
                        rows={3}
                        autoFocus
                        className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-base font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#c4f70e]/60 focus:bg-white/15 focus:ring-2 focus:ring-[#c4f70e]/20 transition-all resize-none"
                      />
                      <p className="text-xs text-white/40 font-mono mt-2.5">
                        Helps the AI learn your strategy
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* FETCHING */}
            {state.step === "fetching" && (
              <motion.div
                key="fetching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-10 gap-5"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-12 h-12 text-[#c4f70e]" />
                </motion.div>
                <div className="text-center">
                  <p className="text-lg font-mono text-white font-medium">Analyzing your trade...</p>
                  <p className="text-sm font-mono text-white/50 mt-1">Fetching on-chain data</p>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {state.step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10 gap-5"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="p-5 rounded-full bg-[#c4f70e]/20 border border-[#c4f70e]/30"
                >
                  <Check className="w-12 h-12 text-[#c4f70e]" />
                </motion.div>
                <div className="text-center">
                  <p className="text-2xl font-mono font-bold text-white">Submitted!</p>
                  <p className="text-sm font-mono text-white/50 mt-2">
                    Your trade is pending review
                  </p>
                </div>
              </motion.div>
            )}

            {/* ERROR */}
            {state.step === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-10 gap-5"
              >
                <div className="p-5 rounded-full bg-red-500/20 border border-red-500/30">
                  <X className="w-12 h-12 text-red-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-mono text-red-400 font-medium">Something went wrong</p>
                  <p className="text-sm font-mono text-white/40 mt-1">{state.error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {state.step === "form" && (
            <div className="flex items-center gap-3">
              {currentFormStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-5 py-3.5 rounded-xl bg-white/10 border border-white/15 text-sm font-mono text-white/70 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl text-base font-mono font-bold transition-all ${
                  canProceed
                    ? "bg-[#c4f70e] text-black hover:bg-[#d4ff3e] cursor-pointer shadow-[0_4px_20px_rgba(196,247,14,0.3)]"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {currentFormStep === 2 ? (
                  <>
                    <Trophy className="w-5 h-5" />
                    Submit Trade
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {(state.step === "success" || state.step === "error") && (
            <button
              onClick={() => handleClose(false)}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/15 text-base font-mono text-white/70 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              {state.step === "success" ? "Done" : "Try Again"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
