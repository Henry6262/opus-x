"use client";

import { useState } from "react";
import { Panel } from "@/components/design-system";
import { Button } from "@/components/ui";
import { useSmartTrading } from "./hooks/useSmartTrading";
import type { Position, TradingSignal, TrackedWallet } from "./types";
import {
  Activity,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Power,
  Eye,
  Target,
  Users,
  Zap,
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

// Stats card component
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = "text-white",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-white/50 uppercase tracking-wide">{label}</p>
        <p className={`text-base font-mono font-semibold ${color}`}>{value}</p>
        {subValue && <p className="text-[11px] text-white/40">{subValue}</p>}
      </div>
    </div>
  );
}

// Wallet row component
function WalletRow({ wallet }: { wallet: TrackedWallet }) {
  return (
    <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        {wallet.twitterAvatar ? (
          <img
            src={wallet.twitterAvatar}
            alt={wallet.label}
            className="w-10 h-10 rounded-full border border-gray-700 object-cover"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${wallet.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
            }`}>
            {wallet.label.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-white text-sm">
              {wallet.twitterName || wallet.label}
            </p>
            {wallet.twitterVerified && (
              <span className="text-blue-400" title="Verified">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.435.716 2.69 1.782 3.407-.123.498-.192 1.02-.192 1.553 0 2.98 2.42 5.4 5.4 5.4.61 0 1.19-.11 1.734-.312.637.586 1.48.947 2.412.947 1.836 0 3.325-1.39 3.522-3.218.42-.03.835-.115 1.235-.247 1.91.95 4.263-.44 4.263-2.583 0-.53-.07-1.05-.192-1.553 1.066-.717 1.782-1.972 1.782-3.407zM10.153 15.65c-.244.25-.64.25-.884 0l-3.004-3.04c-.243-.246-.243-.646 0-.892.244-.245.64-.245.884 0l2.56 2.592 5.37-5.434c.244-.246.64-.246.883 0 .244.246.244.646 0 .892l-5.81 5.88z" />
                </svg>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {wallet.twitterUsername && (
              <a
                href={`https://twitter.com/${wallet.twitterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
              >
                @{wallet.twitterUsername}
              </a>
            )}
            <span className="text-xs text-white/30 font-mono">
              {shortenAddress(wallet.address)}
            </span>
          </div>
        </div>
      </div>
      <a
        href={`https://solscan.io/account/${wallet.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
      >
        <Eye className="w-3 h-3" />
      </a>
    </div>
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
  const {
    config,
    stats,
    wallets,
    signals,
    positions,
    isLoading,
    error,
    lastUpdated,
    refresh,
    toggleTrading,
    closePosition,
  } = useSmartTrading({
    refreshIntervalMs: 10000,
  });

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

  if (isLoading && !stats) {
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

      {/* Trader profile + compact metrics */}
      <Panel className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <div className="md:w-1/3 flex items-center justify-center">
          <img
            src="/character/super-router.png"
            alt="SuperRouter trader profile"
            className="w-40 h-40 rounded-2xl object-cover border border-white/10 shadow-lg shadow-cyan-500/20"
          />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-[0.2em]">
              Smart Money Profile
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white flex items-center gap-2">
              SuperRouter Trader
              {config?.tradingEnabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/40">
                  Live
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Copying high-conviction wallets across Solana in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Wallet}
              label="Balance"
              value={formatSol(stats?.walletBalance)}
              color="text-cyan-400"
            />
            <StatCard
              icon={stats?.totalPnL && stats.totalPnL >= 0 ? TrendingUp : TrendingDown}
              label="Total P&L"
              value={formatSol(stats?.totalPnL)}
              color={stats?.totalPnL && stats.totalPnL >= 0 ? "text-green-400" : "text-red-400"}
            />
            <StatCard
              icon={Activity}
              label="Open Positions"
              value={stats?.openPositions?.toString() || "0"}
              subValue={`of ${config?.maxOpenPositions || 5} max`}
              color="text-yellow-400"
            />
            <StatCard
              icon={Zap}
              label="Position Size"
              value={formatSol(stats?.recommendedPositionSize)}
              subValue={`${config?.maxPositionPercent || 7}% of wallet`}
              color="text-purple-400"
            />
          </div>
        </div>
      </Panel>

      {/* Two columns: Wallets + Signals | Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Tracked Wallets + Recent Signals */}
        <div className="space-y-4">
          {/* Tracked Wallets */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tracked Wallets ({wallets.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {wallets.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-4">No wallets tracked</p>
              ) : (
                wallets.map((wallet) => <WalletRow key={wallet.id} wallet={wallet} />)
              )}
            </div>
          </Panel>

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
