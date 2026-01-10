// Smart Money Trading Types - Matches ponzinomics-api responses

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
