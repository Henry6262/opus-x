"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTerminal } from "../TerminalProvider";
import {
  generateMessage,
  getCategoryColor,
  getCategoryIcon,
  shouldStream,
} from "../ai-personality";
import {
  resolveEvent,
  getEventPriority,
  type TerminalEvent,
  type TerminalEventType,
} from "../terminal-events";
import type { Position, RankedMigration, TradingSignal } from "../../smart-trading/types";

// ============================================
// Types
// ============================================

interface NarratorConfig {
  /** Minimum time between messages (ms) */
  throttleMs?: number;
  /** Interval for idle messages when nothing happening (ms) */
  idleIntervalMs?: number;
  /** Whether narrator is active */
  enabled?: boolean;
}

interface NarratorState {
  positions: Position[];
  history: Position[];
  rankedMigrations: RankedMigration[];
  signals: TradingSignal[];
  tradingEnabled?: boolean;
}

interface UseTerminalNarratorProps extends NarratorConfig {
  state: NarratorState;
  /** Whether boot sequence has completed */
  isBootComplete?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_THROTTLE_MS = 5000; // 5 seconds between messages (was 4)
const DEFAULT_IDLE_INTERVAL_MS = 20000; // Idle message every 20 seconds (was 12)
const MAX_QUEUE_SIZE = 5; // Max queued messages

// ============================================
// Hook
// ============================================

export function useTerminalNarrator({
  state,
  throttleMs = DEFAULT_THROTTLE_MS,
  idleIntervalMs = DEFAULT_IDLE_INTERVAL_MS,
  enabled = true,
  isBootComplete = true,
}: UseTerminalNarratorProps): void {
  const { log } = useTerminal();

  // Effective enabled state - only active after boot completes
  const effectiveEnabled = enabled && isBootComplete;

  // Track state
  const prevStateRef = useRef<NarratorState | null>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasBootedRef = useRef(false);
  const eventQueueRef = useRef<TerminalEvent[]>([]);
  const recentEventsRef = useRef<Set<string>>(new Set());

  // Clear recent events periodically to allow repeats after some time
  useEffect(() => {
    const interval = setInterval(() => {
      recentEventsRef.current.clear();
    }, 60000); // Clear every minute
    return () => clearInterval(interval);
  }, []);

  // Emit an event to the terminal
  const emitEvent = useCallback(
    (event: TerminalEvent, force = false) => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;

      // Create a unique key for deduplication
      const eventKey = `${event.type}:${JSON.stringify(event.data)}`;

      // Skip if we've seen this exact event recently (prevents spam)
      if (recentEventsRef.current.has(eventKey) && !force) {
        return;
      }

      if (timeSinceLastMessage < throttleMs && !force) {
        // Queue the event if we're throttled (respect max queue size)
        if (eventQueueRef.current.length < MAX_QUEUE_SIZE) {
          // Insert by priority
          const priority = getEventPriority(event);
          const insertIndex = eventQueueRef.current.findIndex(
            (e) => getEventPriority(e) < priority
          );
          if (insertIndex === -1) {
            eventQueueRef.current.push(event);
          } else {
            eventQueueRef.current.splice(insertIndex, 0, event);
          }
        }
        return;
      }

      // Resolve event to message
      const { category, context } = resolveEvent(event);
      const text = generateMessage(category, context);
      const color = getCategoryColor(category);
      const icon = getCategoryIcon(category);
      const isStreaming = shouldStream(category);

      log({ text, color, icon, isStreaming });
      lastMessageTimeRef.current = now;
      recentEventsRef.current.add(eventKey);

      // Reset idle timer after any message
      resetIdleTimer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [log, throttleMs]
  );

  // Process queued events
  const processQueue = useCallback(() => {
    if (eventQueueRef.current.length === 0) return;

    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTimeRef.current;

    if (timeSinceLastMessage >= throttleMs) {
      const event = eventQueueRef.current.shift();
      if (event) {
        emitEvent(event, true);
      }
    }
  }, [emitEvent, throttleMs]);

  // Idle message emitter
  const emitIdleMessage = useCallback(() => {
    const migrationCount = state.rankedMigrations?.length || 0;
    emitEvent({
      type: "system:idle",
      data: { count: migrationCount },
      priority: "low",
    });
  }, [emitEvent, state.rankedMigrations?.length]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
    }
    idleTimerRef.current = setInterval(emitIdleMessage, idleIntervalMs);
  }, [emitIdleMessage, idleIntervalMs]);

  // Boot sequence - now handled by useTerminalBoot, so skip the narrator boot
  useEffect(() => {
    if (!effectiveEnabled || hasBootedRef.current) return;
    hasBootedRef.current = true;

    // Don't emit boot message - that's handled by useTerminalBoot now
    // Just start the idle timer
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [effectiveEnabled, resetIdleTimer]);

  // Queue processor
  useEffect(() => {
    const interval = setInterval(processQueue, 2000);
    return () => clearInterval(interval);
  }, [processQueue]);

  // ============================================
  // Event Detection from State Changes
  // ============================================

  useEffect(() => {
    if (!effectiveEnabled) return;

    const prevState = prevStateRef.current;

    // Skip first comparison (no previous state)
    if (!prevState) {
      prevStateRef.current = { ...state };
      return;
    }

    // --- Position Events ---

    // New positions opened
    const newPositions = findNewItems(prevState.positions, state.positions, (p) => p.id);
    for (const pos of newPositions.slice(0, 1)) { // Limit to 1 to prevent spam
      emitEvent({
        type: "position:opened",
        data: {
          tokenSymbol: pos.tokenSymbol ?? undefined,
          price: pos.entryPriceSol,
        },
        priority: "high",
      });
    }

    // Closed positions (check for stop loss vs regular close)
    const closedPositions = findClosedPositions(prevState.positions, state.positions, state.history);
    for (const pos of closedPositions.slice(0, 1)) { // Limit to 1
      if (pos.stoppedOut) {
        emitEvent({
          type: "position:stop_loss",
          data: {
            tokenSymbol: pos.tokenSymbol ?? undefined,
            pnl: pos.realizedPnlSol,
          },
          priority: "high",
        });
      } else if (pos.realizedPnlSol >= 0) {
        emitEvent({
          type: "position:profit",
          data: {
            tokenSymbol: pos.tokenSymbol ?? undefined,
            pnl: pos.realizedPnlSol,
          },
          priority: "high",
        });
      } else {
        emitEvent({
          type: "position:closed",
          data: {
            tokenSymbol: pos.tokenSymbol ?? undefined,
            pnl: pos.realizedPnlSol,
          },
          priority: "normal",
        });
      }
    }

    // --- Migration Events ---

    const newMigrations = findNewItems(
      prevState.rankedMigrations,
      state.rankedMigrations,
      (m) => m.tokenMint
    );
    if (newMigrations.length > 0) {
      const ranked = newMigrations[0];
      emitEvent({
        type: "migration:detected",
        data: {
          tokenSymbol: ranked.tokenSymbol ?? "Unknown",
        },
        priority: "normal",
      });
    }

    // --- AI Analysis Events ---

    // Check for new AI decisions on migrations
    for (const ranked of state.rankedMigrations.slice(0, 5)) {
      const prevRanked = prevState.rankedMigrations.find(
        (r) => r.tokenMint === ranked.tokenMint
      );

      // New AI analysis completed
      if (
        ranked.lastAiDecision &&
        ranked.lastAiConfidence &&
        (!prevRanked?.lastAiDecision ||
          prevRanked.lastAnalyzedAt !== ranked.lastAnalyzedAt)
      ) {
        emitEvent({
          type: "ai:decision",
          data: {
            tokenSymbol: ranked.tokenSymbol ?? "Unknown",
            decision: ranked.lastAiDecision,
            confidence: ranked.lastAiConfidence,
          },
          priority: "normal",
        });
        break; // Only emit one AI decision per cycle
      }
    }

    // --- Wallet Signal Events ---

    // Check for new wallet signals on migrations
    for (const ranked of state.rankedMigrations.slice(0, 5)) {
      const prevRanked = prevState.rankedMigrations.find(
        (r) => r.tokenMint === ranked.tokenMint
      );

      const prevSignalCount = prevRanked?.walletSignalCount ?? 0;
      const currentSignalCount = ranked.walletSignalCount ?? 0;

      if (currentSignalCount > prevSignalCount && ranked.walletSignals?.length > 0) {
        const latestSignal = ranked.walletSignals[0];
        emitEvent({
          type: "wallet:signal_detected",
          data: {
            tokenSymbol: ranked.tokenSymbol ?? "Unknown",
            walletLabel: latestSignal.walletLabel ?? "Tracked wallet",
            action: latestSignal.action,
          },
          priority: "high",
        });
        break; // Only emit one wallet signal per cycle
      }
    }

    // --- Trading Toggle ---

    if (
      prevState.tradingEnabled !== state.tradingEnabled &&
      state.tradingEnabled !== undefined
    ) {
      if (state.tradingEnabled) {
        emitEvent({ type: "system:boot", priority: "high" });
      } else {
        emitEvent({
          type: "system:idle",
          data: { reason: "Trading paused. Standing by." },
          priority: "normal",
        });
      }
    }

    // Update previous state
    prevStateRef.current = { ...state };
  }, [state, effectiveEnabled, emitEvent]);

  // Periodic scanning message (less frequent now)
  useEffect(() => {
    if (!effectiveEnabled || !state.tradingEnabled) return;

    // Random scanning message every 30-60 seconds (was 20-40)
    const scanInterval = setInterval(
      () => {
        const shouldScan = Math.random() > 0.6; // 40% chance (was 50%)
        if (shouldScan) {
          emitEvent({ type: "system:scanning", priority: "low" });
        }
      },
      30000 + Math.random() * 30000
    );

    return () => clearInterval(scanInterval);
  }, [effectiveEnabled, state.tradingEnabled, emitEvent]);
}

// ============================================
// Helpers
// ============================================

function findNewItems<T>(prev: T[], current: T[], getId: (item: T) => string): T[] {
  if (!prev || !current) return [];
  const prevIds = new Set(prev.map(getId));
  return current.filter((item) => !prevIds.has(getId(item)));
}

function findClosedPositions(
  prevPositions: Position[],
  currentPositions: Position[],
  currentHistory: Position[]
): Position[] {
  if (!prevPositions || !currentPositions || !currentHistory) return [];

  const currentIds = new Set(currentPositions.map((p) => p.id));
  const closedIds = prevPositions
    .filter((p) => !currentIds.has(p.id))
    .map((p) => p.id);

  return currentHistory.filter((p) => closedIds.includes(p.id));
}
