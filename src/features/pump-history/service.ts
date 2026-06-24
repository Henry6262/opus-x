import { fetchDevprintApi } from "@/lib/devprnt";
import type {
  FetchTokensParams,
  FetchTokensResult,
  PumpTokenWithTweet,
} from "./types";

export async function fetchPumpTokens(
  params: FetchTokensParams = {}
): Promise<FetchTokensResult> {
  const {
    sortOrder = "desc",
    limit = 20,
    offset = 0,
  } = params;

  try {
    const tokensData = await fetchDevprintApi<any[]>(
      `/api/tokens?limit=${limit}&offset=${offset}&order=${sortOrder}&include_tweets=true`
    );

    // Map to PumpTokenWithTweet format (tweet and labels are null for now)
    const tokens: PumpTokenWithTweet[] = tokensData.map((token: any) => ({
      ...token,
      tweet: null,
      labels: [],
    }));

    console.log(`[fetchPumpTokens] Received ${tokens.length} tokens`);

    return {
      tokens,
      total: tokens.length,
      hasMore: tokens.length === limit, // If we got a full page, there might be more
    };
  } catch (error) {
    console.error("[fetchPumpTokens] Error fetching tokens:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch tokens from devprint API"
    );
  }
}
