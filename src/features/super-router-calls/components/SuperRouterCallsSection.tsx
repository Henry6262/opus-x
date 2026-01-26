"use client";

import { motion } from "motion/react";
import { Zap, Shield } from "lucide-react";
import { TokenGateGuard } from "@/components/auth/TokenGateGuard";
import { CompactAILog } from "./CompactAILog";
import { GodWalletCalls } from "./GodWalletCalls";
import { EnhancedWatchlist } from "./EnhancedWatchlist";

interface SuperRouterCallsSectionProps {
  className?: string;
}

export function SuperRouterCallsSection({ className }: SuperRouterCallsSectionProps) {
  return (
    <section className={className}>
      <TokenGateGuard
        title="Super Router Calls"
        description="Access exclusive trading insights, god wallet copy trading, and enhanced market intelligence. Connect your wallet and hold $SR to unlock."
        fallbackClassName="min-h-[300px]"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Super Router Calls
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
                    EXCLUSIVE
                  </span>
                </h2>
                <p className="text-xs text-white/50">God wallet tracking & enhanced signals</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Token Verified</span>
            </div>
          </div>

          {/* Compact AI Log */}
          <div>
            <CompactAILog />
          </div>

          {/* God Wallet Calls */}
          <GodWalletCalls />

          {/* Enhanced Watchlist with tracker indicators */}
          <div>
            <EnhancedWatchlist />
          </div>
        </motion.div>
      </TokenGateGuard>
    </section>
  );
}
