"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/design-system";
import { Button } from "@/components/ui";
import { useSmartTradingContext } from "./context";
import { smartTradingService } from "./service";
import { MigrationFeedPanel } from "./components/MigrationFeedPanel";
import { TrackedWalletsPanel } from "./components/TrackedWalletsPanel";
import type { Position, TradingSignal, TradingLogItem } from "./types";
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

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Shorten address
function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Signal strength badge
function SignalBadge({ strength, t }: { strength: string; t: (key: string) => string }) {
  const colors: Record<string, string> = {
    STRONG: "bg-green-500/20 text-green-400 border-green-500/30",
    WEAK: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const labels: Record<string, string> = {
    STRONG: t("strength.strong"),
    WEAK: t("strength.weak"),
    PENDING: t("status.pending"),
    REJECTED: t("status.rejected"),
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[strength] || colors.PENDING}`}
    >
      {labels[strength] || strength}
    </span>
  );
}

// Position status badge
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-green-500/20 text-green-400 border-green-500/30",
    PARTIALLY_CLOSED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CLOSED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    STOPPED_OUT: "bg-red-500/20 text-red-400 border-red-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  const labels: Record<string, string> = {
    OPEN: t("status.open"),
    PARTIALLY_CLOSED: t("status.partiallyClosed"),
    CLOSED: t("status.closed"),
    STOPPED_OUT: t("status.stoppedOut"),
    PENDING: t("status.pending"),
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[status] || colors.PENDING}`}
    >
      {labels[status] || status.replace("_", " ")}
    </span>
  );
}

