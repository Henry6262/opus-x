"use client";

import { useState, useEffect, useRef } from "react";
import type { PumpTokenWithTweet } from "@/features/pump-history/types";
import { useTerminal } from "@/features/terminal";

export type AiMood = "idle" | "scanning" | "executing" | "bullish" | "bearish" | "sleeping";

interface AiMoodConfig {
  tokens?: PumpTokenWithTweet[];
  isActive?: boolean;
  isExecuting?: boolean;
}

interface AiMoodResult {
  mood: AiMood;
  pnl: number;
  reason: string;
  intensity: number; // 0-1 scale for visual effects
}

/**
 * Calculate AI mood based on token data and activity
 *
 * Mood Priority:
 * 1. Sleeping - No activity for 5+ minutes
 * 2. Executing - Actively processing trades
 * 3. Bullish - Average PnL > +5%
 * 4. Bearish - Average PnL < -5%
 * 5. Scanning - Default active state
 * 6. Idle - No data/inactive
 */
export function useAiMood({ tokens = [], isActive = true, isExecuting = false }: AiMoodConfig): AiMoodResult {
  const [mood, setMood] = useState<AiMood>("scanning");
  const [pnl, setPnl] = useState<number>(0);
  const [reason, setReason] = useState<string>("Initializing...");
  const [intensity, setIntensity] = useState<number>(0.5);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const terminal = useTerminal();
  const prevTokenCountRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setMood("idle");
      setReason("System inactive");
      setIntensity(0.2);
      return;
    }

    // Update last activity time only when token count actually changes
    if (tokens.length > 0 && tokens.length !== prevTokenCountRef.current) {
      prevTokenCountRef.current = tokens.length;
      setLastActivityTime(Date.now());
    }

    // Check for sleep mode (no activity for 5 minutes)
    const timeSinceActivity = Date.now() - lastActivityTime;
    if (timeSinceActivity > 5 * 60 * 1000) {
      setMood("sleeping");
      setReason("No activity detected");
      setIntensity(0.1);
      return;
    }

    // Executing mode - highest priority when active
    if (isExecuting) {
      setMood("executing");
      setReason("Processing trades");
      setIntensity(0.9);
      return;
    }

    // Calculate real PnL from token market performance
    const recentTokens = tokens.slice(0, 20);

    if (recentTokens.length === 0) {
      setMood("scanning");
      setReason("Scanning for opportunities");
      setIntensity(0.5);
      return;
    }

    // Calculate PnL based on market cap and engagement metrics
    const tokenMetrics = recentTokens.map((token) => {
      const marketCap = token.market_cap || 0;
      const engagement = (token.like_count || 0) + (token.repost_count || 0) + (token.reply_count || 0);

      // Normalize market cap to a score (higher = better)
      // Typical pump.fun tokens: 10k-1M market cap
      const capScore = marketCap > 0 ? Math.min((marketCap / 100000) * 10, 20) : -5;

      // Engagement score (more engagement = higher confidence)
      const engagementScore = Math.min((engagement / 100) * 5, 10);

      // Combined score: market cap weighted by engagement
      const score = capScore + engagementScore;

      return {
        mint: token.mint,
        marketCap,
        engagement,
        score,
      };
    });

    // Calculate average score and convert to PnL percentage
    const avgScore = tokenMetrics.reduce((sum, m) => sum + m.score, 0) / tokenMetrics.length;

    // Convert score to PnL percentage (-20% to +30%)
    // Score range: -5 to 30, center at 12.5 (neutral)
    const calculatedPnL = ((avgScore - 12.5) / 12.5) * 20;
    setPnl(calculatedPnL);

    // Calculate portfolio confidence from engagement spread
    const engagements = tokenMetrics.map(m => m.engagement);
    const avgEngagement = engagements.reduce((sum, e) => sum + e, 0) / engagements.length;
    const hasHighEngagement = avgEngagement > 50;

    // Determine mood based on calculated PnL
    if (calculatedPnL > 5) {
      const engagementNote = hasHighEngagement ? " • High engagement" : "";
      const newReason = `Market momentum +${calculatedPnL.toFixed(1)}%${engagementNote}`;

      if (mood !== "bullish") {
        terminal.log({
          text: `[AI] BULLISH signal detected • PnL: +${calculatedPnL.toFixed(1)}%`,
          color: "var(--matrix-green)",
        });
      }

      setMood("bullish");
      setReason(newReason);
      // Intensity increases with higher PnL and engagement
      const baseIntensity = Math.min(0.5 + (calculatedPnL / 20), 0.9);
      setIntensity(hasHighEngagement ? Math.min(baseIntensity + 0.1, 1) : baseIntensity);

      // Log analysis details
      terminal.log({
        text: `[ANALYSIS] ${recentTokens.length} tokens analyzed • Avg MC: ${(tokenMetrics.reduce((sum, m) => sum + m.marketCap, 0) / recentTokens.length / 1000).toFixed(0)}K`,
        color: "var(--solana-cyan)",
      });
    } else if (calculatedPnL < -5) {
      const engagementNote = hasHighEngagement ? " • Volume declining" : " • Low liquidity";
      const newReason = `Market momentum ${calculatedPnL.toFixed(1)}%${engagementNote}`;

      if (mood !== "bearish") {
        terminal.log({
          text: `[AI] BEARISH signal detected • PnL: ${calculatedPnL.toFixed(1)}%`,
          color: "var(--alert-red)",
        });
      }

      setMood("bearish");
      setReason(newReason);
      // Intensity increases with larger losses
      setIntensity(Math.min(0.5 + (Math.abs(calculatedPnL) / 20), 0.9));

      // Log warning
      terminal.log({
        text: `[WARNING] Market conditions unfavorable • Consider position sizing`,
        color: "var(--warning-amber)",
      });
    } else {
      const tokenCount = recentTokens.length;
      const avgMarketCap = tokenMetrics.reduce((sum, m) => sum + m.marketCap, 0) / tokenCount;
      const capFormatted = avgMarketCap > 1000 ? `${(avgMarketCap / 1000).toFixed(0)}K` : avgMarketCap.toFixed(0);
      const newReason = `${tokenCount} tokens • Avg ${capFormatted} MC`;

      if (mood !== "scanning") {
        terminal.log({
          text: `[AI] Neutral conditions • PnL: ${calculatedPnL.toFixed(1)}% • Scanning for signals`,
          color: "var(--solana-cyan)",
        });
      }

      setMood("scanning");
      setReason(newReason);
      setIntensity(0.5);
    }
  }, [tokens, isActive, isExecuting, lastActivityTime]);

  // Periodic check for sleep mode
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      if (timeSinceActivity > 5 * 60 * 1000 && mood !== "sleeping") {
        setMood("sleeping");
        setReason("No activity detected");
        setIntensity(0.1);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [lastActivityTime, mood]);

  return { mood, pnl, reason, intensity };
}
