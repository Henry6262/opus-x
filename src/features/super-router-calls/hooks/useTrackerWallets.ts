"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDevprintApi } from "@/lib/devprnt";
import type { TrackerWallet } from "../types";

interface UseTrackerWalletsResult {
  wallets: TrackerWallet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface DevprintWalletData {
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
}

function mapWallet(wallet: DevprintWalletData["wallets"][0]): TrackerWallet {
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

      const data = await fetchDevprintApi<DevprintWalletData>("/api/wallets/active");
      const mappedWallets = data.wallets.map(mapWallet);
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
