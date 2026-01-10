import { useState, useEffect } from "react";
import type { PumpTokenWithTweet } from "../types";
import type { TokenPnL } from "@/lib/priceTracking";
import { TokenCard } from "./TokenCard";
import type { RetracementAnalysisResult } from "../hooks/useRetracementAnalysis";
import type { AiEntryAnalysis } from "../hooks/useAiEntryAnalysis";

// Re-export for convenience
export type { RetracementAnalysisResult };

interface TokensTableProps {
  tokens: PumpTokenWithTweet[];
  isLoading: boolean;
  onRefresh: () => void;
  pnlData?: Map<string, TokenPnL>;
  retracementResults?: Map<string, RetracementAnalysisResult>;
  aiEntryResults?: Map<string, AiEntryAnalysis>;
  currentlyAnalyzing?: string | null;
  aiAnalyzing?: string | null;
}

export function TokensTable({ tokens, isLoading, onRefresh, pnlData, retracementResults, aiEntryResults, currentlyAnalyzing, aiAnalyzing }: TokensTableProps) {
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
    <div className="space-y-2">
      {/* Minimal header with count and refresh */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">
            {tokens.length} tokens
          </span>
          {isLoading && (
            <div className="w-3 h-3 border border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-[10px] font-mono text-white/40 hover:text-matrix-green transition-colors px-2 py-1"
        >
          Refresh
        </button>
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
        <div className="space-y-2">
          {tokens.map((token) => (
            <TokenCard
              key={token.mint}
              token={token}
              isNew={newTokenIds.has(token.mint)}
              pnl={pnlData?.get(token.mint)}
              retracement={retracementResults?.get(token.mint)}
              aiEntry={aiEntryResults?.get(token.mint)}
              isBeingAnalyzed={currentlyAnalyzing === token.mint}
              isAiAnalyzing={aiAnalyzing === token.mint}
            />
          ))}
        </div>
      )}
    </div>
  );
}
