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

          // Extract data: use event.data if present, otherwise use the event itself
          // This handles both formats: { type, data: {...} } and { type, symbol, mint, ... }
          const eventData = event.data ?? event;

          // Notify specific handlers
          const handlers = handlersRef.current.get(event.type);
          if (handlers) {
            handlers.forEach((handler) => handler(eventData, event));
          }

          // Notify 'any' handlers
          anyHandlersRef.current.forEach((handler) => handler(eventData, event));
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
// SINGLETON HOOK (Shared across components, per path)
// ============================================

interface SharedSocketState {
  socket: WebSocket | null;
  status: ConnectionStatus;
  clientId: string | null;
  reconnectAttempt: number;
  reconnectTimeout: NodeJS.Timeout | null;
  handlers: Map<string, Set<EventHandler>>;
  anyHandlers: Set<EventHandler>;
  statusListeners: Set<(status: ConnectionStatus) => void>;
  clientIdListeners: Set<(clientId: string | null) => void>;
  isConnecting: boolean;
  hasInitiatedConnection: boolean;
}

// Map of path -> socket state (supports multiple WebSocket connections)
const sharedSockets = new Map<string, SharedSocketState>();

function getOrCreateSocketState(path: string): SharedSocketState {
  if (!sharedSockets.has(path)) {
    sharedSockets.set(path, {
      socket: null,
      status: "disconnected",
      clientId: null,
      reconnectAttempt: 0,
      reconnectTimeout: null,
      handlers: new Map(),
      anyHandlers: new Set(),
      statusListeners: new Set(),
      clientIdListeners: new Set(),
      isConnecting: false,
      hasInitiatedConnection: false,
    });
  }
  return sharedSockets.get(path)!;
}

