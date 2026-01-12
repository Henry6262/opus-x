"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { MigrationFeedEvent } from "../types";

// ============================================
// TYPES
// ============================================

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type EventHandler<T = unknown> = (data: T, event: MigrationFeedEvent) => void;

interface UseWebSocketOptions {
  /** WebSocket server URL (defaults to devprint) */
  url?: string;
  /** WebSocket path (defaults to /ws) */
  path?: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnection attempts (default: 5) */
  reconnectionAttempts?: number;
  /** Reconnection delay in ms (default: 1000) */
  reconnectionDelay?: number;
}

interface UseWebSocketReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Client ID assigned by server */
  clientId: string | null;
  /** Subscribe to a specific event type */
  on: <T = unknown>(eventType: MigrationFeedEvent["type"], handler: EventHandler<T>) => () => void;
  /** Subscribe to all events */
  onAny: (handler: EventHandler) => () => void;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Send a message to the server */
  emit: (event: string, data?: unknown) => void;
  /** Last event received (for debugging) */
  lastEvent: MigrationFeedEvent | null;
}

// ============================================
// HELPER: Get WebSocket URL from HTTP URL
// ============================================

function getWebSocketUrl(httpUrl: string, path: string): string {
  // Convert http(s) to ws(s)
  let wsUrl = httpUrl.replace(/^http/, "ws");
  // Remove trailing slash
  wsUrl = wsUrl.replace(/\/$/, "");
  // Add path
  return `${wsUrl}${path}`;
}

