import { NextRequest, NextResponse } from "next/server";
import { buildDevprntApiUrl } from "@/lib/devprnt";

/**
 * GET /api/trading-competition/wallet-trades?wallet=<address>&mint=<token_mint>
 *
 * Fetches wallet trades for a specific token from DevPrint.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");
    const mint = request.nextUrl.searchParams.get("mint");

    if (!wallet || !mint) {
      return NextResponse.json(
        { success: false, error: "wallet and mint parameters are required" },
        { status: 400 }
      );
    }

    // Fetch aggregated wallet trades from DevPrint
    const url = buildDevprntApiUrl(
      `/api/wallets/token/${mint}/aggregated`
    );
    url.searchParams.set("wallet", wallet);

    const devRes = await fetch(url.toString(), {
      next: { revalidate: 30 },
    });

    if (!devRes.ok) {
      // Fallback: try alternate endpoint
      const altUrl = buildDevprntApiUrl(`/api/wallets/${wallet}/trades`);
      altUrl.searchParams.set("mint", mint);

      const altRes = await fetch(altUrl.toString(), {
        next: { revalidate: 30 },
      });

      if (!altRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch wallet trades from DevPrint",
          },
          { status: 502 }
        );
      }

      const altData = await altRes.json();
      return NextResponse.json({
        success: true,
        data: altData.data ?? altData,
      });
    }

    const data = await devRes.json();

    return NextResponse.json({
      success: true,
      data: data.data ?? data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
