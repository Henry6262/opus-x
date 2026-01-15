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

interface UseBirdeyePollingOptions {
    /** Polling interval in milliseconds (default: 15000 = 15 seconds) */
    intervalMs?: number;
    /** Initial tokens to poll */
    initialTokens?: string[];
    /** Callbacks */
    onTokenStats?: (stats: BirdeyeTokenStats) => void;
    onError?: (error: Error) => void;
}

interface UseBirdeyePollingReturn {
    isPolling: boolean;
    lastUpdated: number | null;
    addTokens: (addresses: string[]) => void;
    removeTokens: (addresses: string[]) => void;
    refresh: () => Promise<void>;
    subscribedTokens: Set<string>;
    tokenStats: Map<string, BirdeyeTokenStats>;
}

// ============================================
// Birdeye REST API Polling Hook
// Uses server-side proxy at /api/birdeye/token-stats
// ============================================

export function useBirdeyePolling(options: UseBirdeyePollingOptions = {}): UseBirdeyePollingReturn {
    const {
        intervalMs = 15000, // 15 seconds default
        initialTokens = [],
        onTokenStats,
        onError,
    } = options;

    const [isPolling, setIsPolling] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [tokenStats, setTokenStats] = useState<Map<string, BirdeyeTokenStats>>(new Map());
    const subscribedTokensRef = useRef<Set<string>>(new Set(initialTokens));
    const [subscribedTokens, setSubscribedTokens] = useState<Set<string>>(new Set(initialTokens));
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Fetch token stats from server-side proxy
    const fetchTokenStats = useCallback(async () => {
        const tokens = Array.from(subscribedTokensRef.current);
        if (tokens.length === 0) return;

        try {
            setIsPolling(true);
            const response = await fetch(`/api/birdeye/token-stats?addresses=${tokens.join(",")}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error || "Failed to fetch token stats");
            }

            if (!isMountedRef.current) return;

            const newStats = new Map<string, BirdeyeTokenStats>();

            for (const [address, data] of Object.entries(result.data)) {
                const stats: BirdeyeTokenStats = {
                    address,
                    price: (data as { price?: number }).price ?? 0,
                    priceChange24h: (data as { priceChange24h?: number }).priceChange24h,
                    volume24h: (data as { volume24h?: number }).volume24h,
                    liquidity: (data as { liquidity?: number }).liquidity,
                    marketCap: (data as { mc?: number; marketCap?: number }).mc ?? (data as { marketCap?: number }).marketCap,
                };

                newStats.set(address, stats);

                // Call callback for each token
                onTokenStats?.(stats);
            }

            setTokenStats(newStats);
            setLastUpdated(Date.now());
        } catch (err) {
            console.error("[BirdeyePolling] Error:", err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
        } finally {
            if (isMountedRef.current) {
                setIsPolling(false);
            }
        }
    }, [onTokenStats, onError]);

    // Add tokens to polling list
    const addTokens = useCallback((addresses: string[]) => {
        let changed = false;
        addresses.forEach((addr) => {
            if (!subscribedTokensRef.current.has(addr)) {
                subscribedTokensRef.current.add(addr);
                changed = true;
            }
        });

        if (changed) {
            setSubscribedTokens(new Set(subscribedTokensRef.current));
            // Immediately fetch when new tokens are added
            fetchTokenStats();
        }
    }, [fetchTokenStats]);

    // Remove tokens from polling list
    const removeTokens = useCallback((addresses: string[]) => {
        addresses.forEach((addr) => subscribedTokensRef.current.delete(addr));
        setSubscribedTokens(new Set(subscribedTokensRef.current));
    }, []);

    // Manual refresh
    const refresh = useCallback(async () => {
        await fetchTokenStats();
    }, [fetchTokenStats]);

    // Setup polling interval
    useEffect(() => {
        isMountedRef.current = true;

        // Initial fetch
        if (subscribedTokensRef.current.size > 0) {
            fetchTokenStats();
        }

        // Setup interval
        intervalRef.current = setInterval(fetchTokenStats, intervalMs);

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchTokenStats, intervalMs]);

    return {
        isPolling,
        lastUpdated,
        addTokens,
        removeTokens,
        refresh,
        subscribedTokens,
        tokenStats,
    };
}

export default useBirdeyePolling;
