"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui";
import type { PumpTokenWithTweet, LabelStatus } from "../types";
import type { TokenPnL } from "@/lib/priceTracking";
import type { TokenAnalysisResult, RetracementAnalysisResult } from "./TokensTable";
import type { EntrySignal } from "@/lib/tokenJourney";
import type { AiEntryAnalysis } from "../hooks/useAiEntryAnalysis";

interface TokenCardProps {
  token: PumpTokenWithTweet;
  isNew?: boolean;
  pnl?: TokenPnL;
  analysis?: TokenAnalysisResult;
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

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// Get badge styling based on AI decision (legacy)
function getDecisionBadge(decision: LabelStatus): { tone: "live" | "warn" | "hot" | "neutral"; label: string } {
  switch (decision) {
    case "approved":
      return { tone: "live", label: "ENTRY" };
    case "needs_review":
      return { tone: "warn", label: "REVIEW" };
    case "flagged":
      return { tone: "warn", label: "CAUTION" };
    case "rejected":
      return { tone: "hot", label: "PASS" };
    default:
      return { tone: "neutral", label: "unlabeled" };
  }
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

// Get trend indicator
function getTrendIndicator(trend: string): { icon: string; color: string } {
  switch (trend) {
    case "pumping":
      return { icon: "↗", color: "text-matrix-green" };
    case "dumping":
      return { icon: "↘", color: "text-terminal-red" };
    case "consolidating":
      return { icon: "→", color: "text-warning-amber" };
    default:
      return { icon: "·", color: "text-white/40" };
  }
}

export function TokenCard({ token, isNew = false, pnl, analysis, retracement, aiEntry, isBeingAnalyzed = false, isAiAnalyzing = false }: TokenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Retracement-based entry signal (new strategy)
  const entrySignal = retracement?.analysis.signal;
  const entryBadge = entrySignal ? getEntrySignalBadge(entrySignal) : null;
  const journey = retracement?.journey;
  const signals = journey?.signals;
  const trendIndicator = signals ? getTrendIndicator(signals.trend) : null;

  // Legacy: Use AI analysis decision if available, otherwise fall back to old label
  const labelStatus = analysis?.decision || token.labels?.[0]?.status || "unlabeled";
  const decisionBadge = analysis ? getDecisionBadge(analysis.decision) : null;

  // Use real PnL data if available (NaN means we have price data but no initial market cap for PnL)
  const pnlPercent = pnl?.pnlPercent;
  const isProfitable = pnlPercent !== undefined && !isNaN(pnlPercent) && pnlPercent > 0;
  const hasPnlData = pnlPercent !== undefined && !isNaN(pnlPercent);

  // Use current market cap from DexScreener if available, otherwise fall back to token's stored market_cap
  const currentMarketCap = pnl?.currentMarketCap ?? pnl?.fdv ?? token.market_cap;
  const priceChange24h = pnl?.priceChange24h;
  const liquidity = pnl?.liquidity;
  const hasLivePriceData = pnl?.currentMarketCap !== undefined || pnl?.fdv !== undefined;

  const padreUrl = buildPadreChartUrl(token.mint);
  const hasTweet = token.tweet && token.tweet.tweet_text;

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
              <p className="text-sm text-white/60 truncate">{token.name}</p>
            </div>

            {/* Time ago */}
            <span className="text-xs text-white/40 font-mono whitespace-nowrap flex-shrink-0">
              {formatTimeAgo(token.detected_at)}
            </span>
          </div>

          {/* Stats row: Retracement metrics (primary) + MCap + Liquidity */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {/* Retracement metrics - show prominently when available */}
            {signals && (
              <>
                <div className="token-stat">
                  <span className="token-stat-label">Pump</span>
                  <span className="token-stat-value text-matrix-green">
                    {signals.pumpMultiple.toFixed(1)}x
                  </span>
                </div>
                <div className="token-stat">
                  <span className="token-stat-label">Dip</span>
                  <span className={`token-stat-value ${signals.drawdownPercent >= 40 && signals.drawdownPercent <= 70 ? 'text-matrix-green' : signals.drawdownPercent > 70 ? 'text-terminal-red' : 'text-warning-amber'}`}>
                    {signals.drawdownPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="token-stat">
                  <span className="token-stat-label">ATH</span>
                  <span className="token-stat-value text-solana-cyan">
                    {formatMarketCap(journey?.athMcap || null)}
                  </span>
                </div>
                <div className="token-stat">
                  <span className="token-stat-label">Trend</span>
                  <span className={`token-stat-value ${trendIndicator?.color || 'text-white/40'}`}>
                    {trendIndicator?.icon} {signals.trend}
                  </span>
                </div>
              </>
            )}

            {/* Current MCap */}
            <div className="token-stat">
              <span className="token-stat-label">MCap{hasLivePriceData && <span className="text-matrix-green text-[8px] ml-1">●</span>}</span>
              <span className="token-stat-value text-solana-cyan">
                {formatMarketCap(journey?.currentMcap || currentMarketCap)}
              </span>
            </div>

            {/* Liquidity */}
            {(journey?.currentLiquidity || liquidity) && (journey?.currentLiquidity || liquidity)! > 0 && (
              <div className="token-stat">
                <span className="token-stat-label">Liq</span>
                <span className="token-stat-value text-warning-amber">
                  {formatMarketCap(journey?.currentLiquidity || liquidity || null)}
                </span>
              </div>
            )}

            {/* Tweet engagement (condensed) */}
            {token.tweet && token.tweet.tweet_like_count !== null && (
              <div className="token-stat">
                <span className="token-stat-label">Engagement</span>
                <span className="token-stat-value text-white/60">
                  {formatNumber(token.tweet.tweet_like_count)}♡
                  {token.tweet.tweet_retweet_count !== null && ` · ${formatNumber(token.tweet.tweet_retweet_count)}↻`}
                </span>
              </div>
            )}
          </div>

          {/* AI Entry Analysis - Display reasoning for BUY signals */}
          {aiEntry && (entrySignal === 'strong_buy' || entrySignal === 'buy') && (
            <div className="mt-3 p-3 rounded-lg bg-void-900/60 border border-matrix-green/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-solana-cyan uppercase tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Analysis
                </span>
              </div>
              {/* Reasoning */}
              <p className="text-sm text-matrix-green leading-relaxed mb-2">
                {aiEntry.reasoning}
              </p>
              {/* Risk */}
              <div className="flex items-start gap-2 text-xs">
                <span className="text-warning-amber font-medium shrink-0">⚠️ Risk:</span>
                <span className="text-white/70">{aiEntry.risk}</span>
              </div>
              {/* Strategy (if available) */}
              {aiEntry.strategy && (
                <div className="flex items-start gap-2 text-xs mt-1">
                  <span className="text-solana-cyan font-medium shrink-0">📈 Strategy:</span>
                  <span className="text-white/70">{aiEntry.strategy}</span>
                </div>
              )}
            </div>
          )}

          {/* AI Analyzing indicator */}
          {isAiAnalyzing && !aiEntry && (
            <div className="mt-3 p-2 rounded-lg bg-void-900/40 border border-solana-cyan/20">
              <div className="flex items-center gap-2 text-xs text-solana-cyan">
                <div className="w-3 h-3 border-2 border-solana-cyan/30 border-t-solana-cyan rounded-full animate-spin" />
                <span className="font-mono">Generating AI analysis...</span>
              </div>
            </div>
          )}

          {/* Tweet text preview (if from a tweet) */}
          {hasTweet && (
            <div className="mt-2 p-2 rounded-lg bg-void-900/40 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3 h-3 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-[10px] text-white/40 font-medium">
                  @{token.tweet!.tweet_author_username}
                </span>
              </div>
              <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                {token.tweet!.tweet_text}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0 mr-4">
          {/* Chart Button - Primary CTA */}
          <a
            href={padreUrl}
            target="_blank"
            rel="noreferrer"
            className="token-action-btn primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span>Chart</span>
          </a>

          {/* Twitter Button */}
          {token.twitter_url && (
            <a
              href={token.twitter_url}
              target="_blank"
              rel="noreferrer"
              className="token-action-btn secondary"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Tweet</span>
            </a>
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
