"use client";

import { PortfolioHoldingsPanel } from "./components/PortfolioHoldingsPanel";
import { AiDecisionFeed } from "./components/AiDecisionFeed";
import { HistoryPanel } from "./components/HistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";

// ============================================
// Main Dashboard
// ============================================

export function SmartTradingDashboard() {
  return (
    <div className="space-y-4 -mt-8 px-4 lg:px-8">
      <Tabs defaultValue="trading" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-white/[0.03] border border-white/[0.05] rounded-full p-1 gap-1">
            <TabsTrigger
              value="trading"
              className="rounded-full px-5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50 transition-all data-[state=active]:text-white data-[state=active]:bg-[var(--brand-primary)]/20 data-[state=active]:shadow-[inset_0_0_12px_rgba(104,172,110,0.3)]"
            >
              Trading
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-full px-5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50 transition-all data-[state=active]:text-white data-[state=active]:bg-[var(--brand-primary)]/20 data-[state=active]:shadow-[inset_0_0_12px_rgba(104,172,110,0.3)]"
            >
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trading" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            {/* Left Column: Portfolio Holdings + AI Log (desktop) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              {/* Portfolio - dynamic height based on items, max 3 visible */}
              <PortfolioHoldingsPanel maxVisibleItems={3} />
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
