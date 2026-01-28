// ============================================
// SUBMISSION
// ============================================

export interface CompetitionSubmission {
  id: string;
  wallet_address: string;
  traded_wallet_address: string;
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  token_image_url: string | null;
  market_cap_at_entry: number | null;
  price_at_entry: number | null;
  current_price: number | null;
  current_market_cap: number | null;
  liquidity: number | null;
  volume_24h: number | null;
  pnl_pct: number | null;
  pnl_usd: number | null;
  entry_time: string | null;
  exit_time: string | null;
  twitter_data: TwitterData | null;
  trade_data: WalletTrade[] | null;
  why_bought: string | null;
  indicators_used: string | null;
  exit_reasoning: string | null;
  pnl_score: number;
  analysis_score: number;
  vote_score: number;
  composite_score: number;
  competition_id: string;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

// ============================================
// VOTE
// ============================================

export interface CompetitionVote {
  id: string;
  submission_id: string;
  voter_wallet: string;
  direction: 1 | -1;
  created_at: string;
}

export type VoteDirection = 1 | -1;

// ============================================
// LEADERBOARD
// ============================================

export interface LeaderboardEntry {
  wallet_address: string;
  total_submissions: number;
  avg_pnl: number;
  best_pnl: number;
  composite_score: number;
  rank: number;
}

// ============================================
// TOKEN DATA (from DevPrint + DexScreener)
// ============================================

export interface TokenData {
  mint: string;
  symbol: string;
  name: string;
  image_url: string | null;
  price_usd: number;
  market_cap: number;
  liquidity: number;
  volume_24h: number;
  price_change_24h: number | null;
  total_supply: number | null;
}

export interface TwitterData {
  tweet_count: number | null;
  follower_count: number | null;
  engagement_score: number | null;
  sentiment: string | null;
  recent_tweets: unknown[] | null;
}

// ============================================
// WALLET TRADES (from DevPrint)
// ============================================

export interface WalletTrade {
  timestamp: number;
  action: "buy" | "sell";
  price_usd: number;
  amount_tokens: number;
  amount_sol: number;
  amount_usd: number;
  tx_hash: string;
}

export interface AggregatedTradeData {
  total_bought_usd: number;
  total_sold_usd: number;
  avg_entry_price: number;
  avg_exit_price: number | null;
  pnl_pct: number;
  pnl_usd: number;
  first_buy_at: number;
  last_trade_at: number;
  trades: WalletTrade[];
}

// ============================================
// SUBMISSION FORM
// ============================================

export interface SubmissionFormData {
  wallet_address: string;
  traded_wallet_address: string;
  token_mint: string;
  reasoning?: string;
}

export interface SubmissionAnalysisData {
  why_bought?: string;
  indicators_used?: string;
  exit_reasoning?: string;
}

// ============================================
// SUBMISSION FLOW STATE
// ============================================

export type SubmissionStep =
  | "form"
  | "fetching"
  | "results"
  | "submitting"
  | "success"
  | "error";

export interface SubmissionState {
  step: SubmissionStep;
  formData: SubmissionFormData | null;
  tokenData: TokenData | null;
  tradeData: AggregatedTradeData | null;
  twitterData: TwitterData | null;
  analysisData: SubmissionAnalysisData;
  error: string | null;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
