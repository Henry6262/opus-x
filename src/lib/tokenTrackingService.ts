/**
 * Token Tracking Service
 *
 * Central cache for token price journeys.
 * Polls DexScreener periodically and maintains price history for all tracked tokens.
 * All users read from this shared cache (no redundant API calls per user).
 */

import {
  TokenJourney,
  PriceSnapshot,
  RetracementSignals,
  SocialMetrics,
  calculateTrend,
  calculateRiskLevel,
} from './tokenJourney';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Maximum snapshots to keep per token
  MAX_SNAPSHOTS_PER_TOKEN: 60,

  // Maximum age of tokens to track (1 hour)
  MAX_TOKEN_AGE_MS: 60 * 60 * 1000,

  // Minimum time between snapshots (30 seconds)
  MIN_SNAPSHOT_INTERVAL_MS: 30 * 1000,

  // DexScreener rate limit: 60 requests/minute
  // We batch tokens, so this is very efficient
  DEXSCREENER_BASE_URL: 'https://api.dexscreener.com',

  // Max tokens per DexScreener request (comma-separated addresses)
  MAX_TOKENS_PER_REQUEST: 30,
};

// ============================================
// DEXSCREENER TYPES
// ============================================

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
  };
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[] | null;
}

// ============================================
// IN-MEMORY CACHE
// ============================================

// Global cache of token journeys
const tokenJourneyCache = new Map<string, TokenJourney>();

// Track last update time to prevent too frequent updates
let lastPollTime = 0;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Fetch price data from DexScreener for multiple tokens
 */
