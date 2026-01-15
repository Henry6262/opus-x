"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { BirdeyeWalletHolding } from "@/app/api/birdeye/wallet-holdings/route";

// Re-export the type for consumers
export type { BirdeyeWalletHolding };

// ============================================
// Types
// ============================================

export interface BirdeyeWalletData {
    wallet: string;
    totalUsd: number;
    holdings: BirdeyeWalletHolding[];
    holdingsMap: Record<string, BirdeyeWalletHolding>;
    tokenCount: number;
}

export interface ValidationResult {
    mint: string;
    symbol: string;
    /** Position quantity from our system */
    expectedQuantity: number;
    /** Actual on-chain quantity from Birdeye */
    actualQuantity: number;
    /** Whether the position is valid (on-chain balance exists) */
    isValid: boolean;
    /** Quantity mismatch (actual - expected) */
    quantityDiff: number;
    /** Mismatch as percentage of expected */
    mismatchPercent: number;
}

interface UseBirdeyeWalletHoldingsOptions {
    /** Wallet address to fetch holdings for */
    walletAddress?: string | null;
    /** Auto-refresh interval in ms (default: 30000 = 30 seconds) */
    refreshIntervalMs?: number;
    /** Enable auto-refresh (default: true) */
    autoRefresh?: boolean;
    /** Callback when holdings are updated */
    onUpdate?: (data: BirdeyeWalletData) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}

interface UseBirdeyeWalletHoldingsReturn {
    /** Wallet holdings data */
    data: BirdeyeWalletData | null;
    /** Holdings map for quick lookup by mint */
    holdingsMap: Map<string, BirdeyeWalletHolding>;
    /** Whether currently loading */
    isLoading: boolean;
    /** Error if any */
    error: Error | null;
    /** Last successful fetch timestamp */
    lastUpdated: number | null;
    /** Manually refresh holdings */
    refresh: () => Promise<void>;
    /** Validate a position against on-chain holdings */
    validatePosition: (mint: string, expectedQuantity: number, symbol?: string) => ValidationResult;
    /** Validate multiple positions at once */
    validatePositions: (positions: Array<{ mint: string; quantity: number; symbol?: string }>) => ValidationResult[];
    /** Check if a token is held on-chain */
    hasHolding: (mint: string) => boolean;
    /** Get holding for a specific mint */
    getHolding: (mint: string) => BirdeyeWalletHolding | undefined;
}

// ============================================
// Hook Implementation
// ============================================

export function useBirdeyeWalletHoldings(
    options: UseBirdeyeWalletHoldingsOptions = {}
): UseBirdeyeWalletHoldingsReturn {
    const {
        walletAddress,
        refreshIntervalMs = 30000,
        autoRefresh = true,
        onUpdate,
        onError,
    } = options;

    const [data, setData] = useState<BirdeyeWalletData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    const isMountedRef = useRef(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Build a Map for quick lookup
    const holdingsMap = useMemo(() => {
        const map = new Map<string, BirdeyeWalletHolding>();
        if (data?.holdings) {
            for (const holding of data.holdings) {
                map.set(holding.address, holding);
            }
        }
        return map;
    }, [data]);

    // Fetch holdings from Birdeye API
    const fetchHoldings = useCallback(async () => {
        if (!walletAddress) {
            setData(null);
            setError(null);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/birdeye/wallet-holdings?wallet=${walletAddress}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to fetch wallet holdings");
            }

            if (!isMountedRef.current) return;

            const walletData: BirdeyeWalletData = result.data;
            setData(walletData);
            setLastUpdated(Date.now());
            onUpdate?.(walletData);
        } catch (err) {
            console.error("[BirdeyeWallet] Error:", err);
            const error = err instanceof Error ? err : new Error(String(err));
            if (isMountedRef.current) {
                setError(error);
                onError?.(error);
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [walletAddress, onUpdate, onError]);

    // Manual refresh
    const refresh = useCallback(async () => {
        await fetchHoldings();
    }, [fetchHoldings]);

    // Check if we have a holding for a mint
    const hasHolding = useCallback(
        (mint: string): boolean => {
            return holdingsMap.has(mint);
        },
        [holdingsMap]
    );

    // Get specific holding
    const getHolding = useCallback(
        (mint: string): BirdeyeWalletHolding | undefined => {
            return holdingsMap.get(mint);
        },
        [holdingsMap]
    );

    // Validate a single position against on-chain holdings
    const validatePosition = useCallback(
        (mint: string, expectedQuantity: number, symbol?: string): ValidationResult => {
            const holding = holdingsMap.get(mint);
            const actualQuantity = holding?.uiAmount ?? 0;
            const quantityDiff = actualQuantity - expectedQuantity;
            const mismatchPercent =
                expectedQuantity > 0 ? Math.abs(quantityDiff / expectedQuantity) * 100 : 0;

            // Position is valid if on-chain balance is >= 90% of expected (allow small rounding errors)
            const isValid = actualQuantity > 0 && mismatchPercent < 10;

            return {
                mint,
                symbol: symbol || holding?.symbol || "UNKNOWN",
                expectedQuantity,
                actualQuantity,
                isValid,
                quantityDiff,
                mismatchPercent,
            };
        },
        [holdingsMap]
    );

    // Validate multiple positions
    const validatePositions = useCallback(
        (positions: Array<{ mint: string; quantity: number; symbol?: string }>): ValidationResult[] => {
            return positions.map((pos) => validatePosition(pos.mint, pos.quantity, pos.symbol));
        },
        [validatePosition]
    );

    // Setup effect for initial fetch and auto-refresh
    useEffect(() => {
        isMountedRef.current = true;

        // Initial fetch
        if (walletAddress) {
            fetchHoldings();
        }

        // Setup auto-refresh interval
        if (autoRefresh && walletAddress) {
            intervalRef.current = setInterval(fetchHoldings, refreshIntervalMs);
        }

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [walletAddress, autoRefresh, refreshIntervalMs, fetchHoldings]);

    return {
        data,
        holdingsMap,
        isLoading,
        error,
        lastUpdated,
        refresh,
        validatePosition,
        validatePositions,
        hasHolding,
        getHolding,
    };
}

export default useBirdeyeWalletHoldings;
