"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSharedWebSocket } from "@/features/smart-trading/hooks/useWebSocket";
import type { TrackerWallet, GodWalletBuy } from "../types";

// Token metadata cache (persists across component remounts)
const tokenMetadataCache = new Map<string, { symbol: string; name: string; imageUrl: string | null }>();

// Fetch token metadata from DexScreener
async function fetchTokenMetadata(mint: string): Promise<{ symbol: string; name: string; imageUrl: string | null } | null> {
  // Check cache first
  if (tokenMetadataCache.has(mint)) {
    return tokenMetadataCache.get(mint)!;
  }

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!response.ok) return null;

    const data = await response.json();
    const pair = data.pairs?.[0];

    if (pair) {
      const metadata = {
        symbol: pair.baseToken?.symbol || mint.slice(0, 6),
        name: pair.baseToken?.name || "Unknown Token",
        imageUrl: pair.info?.imageUrl || null,
      };
      tokenMetadataCache.set(mint, metadata);
      return metadata;
    }
  } catch (err) {
    console.error("[fetchTokenMetadata] Error for", mint, err);
  }

  return null;
}

interface UseGodWalletsResult {
  godWallets: TrackerWallet[];
  recentBuys: GodWalletBuy[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface DevprintGodWalletsResponse {
  success: boolean;
  data: {
    wallets: Array<{
      id: string;
      address: string;
      label: string | null;
      pfp_url: string | null;
      twitter_handle: string | null;
      trust_score: number;
      is_god_wallet: boolean;
      is_active: boolean;
    }>;
    total: number;
  };
}

// Response type for recent buys endpoint (wallet_id only, no wallet details)
interface DevprintRecentBuysResponse {
  success: boolean;
  data: Array<{
    id: string;
    wallet_id: string;
    mint: string;
    chain: string;
    token_symbol: string | null;
    token_name: string | null;
    action: string;
    price_usd: number;
    amount_tokens: number;
    amount_native: number;
    amount_usd: number;
    timestamp: string;
    tx_hash: string;
  }>;
}

interface GodWalletBuyEvent {
  wallet_id: string;
  wallet_address: string;
  wallet_label: string | null;
  wallet_pfp_url: string | null;
  mint: string;
  symbol: string;
  name: string;
  image_url: string | null;
  amount_usd: number;
  amount_sol: number;
  timestamp: number;
  tx_hash: string;
  copied_by_system: boolean;
}

function mapWallet(wallet: DevprintGodWalletsResponse["data"]["wallets"][0]): TrackerWallet {
  return {
    id: wallet.id,
    address: wallet.address,
    label: wallet.label,
    pfpUrl: wallet.pfp_url,
    twitterHandle: wallet.twitter_handle,
    trustScore: wallet.trust_score,
    isGodWallet: wallet.is_god_wallet,
    isActive: wallet.is_active,
  };
}

function mapRecentBuyToGodWalletBuy(
  buy: DevprintRecentBuysResponse["data"][0],
  wallet: TrackerWallet
): GodWalletBuy {
  return {
    wallet,
    mint: buy.mint,
    symbol: buy.token_symbol || buy.mint.slice(0, 6),
    name: buy.token_name || "Unknown Token",
    imageUrl: null, // Will be loaded from DexScreener in component
    amountUsd: buy.amount_usd,
    amountSol: buy.amount_native,
    entryPricePerToken: buy.price_usd, // Token price at entry
    timestamp: buy.timestamp,
    txHash: buy.tx_hash,
    copiedBySystem: false, // Historical buys weren't necessarily copied
  };
}

export function useGodWallets(): UseGodWalletsResult {
  const [godWallets, setGodWallets] = useState<TrackerWallet[]>([]);
  const [recentBuys, setRecentBuys] = useState<GodWalletBuy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });

  const fetchGodWallets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch god wallets list
      const walletsUrl = buildDevprntApiUrl("/api/wallets/god");
      const walletsResponse = await fetch(walletsUrl.toString());

      if (!walletsResponse.ok) {
        throw new Error(`Failed to fetch god wallets: ${walletsResponse.status}`);
      }

      const walletsData: DevprintGodWalletsResponse = await walletsResponse.json();

