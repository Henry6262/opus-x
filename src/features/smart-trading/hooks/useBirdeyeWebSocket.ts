import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Birdeye WebSocket Hook
 *
 * **SECURITY**: Connects to secure WebSocket proxy that hides Birdeye API key server-side.
 * The proxy runs on localhost:8081 and forwards messages to/from Birdeye's API.
 * Supports Redis caching and pub/sub for efficient multi-client broadcasting.
 *
 * **STABILITY**: Uses refs to store callbacks to prevent reconnection loops
 */

export interface BirdeyeTokenStats {
    address: string;
    price: number;
    priceChange24h?: number;
    volume24h?: number;
    liquidity?: number;
    marketCap?: number;
}

export interface BirdeyeOhlcv {
    address: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export interface UseBirdeyeWebSocketOptions {
    chain?: string;
    onTokenStats?: (stats: BirdeyeTokenStats) => void;
    onOhlcv?: (ohlcv: BirdeyeOhlcv) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}

export interface UseBirdeyeWebSocketReturn {
    isConnected: boolean;
    subscribeTokenStats: (addresses: string[]) => void;
    unsubscribeTokenStats: (addresses: string[]) => void;
    subscribeOhlcv: (address: string, chartType?: string) => void;
    unsubscribeOhlcv: (address: string) => void;
    disconnect: () => void;
    subscribedTokens: Set<string>;
}

export function useBirdeyeWebSocket(options: UseBirdeyeWebSocketOptions): UseBirdeyeWebSocketReturn {
    const {
        chain = "solana",
        onTokenStats,
        onOhlcv,
        onConnect,
        onDisconnect,
        onError,
    } = options;

    // WebSocket ref
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const subscribedTokensRef = useRef<Set<string>>(new Set());
    const [subscribedTokens, setSubscribedTokens] = useState<Set<string>>(new Set());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false);

