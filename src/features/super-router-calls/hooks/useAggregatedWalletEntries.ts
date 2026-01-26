"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import type { AggregatedWalletEntry, TrackerWallet, WalletTrade } from "../types";

// Backend response shape - matches new /api/wallets/token/:mint/aggregated endpoint
interface BackendWallet {
  id: string;
  address: string;
  label: string | null;
  pfp_url: string | null;
  twitter_handle?: string | null;
  trust_score?: number;
  is_god_wallet: boolean;
  is_active?: boolean;
}

interface BackendTrade {
  timestamp: number; // Unix ms
  action: "buy" | "sell";
  price_per_token: number;
  mcap_at_trade: number | null;
  amount_usd: number;
  amount_sol: number;
  tx_hash: string;
}

interface BackendAggregatedEntry {
  wallet: BackendWallet;
  avg_entry_mcap: number;
  avg_entry_price: number;
  total_bought_usd: number;
  total_bought_sol: number;
  total_sold_usd: number;
  total_sold_sol: number;
  position_held_pct: number;
  buy_count: number;
  sell_count: number;
  first_buy_at: string;
  last_activity_at: string;
  trades: BackendTrade[];
}

interface ApiResponse {
  success: boolean;
  data: {
    mint: string;
    wallets: BackendAggregatedEntry[];
    total_wallets: number;
  };
  error?: string | null;
}

// Transform snake_case backend response to camelCase frontend type
function transformEntry(entry: BackendAggregatedEntry): AggregatedWalletEntry {
  const wallet: TrackerWallet = {
    id: entry.wallet.id,
    address: entry.wallet.address,
    label: entry.wallet.label,
    pfpUrl: entry.wallet.pfp_url,
    twitterHandle: entry.wallet.twitter_handle || null,
    trustScore: entry.wallet.trust_score || 0.5,
    isGodWallet: entry.wallet.is_god_wallet,
    isActive: entry.wallet.is_active ?? true,
  };

  const trades: WalletTrade[] = entry.trades.map((t) => ({
    action: t.action,
    priceUsd: t.price_per_token,
    amountUsd: t.amount_usd,
    amountSol: t.amount_sol,
    timestamp: new Date(t.timestamp).toISOString(),
    txHash: t.tx_hash,
  }));

  // Use backend avg_entry_mcap if available, otherwise calculate from buy trades
  let avgEntryMcap = entry.avg_entry_mcap || 0;
  let avgEntryPrice = entry.avg_entry_price || 0;

  // Fallback: Calculate from trades if backend didn't provide it
  if (avgEntryMcap === 0 && entry.trades.length > 0) {
    const buyTrades = entry.trades.filter((t) => t.action === "buy");
    if (buyTrades.length > 0) {
      // Calculate weighted average mcap from buy trades (weight by USD amount)
      let totalUsd = 0;
      let weightedMcap = 0;
      let weightedPrice = 0;

      for (const trade of buyTrades) {
        if (trade.mcap_at_trade && trade.mcap_at_trade > 0) {
          weightedMcap += trade.mcap_at_trade * trade.amount_usd;
          totalUsd += trade.amount_usd;
        }
        if (trade.price_per_token > 0) {
          weightedPrice += trade.price_per_token * trade.amount_usd;
        }
      }

      if (totalUsd > 0) {
        avgEntryMcap = weightedMcap / totalUsd;
        avgEntryPrice = weightedPrice / totalUsd;
      }
    }
  }

  return {
    wallet,
    avgEntryMcap,
    avgEntryPrice,
    positionHeldPct: entry.position_held_pct,
    totalBoughtUsd: entry.total_bought_usd,
    totalSoldUsd: entry.total_sold_usd,
    buyCount: entry.buy_count,
    sellCount: entry.sell_count,
    firstEntryTimestamp: entry.first_buy_at,
    lastTradeTimestamp: entry.last_activity_at,
    trades,
  };
}

interface UseAggregatedWalletEntriesOptions {
  godWalletsOnly?: boolean;
  refreshInterval?: number; // ms, 0 to disable
}

interface UseAggregatedWalletEntriesResult {
  entries: AggregatedWalletEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch aggregated wallet entries for a specific token
 * Uses the new /api/wallets/token/:mint/aggregated endpoint
 * Shows one wallet as one item with aggregated metrics
 */
export function useAggregatedWalletEntries(
  mint: string | null,
  options: UseAggregatedWalletEntriesOptions = {}
): UseAggregatedWalletEntriesResult {
  const { godWalletsOnly = true, refreshInterval = 0 } = options;

  const [entries, setEntries] = useState<AggregatedWalletEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchEntries = useCallback(async () => {
    if (!mint || isFetchingRef.current) {
      if (!mint) setEntries([]);
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const url = buildDevprntApiUrl(`/api/wallets/token/${mint}/aggregated`);
      if (godWalletsOnly) {
        url.searchParams.set("god_wallets_only", "true");
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch aggregated entries: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "API returned success: false");
      }

      // Extract wallets array from nested data structure
      const wallets = data.data?.wallets || [];

      // Debug: Log raw backend data to check what fields are populated
      if (wallets.length > 0) {
        console.log("[useAggregatedWalletEntries] Raw backend data for mint:", mint, {
          firstWallet: wallets[0],
          avg_entry_mcap: wallets[0]?.avg_entry_mcap,
          avg_entry_price: wallets[0]?.avg_entry_price,
          trades: wallets[0]?.trades?.slice(0, 2),
        });
      }

      const transformedEntries = wallets.map(transformEntry);
      setEntries(transformedEntries);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch aggregated wallet entries";
      setError(message);
      console.error("[useAggregatedWalletEntries]", err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [mint, godWalletsOnly]);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Optional periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0 || !mint) return;

    const intervalId = setInterval(fetchEntries, refreshInterval);
    return () => clearInterval(intervalId);
  }, [fetchEntries, refreshInterval, mint]);

  return {
    entries,
    isLoading,
    error,
    refetch: fetchEntries,
  };
}

/**
 * Batch fetch aggregated entries for multiple tokens
 */
export function useMultipleAggregatedWalletEntries(
  mints: string[],
  options: UseAggregatedWalletEntriesOptions = {}
): Map<string, AggregatedWalletEntry[]> {
  const { godWalletsOnly = true } = options;
  const [entriesMap, setEntriesMap] = useState<Map<string, AggregatedWalletEntry[]>>(new Map());

  useEffect(() => {
    if (mints.length === 0) {
      setEntriesMap(new Map());
      return;
    }

    const fetchAll = async () => {
      const results = await Promise.all(
        mints.map(async (mint) => {
          try {
            const url = buildDevprntApiUrl(`/api/wallets/token/${mint}/aggregated`);
            if (godWalletsOnly) {
              url.searchParams.set("god_wallets_only", "true");
            }

            const response = await fetch(url.toString());
            if (!response.ok) return { mint, entries: [] };

            const data: ApiResponse = await response.json();
            // Extract wallets array from nested data structure
            const wallets = data.success ? (data.data?.wallets || []) : [];
            const entries = wallets.map(transformEntry);
            return { mint, entries };
          } catch {
            return { mint, entries: [] };
          }
        })
      );

      const newMap = new Map<string, AggregatedWalletEntry[]>();
      for (const { mint, entries } of results) {
        newMap.set(mint, entries);
      }
      setEntriesMap(newMap);
    };

    fetchAll();
  }, [mints.join(","), godWalletsOnly]);

  return entriesMap;
}
