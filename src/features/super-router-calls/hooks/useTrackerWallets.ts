"use client";

import { useState, useEffect, useCallback } from "react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import type { TrackerWallet } from "../types";

interface UseTrackerWalletsResult {
  wallets: TrackerWallet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface DevprintWalletResponse {
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

function mapWallet(wallet: DevprintWalletResponse["data"]["wallets"][0]): TrackerWallet {
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

export function useTrackerWallets(): UseTrackerWalletsResult {
  const [wallets, setWallets] = useState<TrackerWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = buildDevprntApiUrl("/api/wallets/active");
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch wallets: ${response.status}`);
      }

      const data: DevprintWalletResponse = await response.json();

      if (!data.success) {
        throw new Error("API returned success: false");
      }

      const mappedWallets = data.data.wallets.map(mapWallet);
      setWallets(mappedWallets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch wallets";
      setError(message);
      console.error("[useTrackerWallets]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return {
    wallets,
    isLoading,
    error,
    refetch: fetchWallets,
  };
}
