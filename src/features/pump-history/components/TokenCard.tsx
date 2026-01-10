"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui";
import type { PumpTokenWithTweet } from "../types";
import type { TokenPnL } from "@/lib/priceTracking";
import type { RetracementAnalysisResult } from "./TokensTable";
import type { EntrySignal } from "@/lib/tokenJourney";
import type { AiEntryAnalysis } from "../hooks/useAiEntryAnalysis";

interface TokenCardProps {
  token: PumpTokenWithTweet;
  isNew?: boolean;
  pnl?: TokenPnL;
  retracement?: RetracementAnalysisResult;
  aiEntry?: AiEntryAnalysis;
  isBeingAnalyzed?: boolean;
  isAiAnalyzing?: boolean;
}

// Padre.trade referral link builder
const PADRE_REFERRAL_CODE = "sypher";
function buildPadreChartUrl(mint: string): string {
  return `https://padre.trade/token/${mint}?ref=${PADRE_REFERRAL_CODE}`;
}

function formatMarketCap(value: number | null) {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function shortenMint(mint: string): string {
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

// Get badge styling for retracement entry signal
function getEntrySignalBadge(signal: EntrySignal): { tone: "live" | "warn" | "hot" | "neutral"; label: string; glow?: boolean } {
  switch (signal) {
    case "strong_buy":
      return { tone: "live", label: "STRONG BUY", glow: true };
    case "buy":
      return { tone: "live", label: "BUY" };
    case "watch":
      return { tone: "warn", label: "WATCH" };
    case "avoid":
      return { tone: "hot", label: "AVOID" };
    case "no_data":
    default:
      return { tone: "neutral", label: "—" };
  }
}

export function TokenCard({ token, isNew = false, pnl, retracement, aiEntry, isBeingAnalyzed = false, isAiAnalyzing = false }: TokenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Retracement-based entry signal
  const entrySignal = retracement?.analysis.signal;
  const entryBadge = entrySignal ? getEntrySignalBadge(entrySignal) : null;
  const journey = retracement?.journey;

  // Use real PnL data if available
  const pnlPercent = pnl?.pnlPercent;
  const isProfitable = pnlPercent !== undefined && !isNaN(pnlPercent) && pnlPercent > 0;
  const hasPnlData = pnlPercent !== undefined && !isNaN(pnlPercent);

  // Use current market cap from DexScreener if available, otherwise fall back to token's stored market_cap
  const currentMarketCap = pnl?.currentMarketCap ?? pnl?.fdv ?? token.market_cap;
  const hasLivePriceData = pnl?.currentMarketCap !== undefined || pnl?.fdv !== undefined;

  const padreUrl = buildPadreChartUrl(token.mint);

  const handleCopy = () => {
    navigator.clipboard.writeText(token.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`token-card group ${isBeingAnalyzed ? "ring-2 ring-solana-cyan/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]" : ""}`}
      style={{
        animation: isNew ? "slideInFromRight 300ms ease-out" : undefined,
      }}
    >
      {/* New token indicator */}
      {isNew && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-matrix-green to-transparent animate-pulse" />
      )}

      {/* Card content */}
      <div className="flex gap-4">
        {/* Token Image */}
        <div className="token-image-wrapper">
          {token.image_url && !imageError ? (
            <Image
              src={token.image_url}
              alt={token.name}
              width={80}
              height={80}
              className="token-image"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="token-image-placeholder">
              <span className="text-2xl font-bold text-brand-primary/60">
                {token.symbol.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          {/* PnL overlay badge */}
          {hasPnlData && (
            <div
              className={`token-pnl-badge ${isProfitable ? "positive" : "negative"}`}
            >
              {isProfitable ? "+" : ""}
              {pnlPercent!.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          {/* Header row: Symbol, contract, time */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg font-bold font-display text-brand-primary">
                  {token.symbol}
                </h4>
                {/* Contract address inline */}
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-void-900/60 border border-white/10 text-[10px] font-mono text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                  title={`Copy: ${token.mint}`}
                >
                  <span>{shortenMint(token.mint)}</span>
                  {copied ? (
                    <svg className="w-3 h-3 text-matrix-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                {/* Entry Signal Badge - Retracement Strategy */}
                {entryBadge ? (
                  <Badge
                    tone={entryBadge.tone}
                    className={`text-[10px] ${entryBadge.glow ? 'shadow-[0_0_8px_rgba(0,255,136,0.5)]' : ''}`}
                  >
                    {entryBadge.label}
                    {retracement?.analysis.score && ` · ${retracement.analysis.score}`}
                  </Badge>
                ) : isBeingAnalyzed ? (
                  <Badge tone="neutral" className="text-[10px] animate-pulse">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-solana-cyan rounded-full animate-ping" />
                      TRACKING
                    </span>
                  </Badge>
                ) : (
                  <Badge tone="neutral" className="text-[10px]">
                    pending
                  </Badge>
                )}
              </div>
            </div>

            {/* Time ago */}
            <span className="text-xs text-white/40 font-mono whitespace-nowrap flex-shrink-0">
              {formatTimeAgo(token.detected_at)}
            </span>
          </div>

          {/* Stats row: ATH + MCap + Action buttons */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              {/* ATH */}
              {journey?.athMcap && (
                <div className="token-stat">
                  <span className="token-stat-label">ATH</span>
                  <span className="token-stat-value text-solana-cyan">
                    {formatMarketCap(journey.athMcap)}
                  </span>
                </div>
              )}

              {/* Current MCap */}
              <div className="token-stat">
                <span className="token-stat-label">MCap{hasLivePriceData && <span className="text-matrix-green text-[8px] ml-1">●</span>}</span>
                <span className="token-stat-value text-solana-cyan">
                  {formatMarketCap(journey?.currentMcap || currentMarketCap)}
                </span>
              </div>
            </div>

            {/* Action Buttons - moved inline */}
            <div className="flex items-center gap-2">
              <a
                href={padreUrl}
                target="_blank"
                rel="noreferrer"
                className="token-action-btn-inline primary"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span>Chart</span>
              </a>
              {token.twitter_url && (
                <a
                  href={token.twitter_url}
                  target="_blank"
                  rel="noreferrer"
                  className="token-action-btn-inline secondary"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>X</span>
                </a>
              )}
            </div>
          </div>

          {/* AI Reasoning - Compact single line with expand */}
          {entrySignal && entrySignal !== 'no_data' ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`ai-log-row ${entrySignal === 'strong_buy' || entrySignal === 'buy' ? 'buy' : entrySignal === 'watch' ? 'watch' : 'avoid'}`}
            >
              <span className="ai-log-indicator" />
              <span className="ai-log-text">
                {aiEntry?.reasoning
                  ? aiEntry.reasoning.slice(0, 80) + (aiEntry.reasoning.length > 80 ? '...' : '')
                  : retracement?.analysis?.reasons?.[0] || 'Analyzing...'}
              </span>
              <svg
                className={`ai-log-expand ${isExpanded ? 'expanded' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : isBeingAnalyzed || isAiAnalyzing ? (
            <div className="ai-log-row pending">
              <span className="ai-log-indicator pulsing" />
              <span className="ai-log-text">Tracking price history...</span>
            </div>
          ) : null}

          {/* Expanded AI Thinking History */}
          {isExpanded && entrySignal && entrySignal !== 'no_data' && (
            <div className={`ai-expanded-panel ${entrySignal === 'strong_buy' || entrySignal === 'buy' ? 'buy' : entrySignal === 'watch' ? 'watch' : 'avoid'}`}>
              <div className="ai-expanded-header">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>VIBR THINKING LOG</span>
              </div>

              {/* Full reasoning */}
              {aiEntry && (entrySignal === 'strong_buy' || entrySignal === 'buy') ? (
                <div className="ai-expanded-content">
                  <div className="ai-log-entry">
                    <span className="ai-log-time">[ANALYSIS]</span>
                    <span>{aiEntry.reasoning}</span>
                  </div>
                  <div className="ai-log-entry warning">
                    <span className="ai-log-time">[RISK]</span>
                    <span>{aiEntry.risk}</span>
                  </div>
                  {aiEntry.strategy && (
                    <div className="ai-log-entry strategy">
                      <span className="ai-log-time">[STRATEGY]</span>
                      <span>{aiEntry.strategy}</span>
                    </div>
                  )}
                </div>
              ) : retracement?.analysis ? (
                <div className="ai-expanded-content">
                  {retracement.analysis.reasons.map((reason, idx) => (
                    <div key={idx} className="ai-log-entry">
                      <span className="ai-log-time">[{String(idx + 1).padStart(2, '0')}]</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                  {retracement.analysis.warnings.map((warning, idx) => (
                    <div key={`w-${idx}`} className="ai-log-entry warning">
                      <span className="ai-log-time">[WARN]</span>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/5 to-transparent" />
      </div>
    </div>
  );
}
