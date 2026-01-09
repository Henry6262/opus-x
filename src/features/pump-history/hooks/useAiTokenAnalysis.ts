"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTerminal } from "@/features/terminal";
import type { PumpTokenWithTweet, TokenLabel, LabelStatus } from "../types";
import type { TokenPnL } from "@/lib/priceTracking";

// Analysis result for a single token
interface TokenAnalysisResult {
  mint: string;
  symbol: string;
  score: number;
  decision: LabelStatus;
  confidence: number;
  reasons: string[];
  signals: {
    marketCap: "bullish" | "bearish" | "neutral";
    priceAction: "bullish" | "bearish" | "neutral";
    liquidity: "bullish" | "bearish" | "neutral";
    metadata: "bullish" | "bearish" | "neutral";
    engagement: "bullish" | "bearish" | "neutral";
  };
}

interface UseAiTokenAnalysisOptions {
  tokens: PumpTokenWithTweet[];
  pnlData: Map<string, TokenPnL>;
  enabled?: boolean;
  analysisIntervalMs?: number;
}

interface UseAiTokenAnalysisReturn {
  analysisResults: Map<string, TokenAnalysisResult>;
  currentlyAnalyzing: string | null;
  isAnalyzing: boolean;
  analyzedCount: number;
  triggerAnalysis: () => void;
}

// Terminal color constants
const COLORS = {
  SYSTEM: "var(--matrix-green)",
  ANALYZING: "var(--solana-cyan)",
  BULLISH: "var(--matrix-green)",
  BEARISH: "var(--terminal-red)",
  NEUTRAL: "var(--warning-amber)",
  SIGNAL: "var(--brand-primary)",
  MUTED: "var(--white-60)",
};

// Scoring criteria weights
const WEIGHTS = {
  marketCap: 25,
  priceAction: 20,
  liquidity: 20,
  metadata: 15,
  engagement: 20,
};

