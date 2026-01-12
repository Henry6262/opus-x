"use client";

import { useState, useMemo } from "react";
import { SimulationTwitterSection } from "@/features/simulation-twitter";
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
  const [activeView, setActiveView] = useState<ActiveView>("smart-trading");

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
        <div className="hero-section">
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
          <div className="mb-4">
            <TraderProfileCard
              stats={dashboardStats}
              config={config}
              positions={positions}
              history={history}
              activeView={activeView}
              onViewChange={setActiveView}
            />
          </div>

          {/* Feature Content */}
          {activeView === "smart-trading" && (
            <div className="space-y-4">
              <SmartTradingDashboard />
            </div>
          )}
          {activeView === "simulation-twitter" && (
            <div className="space-y-4">
              <SimulationTwitterSection />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
