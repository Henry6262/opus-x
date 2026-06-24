"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDevprintApi } from "@/lib/devprnt";

// Matches backend WalletEntryPoint struct
export interface WalletEntryPoint {
  timestamp: number;      // Unix ms
  price: number;          // USD at entry
  amount_sol: number;
  amount_usd: number;
  wallet_label: string;   // "Whale" for god wallets
  is_god_wallet: boolean;
  tx_hash: string;
}

interface UseWalletEntriesResult {
  entries: WalletEntryPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch wallet entry points for a specific token
 * Used to show where tracked wallets entered on the price chart
 */
export function useWalletEntries(mint: string | null): UseWalletEntriesResult {
  const [entries, setEntries] = useState<WalletEntryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!mint) {
      setEntries([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await fetchDevprintApi<WalletEntryPoint[]>(`/api/wallets/token/${mint}/entries`);
      setEntries(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch wallet entries";
      setError(message);
      console.error("[useWalletEntries]", err);
    } finally {
      setIsLoading(false);
    }
  }, [mint]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    isLoading,
    error,
    refetch: fetchEntries,
  };
}

/**
 * Batch fetch wallet entries for multiple tokens
 * More efficient than individual calls
 */
export function useMultipleWalletEntries(mints: string[]): Map<string, WalletEntryPoint[]> {
  const [entriesMap, setEntriesMap] = useState<Map<string, WalletEntryPoint[]>>(new Map());

  useEffect(() => {
    if (mints.length === 0) {
      setEntriesMap(new Map());
      return;
    }

    // Fetch entries for each mint in parallel
    const fetchAll = async () => {
      const results = await Promise.all(
        mints.map(async (mint) => {
          try {
            const entries = await fetchDevprintApi<WalletEntryPoint[]>(`/api/wallets/token/${mint}/entries`);
            return { mint, entries: entries || [] };
          } catch {
            return { mint, entries: [] };
          }
        })
      );

      const newMap = new Map<string, WalletEntryPoint[]>();
      for (const { mint, entries } of results) {
        newMap.set(mint, entries);
      }
      setEntriesMap(newMap);
    };

    fetchAll();
  }, [mints.join(",")]); // Re-run when mints change

  return entriesMap;
}
