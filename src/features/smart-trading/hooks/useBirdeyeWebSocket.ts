"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ============================================
// Types
// ============================================

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

type MessageHandler = (data: BirdeyeTokenStats | BirdeyeOhlcv) => void;

interface UseBirdeyeWebSocketOptions {
    apiKey: string;
    chain?: string;
    onTokenStats?: (stats: BirdeyeTokenStats) => void;
    onOhlcv?: (ohlcv: BirdeyeOhlcv) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}

interface UseBirdeyeWebSocketReturn {
    isConnected: boolean;
    subscribeTokenStats: (addresses: string[]) => void;
    unsubscribeTokenStats: (addresses: string[]) => void;
    subscribeOhlcv: (address: string, chartType?: string) => void;
    unsubscribeOhlcv: (address: string) => void;
    subscribedTokens: Set<string>;
}

// ============================================
// Birdeye WebSocket Hook
// ============================================

export function useBirdeyeWebSocket(options: UseBirdeyeWebSocketOptions): UseBirdeyeWebSocketReturn {
    const {
        apiKey,
        chain = "solana",
        onTokenStats,
        onOhlcv,
        onConnect,
        onDisconnect,
        onError,
    } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const subscribedTokensRef = useRef<Set<string>>(new Set());
    const [subscribedTokens, setSubscribedTokens] = useState<Set<string>>(new Set());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);

    // Build WebSocket URL
    const wsUrl = `wss://public-api.birdeye.so/socket/${chain}?x-api-key=${apiKey}`;

    // Send message to WebSocket
    const sendMessage = useCallback((payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    }, []);

    // Handle incoming messages
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            const type = data.type;
            const payload = data.data;

            if (type === "TOKEN_STATS_DATA" && payload && onTokenStats) {
                const stats: BirdeyeTokenStats = {
                    address: payload.address || payload.tokenAddress,
                    price: payload.price ?? payload.priceUsd ?? 0,
                    priceChange24h: payload.priceChange24h ?? payload.price_change_24h,
                    volume24h: payload.volume24h ?? payload.v24hUSD,
                    liquidity: payload.liquidity ?? payload.liquidityUSD,
                    marketCap: payload.mc ?? payload.marketCap,
                };
                onTokenStats(stats);
            }

            if ((type === "PRICE_DATA" || type === "BASE_QUOTE_PRICE_DATA") && payload && onOhlcv) {
                const ohlcv: BirdeyeOhlcv = {
                    address: payload.address || payload.baseAddress,
                    open: payload.o ?? payload.open ?? 0,
                    high: payload.h ?? payload.high ?? 0,
                    low: payload.l ?? payload.low ?? 0,
                    close: payload.c ?? payload.close ?? payload.price ?? 0,
                    volume: payload.v ?? payload.volume ?? 0,
                    timestamp: payload.unixTime ?? payload.t ?? Date.now(),
                };
                onOhlcv(ohlcv);
            }
        } catch (err) {
            console.warn("[BirdeyeWS] Failed to parse message:", err);
        }
    }, [onTokenStats, onOhlcv]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!apiKey) {
            console.warn("[BirdeyeWS] No API key provided");
            return;
        }

        // Cleanup existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        console.log("[BirdeyeWS] Connecting to Birdeye WebSocket...");
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("[BirdeyeWS] Connected!");
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            onConnect?.();

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
            onError?.(error);
        };

        ws.onclose = () => {
            console.log("[BirdeyeWS] Disconnected");
            setIsConnected(false);
            onDisconnect?.();

            // Exponential backoff reconnect
            const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        wsRef.current = ws;
    }, [apiKey, wsUrl, handleMessage, onConnect, onDisconnect, onError, sendMessage]);

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

    // Connect on mount
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
    }, [connect]);

    return {
        isConnected,
        subscribeTokenStats,
        unsubscribeTokenStats,
        subscribeOhlcv,
        unsubscribeOhlcv,
        subscribedTokens,
    };
}

export default useBirdeyeWebSocket;
