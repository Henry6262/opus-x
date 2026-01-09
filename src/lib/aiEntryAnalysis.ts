/**
 * AI-Powered Entry Analysis for Retracement Trading
 *
 * Uses Gemini AI to generate natural language reasoning about entry signals.
 * This adds human-readable context to the algorithmic analysis.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TokenJourney, EntryAnalysis } from './tokenJourney';

// ============================================
// TYPES
// ============================================

export interface AiEntryAnalysis {
  /** Natural language explanation of why this is/isn't a good entry */
  reasoning: string;
  /** Key risk to watch */
  risk: string;
  /** Suggested entry/exit strategy (for BUY signals only) */
  strategy?: string;
  /** Raw AI response for debugging */
  _raw?: string;
}

export interface AiAnalysisInput {
  journey: TokenJourney;
  analysis: EntryAnalysis;
}

// ============================================
// GEMINI CLIENT
// ============================================

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ============================================
// PROMPT BUILDING
// ============================================

function buildPrompt(input: AiAnalysisInput): string {
  const { journey, analysis } = input;
  const { signals } = journey;

  const ageMinutes = Math.floor((Date.now() - journey.migrationTime) / (1000 * 60));

  return `You are a meme coin trading analyst specializing in retracement entries. Analyze this token for a potential pullback entry.

TOKEN DATA:
- Symbol: ${journey.symbol}
- Migration MCap: $${formatMcap(journey.migrationMcap)}
- All-Time High: $${formatMcap(journey.athMcap)} (${signals.pumpMultiple.toFixed(1)}x pump)
- Current MCap: $${formatMcap(journey.currentMcap)}
- Drawdown from ATH: ${signals.drawdownPercent.toFixed(0)}%
- Current Liquidity: $${journey.currentLiquidity ? formatMcap(journey.currentLiquidity) : 'Unknown'}
- Price Trend: ${signals.trend}
- Token Age: ${ageMinutes} minutes
- Time Since ATH: ${signals.minutesSinceATH} minutes

ALGORITHMIC ANALYSIS:
- Entry Score: ${analysis.score}/100
- Signal: ${analysis.signal.toUpperCase()}
- Reasons: ${analysis.reasons.join('; ')}
- Warnings: ${analysis.warnings.length > 0 ? analysis.warnings.join('; ') : 'None'}

RESPONSE FORMAT (JSON only, no markdown):
{
  "reasoning": "ONE SENTENCE explaining why this is or isn't a good entry based on the retracement strategy",
  "risk": "ONE key risk factor to monitor",
  "strategy": "Brief entry/exit suggestion if this is a BUY signal, otherwise null"
}

IMPORTANT:
- Be direct and specific, not generic
- Focus on the retracement opportunity (buying proven pumpers at a discount)
- Consider the R:R ratio (potential upside to ATH vs current discount)
- If the token pumped 24x and is now 50% down, it could 2x back to ATH
- Low liquidity is a major risk factor for exit slippage

Respond with valid JSON only:`;
}

function formatMcap(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

// ============================================
// AI ANALYSIS
// ============================================

/**
 * Generate AI-powered entry analysis for a token
 */
export async function generateAiEntryAnalysis(input: AiAnalysisInput): Promise<AiEntryAnalysis> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = buildPrompt(input);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    const parsed = parseAiResponse(text);

    return {
      reasoning: parsed.reasoning || 'Analysis unavailable',
      risk: parsed.risk || 'Unknown risk factors',
      strategy: parsed.strategy || undefined,
      _raw: text,
    };
  } catch (error) {
    console.error('[AI] Entry analysis error:', error);

    // Return fallback based on algorithmic analysis
    return generateFallbackAnalysis(input);
  }
}

/**
 * Parse the AI response, handling potential JSON issues
 */
function parseAiResponse(text: string): {
  reasoning?: string;
  risk?: string;
  strategy?: string | null;
} {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in the response
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Fall through to return empty object
      }
    }
    return {};
  }
}

/**
 * Generate a fallback analysis when AI fails
 */
function generateFallbackAnalysis(input: AiAnalysisInput): AiEntryAnalysis {
  const { journey, analysis } = input;
  const { signals } = journey;

  let reasoning: string;
  let risk: string;
  let strategy: string | undefined;

  if (analysis.signal === 'strong_buy' || analysis.signal === 'buy') {
    const upside = (signals.pumpMultiple / signals.currentMultiple).toFixed(1);
    reasoning = `${signals.pumpMultiple.toFixed(0)}x proven pump with ${signals.drawdownPercent.toFixed(0)}% discount offers ~${upside}x to ATH.`;
    risk = signals.drawdownPercent > 60
      ? 'Deep drawdown may indicate waning momentum'
      : journey.currentLiquidity && journey.currentLiquidity < 10000
        ? 'Low liquidity may cause slippage on exit'
        : 'Watch for continued selling pressure';
    strategy = `Target: Previous ATH ($${formatMcap(journey.athMcap)}). Stop: ${Math.floor(journey.currentMcap * 0.7)}.`;
  } else if (analysis.signal === 'watch') {
    reasoning = analysis.reasons[0] || 'Token shows potential but conditions not ideal for entry.';
    risk = analysis.warnings[0] || 'Wait for better entry conditions.';
  } else {
    reasoning = analysis.warnings[0] || 'Entry conditions not met.';
    risk = 'High probability of further downside.';
  }

  return { reasoning, risk, strategy };
}

/**
 * Batch analyze multiple tokens
 * Uses sequential processing to avoid rate limits
 */
export async function batchAnalyze(
  inputs: AiAnalysisInput[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, AiEntryAnalysis>> {
  const results = new Map<string, AiEntryAnalysis>();

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    try {
      const analysis = await generateAiEntryAnalysis(input);
      results.set(input.journey.mint, analysis);
    } catch (error) {
      console.error(`[AI] Failed to analyze ${input.journey.symbol}:`, error);
      results.set(input.journey.mint, generateFallbackAnalysis(input));
    }

    if (onProgress) {
      onProgress(i + 1, inputs.length);
    }

    // Small delay between requests to avoid rate limiting
    if (i < inputs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
