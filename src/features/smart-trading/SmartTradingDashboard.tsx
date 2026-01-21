"use client";

import { useEffect, useState } from "react";
import { PortfolioHoldingsPanel } from "./components/PortfolioHoldingsPanel";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { AiDecisionFeed } from "./components/AiDecisionFeed";
import { HistoryPanel } from "./components/HistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import ShinyText from "@/components/ShinyText";

// ============================================
// Feature Flag: Enable/disable Analytics tab (hidden by default for production)
// Set NEXT_PUBLIC_ENABLE_ANALYTICS=true in .env.local to enable
// ============================================
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
const STORAGE_KEY = "superrouter-dashboard-tab";

// ============================================
// Main Dashboard
// ============================================

export function SmartTradingDashboard() {
  const [activeTab, setActiveTab] = useState("trading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTab = window.localStorage.getItem(STORAGE_KEY);
    if (savedTab === "analytics" && ANALYTICS_ENABLED) {
      setActiveTab("analytics");
      return;
    }
    if (savedTab === "trading") {
      setActiveTab("trading");
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window === "undefined") return;
    if (value === "trading" || value === "analytics") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  };

  return (
    <div className="space-y-4 -mt-12 px-2 sm:px-4 lg:px-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
            {ANALYTICS_ENABLED && (
              <TabsTrigger
                value="analytics"
                className="relative flex-1 md:flex-none rounded-full px-10 md:px-12 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-widest text-white/40 transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c4f70e]/20 data-[state=active]:to-cyan-500/10 data-[state=active]:shadow-[inset_0_0_20px_rgba(196,247,14,0.3),0_0_30px_rgba(196,247,14,0.15)] data-[state=active]:border data-[state=active]:border-[#c4f70e]/30 hover:text-white/60 hover:bg-white/5"
              >
                <span className="relative inline-flex items-center justify-center">
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
                  <span className="absolute -top-4 -right-10 rounded-full bg-[#c4f70e] px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] text-black shadow-[0_0_12px_rgba(196,247,14,0.35)]">
                    BETA
                  </span>
                </span>
              </TabsTrigger>
            )}
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

        {ANALYTICS_ENABLED && (
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
