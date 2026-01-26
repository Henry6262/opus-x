"use client";

import { useState, useEffect, useCallback } from "react";

interface TokenBalanceData {
  balance: number;
  priceUsd: number;
  usdValue: number;
}

interface TokenBalance {
  balance: number;
  priceUsd: number;
  usdValue: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<TokenBalanceData>;
}

/**
 * Fetch SPL token balance and USD value for a wallet via our API route
 * (server-side RPC call to protect API keys)
 */
export function useTokenBalance(walletAddress: string | null): TokenBalance {
  const [balance, setBalance] = useState(0);
  const [priceUsd, setPriceUsd] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<TokenBalanceData> => {
    if (!walletAddress) {
      setBalance(0);
      setPriceUsd(0);
      setUsdValue(0);
      return { balance: 0, priceUsd: 0, usdValue: 0 };
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
      const newPriceUsd = data.priceUsd ?? 0;
      const newUsdValue = data.usdValue ?? 0;

      setBalance(newBalance);
      setPriceUsd(newPriceUsd);
      setUsdValue(newUsdValue);

      return { balance: newBalance, priceUsd: newPriceUsd, usdValue: newUsdValue };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      setError(message);
      console.error("Token balance fetch error:", err);
      return { balance: 0, priceUsd: 0, usdValue: 0 };
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
    priceUsd,
    usdValue,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
