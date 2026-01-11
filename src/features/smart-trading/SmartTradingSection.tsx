"use client";

import { useState } from "react";
import { Panel } from "@/components/design-system";
import { Button } from "@/components/ui";
import { useSmartTradingContext } from "./context";
import { MigrationFeedPanel } from "./components/MigrationFeedPanel";
import { TrackedWalletsPanel } from "./components/TrackedWalletsPanel";
import type { Position, TradingSignal } from "./types";
import {
  AlertCircle,
  RefreshCw,
  Power,
  Target,
  Zap,
  Activity,
} from "lucide-react";

// Format SOL amount
function formatSol(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return `${amount.toFixed(4)} SOL`;
}

// Format percentage
function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// Shorten address
function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Signal strength badge
function SignalBadge({ strength }: { strength: string }) {
  const colors: Record<string, string> = {
    STRONG: "bg-green-500/20 text-green-400 border-green-500/30",
    WEAK: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[strength] || colors.PENDING}`}
    >
      {strength}
    </span>
  );
}

// Position status badge
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-green-500/20 text-green-400 border-green-500/30",
    PARTIALLY_CLOSED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CLOSED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    STOPPED_OUT: "bg-red-500/20 text-red-400 border-red-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[status] || colors.PENDING}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// Signal row component
function SignalRow({ signal }: { signal: TradingSignal }) {
  return (
    <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <SignalBadge strength={signal.signalStrength} />
        <div>
          <p className="font-medium text-white font-mono">
            {signal.tokenSymbol || shortenAddress(signal.tokenMint)}
          </p>
          <p className="text-xs text-white/50">
            from {signal.wallet?.label || "Unknown"} · {formatSol(signal.buyAmountSol)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-white/50">
          {signal.sentimentScore != null
            ? `Sentiment: ${(signal.sentimentScore * 100).toFixed(0)}%`
            : "Analyzing..."}
        </p>
        <p className="text-xs text-white/40">
          {new Date(signal.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

// Position row component
function PositionRow({
  position,
  onClose,
}: {
  position: Position;
  onClose: (id: string) => void;
}) {
  const pnlPercent = position.entryPriceSol
    ? ((position.currentPrice || position.entryPriceSol) / position.entryPriceSol - 1) * 100
    : 0;
  const isProfit = pnlPercent >= 0;

  return (
    <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <StatusBadge status={position.status} />
        <div>
          <p className="font-medium text-white font-mono">
            {position.tokenSymbol || shortenAddress(position.tokenMint)}
          </p>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>Entry: {formatSol(position.entryAmountSol)}</span>
            <span>•</span>
            <span>Tokens: {position.remainingTokens.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`font-mono font-semibold ${isProfit ? "text-green-400" : "text-red-400"}`}>
            {formatPercent(pnlPercent)}
          </p>
          <div className="flex items-center gap-1 text-xs text-white/40">
            {position.target1Hit && <Target className="w-3 h-3 text-green-400" />}
            {position.target2Hit && <Target className="w-3 h-3 text-cyan-400" />}
            {position.stoppedOut && <AlertCircle className="w-3 h-3 text-red-400" />}
          </div>
        </div>
        {position.status === "OPEN" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClose(position.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

export function SmartTradingSection() {
  // Use shared context instead of separate hook (prevents duplicate API calls!)
  const {
    config,
    dashboardStats,
    signals,
    positions,
    isLoading,
    error,
    lastUpdated,
    refresh,
    toggleTrading,
    closePosition,
  } = useSmartTradingContext();

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

  const handleClosePosition = async (positionId: string) => {
    try {
      await closePosition(positionId);
    } catch (err) {
      console.error("Failed to close position:", err);
    }
  };

  if (isLoading && !dashboardStats) {
    return (
      <section className="section-content">
        <Panel className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-white/50" />
          <span className="ml-3 text-white/50">Loading smart trading data...</span>
        </Panel>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section-content">
        <Panel className="flex items-center justify-center py-12 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <span className="ml-3">Error: {error}</span>
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-4">
            Retry
          </Button>
        </Panel>
      </section>
    );
  }

  return (
    <section className="section-content space-y-4">
      {/* Header with controls */}
      <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full ${config?.tradingEnabled ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
          />
          <div>
            <h2 className="text-lg font-semibold text-white">
              Smart Money Copy Trading
            </h2>
            <p className="text-sm text-white/50">
              {config?.tradingEnabled ? "Trading is LIVE" : "Trading is PAUSED"}
              {lastUpdated && ` • Updated ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant={config?.tradingEnabled ? "solid" : "ghost"}
            size="sm"
            onClick={handleToggleTrading}
            disabled={isToggling}
            className={
              config?.tradingEnabled
                ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
            }
          >
            <Power className="w-4 h-4 mr-1" />
            {config?.tradingEnabled ? "Stop Trading" : "Start Trading"}
          </Button>
        </div>
      </Panel>

      {/* Two columns: Wallets + Signals | Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Tracked Wallets + Recent Signals */}
        <div className="space-y-4">
          {/* Tracked Wallets - New clickable panel with modal */}
          <TrackedWalletsPanel />

          {/* Recent Signals */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Recent Signals ({signals.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {signals.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-4">No recent signals</p>
              ) : (
                signals.map((signal) => <SignalRow key={signal.id} signal={signal} />)
              )}
            </div>
          </Panel>
        </div>

        {/* Right column: Open Positions */}
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide flex items-center gap-2">
              <Target className="w-4 h-4" />
              Open Positions ({positions.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-[540px] overflow-y-auto">
            {positions.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-8">
                No open positions
                <br />
                <span className="text-xs">
                  Positions will appear here when signals are executed
                </span>
              </p>
            ) : (
              positions.map((position) => (
                <PositionRow
                  key={position.id}
                  position={position}
                  onClose={handleClosePosition}
                />
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* Migration Feed Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#c4f70e]" />
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
            Migration Tracker
          </h3>
          <span className="text-xs text-white/30">
            Real-time pump.fun → Raydium migrations
          </span>
        </div>
        <MigrationFeedPanel
          limit={15}
          refreshIntervalMs={5000}
          showTrackInput={true}
        />
      </div>

      {/* Trading config summary */}
      {config && (
        <Panel className="text-xs text-white/40 flex flex-wrap gap-4">
          <span>Target 1: +{config.target1Percent}% (sell {config.target1SellPercent}%)</span>
          <span>Target 2: +{config.target2Percent}% (sell remaining)</span>
          <span>Stop Loss: -{config.stopLossPercent}%</span>
          <span>Max Slippage: {config.maxSlippageBps / 100}%</span>
          <span>Min Tweets: {config.minTweetCount}</span>
        </Panel>
      )}
    </section>
  );
}
