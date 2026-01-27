"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { buildDevprntApiUrl } from "@/lib/devprnt";

/**
 * A single price history data point
 */
export interface PriceHistoryPoint {
  /** ISO timestamp string */
  recordedAt: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Price in USD */
  priceUsd: number;
  /** Market cap (may be null for older points) */
  marketCap: number | null;
  /** Liquidity (may be null for older points) */
  liquidity: number | null;
  /** 24h volume (may be null for older points) */
  volume24h: number | null;
}

/**
 * Response from the price history API
 */
interface PriceHistoryApiResponse {
  success: boolean;
  data: {
    mint: string;
    duration_minutes: number;
    points: Array<{
      recorded_at: string;
      price_usd: number;
      market_cap: number | null;
      liquidity: number | null;
      volume_24h: number | null;
    }>;
    current_price: number;
    price_change_pct: number;
  };
}

interface UseTokenPriceHistoryResult {
  /** Historical price points sorted by time (oldest first) */
  history: PriceHistoryPoint[];
  /** Current price (latest point) */
  currentPrice: number | null;
  /** Price change percentage over the requested duration */
  priceChangePct: number | null;
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
}

// Cache for price history (mint:duration -> data)
const priceHistoryCache = new Map<string, {
  data: UseTokenPriceHistoryResult;
  fetchedAt: number;
}>();

// Cache TTL: 30 seconds
const CACHE_TTL_MS = 30 * 1000;

/**
 * Hook for fetching historical price data for a token.
 *
 * Fetches from `/api/tokens/{mint}/price-history?duration={minutes}` and caches
 * the result for 30 seconds. Returns price history points that can be used
 * to render real charts instead of synthetic data.
 *
 * @param mint - Token mint address
 * @param durationMinutes - Duration of history to fetch (default: 30 minutes)
 *
 * @example
 * ```tsx
 * const { history, isLoading, currentPrice, priceChangePct } = useTokenPriceHistory(mint, 30);
 *
 * // Use for chart data
 * const chartData = history.map(point => ({
 *   time: Math.floor(point.timestamp / 1000) as UTCTimestamp,
 *   value: point.marketCap || point.priceUsd,
 * }));
 *
 * // Show price change
 * if (priceChangePct !== null) {
 *   console.log(`Price changed ${priceChangePct.toFixed(2)}% in last ${durationMinutes} minutes`);
 * }
 * ```
 */
