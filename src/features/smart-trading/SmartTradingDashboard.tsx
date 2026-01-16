"use client";

import { useSmartTradingConfig } from "./context";
import { TransactionsPanel } from "./components/TransactionsPanel";
import { PortfolioHoldingsPanel } from "./components/PortfolioHoldingsPanel";
import { AiDecisionFeed } from "./components/AiDecisionFeed";
import { RecentTradesPanel } from "./components/RecentTradesPanel";

// ============================================
// Main Dashboard
// ============================================

export function SmartTradingDashboard() {
  const { config } = useSmartTradingConfig();
  const defaultWalletAddress = "FXP5NMdrC4qHQbtBy8dduLbryVmevCkjd25mmLBKVA7x";
  const holdingsWallet = config?.wallet_address || defaultWalletAddress;

  return (
    <div className="space-y-4 -mt-8 px-4 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        {/* Left Column: Portfolio + Recent Trades */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:h-[700px]">
          <div className="flex-1 min-h-0 overflow-hidden">
            <PortfolioHoldingsPanel walletAddress={holdingsWallet} minValueUsd={0.5} />
          </div>
          <div className="flex-shrink-0 max-h-[280px] overflow-hidden">
            <RecentTradesPanel maxTrades={10} />
          </div>
        </div>
        {/* Right Column: History + AI Log */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:h-[700px]">
          <div className="flex-1 min-h-0 overflow-hidden">
            <TransactionsPanel maxTransactions={100} />
          </div>
          <div className="flex-shrink-0 h-[280px] overflow-hidden">
            <AiDecisionFeed maxItems={15} />
          </div>
        </div>
      </div>
    </div>
  );
}
