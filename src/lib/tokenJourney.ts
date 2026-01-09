/**
 * Token Journey Tracking for Retracement Trading Strategy
 *
 * Core concept: Track a token's price journey from migration to find optimal
 * entry points during pullbacks from ATH (All-Time High).
 *
 * Strategy: Buy tokens that have PROVEN they can pump (high ATH) when they
 * pull back to attractive levels (40-70% drawdown from ATH).
 */

// ============================================
// TYPES
// ============================================

export interface PriceSnapshot {
  timestamp: number;
  marketCap: number;
  price: number;
  liquidity: number | null;
}

export interface TokenJourney {
  mint: string;
  symbol: string;

  // Migration data (when token first appeared)
  migrationMcap: number;
  migrationTime: number;

  // All-Time High tracking
  athMcap: number;
  athTime: number;

  // Current state
  currentMcap: number;
  currentPrice: number;
  currentLiquidity: number | null;
  lastUpdated: number;

  // Price history (last N snapshots)
  snapshots: PriceSnapshot[];

  // Calculated signals
  signals: RetracementSignals;
}

export interface RetracementSignals {
  // How many X from migration to ATH (e.g., 24 = 24x pump)
  pumpMultiple: number;

  // Current drawdown from ATH as percentage (e.g., 50 = 50% down from ATH)
  drawdownPercent: number;

  // Current position: how many X from migration price (e.g., 12 = still 12x up)
  currentMultiple: number;

  // Time since ATH in minutes
  minutesSinceATH: number;

  // Price trend: analyzing recent snapshots
  trend: 'pumping' | 'dumping' | 'consolidating' | 'unknown';

  // Entry signal based on strategy
  entrySignal: EntrySignal;

  // Risk level
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export type EntrySignal =
  | 'strong_buy'    // Perfect entry: proven pump + good drawdown + consolidating
  | 'buy'           // Good entry: meets criteria
  | 'watch'         // Interesting but not quite there yet
  | 'avoid'         // Doesn't meet criteria
  | 'no_data';      // Not enough data yet

export interface EntryAnalysis {
  signal: EntrySignal;
  score: number;  // 0-100
  reasons: string[];
  warnings: string[];
}

// ============================================
// ANALYSIS LOGIC
// ============================================

/**
 * Analyze a token's journey and determine entry signal
 * Based on retracement/pullback trading strategy
 */
export function analyzeTokenJourney(journey: TokenJourney): EntryAnalysis {
  const { signals } = journey;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50; // Start neutral

  // Age check: We want fresh tokens (< 1 hour old)
  const ageMinutes = (Date.now() - journey.migrationTime) / (1000 * 60);
  const isYoung = ageMinutes <= 60;

  if (!isYoung) {
    warnings.push(`Token is ${Math.floor(ageMinutes / 60)}h old (prefer < 1h)`);
    score -= 20;
  }

  // CRITERION 1: Pump Multiple (has it proven it can run?)
  // We want tokens that have pumped at least 10x from migration
  if (signals.pumpMultiple >= 20) {
    reasons.push(`Strong pump proof: ${signals.pumpMultiple.toFixed(1)}x from migration`);
    score += 25;
  } else if (signals.pumpMultiple >= 10) {
    reasons.push(`Good pump proof: ${signals.pumpMultiple.toFixed(1)}x from migration`);
    score += 15;
  } else if (signals.pumpMultiple >= 5) {
    reasons.push(`Moderate pump: ${signals.pumpMultiple.toFixed(1)}x from migration`);
    score += 5;
  } else {
    warnings.push(`Weak pump history: only ${signals.pumpMultiple.toFixed(1)}x`);
    score -= 15;
  }

  // CRITERION 2: Drawdown (is it at a discount?)
  // Sweet spot: 40-70% down from ATH
  if (signals.drawdownPercent >= 40 && signals.drawdownPercent <= 70) {
    reasons.push(`Ideal drawdown zone: ${signals.drawdownPercent.toFixed(0)}% from ATH`);
    score += 25;
  } else if (signals.drawdownPercent >= 30 && signals.drawdownPercent <= 80) {
    reasons.push(`Acceptable drawdown: ${signals.drawdownPercent.toFixed(0)}% from ATH`);
    score += 10;
  } else if (signals.drawdownPercent < 30) {
    warnings.push(`Still near ATH: only ${signals.drawdownPercent.toFixed(0)}% down`);
    score -= 10;
  } else if (signals.drawdownPercent > 80) {
    warnings.push(`Heavy drawdown: ${signals.drawdownPercent.toFixed(0)}% (might be dead)`);
    score -= 20;
  }

  // CRITERION 3: Trend (is it stabilizing or still dumping?)
  if (signals.trend === 'consolidating') {
    reasons.push('Price consolidating (good for entry)');
    score += 15;
  } else if (signals.trend === 'pumping') {
    reasons.push('Already bouncing - may have missed bottom');
    score += 5;
  } else if (signals.trend === 'dumping') {
    warnings.push('Still dumping - wait for stabilization');
    score -= 15;
  }

  // CRITERION 4: Time since ATH
  // Best entries are within 15-30 mins of ATH (fresh pullback)
  if (signals.minutesSinceATH <= 30) {
    reasons.push(`Fresh pullback: ${signals.minutesSinceATH}min since ATH`);
    score += 10;
  } else if (signals.minutesSinceATH <= 60) {
    reasons.push(`Recent ATH: ${signals.minutesSinceATH}min ago`);
    score += 5;
  }

  // CRITERION 5: Current Multiple (how much upside remains?)
  // If already at 12x and ATH was 24x, there's 2x potential
  const upsidePotential = signals.pumpMultiple / signals.currentMultiple;
  if (upsidePotential >= 2) {
    reasons.push(`${upsidePotential.toFixed(1)}x potential to ATH`);
    score += 10;
  }

  // Determine signal based on score
  let signal: EntrySignal;
  if (score >= 80) {
    signal = 'strong_buy';
  } else if (score >= 65) {
    signal = 'buy';
  } else if (score >= 45) {
    signal = 'watch';
  } else {
    signal = 'avoid';
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return { signal, score, reasons, warnings };
}

/**
 * Determine trend from recent snapshots
 */
export function calculateTrend(snapshots: PriceSnapshot[]): RetracementSignals['trend'] {
  if (snapshots.length < 3) return 'unknown';

  // Look at last 5 snapshots (or fewer if not available)
  const recentSnapshots = snapshots.slice(-5);

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < recentSnapshots.length; i++) {
    const change = (recentSnapshots[i].marketCap - recentSnapshots[i - 1].marketCap)
      / recentSnapshots[i - 1].marketCap;
    changes.push(change);
  }

  // Average change
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

  // Volatility (standard deviation)
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);

