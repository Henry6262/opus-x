"use client";

import { useState } from "react";
import { PortfolioHoldingsPanel } from "./components/PortfolioHoldingsPanel";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { AiDecisionFeed } from "./components/AiDecisionFeed";
import { HistoryPanel } from "./components/HistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";
import ShinyText from "@/components/ShinyText";

// ============================================
// Main Dashboard
// ============================================

export function SmartTradingDashboard() {
  const [activeTab, setActiveTab] = useState("trading");

  return (
    <div className="space-y-4 -mt-12 px-4 lg:px-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="w-full md:w-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-0 gap-0">
            <TabsTrigger
              value="trading"
              className="flex-1 md:flex-none rounded-full px-10 md:px-12 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-widest text-white/40 transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c4f70e]/20 data-[state=active]:to-cyan-500/10 data-[state=active]:shadow-[inset_0_0_20px_rgba(196,247,14,0.3),0_0_30px_rgba(196,247,14,0.15)] data-[state=active]:border data-[state=active]:border-[#c4f70e]/30 hover:text-white/60 hover:bg-white/5"
            >
              {activeTab === "trading" ? (
                <ShinyText
                  text="Trading"
                  speed={3}
                  color="#c4f70e"
                  shineColor="#ffffff"
                  className="font-bold"
                />
              ) : (
                "Trading"
              )}
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex-1 md:flex-none rounded-full px-10 md:px-12 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-widest text-white/40 transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c4f70e]/20 data-[state=active]:to-cyan-500/10 data-[state=active]:shadow-[inset_0_0_20px_rgba(196,247,14,0.3),0_0_30px_rgba(196,247,14,0.15)] data-[state=active]:border data-[state=active]:border-[#c4f70e]/30 hover:text-white/60 hover:bg-white/5"
            >
              {activeTab === "analytics" ? (
                <ShinyText
                  text="Analytics"
                  speed={3}
                  color="#c4f70e"
                  shineColor="#ffffff"
                  className="font-bold"
                />
              ) : (
                "Analytics"
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trading" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            {/* Left Column: Portfolio Holdings + Watchlist + AI Log (desktop) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              {/* Portfolio - dynamic height based on items, max 3 visible */}
              <PortfolioHoldingsPanel maxVisibleItems={3} />
              {/* Watchlist - tokens being monitored before qualifying for trading */}
              <WatchlistPanel />
              {/* AI Log - sits right under portfolio on desktop */}
              <div className="hidden lg:block h-[320px]">
                <AiDecisionFeed maxItems={15} />
              </div>
            </div>
            {/* Right Column: History (Trades/Transactions toggle) */}
            <div className="lg:col-span-2 flex flex-col gap-4 lg:h-[700px]">
              <div className="flex-1 min-h-0 overflow-hidden">
                <HistoryPanel maxItems={50} />
              </div>
              {/* AI Log - mobile only (below history) */}
              <div className="lg:hidden flex-shrink-0 h-[280px] overflow-hidden">
                <AiDecisionFeed maxItems={15} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
