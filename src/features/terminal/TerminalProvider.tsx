"use client";

import { createContext, useCallback, useContext, useMemo, useState, useRef } from "react";
import type { TerminalLogEntry, ThinkingState } from "./types";

export type BootPhase = 'booting' | 'ready';

interface TerminalContextValue {
  logs: TerminalLogEntry[];
  log: (entry: Omit<TerminalLogEntry, "id" | "time"> & { time?: string; isBootMessage?: boolean }) => string;
  updateLog: (id: string, updates: Partial<Pick<TerminalLogEntry, 'text' | 'color' | 'isStreaming' | 'icon'>>) => void;
  thinkingState: ThinkingState;
  startThinking: (tokenSymbol: string) => void;
  stopThinking: () => void;
  setThinkingStep: (step: string) => void;
  bootPhase: BootPhase;
  setBootPhase: (phase: BootPhase) => void;
  isBootComplete: boolean;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

function createLogId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TerminalProvider({
  children,
  initialLogs = [],
  maxLogs = 20,
}: {
  children: React.ReactNode;
  initialLogs?: TerminalLogEntry[];
  maxLogs?: number;
}) {
  const [logs, setLogs] = useState<TerminalLogEntry[]>(initialLogs);
  const [thinkingState, setThinkingState] = useState<ThinkingState>({ isActive: false });
  const [bootPhase, setBootPhase] = useState<BootPhase>('booting');

  // Queue for messages that arrive during boot
  const pendingMessagesRef = useRef<Array<Omit<TerminalLogEntry, "id" | "time"> & { time?: string }>>([]);

  // Derived state for convenience
  const isBootComplete = bootPhase === 'ready';

  const log = useCallback(
    (entry: Omit<TerminalLogEntry, "id" | "time"> & { time?: string; isBootMessage?: boolean }): string => {
      const { isBootMessage, ...logEntry } = entry;

      // During boot phase, only allow boot messages through
      // Queue non-boot messages to be processed after boot
      if (bootPhase === 'booting' && !isBootMessage) {
        // Queue the message for later (up to 10 pending)
        if (pendingMessagesRef.current.length < 10) {
          pendingMessagesRef.current.push(logEntry);
        }
        return ''; // Return empty ID for queued messages
      }

      const id = createLogId();
      const time = logEntry.time || formatTime(new Date());
      setLogs((prev) => {
        const next = [
          ...prev,
          {
            id,
            time,
            text: logEntry.text,
            color: logEntry.color,
            type: logEntry.type,
            isStreaming: logEntry.isStreaming,
            icon: logEntry.icon,
          },
        ];
        return next.slice(-maxLogs);
      });
      return id;
    },
    [maxLogs, bootPhase]
  );

  // Handle boot phase transition - process queued messages
  const handleSetBootPhase = useCallback((phase: BootPhase) => {
    setBootPhase(phase);

    // When boot completes, process any queued messages with staggered timing
    if (phase === 'ready' && pendingMessagesRef.current.length > 0) {
      const messages = [...pendingMessagesRef.current];
      pendingMessagesRef.current = [];

      // Stagger queued messages to prevent flood
      messages.forEach((msg, index) => {
        setTimeout(() => {
          const id = createLogId();
          const time = formatTime(new Date());
          setLogs((prev) => {
            const next = [
              ...prev,
              {
                id,
                time,
                text: msg.text,
                color: msg.color,
                type: msg.type,
                isStreaming: msg.isStreaming,
                icon: msg.icon,
              },
            ];
            return next.slice(-maxLogs);
          });
        }, (index + 1) * 500); // 500ms stagger
      });
    }
  }, [maxLogs]);

  const updateLog = useCallback((id: string, updates: Partial<Pick<TerminalLogEntry, 'text' | 'color' | 'isStreaming'>>) => {
    setLogs((prev) => {
      const index = prev.findIndex((log) => log.id === id);
      if (index === -1) return prev;

      const existing = prev[index];
      // Only update if something actually changed
      if (
        updates.text === existing.text &&
        updates.color === existing.color &&
        updates.isStreaming === existing.isStreaming
      ) {
        return prev;
      }

      const updated = [...prev];
      updated[index] = { ...existing, ...updates };
      return updated;
    });
  }, []);

  const startThinking = useCallback((tokenSymbol: string) => {
    setThinkingState({ isActive: true, tokenSymbol });
  }, []);

  const stopThinking = useCallback(() => {
    setThinkingState({ isActive: false });
  }, []);

  const setThinkingStep = useCallback((step: string) => {
    setThinkingState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const value = useMemo(
    () => ({
      logs,
      log,
      updateLog,
      thinkingState,
      startThinking,
      stopThinking,
      setThinkingStep,
      bootPhase,
      setBootPhase: handleSetBootPhase,
      isBootComplete,
    }),
    [logs, log, updateLog, thinkingState, startThinking, stopThinking, setThinkingStep, bootPhase, handleSetBootPhase, isBootComplete]
  );

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error("useTerminal must be used within TerminalProvider");
  }
  return context;
}