/**
 * Shared WebSocket connection - components with the same path share a socket
 * Different paths get different socket connections
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

  // Get or create state for this specific path
  const socketState = getOrCreateSocketState(path);

  const [status, setStatus] = useState<ConnectionStatus>(socketState.status);
  const [clientId, setClientId] = useState<string | null>(socketState.clientId);
  const [lastEvent, setLastEvent] = useState<MigrationFeedEvent | null>(null);

  // Sync local state with shared state for this path
  useEffect(() => {
    const statusListener = (newStatus: ConnectionStatus) => setStatus(newStatus);
    const clientIdListener = (newClientId: string | null) => setClientId(newClientId);

    socketState.statusListeners.add(statusListener);
    socketState.clientIdListeners.add(clientIdListener);

    // Sync current state on mount
    setStatus(socketState.status);
    setClientId(socketState.clientId);

    return () => {
      socketState.statusListeners.delete(statusListener);
      socketState.clientIdListeners.delete(clientIdListener);
    };
  }, [socketState]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (socketState.socket?.readyState === WebSocket.OPEN || socketState.isConnecting) {
      console.log(`[SharedWebSocket:${path}] Already connected or connecting, skipping...`);
      return;
    }

    socketState.isConnecting = true;
    socketState.status = "connecting";
    socketState.reconnectAttempt = 0;
    socketState.statusListeners.forEach((l) => l("connecting"));

    const wsUrl = getWebSocketUrl(url, path);
    console.log(`[SharedWebSocket:${path}] Connecting to:`, wsUrl);

    try {
      const socket = new WebSocket(wsUrl);
      socketState.socket = socket;

      socket.onopen = () => {
        console.log(`[SharedWebSocket:${path}] Connected`);
        socketState.isConnecting = false;
        socketState.status = "connected";
        socketState.reconnectAttempt = 0;
        socketState.statusListeners.forEach((l) => l("connected"));
      };

      socket.onclose = (event) => {
        console.log(`[SharedWebSocket:${path}] Disconnected:`, event.code, event.reason);
        socketState.isConnecting = false;
        socketState.socket = null;
        socketState.status = "disconnected";
        socketState.clientId = null;
        socketState.hasInitiatedConnection = false;
        socketState.statusListeners.forEach((l) => l("disconnected"));
        socketState.clientIdListeners.forEach((l) => l(null));

        // Auto-reconnect logic
        if (socketState.reconnectAttempt < reconnectionAttempts) {
          socketState.reconnectAttempt++;
          const delay = reconnectionDelay * Math.pow(2, socketState.reconnectAttempt - 1);
          console.log(`[SharedWebSocket:${path}] Reconnecting in ${delay}ms (attempt ${socketState.reconnectAttempt}/${reconnectionAttempts})`);

          socketState.reconnectTimeout = setTimeout(() => {
            socketState.hasInitiatedConnection = true;
            connect();
          }, delay);
        }
      };

      socket.onerror = (err) => {
        console.error(`[SharedWebSocket:${path}] Connection error:`, err);
        socketState.isConnecting = false;
        socketState.status = "error";
        socketState.statusListeners.forEach((l) => l("error"));
      };

      socket.onmessage = (messageEvent) => {
        try {
          const event: MigrationFeedEvent = JSON.parse(messageEvent.data);

          if (event.type === "connected" && event.clientId) {
            socketState.clientId = event.clientId;
            socketState.clientIdListeners.forEach((l) => l(event.clientId!));
            console.log(`[SharedWebSocket:${path}] Client ID received:`, event.clientId);
          }

          // Extract data: use event.data if present, otherwise use the event itself (minus type)
          // This handles both formats: { type, data: {...} } and { type, symbol, mint, ... }
          const eventData = event.data ?? event;

          console.log(`[SharedWebSocket:${path}] Received:`, event.type, eventData);

          // Notify handlers for this path
          socketState.handlers.get(event.type)?.forEach((h) => h(eventData, event));
          socketState.anyHandlers.forEach((h) => h(eventData, event));
        } catch (err) {
          console.warn(`[SharedWebSocket:${path}] Failed to parse message:`, messageEvent.data);
        }
      };
    } catch (err) {
      console.error(`[SharedWebSocket:${path}] Failed to create connection:`, err);
      socketState.isConnecting = false;
      socketState.status = "error";
      socketState.statusListeners.forEach((l) => l("error"));
    }
  }, [url, path, reconnectionAttempts, reconnectionDelay, socketState]);

  const disconnect = useCallback(() => {
    if (socketState.reconnectTimeout) {
      clearTimeout(socketState.reconnectTimeout);
      socketState.reconnectTimeout = null;
    }
    socketState.reconnectAttempt = reconnectionAttempts; // Prevent auto-reconnect
    socketState.isConnecting = false;

    if (socketState.socket) {
      socketState.socket.close();
      socketState.socket = null;
      socketState.status = "disconnected";
      socketState.clientId = null;
      socketState.statusListeners.forEach((l) => l("disconnected"));
      socketState.clientIdListeners.forEach((l) => l(null));
    }
  }, [reconnectionAttempts, socketState]);

  const on = useCallback(<T = unknown>(
    eventType: MigrationFeedEvent["type"],
    handler: EventHandler<T>
  ): (() => void) => {
    if (!socketState.handlers.has(eventType)) {
      socketState.handlers.set(eventType, new Set());
    }
    socketState.handlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      socketState.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }, [socketState]);

  const onAny = useCallback((handler: EventHandler): (() => void) => {
    const wrappedHandler: EventHandler = (data, event) => {
      setLastEvent(event);
      handler(data, event);
    };
    socketState.anyHandlers.add(wrappedHandler);
    return () => {
      socketState.anyHandlers.delete(wrappedHandler);
    };
  }, [socketState]);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketState.socket?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
      socketState.socket.send(message);
    } else {
      console.warn(`[SharedWebSocket:${path}] Cannot emit - not connected`);
    }
  }, [socketState, path]);

  // Auto-connect on first mount for this path (client-side only)
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;
    if (!autoConnect) return;

    // Check if already initiated connection (prevents duplicate connections in StrictMode)
    if (socketState.hasInitiatedConnection) {
      return;
    }

    // Check if already connected or connecting
    if (socketState.socket?.readyState === WebSocket.OPEN || socketState.socket?.readyState === WebSocket.CONNECTING || socketState.isConnecting) {
      return;
    }

    // Set flag BEFORE calling connect
    socketState.hasInitiatedConnection = true;
    connect();
  }, [autoConnect, connect, socketState]);

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
