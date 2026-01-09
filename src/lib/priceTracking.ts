/**
 * Price Tracking Service
 *
 * Uses Jupiter Price API (primary) and DexScreener (fallback) to fetch real-time token prices
 * Calculates PnL based on initial detection price vs current price
 */

export interface TokenPrice {
  mint: string;
  usdPrice: number;
  priceChange24h: number | null;
  marketCap: number | null;
  fdv: number | null;
  liquidity: number | null;
  source: 'jupiter' | 'dexscreener';
  timestamp: number;
}

export interface TokenPnL {
  mint: string;
  initialPrice: number;
  currentPrice: number;
  pnlPercent: number;
  priceChange24h: number | null;
  currentMarketCap: number | null;
  fdv: number | null;
  liquidity: number | null;
  source: 'jupiter' | 'dexscreener';
}

// In-memory cache to avoid rate limits (5 minute TTL)
const priceCache = new Map<string, { price: TokenPrice; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch prices from Jupiter Price API (v3)
 * Rate limit: Generous (API key required from portal.jup.ag)
 * Endpoint: GET https://api.jup.ag/price/v3?ids=mint1,mint2,mint3
 */
async function fetchJupiterPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
  const prices = new Map<string, TokenPrice>();

  // Jupiter supports batching - join mints with comma
  const idsParam = mints.join(',');
  const url = `https://api.jup.ag/price/v3?ids=${idsParam}`;

  try {
    console.log(`[PriceTracking] Fetching Jupiter prices for ${mints.length} tokens`);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[PriceTracking] Jupiter API error: ${response.status}`);
      return prices;
    }

    const data = await response.json() as Record<string, {
      blockId: number | null;
      decimals: number;
      usdPrice: number;
      priceChange24h: number | null;
    }>;

    // Jupiter returns an object with mint addresses as keys
    for (const [mint, priceData] of Object.entries(data)) {
      prices.set(mint, {
        mint,
        usdPrice: priceData.usdPrice,
        priceChange24h: priceData.priceChange24h,
        marketCap: null, // Jupiter doesn't provide market cap
        fdv: null,
        liquidity: null,
        source: 'jupiter',
        timestamp: Date.now(),
      });
    }

    console.log(`[PriceTracking] Jupiter returned ${prices.size}/${mints.length} prices`);
    return prices;
  } catch (error) {
    console.error('[PriceTracking] Jupiter fetch failed:', error);
    return prices;
  }
}

/**
 * Fetch prices from DexScreener API (fallback)
 * Rate limit: 60 requests/minute (free tier)
 * Endpoint: GET https://api.dexscreener.com/latest/dex/tokens/{addresses}
 */
async function fetchDexScreenerPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
  const prices = new Map<string, TokenPrice>();

  // DexScreener supports comma-separated addresses
  const addressesParam = mints.join(',');
  const url = `https://api.dexscreener.com/latest/dex/tokens/${addressesParam}`;

  try {
    console.log(`[PriceTracking] Fetching DexScreener prices for ${mints.length} tokens`);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[PriceTracking] DexScreener API error: ${response.status}`);
      return prices;
    }

    const data = await response.json() as {
      pairs: Array<{
        chainId: string;
        baseToken: {
          address: string;
          name: string;
          symbol: string;
        };
        priceUsd: string;
        priceChange: {
          h24: number;
        };
        liquidity?: {
          usd: number;
        };
        marketCap?: number;
        fdv?: number;
      }>;
    };

    // DexScreener returns multiple pairs per token - use the one with highest liquidity
    const bestPairs = new Map<string, typeof data.pairs[0]>();

    for (const pair of data.pairs || []) {
      const mint = pair.baseToken.address;
      const existingPair = bestPairs.get(mint);

      // Keep pair with highest liquidity
      if (!existingPair || (pair.liquidity?.usd || 0) > (existingPair.liquidity?.usd || 0)) {
        bestPairs.set(mint, pair);
      }
    }

    // Convert to TokenPrice format
    for (const [mint, pair] of bestPairs) {
      prices.set(mint, {
        mint,
        usdPrice: parseFloat(pair.priceUsd),
        priceChange24h: pair.priceChange?.h24 || null,
        marketCap: pair.marketCap || null,
        fdv: pair.fdv || null,
        liquidity: pair.liquidity?.usd || null,
        source: 'dexscreener',
        timestamp: Date.now(),
      });
    }

    console.log(`[PriceTracking] DexScreener returned ${prices.size}/${mints.length} prices`);
    return prices;
  } catch (error) {
    console.error('[PriceTracking] DexScreener fetch failed:', error);
    return prices;
  }
}

/**
 * Fetch current prices for tokens (with caching)
 * Prioritizes DexScreener as it provides market cap data, uses Jupiter as fallback
 */
export async function fetchTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
  const now = Date.now();
  const results = new Map<string, TokenPrice>();
  const uncachedMints: string[] = [];

  // Check cache first
  for (const mint of mints) {
    const cached = priceCache.get(mint);
    if (cached && cached.expiresAt > now) {
      results.set(mint, cached.price);
    } else {
      uncachedMints.push(mint);
    }
  }

  if (uncachedMints.length === 0) {
    console.log(`[PriceTracking] All ${mints.length} prices served from cache`);
    return results;
  }

  console.log(`[PriceTracking] Fetching prices for ${uncachedMints.length} uncached tokens`);

  // Try DexScreener first (primary source - provides market cap data)
  const dexScreenerPrices = await fetchDexScreenerPrices(uncachedMints);

  // Find tokens that DexScreener didn't have
  const missingMints = uncachedMints.filter(mint => !dexScreenerPrices.has(mint));

  // Fallback to Jupiter for missing tokens
  let jupiterPrices = new Map<string, TokenPrice>();
  if (missingMints.length > 0) {
    console.log(`[PriceTracking] ${missingMints.length} tokens not found on DexScreener, trying Jupiter`);
    jupiterPrices = await fetchJupiterPrices(missingMints);
  }

  // Combine results and cache
  const allPrices = new Map([...dexScreenerPrices, ...jupiterPrices]);

  for (const [mint, price] of allPrices) {
    results.set(mint, price);
    priceCache.set(mint, {
      price,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  console.log(`[PriceTracking] Final results: ${results.size}/${mints.length} prices found`);
  console.log(`[PriceTracking] Sources: ${dexScreenerPrices.size} DexScreener, ${jupiterPrices.size} Jupiter, ${mints.length - uncachedMints.length} cached`);

  return results;
}

/**
 * Calculate PnL for tokens based on initial market cap vs current price
 * Also fetches current market cap data from DexScreener for display
 *
 * @param tokens - Array of tokens with mint and initial market_cap
 * @returns Map of mint -> PnL data (includes current market cap even without PnL)
 */
export async function calculateTokenPnL(
  tokens: Array<{ mint: string; market_cap: number | null }>
): Promise<Map<string, TokenPnL>> {
  const results = new Map<string, TokenPnL>();

  if (tokens.length === 0) {
    return results;
  }

  // Fetch current prices for ALL tokens (not just those with initial market cap)
  const mints = tokens.map(t => t.mint);
  const currentPrices = await fetchTokenPrices(mints);

  // Calculate PnL for each token
  for (const token of tokens) {
    const currentPriceData = currentPrices.get(token.mint);

    if (!currentPriceData) {
      continue;
    }

    const hasInitialMarketCap = token.market_cap && token.market_cap > 0;
    const initialPrice = hasInitialMarketCap ? token.market_cap! : 0;
    const currentPrice = currentPriceData.usdPrice;

    // Calculate percentage change only if we have initial market cap
    const pnlPercent = hasInitialMarketCap
      ? ((currentPrice - initialPrice) / initialPrice) * 100
      : 0;

    results.set(token.mint, {
      mint: token.mint,
      initialPrice,
      currentPrice,
      pnlPercent: hasInitialMarketCap ? pnlPercent : NaN, // NaN indicates no PnL data
      priceChange24h: currentPriceData.priceChange24h,
      currentMarketCap: currentPriceData.marketCap,
      fdv: currentPriceData.fdv,
      liquidity: currentPriceData.liquidity,
      source: currentPriceData.source,
    });
  }

  console.log(`[PriceTracking] Fetched market data for ${results.size}/${tokens.length} tokens`);

  return results;
}

/**
 * Clear the price cache (useful for manual refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('[PriceTracking] Price cache cleared');
}
