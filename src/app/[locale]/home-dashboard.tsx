"use client";


import { useState, useMemo } from "react";
import {
  SmartTradingDashboard,
  SmartTradingProvider,
  useSmartTradingConfig,
  useDashboardStats,
  usePositions,
  useMigrationFeedContext,
  useWalletSignals,
} from "@/features/smart-trading";
import { TraderProfileCard } from "@/features/smart-trading/components/TraderProfileCard";
import { Terminal, TerminalProvider, useTerminalNarrator } from "@/features/terminal";
import { useAiMood } from "@/hooks/useAiMood";
import { VibrCoder } from "@/components/VibrCoder";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Map AI mood to VibrCoder animation state
function getVibrCoderState(
  mood: string
): "idle" | "analyzing" | "rejecting" | "buying" | "incoming" | "generating" | "posting" {
  switch (mood) {
    case "scanning":
    case "executing":
      return "analyzing";
    default:
      return "idle";
  }
}

type ActiveView = "simulation-twitter" | "smart-trading";

export function HomeDashboard() {
  return (
    <TerminalProvider>
      <SmartTradingProvider>
        <DashboardContent />
      </SmartTradingProvider>
    </TerminalProvider>
  );
}

function DashboardContent() {
  const activeView: ActiveView = "smart-trading";

  // Smart Trading data from unified WebSocket-first context (live updates!)
  const { config } = useSmartTradingConfig();
  const { dashboardStats } = useDashboardStats();
  const { positions, history } = usePositions();
  const { rankedMigrations } = useMigrationFeedContext();
  const { signals } = useWalletSignals();

  // Memoize narrator state to prevent infinite re-renders (object reference stability)
  const narratorState = useMemo(
    () => ({
      positions,
      history,
      rankedMigrations,
      signals,
      tradingEnabled: config?.tradingEnabled,
    }),
    [positions, history, rankedMigrations, signals, config?.tradingEnabled]
  );

  // AI Terminal Narrator - generates AI reasoning messages based on trading events
  useTerminalNarrator({
    state: narratorState,
    throttleMs: 5000,
    idleIntervalMs: 20000,
    enabled: true,
  });

  // AI Mood System - dynamically calculates mood based on migration data
  const { mood: aiMood, pnl, reason } = useAiMood({
    tokens: [], // No longer using pump-history tokens
    isActive: true,
    isExecuting: false,
  });

  return (
    <>
      <main className={`cockpit-layout ai-mood ai-mood-${aiMood}`}>
        {/* ===== TOP SECTION: VIBR CODER VIDEO + TERMINAL ===== */}
        <div className="hero-section relative">
          <div className="absolute top-14 right-2 md:top-4 md:right-4 z-20">
            <LanguageSwitcher className="shadow-[0_10px_30px_rgba(0,0,0,0.35)] border-white/15 bg-black/50 backdrop-blur-xl scale-75 md:scale-100 origin-top-right" />
          </div>
          <VibrCoder
            state={getVibrCoderState(aiMood)}
            statusText={aiMood.toUpperCase()}
            reason={reason}
            pnl={pnl}
          />
          <div className="hero-terminal">
            <Terminal />
          </div>
        </div>

        {/* ===== BOTTOM SECTION: THE DASHBOARD ===== */}
        <div className="dashboard-panel">
          {/* Trader Profile Card with Integrated Tabs */}
          <div className="mb-4 mt-4">
            <TraderProfileCard
              stats={dashboardStats}
              config={config}
              positions={positions}
              history={history}
            />
          </div>

          {/* Feature Content */}
          {activeView === "smart-trading" && (
            <div className="space-y-4">
              <SmartTradingDashboard />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
