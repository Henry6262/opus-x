"use client";

import { useState, useEffect, useCallback } from "react";

interface TokenBalance {
  balance: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch SPL token balance for a wallet via our API route
 * (server-side RPC call to protect API keys)
 */
export function useTokenBalance(walletAddress: string | null): TokenBalance {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/token-balance?wallet=${encodeURIComponent(walletAddress)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      setBalance(data.balance ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      setError(message);
      console.error("Token balance fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