    // Store callbacks in refs to prevent reconnection loops
    const onTokenStatsRef = useRef(onTokenStats);
    const onOhlcvRef = useRef(onOhlcv);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);
    const onErrorRef = useRef(onError);

    // Update callback refs when they change (without triggering reconnection)
    useEffect(() => { onTokenStatsRef.current = onTokenStats; }, [onTokenStats]);
    useEffect(() => { onOhlcvRef.current = onOhlcv; }, [onOhlcv]);
    useEffect(() => { onConnectRef.current = onConnect; }, [onConnect]);
    useEffect(() => { onDisconnectRef.current = onDisconnect; }, [onDisconnect]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    // Connect to secure WebSocket proxy (hides API key server-side)
    const wsUrl = process.env.NEXT_PUBLIC_BIRDEYE_WS_URL || "ws://localhost:8081";
    const wsUrlWithChain = `${wsUrl}?chain=${chain}`;

    // Send message to WebSocket
    const sendMessage = useCallback((payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    }, []);

    // Handle incoming messages - use refs for callbacks to prevent reconnection loop
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            const type = data.type;
            const payload = data.data;

            if (type === "TOKEN_STATS_DATA" && payload && onTokenStatsRef.current) {
                const stats: BirdeyeTokenStats = {
                    address: payload.address || payload.tokenAddress,
                    price: payload.price ?? payload.priceUsd ?? 0,
                    priceChange24h: payload.priceChange24h ?? payload.price_change_24h,
                    volume24h: payload.volume24h ?? payload.v24hUSD,
                    liquidity: payload.liquidity ?? payload.liquidityUSD,
                    marketCap: payload.mc ?? payload.marketCap,
                };
                onTokenStatsRef.current(stats);
            }

            if ((type === "PRICE_DATA" || type === "BASE_QUOTE_PRICE_DATA") && payload && onOhlcvRef.current) {
                const ohlcv: BirdeyeOhlcv = {
                    address: payload.address || payload.baseAddress,
                    open: payload.o ?? payload.open ?? 0,
                    high: payload.h ?? payload.high ?? 0,
                    low: payload.l ?? payload.low ?? 0,
                    close: payload.c ?? payload.close ?? payload.price ?? 0,
                    volume: payload.v ?? payload.volume ?? 0,
                    timestamp: payload.unixTime ?? payload.t ?? Date.now(),
                };
                onOhlcvRef.current(ohlcv);
            }
        } catch (err) {
            console.warn("[BirdeyeWS] Failed to parse message:", err);
        }
    }, []); // No dependencies - use refs for callbacks

    // Connect to WebSocket proxy - stable function that only changes when chain changes
    const connect = useCallback(() => {
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log("[BirdeyeWS] Connection already in progress, skipping");
            return;
        }

        // Cleanup existing connection
        if (wsRef.current) {
            console.log("[BirdeyeWS] Closing existing connection");
            wsRef.current.close();
            wsRef.current = null;
        }

        isConnectingRef.current = true;
        console.log("[BirdeyeWS] Connecting to secure WebSocket proxy...");
        const ws = new WebSocket(wsUrlWithChain);

        ws.onopen = () => {
            console.log("[BirdeyeWS] Connected!");
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            isConnectingRef.current = false;
            onConnectRef.current?.();

            // Resubscribe to previously tracked tokens
            if (subscribedTokensRef.current.size > 0) {
                const addresses = Array.from(subscribedTokensRef.current);
                sendMessage({
                    type: "SUBSCRIBE_TOKEN_STATS",
                    data: {
                        address: addresses,
                        select: { price: true, priceChange24h: true, volume24h: true, liquidity: true, mc: true },
                    },
                });
            }
        };

        ws.onmessage = handleMessage;

        ws.onerror = (error) => {
            console.error("[BirdeyeWS] Error:", error);
            isConnectingRef.current = false;
            onErrorRef.current?.(error);
        };

        ws.onclose = () => {
            console.log("[BirdeyeWS] Disconnected from proxy");
            setIsConnected(false);
            isConnectingRef.current = false;
            onDisconnectRef.current?.();

            // Exponential backoff reconnect (max 30 seconds)
            const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
            console.log(`[BirdeyeWS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
            reconnectAttemptsRef.current += 1;

            // Clear any existing reconnect timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        wsRef.current = ws;
    }, [wsUrlWithChain, handleMessage, sendMessage]); // Only depend on stable values

    // Subscribe to token stats
    const subscribeTokenStats = useCallback((addresses: string[]) => {
        if (!addresses.length) return;

        addresses.forEach((addr) => subscribedTokensRef.current.add(addr));
        setSubscribedTokens(new Set(subscribedTokensRef.current));

        sendMessage({
            type: "SUBSCRIBE_TOKEN_STATS",
            data: {
                address: addresses,
                select: { price: true, priceChange24h: true, volume24h: true, liquidity: true, mc: true },
            },
        });

        console.log(`[BirdeyeWS] Subscribed to ${addresses.length} tokens`);
    }, [sendMessage]);

    // Unsubscribe from token stats
    const unsubscribeTokenStats = useCallback((addresses: string[]) => {
        addresses.forEach((addr) => subscribedTokensRef.current.delete(addr));
        setSubscribedTokens(new Set(subscribedTokensRef.current));

        sendMessage({
            type: "UNSUBSCRIBE_TOKEN_STATS",
            data: { address: addresses },
        });
    }, [sendMessage]);

    // Subscribe to OHLCV (candlestick) data
    const subscribeOhlcv = useCallback((address: string, chartType: string = "1m") => {
        sendMessage({
            type: "SUBSCRIBE_PRICE",
            data: {
                address,
                chartType,
                currency: "usd",
            },
        });
    }, [sendMessage]);

    // Unsubscribe from OHLCV
    const unsubscribeOhlcv = useCallback((address: string) => {
        sendMessage({
            type: "UNSUBSCRIBE_PRICE",
            data: { address },
        });
    }, [sendMessage]);

    // Disconnect manually
    const disconnect = useCallback(() => {
        console.log("[BirdeyeWS] Manual disconnect");
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // Connect on mount ONLY (not on every connect function change)
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [chain]); // Only reconnect if chain changes

    return {
        isConnected,
        subscribeTokenStats,
        unsubscribeTokenStats,
        subscribeOhlcv,
        unsubscribeOhlcv,
        disconnect,
        subscribedTokens,
    };
}
