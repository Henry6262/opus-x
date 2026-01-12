"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Bot,
  Wallet,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useActivityFeed, useConnectionStatus } from "../context";
import type { ActivityItem } from "../context";

// ============================================
// Helper: Time ago format
// ============================================

type TimeTranslator = (key: string, params?: Record<string, string | number | Date>) => string;

function timeAgo(date: Date, t: TimeTranslator): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return t("justNow");
  if (seconds < 60) return t("secondsAgo", { count: seconds });
  if (seconds < 3600) return t("minutesAgo", { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t("hoursAgo", { count: Math.floor(seconds / 3600) });
  return t("daysAgo", { count: Math.floor(seconds / 86400) });
}

// ============================================
// Activity Icon Component
// ============================================

function ActivityIcon({ type, color }: { type: string; color: ActivityItem["color"] }) {
  const colorClasses: Record<ActivityItem["color"], string> = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
  };

  const iconProps = { className: `w-3.5 h-3.5 ${colorClasses[color]}` };

  switch (type) {
    case "connected":
      return <Wifi {...iconProps} />;
    case "migration_detected":
      return <Zap {...iconProps} />;
    case "market_data_updated":
      return color === "green" ? <TrendingUp {...iconProps} /> : <TrendingDown {...iconProps} />;
    case "ai_analysis":
      return <Bot {...iconProps} />;
    case "wallet_signal":
      return <Wallet {...iconProps} />;
    case "migration_expired":
      return <Clock {...iconProps} />;
    case "feed_update":
    case "stats_update":
      return <RefreshCw {...iconProps} />;
    default:
      return <Activity {...iconProps} />;
  }
}

// ============================================
// Activity Item Component
// ============================================

interface ActivityItemRowProps {
  item: ActivityItem;
  tTime: TimeTranslator;
}

function ActivityItemRow({ item, tTime }: ActivityItemRowProps) {
  const colorClasses: Record<ActivityItem["color"], string> = {
    green: "border-green-500/30 bg-green-500/5",
    red: "border-red-500/30 bg-red-500/5",
    yellow: "border-yellow-500/30 bg-yellow-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    cyan: "border-cyan-500/30 bg-cyan-500/5",
  };

  const glowClasses: Record<ActivityItem["color"], string> = {
    green: "shadow-[0_0_8px_rgba(74,222,128,0.3)]",
    red: "shadow-[0_0_8px_rgba(248,113,113,0.3)]",
    yellow: "shadow-[0_0_8px_rgba(250,204,21,0.3)]",
    blue: "shadow-[0_0_8px_rgba(96,165,250,0.3)]",
    purple: "shadow-[0_0_8px_rgba(192,132,252,0.3)]",
    cyan: "shadow-[0_0_8px_rgba(34,211,238,0.3)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        flex items-center gap-2 px-2.5 py-1.5 rounded-lg border
        ${colorClasses[item.color]}
        ${glowClasses[item.color]}
        transition-all duration-300
      `}
    >
      <ActivityIcon type={item.type} color={item.color} />
      <span className="flex-1 text-xs text-white/80 truncate">{item.message}</span>
      <span className="text-[10px] text-white/40 whitespace-nowrap">{timeAgo(item.timestamp, tTime)}</span>
    </motion.div>
  );
}

// ============================================
// Connection Status Badge
// ============================================

function ConnectionStatusBadge() {
  const t = useTranslations("activity");
  const { connectionStatus, isConnected } = useConnectionStatus();

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium
        ${isConnected
          ? "bg-green-500/20 text-green-400"
          : connectionStatus === "connecting"
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-red-500/20 text-red-400"
        }
      `}
    >
      {isConnected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-green-400"
          />
          <span>{t("live")}</span>
        </>
      ) : connectionStatus === "connecting" ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-3 h-3" />
          </motion.div>
          <span>{t("connecting")}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>{t("offline")}</span>
        </>
      )}
    </div>
  );
}

// ============================================
// Live Activity Feed Component
// ============================================

interface LiveActivityFeedProps {
  maxItems?: number;
  className?: string;
  showHeader?: boolean;
  autoScroll?: boolean;
}

export function LiveActivityFeed({
  maxItems = 20,
  className = "",
  showHeader = true,
  autoScroll = true,
}: LiveActivityFeedProps) {
  const t = useTranslations("activity");
  const tTime = useTranslations("time");
  const { activityFeed, clearActivityFeed } = useActivityFeed();
  const { isConnected } = useConnectionStatus();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new items arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activityFeed.length, autoScroll]);

  const displayItems = activityFeed.slice(0, maxItems);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#c4f70e]" />
            <span className="text-sm font-medium text-white">{t("liveActivity")}</span>
          </div>
          <ConnectionStatusBadge />
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5"
        style={{ scrollBehavior: "smooth" }}
      >
        <AnimatePresence mode="popLayout">
          {displayItems.length > 0 ? (
            displayItems.map((item) => (
              <ActivityItemRow key={item.id} item={item} tTime={tTime} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-white/40"
            >
              {isConnected ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                  </motion.div>
                  <span className="text-xs">{t("waitingForActivity")}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">{t("connectingToFeed")}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activityFeed.length > maxItems && (
        <div className="px-3 py-1.5 text-center text-[10px] text-white/30 border-t border-white/10">
          {t("showingEvents", { shown: maxItems, total: activityFeed.length })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Compact Activity Feed (for dashboard sidebar)
// ============================================

interface CompactActivityFeedProps {
  maxItems?: number;
  className?: string;
}

export function CompactActivityFeed({ maxItems = 5, className = "" }: CompactActivityFeedProps) {
  const t = useTranslations("activity");
  const { activityFeed } = useActivityFeed();
  const { isConnected } = useConnectionStatus();
  const displayItems = activityFeed.slice(0, maxItems);

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#c4f70e]" />
          <span className="text-xs font-medium text-white/70">{t("recentActivity")}</span>
        </div>
        <ConnectionStatusBadge />
      </div>

      <AnimatePresence mode="popLayout">
        {displayItems.length > 0 ? (
          displayItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center gap-1.5 text-xs"
            >
              <ActivityIcon type={item.type} color={item.color} />
              <span className="flex-1 text-white/60 truncate">{item.message}</span>
            </motion.div>
          ))
        ) : (
          <div className="text-[10px] text-white/30 text-center py-2">
            {isConnected ? t("noRecentActivity") : t("connecting")}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