export function useTokenPriceHistory(
  mint: string | null | undefined,
  durationMinutes = 30
): UseTokenPriceHistoryResult {
  const [history, setHistory] = useState<PriceHistoryPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChangePct, setPriceChangePct] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current request to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!mint) {
      setHistory([]);
      setCurrentPrice(null);
      setPriceChangePct(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${mint}:${durationMinutes}`;

    // Check cache
    const cached = priceHistoryCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setHistory(cached.data.history);
      setCurrentPrice(cached.data.currentPrice);
      setPriceChangePct(cached.data.priceChangePct);
      setIsLoading(false);
      setError(cached.data.error);
      return;
    }

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const url = buildDevprntApiUrl(`/api/tokens/${mint}/price-history?duration=${durationMinutes}`);
      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }

      const data: PriceHistoryApiResponse = await response.json();

      if (!data.success) {
        throw new Error("API returned success: false");
      }

      // Map API response to our types
      const mappedHistory: PriceHistoryPoint[] = data.data.points.map((point) => ({
        recordedAt: point.recorded_at,
        timestamp: new Date(point.recorded_at).getTime(),
        priceUsd: point.price_usd,
        marketCap: point.market_cap,
        liquidity: point.liquidity,
        volume24h: point.volume_24h,
      }));

      // Sort by time (oldest first) for chart rendering
      mappedHistory.sort((a, b) => a.timestamp - b.timestamp);

      const result: UseTokenPriceHistoryResult = {
        history: mappedHistory,
        currentPrice: data.data.current_price,
        priceChangePct: data.data.price_change_pct,
        isLoading: false,
        error: null,
        refetch: fetchHistory,
      };

      // Update cache
      priceHistoryCache.set(cacheKey, {
        data: result,
        fetchedAt: Date.now(),
      });

      setHistory(mappedHistory);
      setCurrentPrice(data.data.current_price);
      setPriceChangePct(data.data.price_change_pct);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was aborted, don't update state
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to fetch price history";
      setError(message);
      console.error("[useTokenPriceHistory]", err);
    } finally {
      setIsLoading(false);
    }
  }, [mint, durationMinutes]);

  // Fetch on mount and when mint/duration changes
  useEffect(() => {
    fetchHistory();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHistory]);

  return {
    history,
    currentPrice,
    priceChangePct,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}

/**
 * Hook for fetching price history for multiple tokens at once.
 *
 * Useful for rendering charts for multiple tokens in a list view.
 * Each token's history is fetched independently and cached.
 *
 * @param mints - Array of token mint addresses
 * @param durationMinutes - Duration of history to fetch (default: 30 minutes)
 *
 * @example
 * ```tsx
 * const historyMap = useMultipleTokenPriceHistories(mints, 30);
 *
 * // Use in a list
 * {calls.map(call => {
 *   const history = historyMap.get(call.mint);
 *   if (history?.history.length > 0) {
 *     return <RealChart data={history.history} />;
 *   }
 *   return <SyntheticChart />;
 * })}
 * ```
 */
export function useMultipleTokenPriceHistories(
  mints: string[],
  durationMinutes = 30
): Map<string, UseTokenPriceHistoryResult> {
  const [results, setResults] = useState<Map<string, UseTokenPriceHistoryResult>>(new Map());

  useEffect(() => {
    if (mints.length === 0) {
      setResults(new Map());
      return;
    }

    // Fetch all histories in parallel
    const fetchAll = async () => {
      const entries = await Promise.all(
        mints.map(async (mint) => {
          const cacheKey = `${mint}:${durationMinutes}`;
          const cached = priceHistoryCache.get(cacheKey);

          if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            return [mint, cached.data] as const;
          }

          try {
            const url = buildDevprntApiUrl(`/api/tokens/${mint}/price-history?duration=${durationMinutes}`);
            const response = await fetch(url.toString());

            if (!response.ok) {
              return [mint, {
                history: [] as PriceHistoryPoint[],
                currentPrice: null,
                priceChangePct: null,
                isLoading: false,
                error: `Failed: ${response.status}`,
                refetch: async () => {},
              } satisfies UseTokenPriceHistoryResult] as const;
            }

            const data: PriceHistoryApiResponse = await response.json();

            if (!data.success) {
              return [mint, {
                history: [] as PriceHistoryPoint[],
                currentPrice: null,
                priceChangePct: null,
                isLoading: false,
                error: "API error",
                refetch: async () => {},
              } satisfies UseTokenPriceHistoryResult] as const;
            }

            const mappedHistory: PriceHistoryPoint[] = data.data.points.map((point) => ({
              recordedAt: point.recorded_at,
              timestamp: new Date(point.recorded_at).getTime(),
              priceUsd: point.price_usd,
              marketCap: point.market_cap,
              liquidity: point.liquidity,
              volume24h: point.volume_24h,
            }));

            mappedHistory.sort((a, b) => a.timestamp - b.timestamp);

            const result: UseTokenPriceHistoryResult = {
              history: mappedHistory,
              currentPrice: data.data.current_price,
              priceChangePct: data.data.price_change_pct,
              isLoading: false,
              error: null,
              refetch: async () => {},
            };

            // Cache result
            priceHistoryCache.set(cacheKey, {
              data: result,
              fetchedAt: Date.now(),
            });

            return [mint, result] as const;
          } catch (err) {
            return [mint, {
              history: [] as PriceHistoryPoint[],
              currentPrice: null,
              priceChangePct: null,
              isLoading: false,
              error: err instanceof Error ? err.message : "Fetch error",
              refetch: async () => {},
            } satisfies UseTokenPriceHistoryResult] as const;
          }
        })
      );

      setResults(new Map(entries));
    };

    fetchAll();
  }, [mints.join(","), durationMinutes]);

  return results;
}
