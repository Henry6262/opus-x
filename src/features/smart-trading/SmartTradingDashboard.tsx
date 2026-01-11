"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Power,
  RefreshCw,
  Target,
  Zap,
  Wallet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Panel, CollapsibleSidePanel } from "@/components/design-system";
import { Button } from "@/components/ui";
import {
  useRealTimeDashboardStats,
  useRealTimePositions,
  useRealTimeWalletSignals,
  useRealTimeConfig,
  useRealTimeMigrationFeed,
} from "./context/RealTimeSmartTradingContext";
import { LiveActivityFeed } from "./components/LiveActivityFeed";
import { MigrationTokenCard } from "./components/MigrationTokenCard";
import { TrackedWalletsPanel } from "./components/TrackedWalletsPanel";
import { WalletSignalStack } from "./components/WalletSignalBadge";
import type { Position, TradingSignal } from "./types";

// ============================================
// Helper Functions
// ============================================

function formatSol(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return `${amount.toFixed(4)} SOL`;
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// ============================================
// Connection Status Header
// ============================================

function ConnectionHeader() {
  const { isLoading, refresh } = useRealTimeDashboardStats();
  const { config, toggleTrading } = useRealTimeConfig();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleTrading = async () => {
    if (!config) return;
    setIsToggling(true);
    try {
      await toggleTrading(!config.tradingEnabled);
    } catch (err) {
      console.error("Failed to toggle trading:", err);
    } finally {
      setIsToggling(false);
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
        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>

      <Button
        variant={config?.tradingEnabled ? "solid" : "ghost"}
        size="sm"
        onClick={handleToggleTrading}
        disabled={isToggling || !config}
        className={
          config?.tradingEnabled
            ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
            : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
        }
      >
        <Power className="w-4 h-4 mr-1" />
        {config?.tradingEnabled ? "Stop" : "Start"}
      </Button>
    </div>
  );
}

// ============================================
// Position Card (Compact)
// ============================================

interface PositionCardProps {
  position: Position;
  onClose: (id: string) => void;
}

function PositionCard({ position, onClose }: PositionCardProps) {
  const pnlPercent = position.entryPriceSol
    ? ((position.currentPrice || position.entryPriceSol) / position.entryPriceSol - 1) * 100
    : 0;
  const isProfit = pnlPercent >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              position.status === "OPEN"
                ? "bg-green-400"
                : position.status === "STOPPED_OUT"
                  ? "bg-red-400"
                  : "bg-gray-400"
            }`}
          />
          <span className="font-mono font-medium text-white text-sm">
            {position.tokenSymbol || shortenAddress(position.tokenMint)}
          </span>
        </div>
        <span
          className={`font-mono font-bold text-sm ${
            isProfit ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatPercent(pnlPercent)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Entry: {formatSol(position.entryAmountSol)}</span>
        <div className="flex items-center gap-1">
          {position.target1Hit && <Target className="w-3 h-3 text-green-400" />}
          {position.target2Hit && <Target className="w-3 h-3 text-cyan-400" />}
          {position.status === "OPEN" && (
            <button
              onClick={() => onClose(position.id)}
              className="ml-1 px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Positions Panel
// ============================================

function PositionsPanel() {
  const { positions, closePosition, isLoading } = useRealTimePositions();

  const handleClose = async (id: string) => {
    try {
      await closePosition(id);
    } catch (err) {
      console.error("Failed to close position:", err);
    }
  };

  const openPositions = positions.filter((p) => p.status === "OPEN");

  return (
    <div className="h-full flex flex-col rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#c4f70e]" />
          <span className="text-sm font-medium text-white">Active Positions</span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#c4f70e]/20 text-[#c4f70e]">
            {openPositions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {openPositions.length > 0 ? (
            openPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onClose={handleClose}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-white/40"
            >
              <Target className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">No open positions</span>
              <span className="text-[10px] text-white/30 mt-1">
                Positions appear when signals execute
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// Signals Panel
// ============================================

function SignalsPanel() {
  const { signals, isLoading } = useRealTimeWalletSignals();

  return (
    <div className="h-full flex flex-col rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#c4f70e]" />
          <span className="text-sm font-medium text-white">Recent Signals</span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#c4f70e]/20 text-[#c4f70e]">
            {signals.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {signals.length > 0 ? (
            signals.slice(0, 10).map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-white/40"
            >
              <Zap className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">No recent signals</span>
              <span className="text-[10px] text-white/30 mt-1">
                Signals appear when wallets trade
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: TradingSignal }) {
  const strengthColors: Record<string, string> = {
    STRONG: "border-green-500/30 bg-green-500/10",
    WEAK: "border-yellow-500/30 bg-yellow-500/10",
    PENDING: "border-blue-500/30 bg-blue-500/10",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`p-2.5 rounded-lg border ${strengthColors[signal.signalStrength] || strengthColors.PENDING}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
              signal.signalStrength === "STRONG"
                ? "bg-green-500/20 text-green-400"
                : signal.signalStrength === "WEAK"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {signal.signalStrength}
          </span>
          <span className="font-mono text-xs text-white">
            {signal.tokenSymbol || shortenAddress(signal.tokenMint)}
          </span>
        </div>
        <span className="text-[10px] text-white/40">
          {formatSol(signal.buyAmountSol)}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-white/50">
        from {signal.wallet?.label || "Unknown"} •{" "}
        {new Date(signal.createdAt).toLocaleTimeString()}
      </div>
    </motion.div>
  );
}

// ============================================
// Migration Feed Panel (Real-time)
// ============================================

function RealTimeMigrationPanel() {
  const { rankedMigrations, stats, isLoading, refresh, analyzeMigration, refreshMigrationData } =
    useRealTimeMigrationFeed();

  const readyToTrade = rankedMigrations.filter((r) => r.isReadyToTrade);
  const monitoring = rankedMigrations.filter((r) => !r.isReadyToTrade);

  return (
    <div className="h-full flex flex-col rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#c4f70e]" />
          <span className="text-sm font-medium text-white">Migration Feed</span>
          {stats && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#c4f70e]/20 text-[#c4f70e]">
              {stats.totalActive} active
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white/60 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs border-b border-white/5 bg-black/20">
          <span className="text-green-400">
            <Target className="w-3 h-3 inline mr-1" />
            {stats.readyToTrade} ready
          </span>
          <span className="text-amber-400">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            {stats.pendingAnalysis} pending
          </span>
          <span className="text-[#c4f70e]">
            <Wallet className="w-3 h-3 inline mr-1" />
            {stats.withWalletSignals} signals
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Ready to trade */}
        {readyToTrade.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-green-400">
                Ready to Trade ({readyToTrade.length})
              </span>
            </div>
            <AnimatePresence mode="popLayout">
              {readyToTrade.map((ranked) => (
                <MigrationTokenCard
                  key={ranked.tokenMint}
                  ranked={ranked}
                  onAnalyze={analyzeMigration}
                  onRefresh={refreshMigrationData}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Monitoring */}
        {monitoring.length > 0 && (
          <div>
            {readyToTrade.length > 0 && (
              <div className="flex items-center gap-2 mb-2 mt-4">
                <Activity className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs font-medium text-white/50">
                  Monitoring ({monitoring.length})
                </span>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {monitoring.slice(0, 10).map((ranked) => (
                <MigrationTokenCard
                  key={ranked.tokenMint}
                  ranked={ranked}
                  onAnalyze={analyzeMigration}
                  onRefresh={refreshMigrationData}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {rankedMigrations.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-white/40">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No migrations detected</span>
            <span className="text-[10px] text-white/30 mt-1">
              Waiting for new migrations...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Config Summary
// ============================================

function ConfigSummary() {
  const { config } = useRealTimeConfig();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!config) return null;

  return (
    <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/60">Trading Configuration</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-white/5 flex flex-wrap gap-4 text-xs text-white/50">
              <span>
                <span className="text-white/30">Target 1:</span>{" "}
                <span className="text-green-400">+{config.target1Percent}%</span>{" "}
                (sell {config.target1SellPercent}%)
              </span>
              <span>
                <span className="text-white/30">Target 2:</span>{" "}
                <span className="text-cyan-400">+{config.target2Percent}%</span>{" "}
                (sell remaining)
              </span>
              <span>
                <span className="text-white/30">Stop Loss:</span>{" "}
                <span className="text-red-400">-{config.stopLossPercent}%</span>
              </span>
              <span>
                <span className="text-white/30">Slippage:</span>{" "}
                {config.maxSlippageBps / 100}%
              </span>
              <span>
                <span className="text-white/30">Min Tweets:</span>{" "}
                {config.minTweetCount}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function SmartTradingDashboard() {
  return (
    <div className="space-y-4">
      {/* Header with connection status and controls */}
      <ConnectionHeader />

      {/* Main content grid */}
      <div className="flex gap-4">
        {/* Left: Collapsible Live Activity Feed */}
        <div className="h-[500px] flex-shrink-0">
          <CollapsibleSidePanel
            icon={<Activity className="w-5 h-5" />}
            title="Live Activity"
            direction="left"
            defaultCollapsed={true}
            collapsedWidth={48}
            expandedWidth="280px"
            className="h-full"
          >
            <LiveActivityFeed maxItems={30} />
          </CollapsibleSidePanel>
        </div>

        {/* Center: Migration Feed (grows to fill space) */}
        <div className="flex-1 min-w-0 h-[500px]">
          <RealTimeMigrationPanel />
        </div>

        {/* Right: Positions + Signals */}
        <div className="w-[300px] flex-shrink-0 space-y-4">
          <div className="h-[240px]">
            <PositionsPanel />
          </div>
          <div className="h-[240px]">
            <SignalsPanel />
          </div>
        </div>
      </div>

      {/* Bottom row: Wallets + Config */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <TrackedWalletsPanel />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <ConfigSummary />
        </div>
      </div>
    </div>
  );
}
