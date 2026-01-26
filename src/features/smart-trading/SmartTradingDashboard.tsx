"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { motion } from "motion/react";
import { PortfolioHoldingsPanel } from "./components/PortfolioHoldingsPanel";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { AiDecisionFeed } from "./components/AiDecisionFeed";
import { HistoryPanel } from "./components/HistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { SuperRouterCallsSection } from "@/features/super-router-calls";
import ShinyText from "@/components/ShinyText";

// ============================================
// Feature Flags: Enable/disable tabs (hidden by default for production)
// Set in .env.local to enable locally
// ============================================
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
const SUPER_ROUTER_CALLS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SUPER_ROUTER_CALLS === "true";
const STORAGE_KEY = "superrouter-dashboard-tab";

// ============================================
// Tab configuration
// ============================================
interface TabConfig {
  value: string;
  label: string;
  activeLabel?: string;
  color: string;
  shineColor: string;
  badge?: string;
  enabled: boolean;
}

const TABS_CONFIG: TabConfig[] = [
  {
    value: "trading",
    label: "Trading",
    color: "#c4f70e",
    shineColor: "#ffffff",
    enabled: true,
  },
  {
    value: "analytics",
    label: "Analytics",
    color: "#c4f70e",
    shineColor: "#ffffff",
    enabled: ANALYTICS_ENABLED,
  },
  {
    value: "super-router-calls",
    label: "SR Calls",
    color: "#eab308",
    shineColor: "#ffffff",
    badge: "VIP",
    enabled: SUPER_ROUTER_CALLS_ENABLED,
  },
];

// ============================================
// Animated Tab Button
// ============================================
interface AnimatedTabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
  tabRef: (el: HTMLButtonElement | null) => void;
}

function AnimatedTabButton({ tab, isActive, onClick, tabRef }: AnimatedTabButtonProps) {
  return (
    <button
      ref={tabRef}
      onClick={onClick}
      className="relative z-10 flex-1 md:flex-none rounded-full px-6 md:px-10 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer"
      style={{
        color: isActive ? "white" : "rgba(255,255,255,0.4)",
      }}
    >
      <span className="relative inline-flex items-center justify-center">
        {isActive ? (
          <ShinyText
            text={tab.label}
            speed={3}
            color={tab.color}
            shineColor={tab.shineColor}
            className="font-bold"
          />
        ) : (
          tab.label
        )}
        {tab.badge && (
          <span
            className="absolute -top-4 -right-8 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-black shadow-[0_0_12px_rgba(234,179,8,0.35)]"
            style={{ backgroundColor: tab.color }}
          >
            {tab.badge}
          </span>
        )}
      </span>
    </button>
  );
}

// ============================================
// Animated Tabs Navigation
// ============================================
interface AnimatedTabsNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

function AnimatedTabsNav({ activeTab, onTabChange }: AnimatedTabsNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  const enabledTabs = TABS_CONFIG.filter((t) => t.enabled);

  // Calculate indicator position
  const updateIndicator = () => {
    const activeButton = tabRefs.current.get(activeTab);
    const container = containerRef.current;
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
      if (!isInitialized) setIsInitialized(true);
    }
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeTab]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, []);

  // Get active tab color for indicator
  const activeTabConfig = enabledTabs.find((t) => t.value === activeTab);
  const activeColor = activeTabConfig?.color || "#c4f70e";

  return (
    <div className="flex justify-center mb-6">
      <div
        ref={containerRef}
        className="relative w-full md:w-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1 flex overflow-visible"
      >
        {/* Sliding indicator - bigger than container, extends outside */}
        <motion.div
          className="absolute rounded-full z-0 pointer-events-none"
          initial={false}
          animate={{
            left: indicatorStyle.left - 6,
            width: indicatorStyle.width + 8,
          }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 28,
            mass: 0.9,
          }}
          style={{
            top: -4,
            bottom: -4,
            background: `linear-gradient(135deg, ${activeColor}25 0%, ${activeColor}15 50%, ${activeColor}05 100%)`,
            boxShadow: `inset 0 0 24px ${activeColor}50, 0 0 40px ${activeColor}30, 0 4px 20px ${activeColor}20`,
            border: `1px solid ${activeColor}50`,
            opacity: isInitialized ? 1 : 0,
          }}
        />

        {/* Tab buttons */}
        {enabledTabs.map((tab) => (
          <AnimatedTabButton
            key={tab.value}
            tab={tab}
            isActive={activeTab === tab.value}
            onClick={() => onTabChange(tab.value)}
            tabRef={(el) => {
              if (el) tabRefs.current.set(tab.value, el);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Dashboard
// ============================================

export function SmartTradingDashboard() {
  const [activeTab, setActiveTab] = useState("trading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTab = window.localStorage.getItem(STORAGE_KEY);
    if (savedTab === "analytics" && ANALYTICS_ENABLED) {
      setActiveTab("analytics");
      return;
    }
    if (savedTab === "super-router-calls" && SUPER_ROUTER_CALLS_ENABLED) {
      setActiveTab("super-router-calls");
      return;
    }
    if (savedTab === "trading") {
      setActiveTab("trading");
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window === "undefined") return;
    if (value === "trading" || value === "analytics" || value === "super-router-calls") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  };

  return (
    <div className="space-y-4 -mt-12 px-2 sm:px-4 lg:px-8">
      {/* Custom animated tabs navigation */}
      <AnimatedTabsNav activeTab={activeTab} onTabChange={handleTabChange} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Hidden TabsList for Radix state management */}
        <TabsList className="hidden">
          <TabsTrigger value="trading">Trading</TabsTrigger>
          {ANALYTICS_ENABLED && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {SUPER_ROUTER_CALLS_ENABLED && <TabsTrigger value="super-router-calls">SR Calls</TabsTrigger>}
        </TabsList>

        <TabsContent value="trading" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            {/* Left Column: Portfolio Holdings + Watchlist + AI Log (desktop) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              {/* Portfolio - dynamic height based on items, max 3 visible */}
              <PortfolioHoldingsPanel maxVisibleItems={3} />
              {/* Watchlist - tokens being monitored before qualifying for trading */}
              <WatchlistPanel />
              {/* AI Log - sits right under portfolio on desktop */}
              <div className="hidden lg:block h-[320px]">
                <AiDecisionFeed maxItems={15} />
              </div>
            </div>
            {/* Right Column: History (Trades/Transactions toggle) */}
            <div className="lg:col-span-2 flex flex-col gap-4 lg:h-[700px]">
              <div className="flex-1 min-h-0 overflow-hidden">
                <HistoryPanel maxItems={50} />
              </div>
              {/* AI Log - mobile only (below history) */}
              <div className="lg:hidden flex-shrink-0 h-[280px] overflow-hidden">
                <AiDecisionFeed maxItems={15} />
              </div>
            </div>
          </div>
        </TabsContent>

        {ANALYTICS_ENABLED && (
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        )}

        {SUPER_ROUTER_CALLS_ENABLED && (
          <TabsContent value="super-router-calls" className="space-y-4">
            {/* Super Router Calls Content - WalletButton is inside TokenGateGuard */}
            <SuperRouterCallsSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
