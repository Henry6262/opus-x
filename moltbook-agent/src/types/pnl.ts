/**
 * PnL Data Types for SuperRouter
 *
 * Matches the DevPrint backend response format.
 */

export interface PnLSnapshot {
  totalPnL: number;
  dailyPnL: number;
  winRate: number;
  tradesExecuted: number;
  avgLatencyMs: number;
  openPositions: number;
  closedPositions: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  bestTradePct: number;
  worstTradePct: number;
  avgHoldTimeMinutes: number;
  timestamp: string;
}

export interface PnLFragment {
  text: string;
  type: 'inline' | 'dedicated';
  dataPoint: string;
}

export interface TradingPosition {
  id: string;
  mint: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  entrySol: number;
  unrealizedPnlSol: number;
  unrealizedPnlPct: number;
  peakPrice: number;
  tpHits: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  realizedPnlSol?: number;
  realizedPnlPct?: number;
}
