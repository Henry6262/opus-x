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
import GradualBlur from "@/components/ui/GradualBlur";
import { CompetitionSection, TrainingStatus } from "@/features/trading-competition";

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
      {/* ===== TOP NAVBAR: Trader Profile Card ===== */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        {/* Gradual blur effect below navbar */}
        <div className="absolute inset-0 z-[1]">
          <GradualBlur
            position="top"
            height="7rem"
            strength={2}
            divCount={5}
            curve="bezier"
            exponential
            opacity={1}
          />
        </div>
        {/* Navbar on top of blur */}
        <div className="relative z-[2] pointer-events-auto">
          <TraderProfileCard
            stats={dashboardStats}
            config={config}
            positions={positions}
            history={history}
          />
        </div>
        {/* Language Switcher - on top of blur */}
        <div className="absolute top-3 right-2 md:top-4 md:right-4 z-[3] pointer-events-auto">
          <LanguageSwitcher className="shadow-[0_10px_30px_rgba(0,0,0,0.35)] border-white/15 bg-black/50 backdrop-blur-xl scale-75 md:scale-100 origin-top-right" />
        </div>
      </div>

      <main className={`cockpit-layout ai-mood ai-mood-${aiMood} pt-44 md:pt-20`}>
        {/* ===== TOP SECTION: VIBR CODER VIDEO ===== */}
        <div className="hero-section relative">
          <Suspense fallback={<VibrCoderSkeleton />}>
            <VibrCoder
              state={getVibrCoderState(aiMood)}
              statusText={aiMood.toUpperCase()}
              reason={reason}
              pnl={pnl}
              showWallet={false}
            />
          </Suspense>

          <div className="hero-terminal">
            <Suspense fallback={<TerminalSkeleton />}>
              <Terminal />
            </Suspense>
          </div>
        </div>

        {/* ===== TRADING COMPETITION SECTION ===== */}
        <div className="competition-section-wrapper">
          <div className="flex flex-col md:flex-row gap-4 md:gap-5">
            <div className="flex-1">
              <CompetitionSection />
            </div>
            <div className="w-full md:w-[280px] shrink-0">
              <TrainingStatus />
            </div>
          </div>
        </div>

        {/* ===== BOTTOM SECTION: THE DASHBOARD ===== */}
        <div className="dashboard-panel">
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
