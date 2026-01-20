"use client";

/**
 * Terminal Boot Sequence Hook
 *
 * Orchestrates a staged boot sequence for the terminal, creating
 * an authentic system initialization experience before real data flows in.
 */

import { useEffect, useRef, useCallback } from "react";
import type { TerminalIconType } from "../types";

// Boot message configuration
interface BootMessage {
  text: string;
  icon?: TerminalIconType;
  color?: string;
  delay: number; // Delay after previous message (ms)
  isDecrypted?: boolean; // Use decryption effect
}

// Boot sequence stages
const BOOT_SEQUENCE: BootMessage[] = [
  // Stage 1: System Init (0-1000ms)
  {
    text: "SuperRouter v2.1.0",
    icon: "zap",
    color: "var(--solana-cyan)",
    delay: 0,
    isDecrypted: true,
  },
  {
    text: "Initializing neural pathways...",
    icon: "brain",
    color: "var(--matrix-green)",
    delay: 300,
    isDecrypted: true,
  },
  {
    text: "Loading AI models...",
    icon: "brain",
    color: "var(--matrix-green)",
    delay: 350,
  },

  // Stage 2: Connection (1000-2000ms)
  {
    text: "Establishing secure connection...",
    icon: "shield",
    color: "var(--warning-amber)",
    delay: 400,
  },
  {
    text: "WebSocket handshake complete",
    icon: "check",
    color: "var(--matrix-green)",
    delay: 300,
  },
  {
    text: "Subscribing to migration feed...",
    icon: "search",
    color: "var(--solana-cyan)",
    delay: 350,
  },

  // Stage 3: Ready (2000-2800ms)
  {
    text: "All systems nominal",
    icon: "check",
    color: "var(--matrix-green)",
    delay: 400,
  },
  {
    text: "AI Reasoning Terminal online",
    icon: "zap",
    color: "var(--solana-cyan)",
    delay: 300,
    isDecrypted: true,
  },
  {
    text: "Monitoring for opportunities...",
    icon: "search",
    color: "var(--matrix-green)",
    delay: 350,
  },
];

// Calculate total boot duration
export const BOOT_DURATION = BOOT_SEQUENCE.reduce((total, msg) => total + msg.delay, 0) + 500; // +500ms buffer

interface UseTerminalBootProps {
  /** Function to log messages to terminal */
  log: (entry: {
    text: string;
    color?: string;
    icon?: TerminalIconType;
    isStreaming?: boolean;
    isBootMessage?: boolean;
  }) => string;
  /** Callback when boot sequence completes */
  onBootComplete?: () => void;
  /** Whether boot sequence is enabled */
  enabled?: boolean;
}

interface UseTerminalBootReturn {
  /** Whether boot sequence is currently running */
  isBooting: boolean;
  /** Current boot progress (0-100) */
  bootProgress: number;
  /** Manually trigger boot sequence */
  startBoot: () => void;
}

export function useTerminalBoot({
  log,
  onBootComplete,
  enabled = true,
}: UseTerminalBootProps): UseTerminalBootReturn {
  const hasBootedRef = useRef(false);
  const bootingRef = useRef(false);
  const progressRef = useRef(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const startBoot = useCallback(() => {
    if (hasBootedRef.current || bootingRef.current) return;

    bootingRef.current = true;
    let cumulativeDelay = 0;
    const totalDelay = BOOT_SEQUENCE.reduce((total, msg) => total + msg.delay, 0);

    BOOT_SEQUENCE.forEach((message, index) => {
      cumulativeDelay += message.delay;

      const timeout = setTimeout(() => {
        // Log the boot message
        log({
          text: message.text,
          color: message.color,
          icon: message.icon,
          isStreaming: false, // Boot messages appear instantly
          isBootMessage: true,
        });

        // Update progress
        progressRef.current = Math.round(((index + 1) / BOOT_SEQUENCE.length) * 100);

        // Check if this is the last message
        if (index === BOOT_SEQUENCE.length - 1) {
          // Add a small delay after last message before marking boot complete
          const completeTimeout = setTimeout(() => {
            hasBootedRef.current = true;
            bootingRef.current = false;
            progressRef.current = 100;
            onBootComplete?.();
          }, 500);
          timeoutsRef.current.push(completeTimeout);
        }
      }, cumulativeDelay);

      timeoutsRef.current.push(timeout);
    });
  }, [log, onBootComplete]);

  // Auto-start boot on mount
  useEffect(() => {
    if (!enabled || hasBootedRef.current) return;

    // Small delay to ensure terminal is mounted
    const initTimeout = setTimeout(startBoot, 100);
    timeoutsRef.current.push(initTimeout);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [enabled, startBoot]);

  return {
    isBooting: bootingRef.current,
    bootProgress: progressRef.current,
    startBoot,
  };
}

// Export boot sequence for reference
export { BOOT_SEQUENCE };
