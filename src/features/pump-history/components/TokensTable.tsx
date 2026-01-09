import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import type { PumpTokenWithTweet } from "../types";
import type { TokenPnL } from "@/lib/priceTracking";
import { TokenCard } from "./TokenCard";

interface TokensTableProps {
  tokens: PumpTokenWithTweet[];
  isLoading: boolean;
  onRefresh: () => void;
  pnlData?: Map<string, TokenPnL>;
}

export function TokensTable({ tokens, isLoading, onRefresh, pnlData }: TokensTableProps) {
  const [newTokenIds, setNewTokenIds] = useState<Set<string>>(new Set());

  // Track new tokens for animation
  useEffect(() => {
    const currentIds = new Set(tokens.map((t) => t.mint));
    const newIds = new Set<string>();

    tokens.forEach((token) => {
      if (!newTokenIds.has(token.mint)) {
        newIds.add(token.mint);
      }
    });

    if (newIds.size > 0) {
      setNewTokenIds(currentIds);

      // Clear new status after animation completes
      setTimeout(() => {
        setNewTokenIds((prev) => {
          const updated = new Set(prev);
          newIds.forEach((id) => updated.delete(id));
          return updated;
        });
      }, 1000);
    }
  }, [tokens]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-solana-cyan font-semibold mb-1">
              Token Feed
            </p>
            <h3 className="text-2xl font-display font-bold gradient-text">
              Migration Intelligence
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="btn-ghost"
          >
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && tokens.length === 0 ? (
        <div className="card-glass">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="inline-block w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
              <p className="text-sm text-white/50 font-mono">
                Loading pump history...
              </p>
            </div>
          </div>
        </div>
      ) : tokens.length === 0 ? (
        <div className="card-glass">
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="text-4xl">📊</div>
            <p className="text-sm text-white/50 font-mono">
              No tokens detected yet. Monitoring for migrations...
            </p>
          </div>
        </div>
      ) : (
        /* Token cards grid */
        <div className="space-y-3">
          {tokens.map((token) => (
            <TokenCard
              key={token.mint}
              token={token}
              isNew={newTokenIds.has(token.mint)}
              pnl={pnlData?.get(token.mint)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