// ============================================
// HOOK
// ============================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_DEVPRNT_WS_URL ||
    process.env.NEXT_PUBLIC_DEVPRNT_CORE_URL ||
    "http://localhost:3001",
    path = "/ws",
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  // State
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<MigrationFeedEvent | null>(null);

  // Refs for socket and handlers
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const anyHandlersRef = useRef<Set<EventHandler>>(new Set());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    reconnectAttemptRef.current = 0;

    const wsUrl = getWebSocketUrl(url, path);
    console.log("[WebSocket] Connecting to:", wsUrl);

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[WebSocket] Connected to devprint");
        setStatus("connected");
        reconnectAttemptRef.current = 0;
      };

      socket.onclose = (event) => {
        console.log("[WebSocket] Disconnected:", event.code, event.reason);
        setStatus("disconnected");
        setClientId(null);

        // Auto-reconnect logic
        if (reconnectAttemptRef.current < reconnectionAttempts) {
          reconnectAttemptRef.current++;
          const delay = reconnectionDelay * Math.pow(2, reconnectAttemptRef.current - 1);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${reconnectionAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error("[WebSocket] Connection error:", error);
        setStatus("error");
      };

      socket.onmessage = (messageEvent) => {
        try {
          const event: MigrationFeedEvent = JSON.parse(messageEvent.data);
          setLastEvent(event);

          // Handle 'connected' event to get client ID
          if (event.type === "connected" && event.clientId) {
            setClientId(event.clientId);
            console.log("[WebSocket] Client ID:", event.clientId);
          }

          // Notify specific handlers
          const handlers = handlersRef.current.get(event.type);
          if (handlers) {
            handlers.forEach((handler) => handler(event.data, event));
          }

          // Notify 'any' handlers
          anyHandlersRef.current.forEach((handler) => handler(event.data, event));
        } catch (err) {
          console.warn("[WebSocket] Failed to parse message:", messageEvent.data);
        }
      };
    } catch (err) {
      console.error("[WebSocket] Failed to create connection:", err);
      setStatus("error");
    }
  }, [url, path, reconnectionAttempts, reconnectionDelay]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = reconnectionAttempts; // Prevent auto-reconnect

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setStatus("disconnected");
      setClientId(null);
    }
  }, [reconnectionAttempts]);

  // Subscribe to specific event type
  const on = useCallback(<T = unknown>(
    eventType: MigrationFeedEvent["type"],
    handler: EventHandler<T>
  ): (() => void) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(eventType)?.delete(handler as EventHandler);
    };
  }, []);

  // Subscribe to all events
  const onAny = useCallback((handler: EventHandler): (() => void) => {
    anyHandlersRef.current.add(handler);
    return () => {
      anyHandlersRef.current.delete(handler);
    };
  }, []);

  // Emit event to server (send JSON message)
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
      socketRef.current.send(message);
    } else {
      console.warn("[WebSocket] Cannot emit - not connected");
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Periodic ping for health check
  useEffect(() => {
    if (status !== "connected") return;

    const interval = setInterval(() => {
      emit("ping", { timestamp: Date.now() });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [status, emit]);

  return {
    status,
    clientId,
    on,
    onAny,
    connect,
    disconnect,
    emit,
    lastEvent,
  };
}

// ============================================
// SINGLETON HOOK (Shared across components)
// ============================================

let sharedSocket: WebSocket | null = null;
let sharedStatus: ConnectionStatus = "disconnected";
let sharedClientId: string | null = null;
let sharedReconnectAttempt = 0;
let sharedReconnectTimeout: NodeJS.Timeout | null = null;
const sharedHandlers = new Map<string, Set<EventHandler>>();
const sharedAnyHandlers = new Set<EventHandler>();
const statusListeners = new Set<(status: ConnectionStatus) => void>();

/**
 * Shared WebSocket connection - all components share the same socket
 * Use this when you want one connection for the whole app
 */
export function useSharedWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_DEVPRNT_WS_URL ||
    process.env.NEXT_PUBLIC_DEVPRNT_CORE_URL ||
    "http://localhost:3001",
    path = "/ws",
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>(sharedStatus);
  const [clientId, setClientId] = useState<string | null>(sharedClientId);
  const [lastEvent, setLastEvent] = useState<MigrationFeedEvent | null>(null);

  // Sync local state with shared state
  useEffect(() => {
    const listener = (newStatus: ConnectionStatus) => setStatus(newStatus);
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  }, []);

  const connect = useCallback(() => {
    if (sharedSocket?.readyState === WebSocket.OPEN) return;

    sharedStatus = "connecting";
    sharedReconnectAttempt = 0;
    statusListeners.forEach((l) => l("connecting"));

    const wsUrl = getWebSocketUrl(url, path);
    console.log("[SharedWebSocket] Connecting to:", wsUrl);

    try {
      const socket = new WebSocket(wsUrl);
      sharedSocket = socket;

      socket.onopen = () => {
        console.log("[SharedWebSocket] Connected to devprint");
        sharedStatus = "connected";
        sharedReconnectAttempt = 0;
        statusListeners.forEach((l) => l("connected"));
      };

      socket.onclose = (event) => {
        console.log("[SharedWebSocket] Disconnected:", event.code, event.reason);
        sharedStatus = "disconnected";
        sharedClientId = null;
        statusListeners.forEach((l) => l("disconnected"));

        // Auto-reconnect logic
        if (sharedReconnectAttempt < reconnectionAttempts) {
          sharedReconnectAttempt++;
          const delay = reconnectionDelay * Math.pow(2, sharedReconnectAttempt - 1);
          console.log(`[SharedWebSocket] Reconnecting in ${delay}ms (attempt ${sharedReconnectAttempt}/${reconnectionAttempts})`);

          sharedReconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      socket.onerror = () => {
        sharedStatus = "error";
        statusListeners.forEach((l) => l("error"));
      };

      socket.onmessage = (messageEvent) => {
        try {
          const event: MigrationFeedEvent = JSON.parse(messageEvent.data);

          if (event.type === "connected" && event.clientId) {
            sharedClientId = event.clientId;
          }

          // Notify handlers
          sharedHandlers.get(event.type)?.forEach((h) => h(event.data, event));
          sharedAnyHandlers.forEach((h) => h(event.data, event));
        } catch (err) {
          console.warn("[SharedWebSocket] Failed to parse message:", messageEvent.data);
        }
      };
    } catch (err) {
      console.error("[SharedWebSocket] Failed to create connection:", err);
      sharedStatus = "error";
      statusListeners.forEach((l) => l("error"));
    }
  }, [url, path, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (sharedReconnectTimeout) {
      clearTimeout(sharedReconnectTimeout);
      sharedReconnectTimeout = null;
    }
    sharedReconnectAttempt = reconnectionAttempts; // Prevent auto-reconnect

    if (sharedSocket) {
      sharedSocket.close();
      sharedSocket = null;
      sharedStatus = "disconnected";
      sharedClientId = null;
      statusListeners.forEach((l) => l("disconnected"));
    }
  }, [reconnectionAttempts]);

  const on = useCallback(<T = unknown>(
    eventType: MigrationFeedEvent["type"],
    handler: EventHandler<T>
  ): (() => void) => {
    if (!sharedHandlers.has(eventType)) {
      sharedHandlers.set(eventType, new Set());
    }
    sharedHandlers.get(eventType)!.add(handler as EventHandler);

    // Also update local lastEvent when this handler's event fires
    const wrappedHandler: EventHandler = (data, event) => {
      setLastEvent(event);
      (handler as EventHandler)(data, event);
    };

    return () => {
      sharedHandlers.get(eventType)?.delete(handler as EventHandler);
    };
  }, []);

  const onAny = useCallback((handler: EventHandler): (() => void) => {
    const wrappedHandler: EventHandler = (data, event) => {
      setLastEvent(event);
      handler(data, event);
    };
    sharedAnyHandlers.add(wrappedHandler);
    return () => {
      sharedAnyHandlers.delete(wrappedHandler);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    if (sharedSocket?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
      sharedSocket.send(message);
    } else {
      console.warn("[SharedWebSocket] Cannot emit - not connected");
    }
  }, []);

  // Auto-connect on first mount
  useEffect(() => {
    if (autoConnect && !sharedSocket) {
      connect();
    }
  }, [autoConnect, connect]);

  return {
    status,
    clientId,
    on,
    onAny,
    connect,
    disconnect,
    emit,
    lastEvent,
  };
}
