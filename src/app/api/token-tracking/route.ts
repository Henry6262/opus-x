import { NextRequest, NextResponse } from 'next/server';
import {
  updateTokenTracking,
  getAllTokenJourneys,
  getTokenJourney,
  getCacheStats,
} from '@/lib/tokenTrackingService';
import { analyzeTokenJourney } from '@/lib/tokenJourney';

/**
 * GET /api/token-tracking
 *
 * Get all tracked token journeys with entry analysis
 *
 * Query params:
 * - mint: specific mint address to get (optional)
 * - signal: filter by entry signal (strong_buy, buy, watch, avoid)
 * - stats: if "true", return only cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mint = searchParams.get('mint');
    const signalFilter = searchParams.get('signal');
    const statsOnly = searchParams.get('stats') === 'true';

    // Return stats only
    if (statsOnly) {
      return NextResponse.json({
        success: true,
        data: getCacheStats(),
      });
    }

    // Get specific token
    if (mint) {
      const journey = getTokenJourney(mint);
      if (!journey) {
        return NextResponse.json({
          success: false,
          error: 'Token not found in tracking cache',
        }, { status: 404 });
      }

      const analysis = analyzeTokenJourney(journey);
      return NextResponse.json({
        success: true,
        data: {
          journey,
          analysis,
        },
      });
    }

    // Get all journeys
    let journeys = getAllTokenJourneys();

    // Filter by signal if specified
    if (signalFilter) {
      const validSignals = ['strong_buy', 'buy', 'watch', 'avoid', 'no_data'];
      if (validSignals.includes(signalFilter)) {
        journeys = journeys.filter(j => j.signals.entrySignal === signalFilter);
      }
    }

    // Add analysis to each journey
    const journeysWithAnalysis = journeys.map(journey => ({
      journey,
      analysis: analyzeTokenJourney(journey),
    }));

    // Sort by score (highest first)
    journeysWithAnalysis.sort((a, b) => b.analysis.score - a.analysis.score);

    return NextResponse.json({
      success: true,
      data: {
        journeys: journeysWithAnalysis,
        stats: getCacheStats(),
      },
    });
  } catch (error) {
    console.error('[API] Token tracking GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/token-tracking
 *
 * Update the tracking cache with new token data
 * Called by frontend to trigger a cache refresh
 *
 * Body:
 * - tokens: array of tokens to track
 *   { mint: string, symbol: string, detected_at: string, market_cap: number | null }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens } = body;

    if (!Array.isArray(tokens)) {
      return NextResponse.json({
        success: false,
        error: 'tokens must be an array',
      }, { status: 400 });
    }

    // Update tracking cache
    const updatedCache = await updateTokenTracking(tokens);

    // Get journeys with analysis
    const journeys = Array.from(updatedCache.values());
    const journeysWithAnalysis = journeys.map(journey => ({
      journey,
      analysis: analyzeTokenJourney(journey),
    }));

    // Sort by score
    journeysWithAnalysis.sort((a, b) => b.analysis.score - a.analysis.score);

    return NextResponse.json({
      success: true,
      data: {
        journeys: journeysWithAnalysis,
        stats: getCacheStats(),
      },
    });
  } catch (error) {
    console.error('[API] Token tracking POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
