"use client";

import { useState } from "react";
import { PumpHistorySection } from "@/features/pump-history";
import { SimulationTwitterSection } from "@/features/simulation-twitter";
import {
  SmartTradingSection,
  SmartTradingProvider,
  useSmartTradingContext,
} from "@/features/smart-trading";
import { TraderProfileCard } from "@/features/smart-trading/components/TraderProfileCard";
import { Terminal, TerminalProvider } from "@/features/terminal";
import type { TerminalLogEntry } from "@/features/terminal";
import { useAiMood } from "@/hooks/useAiMood";
import { usePumpTokens } from "@/features/pump-history/hooks/usePumpTokens";
import { VibrCoder } from "@/components/VibrCoder";
import { Twitter, TrendingUp } from "lucide-react";
import { SmartMoneyAnimation } from "@/components/animations";

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

const terminalEvents: TerminalLogEntry[] = [
  {
    id: "boot",
    time: "01:12:24",
    text: "[BOOT] SuperRouter nodes synchronized",
    color: "var(--matrix-green)",
  },
  {
    id: "track",
    time: "01:12:28",
    text: "[TWITTER] Tracking 12 curated accounts",
    color: "var(--solana-cyan)",
  },
  {
    id: "pump",
    time: "01:12:31",
    text: "[PUMP] Migration feed connected · 124 tokens queued",
    color: "var(--warning-amber)",
  },
  {
    id: "ai",
    time: "01:12:40",
    text: "[AI] Scoring pipeline warmed · Golden examples loaded",
    color: "var(--matrix-green)",
  },
  {
    id: "wallet",
    time: "01:12:52",
    text: "[SOLANA] Wallet ready · Trading system LIVE",
    color: "var(--matrix-green)",
  },
];

type ActiveView = "pump-history" | "simulation-twitter" | "smart-trading";

export function HomeDashboard() {
  return (
    <TerminalProvider initialLogs={terminalEvents}>
      <SmartTradingProvider
        refreshIntervalMs={10000}
        migrationRefreshIntervalMs={5000}
      >
        <DashboardContent />
      </SmartTradingProvider>
    </TerminalProvider>
  );
}

function DashboardContent() {
  const [activeView, setActiveView] = useState<ActiveView>("smart-trading");

  // Fetch real token data for mood calculation
  const { tokens } = usePumpTokens({
    limit: 20,
    sortBy: "detected_at",
    sortOrder: "desc",
  });

  // Smart Trading data for TraderProfileCard (from shared context - no duplicate fetching!)
  const {
    config,
    dashboardStats,
    positions,
    history,
  } = useSmartTradingContext();

  // AI Mood System - dynamically calculates mood based on market data
  const { mood: aiMood, pnl, reason, intensity } = useAiMood({
    tokens,
    isActive: true,
    isExecuting: false, // TODO: Wire to real trading execution state
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
          {/* Trader Profile Card - Always Visible */}
          <div className="mb-2">
            <TraderProfileCard
              stats={dashboardStats}
              config={config}
              positions={positions}
              history={history}
            />
          </div>

          {/* Epic Feature Toggle */}
          <div className="tab-switcher">
            <button
              className={`tab-button-epic ${activeView === "smart-trading" ? "active" : ""}`}
              onClick={() => setActiveView("smart-trading")}
            >
              <SmartMoneyAnimation className="tab-icon-large" size={56} />
              <span className="tab-button-title">SMART MONEY</span>
            </button>
            <button
              className={`tab-button-epic ${activeView === "pump-history" ? "active" : ""}`}
              onClick={() => setActiveView("pump-history")}
            >
              <TrendingUp className="tab-icon-large" />
              <span className="tab-button-title">AI TRADING BOT</span>
            </button>
            <button
              className={`tab-button-epic ${activeView === "simulation-twitter" ? "active" : ""}`}
              onClick={() => setActiveView("simulation-twitter")}
            >
              <Twitter className="tab-icon-large" />
              <span className="tab-button-title">TWITTER QUOTE BOT</span>
            </button>
          </div>

          {/* Feature Content */}
          {activeView === "smart-trading" && (
            <div className="space-y-4">
              <SmartTradingSection />
            </div>
          )}
          {activeView === "pump-history" && (
            <div className="space-y-4">
              <PumpHistorySection />
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