// Signal row component - Premium design
function SignalRow({ signal, t }: { signal: TradingSignal; t: (key: string) => string }) {
  const strengthColors = {
    STRONG: "from-green-500/20 to-green-500/5 border-green-500/30",
    WEAK: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    PENDING: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    REJECTED: "from-red-500/20 to-red-500/5 border-red-500/30",
  };

  const strengthIcons = {
    STRONG: "🚀",
    WEAK: "⚡",
    PENDING: "⏳",
    REJECTED: "❌",
  };

  const sentiment = signal.sentimentScore != null ? (signal.sentimentScore * 100).toFixed(0) : null;

  return (
    <div className={`relative p-4 rounded-xl bg-gradient-to-br ${strengthColors[signal.signalStrength] || strengthColors.PENDING} border backdrop-blur-sm hover:scale-[1.02] transition-all duration-200`}>
      {/* Top row: Icon + Token + Strength */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{strengthIcons[signal.signalStrength] || "📊"}</span>
          <div>
            <p className="font-bold text-white font-mono text-lg">
              {signal.tokenSymbol || shortenAddress(signal.tokenMint)}
            </p>
            <p className="text-xs text-white/60 flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40"></span>
              {signal.wallet?.label || t("unknown")}
            </p>
          </div>
        </div>
        <SignalBadge strength={signal.signalStrength} t={t} />
      </div>

      {/* Bottom row: Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          {/* SOL Amount */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">💰</span>
            <span className="font-mono font-semibold text-white/90">{formatSol(signal.buyAmountSol)}</span>
          </div>

          {/* Sentiment */}
          {sentiment && (
            <div className="flex items-center gap-1.5">
              <span className="text-white/40">🎯</span>
              <span className="font-mono font-semibold text-white/90">{sentiment}%</span>
            </div>
          )}
        </div>

        {/* Time */}
        <span className="text-white/40 font-mono">
          {new Date(signal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Pulse effect for STRONG signals */}
      {signal.signalStrength === "STRONG" && (
        <div className="absolute inset-0 rounded-xl bg-green-500/10 animate-pulse pointer-events-none"></div>
      )}
    </div>
  );
}

// Position row component
function PositionRow({
  position,
  onClose,
  t,
  tSignals,
  tCommon,
}: {
  position: Position;
  onClose: (id: string) => void;
  t: (key: string) => string;
  tSignals: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const pnlPercent = position.entryPriceSol
    ? ((position.currentPrice || position.entryPriceSol) / position.entryPriceSol - 1) * 100
    : 0;
  const isProfit = pnlPercent >= 0;

  return (
    <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <StatusBadge status={position.status} t={tSignals} />
        <div>
          <p className="font-medium text-white font-mono">
            {position.tokenSymbol || shortenAddress(position.tokenMint)}
          </p>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>{t("position.entry")}: {formatSol(position.entryAmountSol)}</span>
            <span>•</span>
            <span>{t("position.tokens")}: {position.remainingTokens.toFixed(2)}</span>
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
            {tCommon("close")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SmartTradingSection() {
  const t = useTranslations("smartTrading");
  const tSignals = useTranslations("signals");
  const tMigration = useTranslations("migration");
  const tCommon = useTranslations("common");

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
  const [tpSlLogs, setTpSlLogs] = useState<TradingLogItem[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const lastLogFetchRef = useRef(0);

  const fetchTpSlLogs = async () => {
    setIsLogsLoading(true);
    try {
      const response = await smartTradingService.getTradingLogs({
        category: "POSITION",
        limit: 40,
      });
      const items = response.items.filter((item) => item.message.includes("TP/SL"));
      setTpSlLogs(items);
    } catch (err) {
      console.error("Failed to fetch TP/SL logs:", err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const maybeFetchTpSlLogs = async () => {
    const now = Date.now();
    if (now - lastLogFetchRef.current < 8000) {
      return;
    }
    lastLogFetchRef.current = now;
    await fetchTpSlLogs();
  };

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

  useEffect(() => {
    maybeFetchTpSlLogs();
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    maybeFetchTpSlLogs();
  }, [lastUpdated]);

  useEffect(() => {
    if (positions.length === 0) return;
    maybeFetchTpSlLogs();
  }, [positions]);

  if (isLoading && !dashboardStats) {
    return (
      <section className="section-content">
        <Panel className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-white/50" />
          <span className="ml-3 text-white/50">{t("loadingData")}</span>
        </Panel>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section-content">
        <Panel className="flex items-center justify-center py-12 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <span className="ml-3">{tCommon("error")}: {error}</span>
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-4">
            {tCommon("retry")}
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
              {t("title")}
            </h2>
            <p className="text-sm text-white/50">
              {config?.tradingEnabled ? t("tradingLive") : t("tradingPaused")}
              {lastUpdated && ` • ${t("updated", { time: lastUpdated.toLocaleTimeString() })}`}
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
            {config?.tradingEnabled ? t("stopTrading") : t("startTrading")}
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
          <Panel className="bg-gradient-to-br from-white/5 to-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                {t("recentSignals")}
                <span className="ml-1 px-2 py-0.5 text-xs font-mono bg-white/10 rounded-full">
                  {signals.length}
                </span>
              </h3>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {signals.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p className="text-sm text-white/40">{t("noRecentSignals")}</p>
                  <p className="text-xs text-white/30 mt-1">Signals will appear when wallets make trades</p>
                </div>
              ) : (
                signals.map((signal) => <SignalRow key={signal.id} signal={signal} t={tSignals} />)
              )}
            </div>
          </Panel>
        </div>

        {/* Right column: Open Positions */}
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide flex items-center gap-2">
                <Target className="w-4 h-4" />
                {t("openPositions")} ({positions.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {positions.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-8">
                  {t("noOpenPositions")}
                  <br />
                  <span className="text-xs">
                    {t("positionsWillAppear")}
                  </span>
                </p>
              ) : (
                positions.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    onClose={handleClosePosition}
                    t={t}
                    tSignals={tSignals}
                    tCommon={tCommon}
                  />
                ))
              )}
            </div>
          </Panel>

          <Panel className="bg-gradient-to-br from-white/5 to-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#c4f70e]" />
                TP/SL Decision Log
              </h3>
              <Button variant="ghost" size="sm" onClick={fetchTpSlLogs} disabled={isLogsLoading}>
                <RefreshCw className={`w-4 h-4 ${isLogsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {tpSlLogs.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-6">
                  No TP/SL decisions logged yet.
                </p>
              ) : (
                tpSlLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span className="font-mono">{formatTime(log.createdAt)}</span>
                      <span className="uppercase">{log.level}</span>
                    </div>
                    <div className="text-sm text-white/80 mt-1">{log.message}</div>
                    {log.data && (
                      <div className="text-xs text-white/40 mt-1 font-mono">
                        {log.data?.tokenMint ? shortenAddress(String(log.data.tokenMint)) : ""}
                        {log.data?.action ? ` • ${String(log.data.action)}` : ""}
                        {typeof log.data?.currentPrice === "number"
                          ? ` • ${log.data.currentPrice.toFixed(6)}`
                          : ""}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Migration Feed Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#c4f70e]" />
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
            {tMigration("tracker")}
          </h3>
          <span className="text-xs text-white/30">
            {tMigration("realtimePumpFun")}
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
          <span>{t("config.target1")}: +{config.target1Percent}% ({t("config.sell", { percent: config.target1SellPercent })})</span>
          <span>{t("config.target2")}: +{config.target2Percent}% ({t("config.sellRemaining")})</span>
          <span>{t("config.stopLoss")}: -{config.stopLossPercent}%</span>
          <span>{t("config.maxSlippage")}: {config.maxSlippageBps / 100}%</span>
          <span>{t("config.minTweets")}: {config.minTweetCount}</span>
        </Panel>
      )}
    </section>
  );
}
