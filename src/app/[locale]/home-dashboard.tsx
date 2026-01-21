"use client";

import { useState, useMemo, lazy, Suspense, useEffect, useRef } from "react";
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
import { TerminalProvider, useTerminal, useTerminalNarrator, useAiReasoningStream } from "@/features/terminal";
import { useAiMood } from "@/hooks/useAiMood";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileBottomBar } from "@/components/MobileBottomBar";

// Lazy load heavy components for better initial load performance
const VibrCoder = lazy(() => import("@/components/VibrCoder").then(m => ({ default: m.VibrCoder })));
const Terminal = lazy(() => import("@/features/terminal").then(m => ({ default: m.Terminal })));

// Lightweight loading placeholder for VibrCoder
function VibrCoderSkeleton() {
  return (
    <div className="w-full aspect-video bg-black/50 rounded-lg animate-pulse flex items-center justify-center">
      <div className="w-16 h-16 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );
}

// Lightweight loading placeholder for Terminal
function TerminalSkeleton() {
  return (
    <div className="w-full h-[200px] bg-black/30 rounded-lg border border-white/10 p-4">
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
        <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

// Simple hook to defer rendering until element is near viewport (mobile optimization)
function useInView(rootMargin = "100px") {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isInView };
}

// Skeleton for deferred dashboard content
function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-white/5 rounded-lg" />
      <div className="h-48 bg-white/5 rounded-lg" />
      <div className="h-64 bg-white/5 rounded-lg" />
    </div>
  );
}

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

  // Defer below-fold content for faster initial mobile load
  const { ref: dashboardRef, isInView: dashboardInView } = useInView("200px");

  // Get boot completion state from terminal context
  const { isBootComplete } = useTerminal();

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
  // Only activates AFTER boot sequence completes
  useTerminalNarrator({
    state: narratorState,
    throttleMs: 5000,
    idleIntervalMs: 20000,
    enabled: true,
    isBootComplete,
  });

  // AI Reasoning Stream - bridges WebSocket events directly to terminal
  // This enables live streaming of AI analysis, decisions, and reasoning
  // Only activates AFTER boot sequence completes
  useAiReasoningStream({
    enabled: true,
    maxThinkingSteps: 6,
    throttleMs: 800, // Faster than narrator for real-time feel
    isBootComplete,
  });

  // AI Mood System - dynamically calculates mood based on migration data
  const emptyTokens = useMemo(() => [], []);
  const { mood: aiMood, pnl, reason } = useAiMood({
    tokens: emptyTokens, // No longer using pump-history tokens
    isActive: true,
    isExecuting: false,
  });

  return (
    <>
      <main className={`cockpit-layout ai-mood ai-mood-${aiMood}`}>
        {/* ===== TOP SECTION: VIBR CODER VIDEO + TERMINAL ===== */}
        <div className="hero-section relative">
          <div className="absolute top-14 right-2 md:top-4 md:right-4 z-[20]">
            <LanguageSwitcher className="shadow-[0_10px_30px_rgba(0,0,0,0.35)] border-white/15 bg-black/50 backdrop-blur-xl scale-75 md:scale-100 origin-top-right" />
          </div>
          <Suspense fallback={<VibrCoderSkeleton />}>
            <VibrCoder
              state={getVibrCoderState(aiMood)}
              statusText={aiMood.toUpperCase()}
              reason={reason}
              pnl={pnl}
            />
          </Suspense>
          <div className="hero-terminal">
            <Suspense fallback={<TerminalSkeleton />}>
              <Terminal />
            </Suspense>
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

          {/* Feature Content - deferred until scrolled into view for mobile perf */}
          <div ref={dashboardRef}>
            {activeView === "smart-trading" && (
              dashboardInView ? (
                <div className="space-y-4">
                  <SmartTradingDashboard />

                  {/* Analytics Dashboards */}
                  {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true" && (
                    <div className="mt-8 space-y-8" />
                  )}
                </div>
              ) : (
                <DashboardSkeleton />
              )
            )}
          </div>
        </div>

        {/* Mobile Bottom Bar - Twitter & CA Copy */}
        <MobileBottomBar />
      </main>
    </>
  );
}