async function fetchDexScreenerPrices(mints: string[]): Promise<Map<string, DexScreenerPair>> {
  const results = new Map<string, DexScreenerPair>();

  // Batch requests (max 30 tokens per request)
  for (let i = 0; i < mints.length; i += CONFIG.MAX_TOKENS_PER_REQUEST) {
    const batch = mints.slice(i, i + CONFIG.MAX_TOKENS_PER_REQUEST);
    const addresses = batch.join(',');

    try {
      const response = await fetch(
        `${CONFIG.DEXSCREENER_BASE_URL}/tokens/v1/solana/${addresses}`
      );

      if (!response.ok) {
        console.error(`[TokenTracking] DexScreener error: ${response.status}`);
        continue;
      }

      const data: DexScreenerPair[] = await response.json();

      // Index by token address
      for (const pair of data) {
        // Only take the first (highest liquidity) pair per token
        if (!results.has(pair.baseToken.address)) {
          results.set(pair.baseToken.address, pair);
        }
      }
    } catch (error) {
      console.error('[TokenTracking] Failed to fetch from DexScreener:', error);
    }

    // Small delay between batches to respect rate limits
    if (i + CONFIG.MAX_TOKENS_PER_REQUEST < mints.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Calculate signals for a token journey
 */
function calculateSignals(journey: TokenJourney): RetracementSignals {
  const {
    migrationMcap,
    athMcap,
    athTime,
    currentMcap,
    snapshots,
  } = journey;

  // Pump multiple: how many X from migration to ATH
  const pumpMultiple = athMcap / migrationMcap;

  // Current multiple: how many X from migration to current
  const currentMultiple = currentMcap / migrationMcap;

  // Drawdown: percentage down from ATH
  const drawdownPercent = athMcap > 0
    ? ((athMcap - currentMcap) / athMcap) * 100
    : 0;

  // Time since ATH in minutes
  const minutesSinceATH = (Date.now() - athTime) / (1000 * 60);

  // Calculate trend from snapshots
  const trend = calculateTrend(snapshots);

  // Initial risk level (will be recalculated)
  const riskLevel = 'medium' as const;

  const signals: RetracementSignals = {
    pumpMultiple,
    drawdownPercent,
    currentMultiple,
    minutesSinceATH,
    trend,
    entrySignal: 'no_data',
    riskLevel,
  };

  // Now calculate risk level with full journey context
  const tempJourney = { ...journey, signals };
  signals.riskLevel = calculateRiskLevel(tempJourney);

  return signals;
}

/**
 * Initialize a new token journey
 */
function initializeJourney(
  mint: string,
  symbol: string,
  initialMcap: number,
  initialPrice: number,
  liquidity: number | null,
  migrationTime: number,
  social?: SocialMetrics
): TokenJourney {
  const now = Date.now();
  const snapshot: PriceSnapshot = {
    timestamp: now,
    marketCap: initialMcap,
    price: initialPrice,
    liquidity,
  };

  const journey: TokenJourney = {
    mint,
    symbol,
    migrationMcap: initialMcap,
    migrationTime,
    athMcap: initialMcap,
    athTime: now,
    currentMcap: initialMcap,
    currentPrice: initialPrice,
    currentLiquidity: liquidity,
    lastUpdated: now,
    snapshots: [snapshot],
    signals: {
      pumpMultiple: 1,
      drawdownPercent: 0,
      currentMultiple: 1,
      minutesSinceATH: 0,
      trend: 'unknown',
      entrySignal: 'no_data',
      riskLevel: 'medium',
    },
    social,
  };

  return journey;
}

/**
 * Extract social metrics from token input
 * Handles both tweet and community data based on twitter_link_type
 */
function extractSocialMetrics(token: TokenInput): SocialMetrics | undefined {
  const linkType = token.twitter_link_type;

  // Community type - use community data
  if (linkType === 'community') {
    // Only return if we have community data
    if (token.community_member_count === undefined && token.community_creator_followers === undefined) {
      return undefined;
    }

    return {
      sourceType: 'community',
      // Use community creator as the "author"
      authorFollowers: token.community_creator_followers ?? null,
      authorVerified: token.community_creator_verified ?? null,
      authorUsername: token.community_creator_username ?? null,
      authorName: token.community_creator_name ?? null,
      // No tweet engagement for communities
      likeCount: null,
      retweetCount: null,
      replyCount: null,
      quoteCount: null,
      bookmarkCount: null,
      impressionCount: null,
      viewCount: null,
      tweetText: null,
      tweetCreatedAt: null,
      // Community-specific data
      communityId: token.community_id ?? null,
      communityName: token.community_name ?? null,
      communityDescription: token.community_description ?? null,
      communityMemberCount: token.community_member_count ?? null,
      communityModeratorCount: token.community_moderator_count ?? null,
      communityCreatedAt: token.community_created_at ?? null,
    };
  }

  // Tweet type (or profile/search/unknown) - use tweet data
  if (token.author_followers === undefined && token.tweet_like_count === undefined) {
    return undefined;
  }

  return {
    sourceType: linkType === 'tweet' ? 'tweet' : 'unknown',
    authorFollowers: token.author_followers ?? null,
    authorVerified: token.author_verified ?? null,
    authorUsername: token.tweet_author_username ?? null,
    authorName: token.tweet_author_name ?? null,
    likeCount: token.tweet_like_count ?? null,
    retweetCount: token.tweet_retweet_count ?? null,
    replyCount: token.tweet_reply_count ?? null,
    quoteCount: token.tweet_quote_count ?? null,
    bookmarkCount: token.tweet_bookmark_count ?? null,
    impressionCount: token.tweet_impression_count ?? null,
    viewCount: token.tweet_view_count ?? null,
    tweetText: token.tweet_text ?? null,
    tweetCreatedAt: token.tweet_created_at ?? null,
    // No community data for tweets
    communityId: null,
    communityName: null,
    communityDescription: null,
    communityMemberCount: null,
    communityModeratorCount: null,
    communityCreatedAt: null,
  };
}

/**
 * Update a token journey with new price data
 */
function updateJourney(
  journey: TokenJourney,
  marketCap: number,
  price: number,
  liquidity: number | null
): TokenJourney {
  const now = Date.now();

  // Check if enough time has passed since last snapshot
  const lastSnapshot = journey.snapshots[journey.snapshots.length - 1];
  const shouldAddSnapshot = !lastSnapshot ||
    (now - lastSnapshot.timestamp) >= CONFIG.MIN_SNAPSHOT_INTERVAL_MS;

  // Add snapshot if enough time passed
  const newSnapshots = shouldAddSnapshot
    ? [
        ...journey.snapshots,
        { timestamp: now, marketCap, price, liquidity },
      ].slice(-CONFIG.MAX_SNAPSHOTS_PER_TOKEN)
    : journey.snapshots;

  // Update ATH if current > previous ATH
  const isNewATH = marketCap > journey.athMcap;

  const updatedJourney: TokenJourney = {
    ...journey,
    athMcap: isNewATH ? marketCap : journey.athMcap,
    athTime: isNewATH ? now : journey.athTime,
    currentMcap: marketCap,
    currentPrice: price,
    currentLiquidity: liquidity,
    lastUpdated: now,
    snapshots: newSnapshots,
    signals: journey.signals, // Will be recalculated below
  };

  // Recalculate signals
  updatedJourney.signals = calculateSignals(updatedJourney);

  return updatedJourney;
}

// ============================================
// PUBLIC API
// ============================================

/** Input token type with optional social metrics */
export interface TokenInput {
  mint: string;
  symbol: string;
  detected_at: string;
  market_cap: number | null;
  twitter_link_type?: string | null;

  // Tweet social metrics (from devprint with include_tweets=true)
  author_followers?: number | null;
  author_verified?: boolean | null;
  tweet_author_username?: string | null;
  tweet_author_name?: string | null;
  tweet_like_count?: number | null;
  tweet_retweet_count?: number | null;
  tweet_reply_count?: number | null;
  tweet_quote_count?: number | null;
  tweet_bookmark_count?: number | null;
  tweet_impression_count?: number | null;
  tweet_view_count?: number | null;
  tweet_text?: string | null;
  tweet_created_at?: string | null;

  // Community social metrics (from devprint with include_tweets=true, for community link type)
  community_id?: string | null;
  community_name?: string | null;
  community_description?: string | null;
  community_member_count?: number | null;
  community_moderator_count?: number | null;
  community_creator_username?: string | null;
  community_creator_name?: string | null;
  community_creator_followers?: number | null;
  community_creator_verified?: boolean | null;
  community_created_at?: string | null;
}

/**
 * Update the tracking cache with tokens from the devprnt feed
 * Call this periodically to keep the cache fresh
 */
export async function updateTokenTracking(
  tokens: TokenInput[]
): Promise<Map<string, TokenJourney>> {
  const now = Date.now();

  // Throttle updates
  if (now - lastPollTime < CONFIG.MIN_SNAPSHOT_INTERVAL_MS) {
    return tokenJourneyCache;
  }
  lastPollTime = now;

  // Filter to tokens < 1 hour old
  const freshTokens = tokens.filter(t => {
    const age = now - new Date(t.detected_at).getTime();
    return age <= CONFIG.MAX_TOKEN_AGE_MS;
  });

  if (freshTokens.length === 0) {
    return tokenJourneyCache;
  }

  const mints = freshTokens.map(t => t.mint);

  // Fetch current prices from DexScreener
  const priceData = await fetchDexScreenerPrices(mints);

  // Update or create journeys
  for (const token of freshTokens) {
    const pair = priceData.get(token.mint);
    if (!pair) continue;

    const marketCap = pair.marketCap ?? pair.fdv ?? 0;
    const price = parseFloat(pair.priceUsd) || 0;
    const liquidity = pair.liquidity?.usd ?? null;

    if (marketCap <= 0) continue;

    const existingJourney = tokenJourneyCache.get(token.mint);

    if (existingJourney) {
      // Update existing journey (preserve social metrics)
      const updated = updateJourney(existingJourney, marketCap, price, liquidity);
      tokenJourneyCache.set(token.mint, updated);
    } else {
      // Initialize new journey with social metrics if available
      const migrationTime = new Date(token.detected_at).getTime();
      const migrationMcap = token.market_cap || marketCap;
      const social = extractSocialMetrics(token);

      const newJourney = initializeJourney(
        token.mint,
        token.symbol,
        migrationMcap,
        price,
        liquidity,
        migrationTime,
        social
      );
      tokenJourneyCache.set(token.mint, newJourney);
    }
  }

  // Clean up old tokens from cache
  for (const [mint, journey] of tokenJourneyCache) {
    const age = now - journey.migrationTime;
    if (age > CONFIG.MAX_TOKEN_AGE_MS * 2) { // Keep for 2x max age
      tokenJourneyCache.delete(mint);
    }
  }

  console.log(`[TokenTracking] Updated ${priceData.size} tokens, cache size: ${tokenJourneyCache.size}`);

  return tokenJourneyCache;
}

/**
 * Get all tracked token journeys
 */
export function getAllTokenJourneys(): TokenJourney[] {
  return Array.from(tokenJourneyCache.values());
}

/**
 * Get a specific token journey
 */
export function getTokenJourney(mint: string): TokenJourney | undefined {
  return tokenJourneyCache.get(mint);
}

/**
 * Get tokens with specific entry signals
 */
export function getTokensBySignal(
  signals: Array<RetracementSignals['entrySignal']>
): TokenJourney[] {
  return getAllTokenJourneys().filter(j => signals.includes(j.signals.entrySignal));
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const journeys = getAllTokenJourneys();
  const signalCounts = {
    strong_buy: 0,
    buy: 0,
    watch: 0,
    avoid: 0,
    no_data: 0,
  };

  for (const journey of journeys) {
    signalCounts[journey.signals.entrySignal]++;
  }

  return {
    totalTracked: journeys.length,
    lastPollTime,
    signalCounts,
  };
}
