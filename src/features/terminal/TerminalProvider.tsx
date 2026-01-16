"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TerminalLogEntry, ThinkingState } from "./types";

interface TerminalContextValue {
  logs: TerminalLogEntry[];
  log: (entry: Omit<TerminalLogEntry, "id" | "time"> & { time?: string }) => string;
  updateLog: (id: string, updates: Partial<Pick<TerminalLogEntry, 'text' | 'color' | 'isStreaming'>>) => void;
  thinkingState: ThinkingState;
  startThinking: (tokenSymbol: string) => void;
  stopThinking: () => void;
  setThinkingStep: (step: string) => void;
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

  const log = useCallback(
    (entry: Omit<TerminalLogEntry, "id" | "time"> & { time?: string }): string => {
      const id = createLogId();
      const time = entry.time || formatTime(new Date());
      setLogs((prev) => {
        const next = [
          ...prev,
          {
            id,
            time,
            text: entry.text,
            color: entry.color,
            type: entry.type,
            isStreaming: entry.isStreaming,
          },
        ];
        return next.slice(-maxLogs);
      });
      return id;
    },
    [maxLogs]
  );

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
    () => ({ logs, log, updateLog, thinkingState, startThinking, stopThinking, setThinkingStep }),
    [logs, log, updateLog, thinkingState, startThinking, stopThinking, setThinkingStep]
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