  // Determine trend
  if (avgChange > 0.05) return 'pumping';  // >5% avg increase
  if (avgChange < -0.05) return 'dumping'; // >5% avg decrease
  if (volatility < 0.03) return 'consolidating'; // Low volatility, stable
  return 'unknown';
}

/**
 * Calculate risk level based on various factors
 */
export function calculateRiskLevel(journey: TokenJourney): RetracementSignals['riskLevel'] {
  const { signals, currentLiquidity } = journey;

  let riskScore = 0;

  // Low liquidity = higher risk
  if (currentLiquidity !== null) {
    if (currentLiquidity < 5000) riskScore += 3;
    else if (currentLiquidity < 10000) riskScore += 2;
    else if (currentLiquidity < 20000) riskScore += 1;
  } else {
    riskScore += 2; // Unknown liquidity
  }

  // High drawdown = higher risk
  if (signals.drawdownPercent > 70) riskScore += 2;
  else if (signals.drawdownPercent > 50) riskScore += 1;

  // Dumping trend = higher risk
  if (signals.trend === 'dumping') riskScore += 2;

  // Low pump proof = higher risk
  if (signals.pumpMultiple < 5) riskScore += 2;

  // Determine level
  if (riskScore <= 2) return 'low';
  if (riskScore <= 4) return 'medium';
  if (riskScore <= 6) return 'high';
  return 'extreme';
}

// ============================================
// SIGNAL FORMATTING
// ============================================

export function formatEntrySignal(signal: EntrySignal): { label: string; color: string } {
  switch (signal) {
    case 'strong_buy':
      return { label: 'STRONG BUY', color: 'text-green-400' };
    case 'buy':
      return { label: 'BUY', color: 'text-green-500' };
    case 'watch':
      return { label: 'WATCH', color: 'text-yellow-400' };
    case 'avoid':
      return { label: 'AVOID', color: 'text-red-400' };
    case 'no_data':
      return { label: 'NO DATA', color: 'text-gray-400' };
  }
}

export function formatRiskLevel(risk: RetracementSignals['riskLevel']): { label: string; color: string } {
  switch (risk) {
    case 'low':
      return { label: 'LOW RISK', color: 'text-green-400' };
    case 'medium':
      return { label: 'MED RISK', color: 'text-yellow-400' };
    case 'high':
      return { label: 'HIGH RISK', color: 'text-orange-400' };
    case 'extreme':
      return { label: 'EXTREME', color: 'text-red-500' };
  }
}
