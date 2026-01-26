"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { TokenGateGuard } from "@/components/auth/TokenGateGuard";
import { GodWalletCalls } from "./GodWalletCalls";
import { EnhancedWatchlist } from "./EnhancedWatchlist";
import ShinyText from "@/components/ShinyText";

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
          {/* Epic Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Scouting GIF Icon - Vertical aspect ratio */}
              <motion.div
                className="relative flex-shrink-0"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute -inset-2 rounded-2xl blur-xl bg-[#c4f70e]/25" />
                <div className="relative w-14 h-20 rounded-2xl overflow-hidden">
                  <Image
                    src="/videos/scouting-v2.gif"
                    alt="Scouting"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </motion.div>

              {/* Title + Description - centered vertically */}
              <div className="flex flex-col justify-center">
                <h2 className="flex items-center gap-3">
                  <ShinyText
                    text="SUPER ROUTER CALLS"
                    speed={4}
                    color="#ffffff"
                    shineColor="#c4f70e"
                    className="text-2xl font-black tracking-wide"
                  />
                </h2>
                <p className="text-sm text-white/50 mt-1">God wallet tracking & enhanced signals</p>
              </div>
            </div>

            {/* Badge - no box shadow */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c4f70e]/10 border border-[#c4f70e]/30">
              <ShinyText
                text="$SR Holders"
                speed={2}
                color="#c4f70e"
                shineColor="#ffffff"
                className="text-xs font-bold"
              />
            </div>
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
