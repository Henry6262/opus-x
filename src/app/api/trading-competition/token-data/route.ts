import { NextRequest, NextResponse } from "next/server";
import { buildDevprntApiUrl } from "@/lib/devprnt";

/**
 * GET /api/trading-competition/token-data?mint=<token_mint>
 *
 * Fetches token metadata and market data from DevPrint + DexScreener.
 */
export async function GET(request: NextRequest) {
  try {
    const mint = request.nextUrl.searchParams.get("mint");
    if (!mint) {
      return NextResponse.json(
        { success: false, error: "mint parameter is required" },
        { status: 400 }
      );
    }

    // Fetch from DexScreener for market data + metadata
    const dexRes = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { next: { revalidate: 30 } }
    );

    if (!dexRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch token data from DexScreener" },
        { status: 502 }
      );
    }

    const dexData = await dexRes.json();
    const pair = dexData?.pairs?.[0];

    if (!pair) {
      return NextResponse.json(
        { success: false, error: "Token not found on DexScreener" },
        { status: 404 }
      );
    }

    // Also try to fetch tweet/community data from Ponzinomics (optional)
    let twitterData = null;
    try {
      const ponzApi = process.env.NEXT_PUBLIC_PONZINOMICS_API_URL;
      const ponzKey = process.env.PONZINOMICS_API_KEY;
      if (ponzApi && ponzKey) {
        const twitterRes = await fetch(
          `${ponzApi}/api/twitter/token/${mint}`,
          {
            headers: { "x-api-key": ponzKey },
            next: { revalidate: 60 },
          }
        );
        if (twitterRes.ok) {
          const twitterJson = await twitterRes.json();
          twitterData = twitterJson.data ?? null;
        }
      }
    } catch {
      // Twitter data is optional, don't fail the request
    }

    const tokenData = {
      mint,
      symbol: pair.baseToken?.symbol ?? "UNKNOWN",
      name: pair.baseToken?.name ?? "Unknown Token",
      image_url: pair.info?.imageUrl ?? null,
      price_usd: parseFloat(pair.priceUsd) || 0,
      market_cap: pair.marketCap ?? pair.fdv ?? 0,
      liquidity: pair.liquidity?.usd ?? 0,
      volume_24h: pair.volume?.h24 ?? 0,
      price_change_24h: pair.priceChange?.h24 ?? null,
      total_supply: pair.fdv && pair.priceUsd
        ? pair.fdv / parseFloat(pair.priceUsd)
        : null,
    };

    return NextResponse.json({
      success: true,
      data: { token: tokenData, twitter: twitterData },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
