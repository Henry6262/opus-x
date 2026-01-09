import { buildDevprntApiUrl } from "@/lib/devprnt";
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
    // Build devprint API URL
    const url = buildDevprntApiUrl("/api/tokens");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order", sortOrder);

    console.log(`[fetchPumpTokens] Fetching from devprint API: ${url.toString()}`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error("API returned success: false");
    }

    const tokensData = result.data || [];

    // Map to PumpTokenWithTweet format (tweet and labels are null for now)
    const tokens: PumpTokenWithTweet[] = tokensData.map((token: any) => ({
      ...token,
      tweet: null,
      labels: [],
    }));

    console.log(`[fetchPumpTokens] Received ${tokens.length} tokens from devprint API`);

    return {
      tokens,
      total: result.count || tokens.length,
      hasMore: tokens.length === limit, // If we got a full page, there might be more
    };
  } catch (error) {
    console.error("[fetchPumpTokens] Error fetching tokens:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch tokens from devprint API"
    );
  }
}
