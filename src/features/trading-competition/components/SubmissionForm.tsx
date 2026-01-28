"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Wallet,
  Coins,
  Search,
  Info,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { SubmissionFormData } from "../types";

interface SubmissionFormProps {
  onAnalyze: (data: SubmissionFormData) => void;
  isLoading?: boolean;
}

export function SubmissionForm({ onAnalyze, isLoading }: SubmissionFormProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [tradedWallet, setTradedWallet] = useState("");
  const [tokenMint, setTokenMint] = useState("");
  const [useSameWallet, setUseSameWallet] = useState(true);

  const canSubmit =
    walletAddress.length > 30 &&
    tokenMint.length > 30 &&
    (useSameWallet || tradedWallet.length > 30);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAnalyze({
      wallet_address: walletAddress,
      traded_wallet_address: useSameWallet ? walletAddress : tradedWallet,
      token_mint: tokenMint,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Step indicator */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-xl border border-white/5">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#c4f70e]/10 border border-[#c4f70e]/30">
          <span className="text-[10px] font-mono font-bold text-[#c4f70e]">1</span>
        </div>
        <div className="flex-1">
          <span className="text-[12px] font-mono text-white/70">Enter trade details</span>
          <span className="text-[10px] text-white/30 ml-2">Step 1 of 2</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>

      {/* Wallet input */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Your Wallet Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value.trim())}
            placeholder="Enter your Solana wallet address..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-[13px] font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#c4f70e]/40 focus:bg-black/50 transition-all pr-10"
          />
          {walletAddress.length > 30 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </motion.div>
          )}
        </div>
        <p className="text-[10px] text-white/25 font-mono pl-1">
          This is your identity for the leaderboard
        </p>
      </div>

      {/* Toggle: same wallet */}
      <label className="flex items-center gap-3 cursor-pointer group px-3 py-2.5 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.03] transition-colors">
        <div
          className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
            useSameWallet
              ? "bg-[#c4f70e]/20 border-[#c4f70e]/50"
              : "bg-white/5 border-white/20 group-hover:border-white/30"
          }`}
          onClick={(e) => {
            e.preventDefault();
            setUseSameWallet(!useSameWallet);
          }}
        >
          {useSameWallet && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 text-[#c4f70e]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          )}
        </div>
        <span
          className="text-[12px] text-white/50 select-none flex-1"
          onClick={() => setUseSameWallet(!useSameWallet)}
        >
          I traded from the same wallet
        </span>
      </label>

      {/* Traded wallet (conditional) */}
      {!useSameWallet && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-col gap-2"
        >
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            Traded Wallet Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={tradedWallet}
              onChange={(e) => setTradedWallet(e.target.value.trim())}
              placeholder="Wallet address that executed the trade..."
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-[13px] font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#c4f70e]/40 focus:bg-black/50 transition-all pr-10"
            />
            {tradedWallet.length > 30 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Token mint input */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          Token Contract Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={tokenMint}
            onChange={(e) => setTokenMint(e.target.value.trim())}
            placeholder="Token mint address (Solana)..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-[13px] font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#c4f70e]/40 focus:bg-black/50 transition-all pr-10"
          />
          {tokenMint.length > 30 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </motion.div>
          )}
        </div>
        <p className="text-[10px] text-white/25 font-mono pl-1">
          The token you traded (copy from DexScreener or Solscan)
        </p>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#c4f70e]/5 border border-[#c4f70e]/10 rounded-xl">
        <Info className="w-4 h-4 text-[#c4f70e]/50 mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-white/40 leading-relaxed">
            We&apos;ll automatically fetch:
          </p>
          <ul className="text-[10px] text-white/30 space-y-0.5 font-mono">
            <li>• Token metadata & market metrics</li>
            <li>• Your trade history for this token</li>
            <li>• P&L calculations</li>
            <li>• Price chart since your entry</li>
          </ul>
        </div>
      </div>

      {/* Analyze button */}
      <motion.button
        onClick={handleSubmit}
        disabled={!canSubmit || isLoading}
        whileHover={canSubmit ? { scale: 1.01 } : {}}
        whileTap={canSubmit ? { scale: 0.98 } : {}}
        className={`group relative flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-mono text-[14px] font-bold transition-all overflow-hidden ${
          canSubmit
            ? "cursor-pointer"
            : "bg-white/5 text-white/20 cursor-not-allowed"
        }`}
      >
        {canSubmit && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-[#c4f70e] to-[#a8d800]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#d4ff3e] to-[#c4f70e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        )}
        <Search className={`relative w-5 h-5 ${canSubmit ? "text-black" : ""}`} />
        <span className={`relative ${canSubmit ? "text-black" : ""}`}>
          {isLoading ? "ANALYZING..." : "ANALYZE TRADE"}
        </span>
      </motion.button>
    </div>
  );
}
