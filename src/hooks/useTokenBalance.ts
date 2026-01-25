"use client";

import { useState, useEffect, useCallback } from "react";
import { SOLANA_RPC_URL, SR_TOKEN_MINT } from "@/lib/config";

interface TokenBalance {
  balance: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface TokenAccountResponse {
  result: {
    value: Array<{
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: {
                uiAmount: number;
              };
            };
          };
        };
      };
    }>;
  };
}

/**
 * Fetch SPL token balance for a wallet
 */
export function useTokenBalance(
  walletAddress: string | null,
  tokenMint: string = SR_TOKEN_MINT
): TokenBalance {
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
      // Use getTokenAccountsByOwner RPC method
      const response = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            walletAddress,
            { mint: tokenMint },
            { encoding: "jsonParsed" },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC error: ${response.status}`);
      }

      const data: TokenAccountResponse = await response.json();

      if (data.result?.value?.length > 0) {
        const tokenAmount = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        setBalance(tokenAmount);
      } else {
        // No token account found, balance is 0
        setBalance(0);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      setError(message);
      console.error("Token balance fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, tokenMint]);

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
