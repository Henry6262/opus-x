"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PumpTokenWithTweet } from "../types";
import { buildDevprntWsUrl } from "@/lib/devprnt";

export interface TokenStreamEvent {
  type: "new_token" | "label_update" | "golden_created" | "connected";
  token?: PumpTokenWithTweet;
  mint?: string;
  timestamp?: number;
  client_id?: string;
}

export interface UsePumpTokensStreamOptions {
  enabled?: boolean;
  onNewToken?: (token: PumpTokenWithTweet) => void;
}

export interface UsePumpTokensStreamReturn {
  newTokens: PumpTokenWithTweet[];
  newTokenCount: number;
  showNewTokens: () => void;
  isConnected: boolean;
  clearNewTokens: () => void;
}

export function usePumpTokensStream(
  options: UsePumpTokensStreamOptions = {}
): UsePumpTokensStreamReturn {
  const { enabled = true, onNewToken } = options;

  const [newTokens, setNewTokens] = useState<PumpTokenWithTweet[]>([]);
  const [newTokenCount, setNewTokenCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const seenMintsRef = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = buildDevprntWsUrl("/ws/tokens");
      console.log(`[TokenStream] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[TokenStream] ✅ Connected to devprnt");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TokenStreamEvent;

          // Log message type for debugging
          console.log(`[TokenStream] 📨 ${data.type}`, data.type === "new_token" ? data.token?.symbol : "");

          if (data.type === "connected") {
            console.log("[TokenStream] Connection acknowledged:", data.client_id);
            return;
          }

          if (data.type === "new_token" && data.token) {
            // Validate required fields
            if (!data.token.mint) {
              console.warn("[TokenStream] ⚠️ Token missing mint address, skipping");
              return;
            }

            if (seenMintsRef.current.has(data.token.mint)) {
              return;
            }
            seenMintsRef.current.add(data.token.mint);
            setNewTokens((prev) => [data.token as PumpTokenWithTweet, ...prev]);
            setNewTokenCount((prev) => prev + 1);
            onNewToken?.(data.token);
          }
        } catch (error) {
          console.error("[TokenStream] Failed to parse message:", error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("[TokenStream] ❌ WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log(`[TokenStream] 🔌 Disconnected (code: ${event.code}, reason: ${event.reason || 'No reason provided'})`);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect after 3 seconds
        if (enabled) {
          console.log("[TokenStream] 🔄 Reconnecting in 3s...");
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[TokenStream] Connection failed:", error);
      setIsConnected(false);
    }
  }, [enabled, onNewToken]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  const showNewTokens = useCallback(() => {
    setNewTokenCount(0);
  }, []);

  const clearNewTokens = useCallback(() => {
    setNewTokens([]);
    setNewTokenCount(0);
  }, []);

  return {
    newTokens,
    newTokenCount,
    showNewTokens,
    isConnected,
    clearNewTokens,
  };
}
