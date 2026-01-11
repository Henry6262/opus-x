"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { MigrationFeedEvent } from "../types";

// ============================================
// TYPES
// ============================================

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type EventHandler<T = unknown> = (data: T, event: MigrationFeedEvent) => void;

interface UseWebSocketOptions {
  /** WebSocket server URL (defaults to ponzinomics-api) */
  url?: string;
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
// HOOK
// ============================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_PONZINOMICS_WS_URL || "http://localhost:4001",
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  // State
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<MigrationFeedEvent | null>(null);

  // Refs for socket and handlers
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const anyHandlersRef = useRef<Set<EventHandler>>(new Set());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setStatus("connecting");

    const socket = io(url, {
      path: "/ws/migration-feed",
      transports: ["websocket", "polling"],
      reconnectionAttempts,
      reconnectionDelay,
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setStatus("connected");
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);
      setStatus("disconnected");
      setClientId(null);
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);
      setStatus("error");
    });

    // Pong response
    socket.on("pong", (data: { timestamp: number }) => {
      console.log("[WebSocket] Pong received, latency:", Date.now() - data.timestamp, "ms");
    });

    // Main message handler - all events come through 'message'
    socket.on("message", (event: MigrationFeedEvent) => {
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
    });

    return socket;
  }, [url, reconnectionAttempts, reconnectionDelay]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
      setClientId(null);
    }
  }, []);

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

  // Emit event to server
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
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
      socketRef.current?.emit("ping");
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [status]);

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

let sharedSocket: Socket | null = null;
let sharedStatus: ConnectionStatus = "disconnected";
let sharedClientId: string | null = null;
const sharedHandlers = new Map<string, Set<EventHandler>>();
const sharedAnyHandlers = new Set<EventHandler>();
const statusListeners = new Set<(status: ConnectionStatus) => void>();

/**
 * Shared WebSocket connection - all components share the same socket
 * Use this when you want one connection for the whole app
 */
export function useSharedWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_PONZINOMICS_WS_URL || "http://localhost:4001",
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
    if (sharedSocket?.connected) return;

    sharedStatus = "connecting";
    statusListeners.forEach((l) => l("connecting"));

    const socket = io(url, {
      path: "/ws/migration-feed",
      transports: ["websocket", "polling"],
      reconnectionAttempts,
      reconnectionDelay,
      autoConnect: true,
    });

    sharedSocket = socket;

    socket.on("connect", () => {
      console.log("[SharedWebSocket] Connected");
      sharedStatus = "connected";
      statusListeners.forEach((l) => l("connected"));
    });

    socket.on("disconnect", () => {
      console.log("[SharedWebSocket] Disconnected");
      sharedStatus = "disconnected";
      sharedClientId = null;
      statusListeners.forEach((l) => l("disconnected"));
    });

    socket.on("connect_error", () => {
      sharedStatus = "error";
      statusListeners.forEach((l) => l("error"));
    });

    socket.on("pong", (data: { timestamp: number }) => {
      console.log("[SharedWebSocket] Latency:", Date.now() - data.timestamp, "ms");
    });

    socket.on("message", (event: MigrationFeedEvent) => {
      if (event.type === "connected" && event.clientId) {
        sharedClientId = event.clientId;
      }

      // Notify handlers
      sharedHandlers.get(event.type)?.forEach((h) => h(event.data, event));
      sharedAnyHandlers.forEach((h) => h(event.data, event));
    });
  }, [url, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    sharedSocket?.disconnect();
    sharedSocket = null;
    sharedStatus = "disconnected";
    sharedClientId = null;
    statusListeners.forEach((l) => l("disconnected"));
  }, []);

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
    if (sharedSocket?.connected) {
      sharedSocket.emit(event, data);
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
