"use client";

import { useState, useEffect, useCallback } from "react";
import { useSharedWebSocket } from "@/features/smart-trading/hooks/useWebSocket";

/**
 * Real-time price data for a god wallet token
 */
export interface TokenPrice {
  mint: string;
  symbol: string;
  priceUsd: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  priceChange30mPct: number;
  timestamp: number;
}

/**
 * WebSocket event shape from backend
 */
interface GodWalletTokenPriceUpdateEvent {
  mint: string;
  symbol: string;
  price_usd: number;
  market_cap: number;
  liquidity: number;
  volume_24h: number;
  price_change_30m_pct: number;
  timestamp: number;
}

interface UseGodWalletTokenPricesResult {
  /** Map of mint address to latest price data */
  prices: Map<string, TokenPrice>;
  /** Get price for a specific mint */
  getPrice: (mint: string) => TokenPrice | undefined;
  /** Whether we've received any price updates yet */
  hasReceivedUpdates: boolean;
  /** Last update timestamp (ms) */
  lastUpdateAt: number | null;
}

/**
 * Hook for receiving real-time price updates for god wallet tokens.
 *
 * Listens for `god_wallet_token_price_update` WebSocket events and maintains
 * a map of current prices. Updates are pushed from the backend GodWalletPriceMonitor
 * which subscribes to Birdeye WebSocket for all active god wallet tokens.
 *
 * @example
 * ```tsx
 * const { prices, getPrice, hasReceivedUpdates } = useGodWalletTokenPrices();
 *
 * // Get price for a specific token
 * const tokenPrice = getPrice(mint);
 * if (tokenPrice) {
 *   console.log(`${tokenPrice.symbol}: $${tokenPrice.priceUsd} (MC: $${tokenPrice.marketCap})`);
 * }
 *
 * // React to price changes
 * useEffect(() => {
 *   if (hasReceivedUpdates) {
 *     console.log("Received price updates for", prices.size, "tokens");
 *   }
 * }, [prices, hasReceivedUpdates]);
 * ```
 */
export function useGodWalletTokenPrices(): UseGodWalletTokenPricesResult {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [hasReceivedUpdates, setHasReceivedUpdates] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

  const { on: onTradingEvent } = useSharedWebSocket({ path: "/ws/trading" });

  // Helper to get price for a mint
  const getPrice = useCallback(
    (mint: string) => prices.get(mint),
    [prices]
  );

  // Listen for price update events
  useEffect(() => {
    const unsubscribe = onTradingEvent<GodWalletTokenPriceUpdateEvent>(
      "god_wallet_token_price_update",
      (data) => {
        const tokenPrice: TokenPrice = {
          mint: data.mint,
          symbol: data.symbol,
          priceUsd: data.price_usd,
          marketCap: data.market_cap,
          liquidity: data.liquidity,
          volume24h: data.volume_24h,
          priceChange30mPct: data.price_change_30m_pct,
          timestamp: data.timestamp,
        };

        setPrices((prev) => {
          const next = new Map(prev);
          next.set(data.mint, tokenPrice);
          return next;
        });

        setHasReceivedUpdates(true);
        setLastUpdateAt(Date.now());
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [onTradingEvent]);

  return {
    prices,
    getPrice,
    hasReceivedUpdates,
    lastUpdateAt,
  };
}
