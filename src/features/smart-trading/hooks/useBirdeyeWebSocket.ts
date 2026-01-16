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

export interface BirdeyeTransaction {
    address: string;
    txHash: string;
    blockTime: number;
    price: number;
    side: "buy" | "sell";
    volumeUSD: number;
    source: string; // "raydium", "orca", etc.
    owner: string;
}

export interface UseBirdeyeWebSocketOptions {
    chain?: string;
    onTokenStats?: (stats: BirdeyeTokenStats) => void;
    onOhlcv?: (ohlcv: BirdeyeOhlcv) => void;
    onTransaction?: (tx: BirdeyeTransaction) => void;
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
    subscribeTransactions: (addresses: string[]) => void;
    unsubscribeTransactions: (addresses: string[]) => void;
    disconnect: () => void;
    subscribedTokens: Set<string>;
    subscribedTxTokens: Set<string>;
}

export function useBirdeyeWebSocket(options: UseBirdeyeWebSocketOptions): UseBirdeyeWebSocketReturn {
    const {
        chain = "solana",
        onTokenStats,
        onOhlcv,
        onTransaction,
        onConnect,
        onDisconnect,
        onError,
    } = options;

    // WebSocket ref
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const subscribedTokensRef = useRef<Set<string>>(new Set());
    const [subscribedTokens, setSubscribedTokens] = useState<Set<string>>(new Set());
    const subscribedTxTokensRef = useRef<Set<string>>(new Set());
    const [subscribedTxTokens, setSubscribedTxTokens] = useState<Set<string>>(new Set());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false);

    // Store callbacks in refs to prevent reconnection loops
    const onTokenStatsRef = useRef(onTokenStats);
    const onOhlcvRef = useRef(onOhlcv);
    const onTransactionRef = useRef(onTransaction);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);
    const onErrorRef = useRef(onError);

    // Update callback refs when they change (without triggering reconnection)
    useEffect(() => { onTokenStatsRef.current = onTokenStats; }, [onTokenStats]);
    useEffect(() => { onOhlcvRef.current = onOhlcv; }, [onOhlcv]);
    useEffect(() => { onTransactionRef.current = onTransaction; }, [onTransaction]);
    useEffect(() => { onConnectRef.current = onConnect; }, [onConnect]);
    useEffect(() => { onDisconnectRef.current = onDisconnect; }, [onDisconnect]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    // Connect to Rust backend WebSocket proxy (hides API key server-side)
    const wsUrl = process.env.NEXT_PUBLIC_BIRDEYE_WS_URL || "ws://localhost:3001/ws/birdeye";

    // Properly construct URL with chain parameter (avoid duplicates)
    const url = new URL(wsUrl);
    if (!url.searchParams.has('chain')) {
        url.searchParams.set('chain', chain);
    }
    const wsUrlWithChain = url.toString();

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

            // PRICE_DATA from Railway proxy (used for both token stats and OHLCV)
            if ((type === "PRICE_DATA" || type === "BASE_QUOTE_PRICE_DATA") && payload) {
                // If subscribed via subscribeTokenStats, trigger onTokenStats callback
                if (onTokenStatsRef.current) {
                    const stats: BirdeyeTokenStats = {
                        address: payload.address || payload.tokenAddress || payload.baseAddress,
                        price: payload.c ?? payload.close ?? payload.price ?? payload.priceUsd ?? 0,
                        priceChange24h: payload.priceChange24h ?? payload.price_change_24h,
                        volume24h: payload.v ?? payload.volume ?? payload.volume24h ?? payload.v24hUSD,
                        liquidity: payload.liquidity ?? payload.liquidityUSD,
                        marketCap: payload.marketcap ?? payload.mc ?? payload.marketCap,
                    };
                    onTokenStatsRef.current(stats);
                }

                // If subscribed via subscribeOhlcv, trigger onOhlcv callback
                if (onOhlcvRef.current) {
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
            }

            if (type === "TXS_DATA" && payload && onTransactionRef.current) {
                const tx: BirdeyeTransaction = {
                    address: payload.address || payload.token,
                    txHash: payload.txHash || payload.signature,
                    blockTime: payload.blockTime || payload.blockUnixTime || Date.now() / 1000,
                    price: payload.price || 0,
                    side: payload.side || (payload.type === "buy" ? "buy" : "sell"),
                    volumeUSD: payload.volumeUSD || payload.volume || 0,
                    source: payload.source || payload.platform || "unknown",
                    owner: payload.owner || payload.from || "",
                };
                onTransactionRef.current(tx);
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
                // Railway proxy expects SUBSCRIBE_PRICE with single address + chain
                addresses.forEach((address) => {
                    sendMessage({
                        type: "SUBSCRIBE_PRICE",
                        data: {
                            address,
                            chain,
                        },
                    });
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

        // Birdeye API expects SUBSCRIBE_PRICE with queryType, chartType, address, currency
        addresses.forEach((address) => {
            sendMessage({
                type: "SUBSCRIBE_PRICE",
                data: {
                    queryType: "simple",
                    chartType: "1m",
                    address,
                    currency: "usd",
                },
            });
        });

        console.log(`[BirdeyeWS] Subscribed to ${addresses.length} tokens`);
    }, [sendMessage]);

    // Unsubscribe from token stats
    const unsubscribeTokenStats = useCallback((addresses: string[]) => {
        addresses.forEach((addr) => subscribedTokensRef.current.delete(addr));
        setSubscribedTokens(new Set(subscribedTokensRef.current));

        // Railway proxy expects UNSUBSCRIBE_PRICE with single address
        addresses.forEach((address) => {
            sendMessage({
                type: "UNSUBSCRIBE_PRICE",
                data: { address },
            });
        });
    }, [sendMessage]);

    // Subscribe to OHLCV (candlestick) data
    const subscribeOhlcv = useCallback((address: string, chartType: string = "1m") => {
        sendMessage({
            type: "SUBSCRIBE_PRICE",
            data: {
                queryType: "simple",
                chartType,
                address,
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

    // Subscribe to transactions (swap events)
    const subscribeTransactions = useCallback((addresses: string[]) => {
        if (!addresses.length) return;

        addresses.forEach((addr) => subscribedTxTokensRef.current.add(addr));
        setSubscribedTxTokens(new Set(subscribedTxTokensRef.current));

        addresses.forEach((address) => {
            sendMessage({
                type: "SUBSCRIBE_TXS",
                data: {
                    queryType: "simple",
                    address,
                    txsType: "swap",
                },
            });
        });

        console.log(`[BirdeyeWS] Subscribed to transactions for ${addresses.length} tokens`);
    }, [sendMessage]);

    // Unsubscribe from transactions
    const unsubscribeTransactions = useCallback((addresses: string[]) => {
        addresses.forEach((addr) => subscribedTxTokensRef.current.delete(addr));
        setSubscribedTxTokens(new Set(subscribedTxTokensRef.current));

        addresses.forEach((address) => {
            sendMessage({
                type: "UNSUBSCRIBE_TXS",
                data: { address },
            });
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
        subscribeTransactions,
        unsubscribeTransactions,
        disconnect,
        subscribedTokens,
        subscribedTxTokens,
    };
}
