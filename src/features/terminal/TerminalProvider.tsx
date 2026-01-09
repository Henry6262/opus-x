"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TerminalLogEntry } from "./types";

interface TerminalContextValue {
  logs: TerminalLogEntry[];
  log: (entry: Omit<TerminalLogEntry, "id" | "time"> & { time?: string }) => void;
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
  maxLogs = 80,
}: {
  children: React.ReactNode;
  initialLogs?: TerminalLogEntry[];
  maxLogs?: number;
}) {
  const [logs, setLogs] = useState<TerminalLogEntry[]>(initialLogs);

  const log = useCallback(
    (entry: Omit<TerminalLogEntry, "id" | "time"> & { time?: string }) => {
      const time = entry.time || formatTime(new Date());
      setLogs((prev) => {
        const next = [
          ...prev,
          {
            id: createLogId(),
            time,
            text: entry.text,
            color: entry.color,
          },
        ];
        return next.slice(-maxLogs);
      });
    },
    [maxLogs]
  );

  const value = useMemo(() => ({ logs, log }), [logs, log]);

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error("useTerminal must be used within TerminalProvider");
  }
  return context;
}
