"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPumpTokens } from "../service";
import type { FetchTokensParams, PumpTokenWithTweet } from "../types";

export interface UsePumpTokensResult {
  tokens: PumpTokenWithTweet[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  filters: FetchTokensParams;
  updateFilters: (newFilters: Partial<FetchTokensParams>) => void;
  refresh: () => void;
}

export function usePumpTokens(initialFilters: FetchTokensParams = {}): UsePumpTokensResult {
  const [tokens, setTokens] = useState<PumpTokenWithTweet[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FetchTokensParams>({
    ...initialFilters,
    offset: initialFilters.offset ?? 0,
  });

  const loadingRef = useRef(false);

  const loadTokens = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPumpTokens(filters);
      setTokens(result.tokens);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [filters]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const updateFilters = useCallback((newFilters: Partial<FetchTokensParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      ...(newFilters.offset === undefined ? { offset: 0 } : {}),
    }));
  }, []);

  const refresh = useCallback(() => {
    setFilters((prev) => ({ ...prev, offset: 0 }));
  }, []);

  return {
    tokens,
    total,
    hasMore,
    isLoading,
    error,
    filters,
    updateFilters,
    refresh,
  };
}