      if (!walletsData.success) {
        throw new Error("API returned success: false");
      }

      const mappedWallets = walletsData.data.wallets.map(mapWallet);
      setGodWallets(mappedWallets);

      // Create a map of god wallets by ID for quick lookup
      const godWalletMap = new Map<string, TrackerWallet>();
      for (const wallet of mappedWallets) {
        godWalletMap.set(wallet.id, wallet);
      }

      // Fetch recent buys and filter for god wallets only
      try {
        const buysUrl = buildDevprntApiUrl("/api/wallets/recent-buys");
        const buysResponse = await fetch(buysUrl.toString());

        if (buysResponse.ok) {
          const buysData: DevprintRecentBuysResponse = await buysResponse.json();

          if (buysData.success && buysData.data) {
            // Filter for god wallet buys only (by matching wallet_id)
            const godWalletBuys: GodWalletBuy[] = [];

            for (const buy of buysData.data) {
              if (buy.action !== "buy") continue;

              const wallet = godWalletMap.get(buy.wallet_id);
              if (wallet) {
                godWalletBuys.push(mapRecentBuyToGodWalletBuy(buy, wallet));
              }
            }

            console.log("[useGodWallets] Loaded", godWalletBuys.length, "god wallet buys from DB");

            // Fetch token metadata for unique mints in parallel
            const uniqueMints = [...new Set(godWalletBuys.map(b => b.mint))];
            console.log("[useGodWallets] Fetching metadata for", uniqueMints.length, "unique tokens");

            await Promise.all(
              uniqueMints.map(mint => fetchTokenMetadata(mint))
            );

            // Enrich buys with cached metadata
            const enrichedBuys = godWalletBuys.map(buy => {
              const metadata = tokenMetadataCache.get(buy.mint);
              if (metadata) {
                return {
                  ...buy,
                  symbol: metadata.symbol,
                  name: metadata.name,
                  imageUrl: metadata.imageUrl || buy.imageUrl,
                };
              }
              return buy;
            });

            setRecentBuys(enrichedBuys);
          }
        }
      } catch (buyErr) {
        // Don't fail the whole fetch if recent buys fails
        console.error("[useGodWallets] Failed to fetch recent buys:", buyErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch god wallets";
      setError(message);
      console.error("[useGodWallets]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGodWallets();
  }, [fetchGodWallets]);

  // Listen for god wallet buy events
  useEffect(() => {
    const unsubscribe = onTradingEvent<GodWalletBuyEvent>("god_wallet_buy_detected", async (data) => {
      console.log("[useGodWallets] God wallet buy detected:", data);

      // Fetch token metadata if not in cache
      const metadata = await fetchTokenMetadata(data.mint);

      const newBuy: GodWalletBuy = {
        wallet: {
          id: data.wallet_id,
          address: data.wallet_address,
          label: data.wallet_label,
          pfpUrl: data.wallet_pfp_url,
          twitterHandle: null,
          trustScore: 1.0,
          isGodWallet: true,
          isActive: true,
        },
        mint: data.mint,
        symbol: metadata?.symbol || data.symbol || data.mint.slice(0, 6),
        name: metadata?.name || data.name || "Unknown Token",
        imageUrl: metadata?.imageUrl || data.image_url,
        amountUsd: data.amount_usd,
        amountSol: data.amount_sol,
        entryPricePerToken: 0, // WebSocket doesn't provide this, will be fetched from market data
        timestamp: new Date(data.timestamp).toISOString(),
        txHash: data.tx_hash,
        copiedBySystem: data.copied_by_system,
      };

      setRecentBuys((prev) => {
        // Check if this buy already exists (avoid duplicates)
        const exists = prev.some(
          (buy) => buy.txHash === newBuy.txHash ||
                   (buy.mint === newBuy.mint && buy.wallet.id === newBuy.wallet.id && buy.timestamp === newBuy.timestamp)
        );
        if (exists) {
          console.log("[useGodWallets] Duplicate buy detected, skipping");
          return prev;
        }
        return [newBuy, ...prev].slice(0, 20);
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [onTradingEvent]);

  return {
    godWallets,
    recentBuys,
    isLoading,
    error,
    refetch: fetchGodWallets,
  };
}
