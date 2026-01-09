"use client";

import { useState } from "react";
import { PONZINOMICS_API_URL } from "@/lib/config";
import { PumpHistorySection } from "@/features/pump-history";
import { SimulationTwitterSection } from "@/features/simulation-twitter";
import { Terminal, TerminalProvider } from "@/features/terminal";
import type { TerminalLogEntry } from "@/features/terminal";
import { useAiMood } from "@/hooks/useAiMood";
import { usePumpTokens } from "@/features/pump-history/hooks/usePumpTokens";
import { BackgroundParticles } from "@/components/BackgroundParticles";
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

type ActiveView = "pump-history" | "simulation-twitter";

export function HomeDashboard() {
  return (
    <TerminalProvider initialLogs={terminalEvents}>
      <DashboardContent />
    </TerminalProvider>
  );
}

function DashboardContent() {
  const [activeView, setActiveView] = useState<ActiveView>("pump-history");

  // Fetch real token data for mood calculation
  const { tokens } = usePumpTokens({
    limit: 20,
    sortBy: "detected_at",
    sortOrder: "desc",
  });

  // AI Mood System - dynamically calculates mood based on market data
  const { mood: aiMood, pnl, reason, intensity } = useAiMood({
    tokens,
    isActive: true,
    isExecuting: false, // TODO: Wire to real trading execution state
  });

  return (
    <>
      {/* Background particles that react to AI mood */}
      <BackgroundParticles mood={aiMood} intensity={intensity} />

      <main className={`cockpit-layout crt-effect ai-mood ai-mood-${aiMood}`}>
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
          {/* Glassmorphic Tab Switcher */}
          <div className="tab-switcher">
            <button
              className={`tab-button ${activeView === "pump-history" ? "active" : ""}`}
              onClick={() => setActiveView("pump-history")}
            >
              📈 AI TRADING BOT
            </button>
            <button
              className={`tab-button ${activeView === "simulation-twitter" ? "active" : ""}`}
              onClick={() => setActiveView("simulation-twitter")}
            >
              🎨 TWITTER QUOTE BOT
            </button>
          </div>

          {/* Feature Content */}
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
