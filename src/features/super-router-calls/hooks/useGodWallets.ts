"use client";

import { useState, useEffect, useCallback } from "react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSharedWebSocket } from "@/features/smart-trading/hooks/useWebSocket";
import type { TrackerWallet, GodWalletBuy } from "../types";

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

      const url = buildDevprntApiUrl("/api/wallets/god");
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch god wallets: ${response.status}`);
      }

      const data: DevprintGodWalletsResponse = await response.json();

      if (!data.success) {
        throw new Error("API returned success: false");
      }

      const mappedWallets = data.data.wallets.map(mapWallet);
      setGodWallets(mappedWallets);
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
    const unsubscribe = onTradingEvent<GodWalletBuyEvent>("god_wallet_buy_detected", (data) => {
      console.log("[useGodWallets] God wallet buy detected:", data);

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
        symbol: data.symbol,
        name: data.name,
        imageUrl: data.image_url,
        amountUsd: data.amount_usd,
        amountSol: data.amount_sol,
        timestamp: new Date(data.timestamp).toISOString(),
        txHash: data.tx_hash,
        copiedBySystem: data.copied_by_system,
      };

      setRecentBuys((prev) => [newBuy, ...prev].slice(0, 20));
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
