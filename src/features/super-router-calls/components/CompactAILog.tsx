"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useSharedWebSocket } from "@/features/smart-trading/hooks/useWebSocket";
import DecryptedText from "@/components/DecryptedText";

interface AiReasoningEvent {
  symbol: string;
  mint: string;
  reasoning: string;
  conviction: number;
  will_trade: boolean;
  timestamp: number;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getConvictionColor(conviction: number): string {
  if (conviction >= 0.85) return "text-green-400";
  if (conviction >= 0.7) return "text-yellow-400";
  if (conviction >= 0.5) return "text-orange-400";
  return "text-red-400";
}

export function CompactAILog() {
  const [latestEvent, setLatestEvent] = useState<AiReasoningEvent | null>(null);
  const [recentEvents, setRecentEvents] = useState<AiReasoningEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const { on: onReasoningEvent } = useSharedWebSocket({ path: "/ws/trading/reasoning" });

  useEffect(() => {
    const unsubscribe = onReasoningEvent<AiReasoningEvent>("ai_reasoning", (data) => {
      console.log("[CompactAILog] New AI reasoning:", data.symbol);
      setLatestEvent(data);
      setAnimationKey((prev) => prev + 1);
      setRecentEvents((prev) => [data, ...prev].slice(0, 10));
    });

    return () => {
      unsubscribe?.();
    };
  }, [onReasoningEvent]);

  if (!latestEvent) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="w-5 h-5 text-purple-400" />
        </motion.div>
        <span className="text-sm text-white/50 italic">Waiting for AI analysis...</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gradient-to-r from-purple-500/5 to-transparent border border-purple-500/20 overflow-hidden">
      {/* Main compact view */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        {/* Brain icon with pulse */}
        <motion.div
          key={animationKey}
          initial={{ scale: 1.3, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Brain className="w-5 h-5 text-purple-400" />
        </motion.div>

        {/* Token symbol */}
        <span className="font-bold text-white text-sm">{latestEvent.symbol}</span>

        {/* Conviction */}
        <span className={`text-xs font-mono font-bold ${getConvictionColor(latestEvent.conviction)}`}>
          {(latestEvent.conviction * 100).toFixed(0)}%
        </span>

        {/* Decision badge */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            latestEvent.will_trade
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {latestEvent.will_trade ? "TRADE" : "PASS"}
        </span>

        {/* Reasoning preview */}
        <div className="flex-1 min-w-0">
          <DecryptedText
            key={animationKey}
            text={latestEvent.reasoning.slice(0, 60) + (latestEvent.reasoning.length > 60 ? "..." : "")}
            speed={25}
            maxIterations={6}
            animateOn="view"
            className="text-white/70"
            encryptedClassName="text-purple-400/50"
            parentClassName="text-[11px] truncate"
          />
        </div>

        {/* Time */}
        <span className="text-[10px] text-white/40 flex-shrink-0">
          {formatTimeAgo(latestEvent.timestamp)}
        </span>

        {/* Expand indicator */}
        {recentEvents.length > 1 && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-white/40" />
          </motion.div>
        )}
      </button>

      {/* Expanded history */}
      <AnimatePresence>
        {isExpanded && recentEvents.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto">
              {recentEvents.slice(1).map((event, idx) => (
                <motion.div
                  key={`${event.mint}-${event.timestamp}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5"
                >
                  <span className="font-medium text-white text-xs">{event.symbol}</span>
                  <span className={`text-[10px] font-mono ${getConvictionColor(event.conviction)}`}>
                    {(event.conviction * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded ${
                      event.will_trade
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {event.will_trade ? "TRADE" : "PASS"}
                  </span>
                  <span className="text-[10px] text-white/50 truncate flex-1">
                    {event.reasoning.slice(0, 40)}...
                  </span>
                  <span className="text-[9px] text-white/30 flex-shrink-0">
                    {formatTimeAgo(event.timestamp)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
