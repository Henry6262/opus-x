// Smart Money Trading Types - Matches ponzinomics-api responses

// ============================================
// SIGNAL SOURCE - Tracks where signals originate
// ============================================

export enum SignalSource {
  MIGRATION = "migration",           // New token migration detected
  TRACKED_WALLET = "tracked_wallet", // One of our tracked wallets bought
  DEX_ACTIVITY = "dex",              // General DEX activity
  PRICE_MOMENTUM = "price_momentum", // Price spike/momentum signal
  MANUAL = "manual",                 // Manually tracked by user
}

// Price history point for sparkline charts
export interface PriceHistoryPoint {
  timestamp: string;
  priceUsd: number;
  marketCap?: number;
  liquidity?: number;
}

export interface TrackedWallet {
  id: string;
  address: string;
  label: string;
  active: boolean;
  webhookId?: string;
  // Twitter Profile Data
  twitterUsername?: string | null;
  twitterUserId?: string | null;
  twitterName?: string | null;
  twitterBio?: string | null;
  twitterAvatar?: string | null;
  twitterBanner?: string | null;
  twitterFollowers?: number | null;
  twitterFollowing?: number | null;
  twitterTweetCount?: number | null;
  twitterVerified?: boolean;
  twitterProfileFetchedAt?: Date | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradingSignal {
  id: string;
  walletId: string;
  wallet?: TrackedWallet;
  tokenMint: string;
  tokenSymbol?: string | null;
  txSignature: string;
  buyAmountSol: number;
  tokenAmount?: number | null;
  signalStrength: "PENDING" | "STRONG" | "WEAK" | "REJECTED";
  twitterAnalysis?: TwitterAnalysis | null;
  sentimentScore?: number | null;
  narrativeNotes?: string | null;
  isMigrated: boolean;
  migrationTx?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface TwitterAnalysis {
  tweetCount: number;
  sentimentScore: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topThemes: string[];
  redFlags: string[];
  summary: string;
}

export interface Position {
  id: string;
  signalId: string;
  signal?: TradingSignal;
  tokenMint: string;
  tokenSymbol?: string | null;
  status: "PENDING" | "OPEN" | "PARTIALLY_CLOSED" | "CLOSED" | "STOPPED_OUT";

  // Entry
  entryPriceSol: number;
  entryAmountSol: number;
  entryTokens: number;
  entryTxSig?: string | null;

  // Targets
  target1Price: number;
  target1Percent: number;
  target1Hit: boolean;
  target1TxSig?: string | null;

  target2Price: number;
  target2Hit: boolean;
  target2TxSig?: string | null;

  stopLossPrice: number;
  stoppedOut: boolean;
  stopLossTxSig?: string | null;

  // Current state
  currentPrice?: number | null;
  remainingTokens: number;
  realizedPnlSol: number;
  unrealizedPnl?: number | null;

  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface TradingConfig {
  id: string;
  tradingEnabled: boolean;
  maxPositionPercent: number;
  maxOpenPositions: number;
  target1Percent: number;
  target1SellPercent: number;
  target2Percent: number;
  stopLossPercent: number;
  minTweetCount: number;
  minSentimentScore: number;
  maxDailyLossSol: number;
  maxDailyTrades: number;
  maxSlippageBps: number;
  wallet_address?: string;    // Trading wallet public key
  trading_mode?: 'paper' | 'real'; // Current trading mode
  sol_balance?: number;       // SOL balance (real mode only)

  // Wallet signal settings
  walletSignalSizeMultiplier?: number; // Position size multiplier for wallet signals (default: 0.5 = 2x less)
  reAnalyzeOnWalletSignal?: boolean;   // Whether to re-analyze when tracked wallet enters a token

  createdAt?: string;
  updatedAt?: string;
}


// Dashboard stats response from /smart-trading/stats/dashboard
export interface DashboardStatsResponse {
  trading: {
    tradingEnabled: boolean;
    walletBalance: number;
    realWalletBalance: number;
    openPositions: number;
    maxOpenPositions: number;
    dailyPnL: number;
    maxDailyLoss: number;
    dailyTrades: number;
    maxDailyTrades: number;
    totalExposure: number;
    unrealizedPnL: number;
    availableForTrading: number;
    recommendedPositionSize: number;
  };
  performance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitSol: number;
    totalLossSol: number;
    netPnlSol: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
  };
  trackedWallets: number;
  signalsToday: number;
  strongSignalsToday: number;
}

// Signals list response
export interface SignalsResponse {
  items: TradingSignal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Positions list response
export interface PositionsResponse {
  items: Position[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Combined data for UI
export interface SmartTradingData {
  dashboardStats: DashboardStatsResponse | null;
  config: TradingConfig | null;
  wallets: TrackedWallet[];
  signals: TradingSignal[];
  positions: Position[];
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: string;
  totalValueSol: number;
  walletBalanceSol: number;
  unrealizedPnLSol: number;
  openPositions: number;
}

// ============================================
// MIGRATION FEED TYPES
// ============================================

export type TrackingStatus = "ACTIVE" | "EXPIRED" | "TRADED";
export type AiDecision = "ENTER" | "WAIT" | "PASS";
export type AnalysisTrigger = "SCHEDULED" | "WALLET_SIGNAL" | "MIGRATION" | "PRICE_SPIKE";

export interface Migration {
  id: string;
  tokenMint: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenImageUrl: string | null;
  trackingStatus: TrackingStatus;
  detectedAt: string;
  poolAddress: string | null;
  migrationTxSig: string | null;
  expiresAt: string | null;
  priorityScore: number;

  // Signal source tracking
  signalSource?: SignalSource;           // How this token was discovered
  hasWalletConfirmation?: boolean;       // True if a tracked wallet also bought this

  // Market data
  lastPriceUsd: number | null;
  lastMarketCap: number | null;
  lastLiquidity: number | null;
  lastVolume24h: number | null;
  lastPriceChange1h: number | null;
  lastUpdatedAt: string | null;

  // Price history for sparkline (array of price points over time)
  priceHistory: PriceHistoryPoint[] | null;

  // AI analysis
  lastAiDecision: AiDecision | null;
  lastAiConfidence: number | null;
  lastAiReasoning: string | null;
  lastAnalyzedAt: string | null;

  // Wallet signals
  walletSignalCount: number;
  walletSignals: WalletSignal[];
  lastWalletSignalAt: string | null;
}

export interface WalletSignal {
  walletAddress: string;
  walletLabel?: string;
  action: "BUY" | "SELL";
  amountSol?: number;
  timestamp: string;
  // Twitter profile data (from TrackedWallet)
  twitterUsername?: string | null;
  twitterAvatar?: string | null;
  twitterName?: string | null;
}

export interface MigrationAnalysis {
  id: string;
  migrationId: string;
  priceUsd: number;
  marketCap: number;
  liquidity: number;
  volume24h: number | null;
  decision: AiDecision;
  confidence: number;
  reasoning: string;
  risks: string[];
  triggerType: AnalysisTrigger;
  triggerData: Record<string, unknown> | null;
  createdAt: string;
}

// RankedMigration is a FLAT structure - migration fields are at root level
// This matches the backend API response from /smart-trading/migration-feed/ranked
export interface RankedMigration extends Migration {
  score: number;
  breakdown: SignalBreakdown;
  isReadyToTrade: boolean;
}

// SignalBreakdown matches backend property names from signal-aggregator.service.ts
export interface SignalBreakdown {
  migrationAge: number;
  walletSignals: number;
  aiConfidence: number;
  priceMomentum: number;
  multipleWallets: number;
  total: number;
}

export interface MigrationFeedStats {
  totalActive: number;
  pendingAnalysis: number;
  readyToTrade: number;
  withWalletSignals: number;
  expiredToday: number;
}

// Migration feed API responses
export interface MigrationFeedResponse {
  items: Migration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RankedMigrationsResponse {
  items: RankedMigration[];
  stats: MigrationFeedStats;
}

// WebSocket event types for migration feed
export interface MigrationFeedEvent {
  type:
  | "connected"
  | "migration_detected"
  | "token_added"
  | "market_data_updated"
  | "ai_analysis"
  | "ai_reasoning"
  | "no_market_data"
  | "wallet_signal"
  | "migration_expired"
  | "feed_update"
  | "stats_update"
  | "signal_detected"
  | "wallet_buy_detected"
  | "god_wallet_buy_detected"
  | "position_opened"
  | "price_update"
  | "take_profit_triggered"
  | "position_closed"
  | "holdings_snapshot"
  | "stop_loss_triggered"
  | "watchlist_added"
  | "watchlist_updated"
  | "watchlist_removed"
  | "watchlist_graduated"
  | "history_updated"
  | "god_wallet_token_price_update";
  data?: unknown;
  timestamp: number;
  clientId?: string;
}

// Holdings snapshot from backend WebSocket (sent every 2s on position changes)
export interface HoldingsSnapshotData {
  holdings: HoldingData[];
  total_unrealized_pnl_sol: number;
  total_realized_pnl_sol: number;
  open_position_count: number;
  timestamp: number;
}

/** Individual criteria check result from AI evaluation */
export interface CriteriaCheck {
  name: string;
  passed: boolean;
  skipped: boolean;
  value: number;
  threshold: number;
  reason: string | null;
}

/** Dynamic confidence score breakdown */
export interface DynamicConfidenceScore {
  total_score: number;
  volume_score: number;
  holder_score: number;
  price_score: number;
  momentum_score: number;
}

/** Momentum analysis details */
export interface MomentumAnalysis {
  price_change_5m: number;
  volume_change_5m: number;
  holder_change_5m: number;
  trend: "bullish" | "bearish" | "neutral";
}

/** Bundle analysis for bot detection */
export interface BundleAnalysis {
  is_bundled: boolean;
  bundle_percentage: number;
  unique_wallets: number;
  suspicious_patterns: string[];
}

/** Full buy criteria result - AI reasoning for why we bought */
export interface BuyCriteriaResult {
  passed: boolean;
  confidence_check: CriteriaCheck;
  market_cap_check: CriteriaCheck;
  liquidity_check: CriteriaCheck;
  volume_check: CriteriaCheck;
  holder_count_check: CriteriaCheck;
  holder_check: CriteriaCheck;
  dev_risk_check: CriteriaCheck;
  security_check: CriteriaCheck;
  bundle_check: CriteriaCheck;
  trend_check: CriteriaCheck;
  dynamic_confidence_check: CriteriaCheck;
  momentum_check: CriteriaCheck;
  rejection_reasons: string[];
  dynamic_confidence?: DynamicConfidenceScore;
  momentum_analysis?: MomentumAnalysis;
  bundle_analysis?: BundleAnalysis;
}

export interface HoldingData {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  entry_price: number;
  entry_time: string;
  entry_sol_value: number;
  initial_quantity: number;
  current_quantity: number;
  current_price: number;
  unrealized_pnl_sol: number;
  unrealized_pnl_pct: number;
  peak_price: number;
  peak_pnl_pct: number;
  realized_pnl_sol: number;
  status: "open" | "partially_closed" | "partiallyclosed" | "closed" | "pending";
  market_cap: number | null;
  liquidity: number | null;
  volume_24h: number | null;
  buy_signature: string | null;
  /** Token image URL (optional, fallback to DexScreener if missing) */
  image_url?: string | null;
  /** AI reasoning - why we decided to buy this token */
  buy_criteria: BuyCriteriaResult | null;
}

// ============================================
// WATCHLIST TYPES
// ============================================

/** Metrics snapshot for a watchlist token */
export interface WatchlistMetrics {
  liquidity_usd: number;
  volume_24h_usd: number;
  market_cap_usd: number;
  holder_count: number;
  price_usd: number;
}

/** Result of a watchlist check */
export interface WatchlistCheckResult {
  passed: boolean;
  failed_checks: string[];
  improving: boolean;
  checked_at: string;
}

/** A token being watched for potential trading opportunity */
export interface WatchlistToken {
  mint: string;
  symbol: string;
  name: string;
  added_at: string;
  last_check_at: string;
  check_count: number;
  watch_reasons: string[];
  metrics: WatchlistMetrics;
  last_result: WatchlistCheckResult;
  detection_source?: string | null;
  migration_detected_at?: number | null;
}

/** Watchlist statistics */
export interface WatchlistStats {
  total_watching: number;
  improving_count: number;
  avg_check_count: number;
  oldest_token_age_secs: number;
}

/** Response from /api/trading/watchlist */
export interface WatchlistResponse {
  tokens: WatchlistToken[];
  stats: WatchlistStats;
}

/** AI reasoning entry for a watchlist token */
export interface WatchlistReasoningEntry {
  reasoning: string;
  conviction: number;
  will_trade: boolean;
  timestamp: number;
}

/** Response from /api/trading/watchlist/reasoning */
export interface WatchlistReasoningResponse {
  reasoning: Record<string, WatchlistReasoningEntry[]>; // keyed by mint address
}

/** WebSocket event: Token added to watchlist */
export interface WatchlistAddedEvent {
  mint: string;
  symbol: string;
  name: string;
  watch_reasons: string[];
  liquidity_usd: number;
  volume_24h_usd: number;
  market_cap_usd: number;
  holder_count: number;
  timestamp: number;
}

/** WebSocket event: Watchlist token updated */
export interface WatchlistUpdatedEvent {
  mint: string;
  symbol: string;
  check_count: number;
  improving: boolean;
  market_cap_usd: number;
  volume_24h_usd: number;
  holder_count: number;
  failed_checks: string[];
  timestamp: number;
}

/** WebSocket event: Token removed from watchlist */
export interface WatchlistRemovedEvent {
  mint: string;
  symbol: string;
  reason: string;
  total_checks: number;
  watched_duration_secs: number;
  timestamp: number;
}

/** WebSocket event: Token graduated from watchlist */
export interface WatchlistGraduatedEvent {
  mint: string;
  symbol: string;
  total_checks: number;
  watched_duration_secs: number;
  final_liquidity_usd: number;
  final_volume_24h_usd: number;
  final_holder_count: number;
  timestamp: number;
}

// ============================================
// DASHBOARD INIT - Consolidated Response
// ============================================
// This is the response from /smart-trading/dashboard/init
// which returns ALL data needed for the smart-trading dashboard
// in a single API call.

/** Stats for migration feed (matches backend MigrationFeedStatsDto) */
export interface DashboardMigrationStats {
  totalActive: number;
  readyToTrade: number;
  avgScore: number;
  cacheSize: number;
  isPolling: boolean;
  analyzerReady: boolean;
  analysisQueueLength: number;
}

/** Positions grouped by status */
export interface DashboardPositions {
  open: Position[];
  closed: Position[];
}

/** Consolidated dashboard init response - single API call for all data */
export interface DashboardInitResponse {
  config: TradingConfig;
  stats: DashboardStatsResponse;
  wallets: TrackedWallet[];
  signals: TradingSignal[];
  positions: DashboardPositions;
  migrations: RankedMigration[];
  migrationStats: DashboardMigrationStats;
  serverTime: string;
}
