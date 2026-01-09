"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseWebSocketOptions<TMessage = unknown> {
  url: string;
  onMessage: (data: TMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
  silent?: boolean; // Don't log errors if the feature is optional
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "failed";
  reconnectAttempts: number;
  send: (data: unknown) => void;
  reconnect: () => void;
  close: () => void;
}

export function useWebSocket<TMessage = unknown>(
  options: UseWebSocketOptions<TMessage>
): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    enabled = true,
    silent = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "failed"
  >("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldConnectRef = useRef(enabled);

  useEffect(() => {
    shouldConnectRef.current = enabled;
  }, [enabled]);

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Check if we've exceeded max reconnection attempts
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionState("failed");
      if (!silent) {
        console.warn(
          `[WebSocket] Max reconnection attempts (${maxReconnectAttempts}) reached for ${url}`
        );
      }
      return;
    }

    try {
      setConnectionState("connecting");
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionState("connected");
        setReconnectAttempts(0); // Reset counter on successful connection
        onConnect?.();
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TMessage;
          onMessage(data);
        } catch (error) {
          if (!silent) {
            console.error("[WebSocket] Failed to parse message:", error);
          }
        }
      };

      ws.onerror = (error) => {
        setConnectionState("disconnected");
        onError?.(error);
        if (!silent) {
          console.error(`[WebSocket] Connection error for ${url}:`, error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionState("disconnected");
        onDisconnect?.();

        if (autoReconnect && shouldConnectRef.current) {
          setReconnectAttempts((prev) => prev + 1);
          // Exponential backoff with jitter
          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttempts),
            30000 // Max 30 seconds
          );
          const jitter = Math.random() * 1000;
          const delay = backoffDelay + jitter;

          if (!silent) {
            console.log(
              `[WebSocket] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`
            );
          }

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setConnectionState("disconnected");
      if (!silent) {
        console.error(`[WebSocket] Connection failed for ${url}:`, error);
      }
      if (autoReconnect && shouldConnectRef.current) {
        setReconnectAttempts((prev) => prev + 1);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
    silent,
  ]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const close = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    setReconnectAttempts(0); // Reset attempts on manual reconnect
    close();
    shouldConnectRef.current = true;
    connect();
  }, [close, connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      close();
    };
  }, [enabled, connect, close]);

  return {
    isConnected,
    connectionState,
    reconnectAttempts,
    send,
    reconnect,
    close
  };
}
