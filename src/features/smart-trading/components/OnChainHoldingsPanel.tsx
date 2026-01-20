"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

// ============================================
// Types for On-Chain Holdings
// ============================================

import type { HoldingData } from "../types";

// Use the correct HoldingData type from shared types
type OnChainHolding = HoldingData;

// ============================================
// Holdings Card Component
// ============================================

interface HoldingCardProps {
    holding: OnChainHolding;
}

function HoldingCard({ holding }: HoldingCardProps) {
    const formatValue = (val: number | null) => {
        if (val === null) return "—";
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
        return `$${val.toFixed(2)}`;
    };

    const formatAmount = (val: number) => {
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
        return val.toFixed(2);
    };

    // Calculate current value in SOL
    const currentValueSol = holding.current_quantity * holding.current_price;

    // PnL is positive if unrealized PnL >= 0
    const isPositive = (holding.unrealized_pnl_sol || 0) >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all"
        >
            {/* Token Image */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {holding.image_url ? (
                    <Image
                        src={holding.image_url}
                        alt={holding.symbol}
                        width={32}
                        height={32}
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                        {holding.symbol.slice(0, 2)}
                    </div>
                )}
            </div>

            {/* Token Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{holding.symbol}</span>
                    <a
                        href={`https://solscan.io/token/${holding.mint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/60 transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <div className="text-[10px] text-white/40 truncate">{holding.name}</div>
            </div>

            {/* Amount & Entry Price */}
            <div className="text-right">
                <div className="text-sm font-medium font-mono tabular-nums text-white">{formatAmount(holding.current_quantity)}</div>
                <div className="text-[10px] font-mono tabular-nums text-white/40">
                    {holding.current_price ? `@${holding.current_price.toFixed(8)} SOL` : "No price"}
                </div>
            </div>

            {/* Current Value SOL + PnL% */}
            <div className="text-right min-w-[90px]">
                <div className="text-sm font-medium font-mono tabular-nums text-white flex items-center justify-end gap-1">
                    {currentValueSol.toFixed(3)}
                    <Image src="/logos/solana.png" alt="SOL" width={12} height={12} />
                </div>
                <div className={`text-[10px] font-mono tabular-nums font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{holding.unrealized_pnl_pct?.toFixed(1) || "0.0"}%
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// On-Chain Holdings Panel
// ============================================

interface OnChainHoldingsPanelProps {
    walletAddress?: string;
    minValueUsd?: number;
}

export function OnChainHoldingsPanel({ walletAddress, minValueUsd = 0.1 }: OnChainHoldingsPanelProps) {
  const [holdings, setHoldings] = useState<OnChainHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const searchParams = useSearchParams();
  const walletFromQuery = searchParams?.get("wallet") || undefined;
  const effectiveWallet = useMemo(() => walletAddress ?? walletFromQuery, [walletAddress, walletFromQuery]);

  const fetchHoldings = useCallback(async () => {
    if (!effectiveWallet) {
      setHoldings([]);
      setTotalValue(0);
      setError("Provide a wallet (?wallet=) or set a trading wallet to load holdings.");
      setIsLoading(false);
      return;
    }

    const friendlyError = (message?: string | null) => {
      if (!message) return "Failed to load holdings. Please retry.";
      const lower = message.toLowerCase();
      if (lower.includes("error decoding response body") || lower.includes("invalid type")) {
        return "Holdings API returned malformed data. Please retry later.";
      }
      return message;
    };

    try {
      setIsLoading(true);
      // Note: /api/trading/holdings doesn't accept wallet parameter - it returns holdings for the configured trading wallet
      // This panel shows the same portfolio data as PortfolioHoldingsPanel
      const url = buildDevprntApiUrl("/api/trading/holdings");
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      let result: any = null;
      try {
        result = await response.json();
      } catch (parseErr) {
        throw new Error("Unexpected response while loading holdings");
      }

      if (result && result.success === false) {
        throw new Error(friendlyError(result.error));
      }

      const rawData: OnChainHolding[] = (result?.data as OnChainHolding[]) || [];

      // Filter open and partially_closed positions
      const data = rawData.filter(
        (h) => (h.status === "open" || h.status === "partially_closed") && h.current_quantity > 0
      );

      // Add image_url if missing (use DexScreener)
      const enrichedData = data.map(h => ({
        ...h,
        image_url: h.image_url || `https://dd.dexscreener.com/ds-data/tokens/solana/${h.mint}.png`,
      }));

      setHoldings(enrichedData);

      // Calculate total value in SOL (entry + unrealized PnL)
      const totalSol = enrichedData.reduce((sum, h) => {
        const currentValue = h.entry_sol_value + (h.unrealized_pnl_sol || 0);
        return sum + currentValue;
      }, 0);
      setTotalValue(totalSol);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch on-chain holdings:", err);
      setError(err instanceof Error ? friendlyError(err.message) : "Failed to load holdings. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveWallet, minValueUsd]);

  useEffect(() => {
    fetchHoldings();
    const interval = setInterval(fetchHoldings, 60000); // Refresh every 60s
    return () => clearInterval(interval);
    }, [fetchHoldings]);

    return (
        <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#c4f70e]" />
                    <span className="text-sm font-medium text-white">On-Chain Holdings</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold tabular-nums rounded bg-[#c4f70e]/20 text-[#c4f70e]">
                        {holdings.length}
                    </span>
                    {totalValue > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono tabular-nums rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                            {totalValue.toFixed(2)}
                            <Image src="/logos/solana.png" alt="SOL" width={10} height={10} />
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchHoldings}
                    disabled={isLoading}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                {isLoading && holdings.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 text-white/40 animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="text-center py-4 text-red-400 text-sm">
                        {error}
                        <button
                            onClick={fetchHoldings}
                            className="block mx-auto mt-2 text-xs text-white/40 hover:text-white underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!error && holdings.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                        <Wallet className="w-10 h-10 mb-3 opacity-50" />
                        <span className="text-sm">No token holdings found</span>
                        <span className="text-xs text-white/30 mt-1">Or provide wallet address</span>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {holdings.map((holding) => (
                        <HoldingCard key={holding.mint} holding={holding} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default OnChainHoldingsPanel;