export function useAiTokenAnalysis({
  tokens,
  pnlData,
  enabled = true,
  analysisIntervalMs = 3000,
}: UseAiTokenAnalysisOptions): UseAiTokenAnalysisReturn {
  const { log } = useTerminal();
  const [analysisResults, setAnalysisResults] = useState<Map<string, TokenAnalysisResult>>(new Map());
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);

  const analysisQueueRef = useRef<string[]>([]);
  const isRunningRef = useRef(false);

  // Score market cap (prefer mid-range mcaps, not too low/high)
  const scoreMarketCap = useCallback((mcap: number | null | undefined): { score: number; signal: "bullish" | "bearish" | "neutral"; reason: string } => {
    if (!mcap || mcap <= 0) {
      return { score: 0, signal: "neutral", reason: "No market cap data" };
    }

    // Sweet spot: $50K - $500K market cap
    if (mcap >= 50000 && mcap <= 500000) {
      return { score: 100, signal: "bullish", reason: `MCap $${(mcap / 1000).toFixed(0)}K in sweet spot` };
    }
    // Early stage: < $50K (higher risk, higher reward)
    if (mcap < 50000) {
      return { score: 70, signal: "neutral", reason: `Early stage MCap $${(mcap / 1000).toFixed(1)}K` };
    }
    // Growing: $500K - $2M
    if (mcap <= 2000000) {
      return { score: 80, signal: "bullish", reason: `Growing MCap $${(mcap / 1000000).toFixed(2)}M` };
    }
    // Established: > $2M (lower upside potential)
    return { score: 50, signal: "neutral", reason: `Established MCap $${(mcap / 1000000).toFixed(2)}M` };
  }, []);

  // Score price action from PnL data
  const scorePriceAction = useCallback((pnl: TokenPnL | undefined): { score: number; signal: "bullish" | "bearish" | "neutral"; reason: string } => {
    if (!pnl) {
      return { score: 50, signal: "neutral", reason: "No price data" };
    }

    const change24h = pnl.priceChange24h;
    if (change24h === null || change24h === undefined) {
      return { score: 50, signal: "neutral", reason: "No 24h change data" };
    }

    // Strong positive momentum
    if (change24h > 50) {
      return { score: 95, signal: "bullish", reason: `24h +${change24h.toFixed(0)}% PUMPING` };
    }
    if (change24h > 20) {
      return { score: 85, signal: "bullish", reason: `24h +${change24h.toFixed(0)}% bullish` };
    }
    if (change24h > 5) {
      return { score: 70, signal: "bullish", reason: `24h +${change24h.toFixed(1)}% up` };
    }
    // Stable
    if (change24h >= -10 && change24h <= 5) {
      return { score: 55, signal: "neutral", reason: `24h ${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}% stable` };
    }
    // Dumping
    if (change24h < -30) {
      return { score: 20, signal: "bearish", reason: `24h ${change24h.toFixed(0)}% DUMPING` };
    }
    return { score: 35, signal: "bearish", reason: `24h ${change24h.toFixed(1)}% down` };
  }, []);

  // Score liquidity
  const scoreLiquidity = useCallback((pnl: TokenPnL | undefined): { score: number; signal: "bullish" | "bearish" | "neutral"; reason: string } => {
    const liquidity = pnl?.liquidity;
    if (!liquidity || liquidity <= 0) {
      return { score: 30, signal: "bearish", reason: "No liquidity data" };
    }

    // Good liquidity: > $20K
    if (liquidity >= 50000) {
      return { score: 100, signal: "bullish", reason: `Liq $${(liquidity / 1000).toFixed(0)}K strong` };
    }
    if (liquidity >= 20000) {
      return { score: 80, signal: "bullish", reason: `Liq $${(liquidity / 1000).toFixed(0)}K healthy` };
    }
    if (liquidity >= 5000) {
      return { score: 60, signal: "neutral", reason: `Liq $${(liquidity / 1000).toFixed(1)}K moderate` };
    }
    // Low liquidity = high slippage risk
    return { score: 25, signal: "bearish", reason: `Liq $${liquidity.toFixed(0)} LOW RISK` };
  }, []);

  // Score metadata quality (image, socials, description)
  const scoreMetadata = useCallback((token: PumpTokenWithTweet): { score: number; signal: "bullish" | "bearish" | "neutral"; reason: string } => {
    let score = 0;
    const reasons: string[] = [];

    // Has image
    if (token.image_url) {
      score += 25;
      reasons.push("img");
    }
    // Has Twitter
    if (token.twitter_url) {
      score += 30;
      reasons.push("twitter");
    }
    // Has Telegram
    if (token.telegram_url) {
      score += 20;
      reasons.push("tg");
    }
    // Has website
    if (token.website_url) {
      score += 25;
      reasons.push("web");
    }

    if (score >= 75) {
      return { score, signal: "bullish", reason: `Full socials: ${reasons.join("+")}` };
    }
    if (score >= 50) {
      return { score, signal: "neutral", reason: `Partial: ${reasons.join("+")}` };
    }
    return { score, signal: "bearish", reason: reasons.length ? `Minimal: ${reasons.join("+")}` : "No socials" };
  }, []);

  // Score engagement (if we have tweet data)
  const scoreEngagement = useCallback((token: PumpTokenWithTweet): { score: number; signal: "bullish" | "bearish" | "neutral"; reason: string } => {
    const tweet = token.tweet;
    if (!tweet) {
      // Fall back to token-level engagement if available
      const impressions = token.impression_count || 0;
      const likes = token.like_count || 0;

      if (impressions > 10000 || likes > 100) {
        return { score: 80, signal: "bullish", reason: `${(impressions / 1000).toFixed(0)}K views` };
      }
      return { score: 40, signal: "neutral", reason: "No engagement data" };
    }

    const likes = tweet.tweet_like_count || 0;
    const retweets = tweet.tweet_retweet_count || 0;
    const impressions = tweet.tweet_impression_count || 0;

    // Calculate engagement rate
    const engagementScore = likes * 2 + retweets * 3;

    if (engagementScore > 500 || impressions > 50000) {
      return { score: 95, signal: "bullish", reason: `VIRAL: ${likes} likes, ${(impressions / 1000).toFixed(0)}K views` };
    }
    if (engagementScore > 100 || impressions > 10000) {
      return { score: 75, signal: "bullish", reason: `Good: ${likes}L ${retweets}RT` };
    }
    if (engagementScore > 20) {
      return { score: 55, signal: "neutral", reason: `Moderate: ${likes}L ${retweets}RT` };
    }
    return { score: 30, signal: "bearish", reason: `Low engagement` };
  }, []);

  // Main analysis function for a single token
  const analyzeToken = useCallback((token: PumpTokenWithTweet, pnl: TokenPnL | undefined): TokenAnalysisResult => {
    const mcapResult = scoreMarketCap(pnl?.currentMarketCap ?? pnl?.fdv ?? token.market_cap);
    const priceResult = scorePriceAction(pnl);
    const liquidityResult = scoreLiquidity(pnl);
    const metadataResult = scoreMetadata(token);
    const engagementResult = scoreEngagement(token);

    // Calculate weighted score
    const totalScore =
      (mcapResult.score * WEIGHTS.marketCap +
       priceResult.score * WEIGHTS.priceAction +
       liquidityResult.score * WEIGHTS.liquidity +
       metadataResult.score * WEIGHTS.metadata +
       engagementResult.score * WEIGHTS.engagement) / 100;

    // Determine decision based on score
    let decision: LabelStatus;
    let confidence: number;

    if (totalScore >= 75) {
      decision = "approved";
      confidence = Math.min(95, totalScore);
    } else if (totalScore >= 55) {
      decision = "needs_review";
      confidence = totalScore;
    } else if (totalScore >= 35) {
      decision = "flagged";
      confidence = 100 - totalScore;
    } else {
      decision = "rejected";
      confidence = 100 - totalScore;
    }

    // Collect non-neutral reasons
    const reasons: string[] = [];
    if (mcapResult.signal !== "neutral") reasons.push(mcapResult.reason);
    if (priceResult.signal !== "neutral") reasons.push(priceResult.reason);
    if (liquidityResult.signal !== "neutral") reasons.push(liquidityResult.reason);
    if (metadataResult.signal !== "neutral") reasons.push(metadataResult.reason);
    if (engagementResult.signal !== "neutral") reasons.push(engagementResult.reason);

    return {
      mint: token.mint,
      symbol: token.symbol,
      score: Math.round(totalScore),
      decision,
      confidence: Math.round(confidence),
      reasons,
      signals: {
        marketCap: mcapResult.signal,
        priceAction: priceResult.signal,
        liquidity: liquidityResult.signal,
        metadata: metadataResult.signal,
        engagement: engagementResult.signal,
      },
    };
  }, [scoreMarketCap, scorePriceAction, scoreLiquidity, scoreMetadata, scoreEngagement]);

  // Run analysis loop
  const runAnalysisLoop = useCallback(async () => {
    if (isRunningRef.current || !enabled) return;
    isRunningRef.current = true;
    setIsAnalyzing(true);

    // Build queue of tokens to analyze (only those not yet analyzed)
    const currentResults = analysisResults;
    const toAnalyze = tokens.filter(t => !currentResults.has(t.mint));

    if (toAnalyze.length === 0) {
      log({ text: "[AI] All tokens analyzed · Waiting for new migrations...", color: COLORS.SYSTEM });
      setIsAnalyzing(false);
      isRunningRef.current = false;
      return;
    }

    log({ text: `[AI] Starting analysis · ${toAnalyze.length} tokens queued`, color: COLORS.SYSTEM });

    for (const token of toAnalyze) {
      if (!enabled) break;

      setCurrentlyAnalyzing(token.mint);

      // Log start of analysis
      log({
        text: `[AI] Analyzing ${token.symbol} · ${token.mint.slice(0, 6)}...${token.mint.slice(-4)}`,
        color: COLORS.ANALYZING
      });

      // Small delay to make analysis visible in terminal
      await new Promise(r => setTimeout(r, 500));

      // Run analysis
      const pnl = pnlData.get(token.mint);
      const result = analyzeToken(token, pnl);

      // Log signals
      const signalEmojis = {
        bullish: "↑",
        bearish: "↓",
        neutral: "→",
      };

      const signalLine = [
        `MCap${signalEmojis[result.signals.marketCap]}`,
        `Price${signalEmojis[result.signals.priceAction]}`,
        `Liq${signalEmojis[result.signals.liquidity]}`,
        `Meta${signalEmojis[result.signals.metadata]}`,
        `Eng${signalEmojis[result.signals.engagement]}`,
      ].join(" ");

      log({
        text: `[AI] ${token.symbol} signals: ${signalLine}`,
        color: COLORS.SIGNAL
      });

      // Log decision
      const decisionColor = {
        approved: COLORS.BULLISH,
        needs_review: COLORS.NEUTRAL,
        flagged: COLORS.NEUTRAL,
        rejected: COLORS.BEARISH,
      }[result.decision];

      const decisionEmoji = {
        approved: "✓ ENTRY",
        needs_review: "? REVIEW",
        flagged: "⚠ CAUTION",
        rejected: "✗ PASS",
      }[result.decision];

      log({
        text: `[AI] ${token.symbol} → ${decisionEmoji} · Score: ${result.score}/100 · Confidence: ${result.confidence}%`,
        color: decisionColor
      });

      // Store result
      setAnalysisResults(prev => {
        const next = new Map(prev);
        next.set(token.mint, result);
        return next;
      });
      setAnalyzedCount(prev => prev + 1);

      // Delay between tokens
      await new Promise(r => setTimeout(r, analysisIntervalMs));
    }

    setCurrentlyAnalyzing(null);
    setIsAnalyzing(false);
    isRunningRef.current = false;

    log({ text: `[AI] Analysis cycle complete · ${toAnalyze.length} tokens processed`, color: COLORS.SYSTEM });
  }, [tokens, pnlData, enabled, analysisIntervalMs, analysisResults, analyzeToken, log]);

  // Trigger analysis manually
  const triggerAnalysis = useCallback(() => {
    if (!isRunningRef.current) {
      runAnalysisLoop();
    }
  }, [runAnalysisLoop]);

  // Auto-start analysis when tokens or pnl data changes
  useEffect(() => {
    if (enabled && tokens.length > 0 && pnlData.size > 0) {
      const hasUnanalyzed = tokens.some(t => !analysisResults.has(t.mint));
      if (hasUnanalyzed && !isRunningRef.current) {
        // Delay initial analysis to let UI settle
        const timer = setTimeout(() => {
          runAnalysisLoop();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [enabled, tokens.length, pnlData.size, analysisResults, runAnalysisLoop]);

  return {
    analysisResults,
    currentlyAnalyzing,
    isAnalyzing,
    analyzedCount,
    triggerAnalysis,
  };
}
