import type {
  ApiResponse,
  CompetitionSubmission,
  LeaderboardEntry,
  TokenData,
  AggregatedTradeData,
  SubmissionAnalysisData,
  VoteDirection,
  CompetitionVote,
} from "./types";

const BASE_URL = "/api/trading-competition";

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return response.json() as Promise<ApiResponse<T>>;
}

// ============================================
// TOKEN DATA
// ============================================

export async function fetchTokenData(
  mint: string
): Promise<ApiResponse<TokenData>> {
  return fetchApi<TokenData>(
    `${BASE_URL}/token-data?mint=${encodeURIComponent(mint)}`
  );
}

// ============================================
// WALLET TRADES
// ============================================

export async function fetchWalletTrades(
  wallet: string,
  mint: string
): Promise<ApiResponse<AggregatedTradeData>> {
  const params = new URLSearchParams({ wallet, mint });
  return fetchApi<AggregatedTradeData>(
    `${BASE_URL}/wallet-trades?${params.toString()}`
  );
}

// ============================================
// SUBMISSIONS
// ============================================

export async function createSubmission(payload: {
  wallet_address: string;
  traded_wallet_address: string;
  token_mint: string;
  token_data: TokenData;
  trade_data: AggregatedTradeData;
  twitter_data: unknown;
  analysis: SubmissionAnalysisData;
}): Promise<ApiResponse<CompetitionSubmission>> {
  return fetchApi<CompetitionSubmission>(`${BASE_URL}/submissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listSubmissions(params?: {
  competition_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<CompetitionSubmission[]>> {
  const searchParams = new URLSearchParams();
  if (params?.competition_id)
    searchParams.set("competition_id", params.competition_id);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  return fetchApi<CompetitionSubmission[]>(
    `${BASE_URL}/submissions${qs ? `?${qs}` : ""}`
  );
}

export async function getSubmission(
  id: string
): Promise<ApiResponse<CompetitionSubmission>> {
  return fetchApi<CompetitionSubmission>(`${BASE_URL}/submissions/${id}`);
}

// ============================================
// VOTING
// ============================================

export async function voteOnSubmission(
  submissionId: string,
  voter_wallet: string,
  direction: VoteDirection
): Promise<ApiResponse<CompetitionVote>> {
  return fetchApi<CompetitionVote>(
    `${BASE_URL}/submissions/${submissionId}/vote`,
    {
      method: "POST",
      body: JSON.stringify({ voter_wallet, direction }),
    }
  );
}

// ============================================
// LEADERBOARD
// ============================================

export async function fetchLeaderboard(params?: {
  competition_id?: string;
  limit?: number;
}): Promise<ApiResponse<LeaderboardEntry[]>> {
  const searchParams = new URLSearchParams();
  if (params?.competition_id)
    searchParams.set("competition_id", params.competition_id);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  return fetchApi<LeaderboardEntry[]>(
    `${BASE_URL}/leaderboard${qs ? `?${qs}` : ""}`
  );
}
