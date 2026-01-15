"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  RefreshCw,
  Power,
  Brain,
  Rocket,
  Wifi,
  Activity,
  Target,
  Bell,
  Wallet2,
  TrendingUp,
  TrendingDown,
  BarChart2,
} from "lucide-react";
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
  return null;
}

// ============================================
// AI / Activity Log Panel
// ============================================

function AiActivityLog() {
  const t = useTranslations("activity");
  const tTime = useTranslations("time");
  const { activityFeed } = useActivityFeed();

  const items = useMemo(() => activityFeed.slice(0, 10), [activityFeed]);
  const iconForType = (type: string) => {
    switch (type) {
      case "connected":
        return <Wifi className="w-4 h-4 text-green-400" />;
      case "migration_detected":
      case "feed_update":
        return <Activity className="w-4 h-4 text-cyan-300" />;
      case "market_data_updated":
        return <BarChart2 className="w-4 h-4 text-blue-300" />;
      case "ai_analysis":
        return <Brain className="w-4 h-4 text-purple-300" />;
      case "wallet_signal":
      case "wallet_buy_detected":
        return <Wallet2 className="w-4 h-4 text-fuchsia-300" />;
      case "signal_detected":
        return <Bell className="w-4 h-4 text-yellow-300" />;
      case "position_opened":
        return <Rocket className="w-4 h-4 text-green-400" />;
      case "take_profit_triggered":
        return <Target className="w-4 h-4 text-lime-300" />;
      case "position_closed":
        return <TrendingDown className="w-4 h-4 text-red-300" />;
      case "migration_expired":
        return <TrendingDown className="w-4 h-4 text-orange-300" />;
      case "stats_update":
        return <BarChart2 className="w-4 h-4 text-blue-300" />;
      default:
        return <Activity className="w-4 h-4 text-white/60" />;
    }
  };

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
            <div
              key={item.id}
              className="p-2.5 rounded-lg border border-white/10 bg-white/5 flex items-start gap-2"
            >
              <div className="mt-0.5">{iconForType(item.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-white">
                  <span className="font-medium leading-snug">{item.message}</span>
                  <span className="text-white/40 whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                </div>
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
    <div className="space-y-4 -mt-8 px-4 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
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
