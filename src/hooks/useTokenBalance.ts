"use client";

import { useState, useEffect, useCallback } from "react";

interface TokenBalance {
  balance: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<number>;
}

/**
 * Fetch SPL token balance for a wallet via our API route
 * (server-side RPC call to protect API keys)
 */
export function useTokenBalance(walletAddress: string | null): TokenBalance {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress) {
      setBalance(0);
      return 0;
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

      const newBalance = data.balance ?? 0;
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      setError(message);
      console.error("Token balance fetch error:", err);
      return 0;
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
