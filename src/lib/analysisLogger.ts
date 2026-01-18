
import { createClient } from '@supabase/supabase-js';

// Reusing client from supabase.ts as it is already typed there
import { supabase } from './supabase';

export type AiAnalysisLog = {
    mint: string;
    symbol?: string;
    name?: string;
    triggerType: 'MIGRATION' | 'WALLET_SIGNAL' | 'RETRACEMENT' | 'MANUAL';
    decision: 'ENTER' | 'PASS' | 'WAIT' | 'WATCH';
    confidence: number;
    reasoning: string;
    marketData: {
        price: number;
        marketCap?: number;
        liquidity?: number;
        volume24h?: number;
    };
    scoreBreakdown?: {
        entry_score?: number;
        reasons?: string[];
        warnings?: string[];
    };
    journeyMetrics?: {
        pump_multiple?: number;
        drawdown_percent?: number;
    };
};

export async function logAiAnalysis(params: AiAnalysisLog) {
    if (!supabase) return;

    try {
        const { error } = await supabase.from('token_ai_analysis_log').insert({
            token_mint: params.mint,
            token_symbol: params.symbol,
            token_name: params.name,
            trigger_type: params.triggerType,
            decision: params.decision,
            confidence: params.confidence,
            reasoning: params.reasoning,
            price_usd: params.marketData.price,
            market_cap: params.marketData.marketCap,
            liquidity: params.marketData.liquidity,
            volume_24h: params.marketData.volume24h,
            entry_score: params.scoreBreakdown?.entry_score,
            reasons: params.scoreBreakdown?.reasons,
            warnings: params.scoreBreakdown?.warnings,
            pump_multiple: params.journeyMetrics?.pump_multiple,
            drawdown_percent: params.journeyMetrics?.drawdown_percent,
        });

        if (error) {
            console.error('Error logging AI analysis:', error);
        }
    } catch (err) {
        console.error('Exception logging AI analysis:', err);
    }
}

export async function logMarketSnapshot(params: {
    mint: string;
    symbol?: string;
    name?: string;
    snapshotType: 'DETECTION' | 'TRADE_ENTRY' | 'TRADE_EXIT' | 'TAKE_PROFIT' | 'AI_ANALYSIS';
    marketData: {
        price: number;
        marketCap?: number;
        liquidity?: number;
        volume24h?: number;
        priceChange1h?: number;
        priceChange24h?: number;
        holderCount?: number;
    };
    references?: {
        positionId?: string;
        analysisId?: string;
    };
}) {
    if (!supabase) return;

    try {
        const { error } = await supabase.from('token_market_snapshots').insert({
            token_mint: params.mint,
            token_symbol: params.symbol,
            token_name: params.name,
            snapshot_type: params.snapshotType,
            price_usd: params.marketData.price,
            market_cap: params.marketData.marketCap,
            liquidity: params.marketData.liquidity,
            volume_24h: params.marketData.volume24h,
            price_change_1h: params.marketData.priceChange1h,
            price_change_24h: params.marketData.priceChange24h,
            holder_count: params.marketData.holderCount,
            position_id: params.references?.positionId,
            analysis_id: params.references?.analysisId,
        });

        if (error) {
            console.error('Error logging market snapshot:', error);
        }
    } catch (err) {
        console.error('Exception logging market snapshot:', err);
    }
}
