"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTerminal } from "@/features/terminal";
import type { RetracementAnalysisResult } from "./useRetracementAnalysis";
import { logAiAnalysis } from "@/lib/analysisLogger";

// ============================================
// TYPES
// ============================================

export interface AiEntryAnalysis {
  reasoning: string;
  risk: string;
  strategy?: string;
}

interface UseAiEntryAnalysisOptions {
  /** Retracement analysis results to analyze */
  retracementResults: Map<string, RetracementAnalysisResult>;
  /** Only analyze tokens with these signals */
  signalsToAnalyze?: ('strong_buy' | 'buy')[];
  /** Delay between batch requests (ms) */
  batchDelayMs?: number;
  /** Enable/disable analysis */
  enabled?: boolean;
}

interface UseAiEntryAnalysisReturn {
  /** AI analysis results by mint address */
  aiResults: Map<string, AiEntryAnalysis>;
  /** Currently analyzing token (for loading indicator) */
  currentlyAnalyzing: string | null;
  /** Whether any analysis is in progress */
  isAnalyzing: boolean;
  /** Number of tokens analyzed */
  analyzedCount: number;
  /** Error if analysis failed */
  error: string | null;
  /** Manually trigger analysis for a specific token */
  analyzeToken: (mint: string) => Promise<void>;
  /** Clear all results */
  clearResults: () => void;
}

// Terminal color constants
const COLORS = {
  AI: "var(--solana-cyan)",
  REASONING: "var(--matrix-green)",
  RISK: "var(--warning-amber)",
  ERROR: "var(--terminal-red)",
  MUTED: "var(--white-60)",
  THINKING: "var(--solana-cyan)",
};

// Thinking steps to show during analysis
const THINKING_STEPS = [
  "Parsing journey data",
  "Evaluating pump metrics",
  "Analyzing drawdown depth",
  "Generating entry thesis",
];

// ============================================
// HOOK
// ============================================

export function useAiEntryAnalysis({
  retracementResults,
  signalsToAnalyze = ['strong_buy', 'buy'],
  batchDelayMs = 1000,
  enabled = true,
}: UseAiEntryAnalysisOptions): UseAiEntryAnalysisReturn {
  const { log, startThinking, stopThinking } = useTerminal();
  const [aiResults, setAiResults] = useState<Map<string, AiEntryAnalysis>>(new Map());
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzedTokensRef = useRef<Set<string>>(new Set());
  const analysisQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  // Analyze a single token
  const analyzeToken = useCallback(async (mint: string) => {
    const result = retracementResults.get(mint);
    if (!result) return;

    setCurrentlyAnalyzing(mint);
    setIsAnalyzing(true);
    startThinking(result.journey.symbol);

    // Log initial analysis message
    log({
      text: `[AI] Analyzing ${result.journey.symbol}...`,
      color: COLORS.AI,
    });

    try {
      // Show thinking steps with delays for visual effect
      const stepDelay = 200;
      for (let i = 0; i < THINKING_STEPS.length; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDelay));
        log({
          text: `   ${THINKING_STEPS[i]}...`,
          type: 'thinking-step',
          color: COLORS.THINKING,
        });
      }

      const response = await fetch('/api/ai-entry-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journey: result.journey,
          analysis: result.analysis,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const aiAnalysis: AiEntryAnalysis = data.data;

      setAiResults(prev => {
        const newMap = new Map(prev);
        newMap.set(mint, aiAnalysis);
        return newMap;
      });

      analyzedTokensRef.current.add(mint);

      // Log final results
      log({
        text: `[AI] ${result.journey.symbol} → ${result.analysis.signal.toUpperCase()}`,
        color: COLORS.AI,
      });
      log({
        text: `  ├─ ${aiAnalysis.reasoning}`,
        color: COLORS.REASONING,
      });
      log({
        text: `  └─ Risk: ${aiAnalysis.risk}`,
        color: COLORS.RISK,
      });

      // Log to Supabase
      logAiAnalysis({
        mint,
        symbol: result.journey.symbol,
        name: result.journey.name,
        triggerType: 'RETRACEMENT',
        decision: 'WATCH', // Typically retracement analysis means we are watching/waiting for entry
        confidence: 0.8, // Placeholder or derive from text/risk
        reasoning: aiAnalysis.reasoning,
        marketData: {
          price: result.journey.current_price,
          marketCap: result.journey.market_cap,
          liquidity: result.journey.liquidity,
          volume24h: result.journey.volume_24h
        },
        journeyMetrics: {
          pump_multiple: result.journey.pump_multiple,
          drawdown_percent: result.journey.drawdown_percent
        }
      }).catch(err => console.error("Failed to log Retracement analysis", err));

      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMsg);
      log({
        text: `[AI] Analysis failed for ${result.journey.symbol}: ${errorMsg}`,
        color: COLORS.ERROR,
      });
    } finally {
      setCurrentlyAnalyzing(null);
      setIsAnalyzing(false);
      stopThinking();
    }
  }, [retracementResults, log, startThinking, stopThinking]);

  // Process the analysis queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || analysisQueueRef.current.length === 0) return;

    isProcessingRef.current = true;

    while (analysisQueueRef.current.length > 0) {
      const mint = analysisQueueRef.current.shift();
      if (!mint) break;

      // Skip if already analyzed
      if (analyzedTokensRef.current.has(mint)) continue;

      await analyzeToken(mint);

      // Delay between analyses to avoid rate limiting
      if (analysisQueueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
    }

    isProcessingRef.current = false;
  }, [analyzeToken, batchDelayMs]);

  // Watch for new tokens that need analysis
  useEffect(() => {
    if (!enabled) return;

    // Find tokens that need analysis
    const tokensToAnalyze: string[] = [];

    retracementResults.forEach((result, mint) => {
      // Only analyze BUY signals
      if (!signalsToAnalyze.includes(result.analysis.signal as 'strong_buy' | 'buy')) {
        return;
      }

      // Skip already analyzed
      if (analyzedTokensRef.current.has(mint)) return;

      // Skip if already in queue
      if (analysisQueueRef.current.includes(mint)) return;

      tokensToAnalyze.push(mint);
    });

    if (tokensToAnalyze.length > 0) {
      log({
        text: `[AI] Queuing ${tokensToAnalyze.length} token(s) for analysis`,
        color: COLORS.MUTED,
      });

      // Add to queue
      analysisQueueRef.current.push(...tokensToAnalyze);

      // Start processing
      processQueue();
    }
  }, [retracementResults, signalsToAnalyze, enabled, log, processQueue]);

  // Clear results
  const clearResults = useCallback(() => {
    setAiResults(new Map());
    analyzedTokensRef.current.clear();
    analysisQueueRef.current = [];
    setError(null);
  }, []);

  return {
    aiResults,
    currentlyAnalyzing,
    isAnalyzing,
    analyzedCount: analyzedTokensRef.current.size,
    error,
    analyzeToken,
    clearResults,
  };
}
