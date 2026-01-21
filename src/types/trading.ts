/**
 * Trading Analytics Types
 *
 * Types for the overall trading analytics dashboard.
 * Uses data from /api/trading/positions endpoint.
 */

export interface TradingPosition {
  id: string;
  mint: string;
  token_name: string;
  ticker: string;
  entry_price: number;
  entry_time: string;
  initial_quantity: number;
  entry_sol_value: number;
  entry_liquidity: number;
  current_quantity: number;
  current_price: number;
  current_value_sol: number;
  unrealized_pnl_sol: number;
  unrealized_pnl_pct: number;
  peak_price: number;
  peak_pnl_pct: number;
  targets_hit: TargetHit[];
  realized_pnl_sol: number;
  tp1_hit: boolean;
  tp2_hit: boolean;
  tp3_hit: boolean;
  status: 'open' | 'partially_closed' | 'closed';
  closed_at: string | null;
  close_reason: string | null;
  pending_sell: any | null;
  sell_in_progress: boolean;
  buy_signature: string;
  sell_transactions: SellTransaction[];
  buy_criteria: BuyCriteria | null;
  created_at: string;
  updated_at: string;
  agent_version_id: string | null;
  agent_version_code: string | null;
}

export interface TargetHit {
  target_multiplier: number;
  sold_quantity: number;
  sold_price: number;
  sold_time: string;
  realized_sol: number;
}

export interface SellTransaction {
  signature: string;
  quantity: number;
  price: number;
  sol_received: number;
  timestamp: string;
}

export interface BuyCriteria {
  passed: boolean;
  confidence_check?: CheckResult;
  market_cap_check?: CheckResult;
  liquidity_usd?: number;
  holder_count_check?: CheckResult;
  momentum_check?: CheckResult;
  dynamic_confidence?: DynamicConfidence;
  [key: string]: any;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  reason: string | null;
  skipped: boolean;
  threshold: number;
  value: number;
}

export interface DynamicConfidence {
  total_score: number;
  volume_score: number;
  holder_score: number;
  price_score: number;
  breakdown: string;
}

// Aggregated analytics
export interface TradingAnalytics {
  totalTrades: number;
  openPositions: number;
  closedPositions: number;
  totalInvestedSol: number;
  totalPnlSol: number;
  totalPnlPct: number;
  winRate: number;
  avgMultiplier: number;
  avgHoldTimeMinutes: number;
  bestTradePct: number;
  worstTradePct: number;
  tp1HitRate: number;
  tp2HitRate: number;
  tp3HitRate: number;
}

// Daily aggregation for charts
export interface DailyTradingMetrics {
  date: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnlSol: number;
  avgMultiplier: number;
  totalInvestedSol: number;
}

// Token performance ranking
export interface TokenPerformance {
  mint: string;
  tokenName: string;
  ticker: string;
  entryTime: string;
  exitTime: string | null;
  entryPrice: number;
  exitPrice: number | null;
  investedSol: number;
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  totalPnlSol: number;
  pnlPct: number;
  peakPnlPct: number;
  holdTimeMinutes: number | null;
  status: 'open' | 'partially_closed' | 'closed';
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
}
