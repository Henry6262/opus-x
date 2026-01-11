"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Brain,
  Wallet,
  Clock,
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  Activity,
  Target,
  TrendingUp,
} from "lucide-react";
import { StatusPill } from "@/components/design-system";
import { MigrationTokenCard } from "./MigrationTokenCard";
import { useMigrationFeed } from "../hooks/useMigrationFeed";
import type { MigrationFeedStats } from "../types";

interface MigrationFeedPanelProps {
  /** Maximum number of migrations to display */
  limit?: number;
  /** Polling interval in milliseconds */
  refreshIntervalMs?: number;
  /** Whether to show the manual track input */
  showTrackInput?: boolean;
}

export function MigrationFeedPanel({
  limit = 20,
  refreshIntervalMs = 5000,
  showTrackInput = true,
}: MigrationFeedPanelProps) {
  const {
    rankedMigrations,
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh,
    trackMigration,
    analyzeMigration,
    refreshMigrationData,
  } = useMigrationFeed({ limit, refreshIntervalMs });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackInput, setTrackInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTrack = async () => {
    if (!trackInput.trim()) return;

    setIsTracking(true);
    setTrackError(null);

    try {
      await trackMigration(trackInput.trim());
      setTrackInput("");
      setShowTrackForm(false);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "Failed to track token");
    } finally {
      setIsTracking(false);
    }
  };

  const handleAnalyze = async (tokenMint: string) => {
    await analyzeMigration(tokenMint);
  };

  const handleRefreshToken = async (tokenMint: string) => {
    await refreshMigrationData(tokenMint);
  };

  // Separate ready-to-trade from others
  const readyToTrade = rankedMigrations.filter((r) => r.isReadyToTrade);
  const monitoring = rankedMigrations.filter((r) => !r.isReadyToTrade);

  return (
    <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#c4f70e]/10">
              <Activity className="w-5 h-5 text-[#c4f70e]" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Migration Feed</h2>
              <p className="text-xs text-white/40">
                Real-time token migration tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Last updated */}
            {lastUpdated && (
              <span className="text-xs text-white/30">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}

            {/* Track button */}
            {showTrackInput && (
              <button
                onClick={() => setShowTrackForm(!showTrackForm)}
                className={`p-2 rounded-lg transition-colors ${
                  showTrackForm
                    ? "bg-[#c4f70e]/20 text-[#c4f70e]"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
                title="Track token manually"
              >
                {showTrackForm ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw
                className={`w-4 h-4 text-white/60 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Track input form */}
        <AnimatePresence>
          {showTrackForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="Enter token mint address..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c4f70e]/50"
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                />
                <button
                  onClick={handleTrack}
                  disabled={isTracking || !trackInput.trim()}
                  className="px-4 py-2 rounded-lg bg-[#c4f70e] text-black font-medium text-sm hover:bg-[#d4ff1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTracking ? "Tracking..." : "Track"}
                </button>
              </div>
              {trackError && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{trackError}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats bar */}
      {stats && <FeedStats stats={stats} />}

      {/* Content */}
      <div className="p-4">
        {/* Loading state */}
        {isLoading && rankedMigrations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-[#c4f70e] animate-spin mb-3" />
            <p className="text-sm text-white/60">Loading migration feed...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
            <p className="text-sm text-white/60">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 rounded-lg bg-white/5 text-sm text-white/60 hover:bg-white/10 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && rankedMigrations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Activity className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-sm text-white/60">No migrations being tracked</p>
            <p className="text-xs text-white/30 mt-1">
              Add a token address above or wait for migrations to be detected
            </p>
          </div>
        )}

        {/* Ready to trade section */}
        {readyToTrade.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">
                Ready to Trade
              </span>
              <StatusPill tone="live" className="text-[10px]">
                {readyToTrade.length}
              </StatusPill>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {readyToTrade.map((ranked) => (
                  <MigrationTokenCard
                    key={ranked.migration.tokenMint}
                    ranked={ranked}
                    onAnalyze={handleAnalyze}
                    onRefresh={handleRefreshToken}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Monitoring section */}
        {monitoring.length > 0 && (
          <div>
            {readyToTrade.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white/60">
                  Monitoring
                </span>
                <span className="text-xs text-white/30">
                  ({monitoring.length})
                </span>
              </div>
            )}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {monitoring.map((ranked) => (
                  <MigrationTokenCard
                    key={ranked.migration.tokenMint}
                    ranked={ranked}
                    onAnalyze={handleAnalyze}
                    onRefresh={handleRefreshToken}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedStats({ stats }: { stats: MigrationFeedStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/5">
      <StatItem
        icon={<Activity className="w-4 h-4" />}
        label="Active"
        value={stats.totalActive}
        color="text-white"
      />
      <StatItem
        icon={<Brain className="w-4 h-4" />}
        label="Pending AI"
        value={stats.pendingAnalysis}
        color="text-amber-400"
      />
      <StatItem
        icon={<Target className="w-4 h-4" />}
        label="Ready"
        value={stats.readyToTrade}
        color="text-green-400"
      />
      <StatItem
        icon={<Wallet className="w-4 h-4" />}
        label="With Signals"
        value={stats.withWalletSignals}
        color="text-[#c4f70e]"
      />
      <StatItem
        icon={<Clock className="w-4 h-4" />}
        label="Expired"
        value={stats.expiredToday}
        color="text-white/40"
      />
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-3 bg-black/20 text-center">
      <div className={`flex items-center justify-center gap-1.5 ${color} mb-1`}>
        {icon}
        <span className="font-mono font-bold text-lg">{value}</span>
      </div>
      <span className="text-[10px] text-white/40 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 5) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
}
