"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Power, Brain } from "lucide-react";
import { Panel } from "@/components/design-system";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useDashboardStats,
  useSmartTradingConfig,
  useActivityFeed,
} from "./context";
import { TransactionsPanel } from "./components/TransactionsPanel";
import { PortfolioHoldingsPanel } from "./components/PortfolioHoldingsPanel";

// ============================================
// Connection Status Header
// ============================================

function ConnectionHeader() {
  const t = useTranslations("dashboard");
  const { isLoading, refresh } = useDashboardStats();
  const { config, toggleTrading } = useSmartTradingConfig();

  const handleToggleTrading = async () => {
    if (!config) return;
    try {
      await toggleTrading(!config.tradingEnabled);
    } catch (err) {
      console.error("Failed to toggle trading:", err);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={refresh}
        disabled={isLoading}
        className="p-2"
      >
        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
      </Button>

      <Button
        variant={config?.tradingEnabled ? "solid" : "ghost"}
        size="sm"
        onClick={handleToggleTrading}
        disabled={!config}
        className={
          config?.tradingEnabled
            ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
            : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
        }
      >
        <Power className="w-4 h-4 mr-1" />
        {config?.tradingEnabled ? t("stop") : t("start")}
      </Button>
    </div>
  );
}

// ============================================
// AI / Activity Log Panel
// ============================================

function AiActivityLog() {
  const t = useTranslations("activity");
  const tTime = useTranslations("time");
  const { activityFeed } = useActivityFeed();

  const items = useMemo(() => activityFeed.slice(0, 10), [activityFeed]);

  const timeAgo = (date: Date) => {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return tTime("justNow");
    if (diffMins < 60) return tTime("minutesAgo", { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return tTime("hoursAgo", { count: diffHours });
    return tTime("daysAgo", { count: Math.floor(diffHours / 24) });
  };

  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-[#c4f70e]" />
        <span className="text-sm font-medium text-white">{t("liveActivity")}</span>
      </div>
      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-xs text-white/50 py-6 text-center">
            No recent activity
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="p-2.5 rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center justify-between text-xs text-white">
                <span className="font-medium">{item.message}</span>
                <span className="text-white/40">{timeAgo(item.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

// ============================================
// Main Dashboard
// ============================================

export function SmartTradingDashboard() {
  const { config } = useSmartTradingConfig();
  const defaultWalletAddress = "FXP5NMdrC4qHQbtBy8dduLbryVmevCkjd25mmLBKVA7x";
  const holdingsWallet = config?.wallet_address || defaultWalletAddress;

  return (
    <div className="space-y-4">
      <ConnectionHeader />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <PortfolioHoldingsPanel walletAddress={holdingsWallet} minValueUsd={0.5} />
        </div>
        <div className="space-y-4">
          <TransactionsPanel maxTransactions={20} />
          <AiActivityLog />
        </div>
      </div>
    </div>
  );
}
