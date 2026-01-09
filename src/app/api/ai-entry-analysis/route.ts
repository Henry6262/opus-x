import { NextRequest, NextResponse } from 'next/server';
import { generateAiEntryAnalysis, batchAnalyze } from '@/lib/aiEntryAnalysis';
import type { TokenJourney, EntryAnalysis } from '@/lib/tokenJourney';

/**
 * POST /api/ai-entry-analysis
 *
 * Generate AI-powered entry analysis for one or more tokens
 *
 * Body:
 * - For single token:
 *   { journey: TokenJourney, analysis: EntryAnalysis }
 *
 * - For batch:
 *   { batch: true, tokens: Array<{ journey: TokenJourney, analysis: EntryAnalysis }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for required environment variable
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI analysis not configured - GEMINI_API_KEY required',
      }, { status: 503 });
    }

    // Batch processing
    if (body.batch && Array.isArray(body.tokens)) {
      const inputs = body.tokens as Array<{ journey: TokenJourney; analysis: EntryAnalysis }>;

      if (inputs.length === 0) {
        return NextResponse.json({
          success: true,
          data: {},
        });
      }

      if (inputs.length > 10) {
        return NextResponse.json({
          success: false,
          error: 'Maximum 10 tokens per batch',
        }, { status: 400 });
      }

      const results = await batchAnalyze(inputs);

      // Convert Map to object for JSON response
      const resultsObj: Record<string, unknown> = {};
      results.forEach((value, key) => {
        resultsObj[key] = value;
      });

      return NextResponse.json({
        success: true,
        data: resultsObj,
      });
    }

    // Single token processing
    const { journey, analysis } = body as { journey: TokenJourney; analysis: EntryAnalysis };

    if (!journey || !analysis) {
      return NextResponse.json({
        success: false,
        error: 'Missing journey or analysis in request body',
      }, { status: 400 });
    }

    const aiAnalysis = await generateAiEntryAnalysis({ journey, analysis });

    return NextResponse.json({
      success: true,
      data: aiAnalysis,
    });
  } catch (error) {
    console.error('[API] AI entry analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
