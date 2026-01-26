import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SR_TOKEN_MINT = process.env.NEXT_PUBLIC_SR_TOKEN_MINT || "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump";

interface TokenAccountInfo {
  parsed: {
    info: {
      mint: string;
      tokenAmount: {
        uiAmount: number;
      };
    };
  };
}

interface RpcResponse {
  result?: {
    value: Array<{
      account: {
        data: TokenAccountInfo;
      };
    }>;
  };
  error?: {
    message: string;
  };
}

interface DexScreenerPair {
  priceUsd?: string;
  priceNative?: string;
}

interface DexScreenerResponse {
  pairs?: DexScreenerPair[];
}

/**
 * Fetch token price from DexScreener (free, no API key needed)
 */
async function getTokenPriceUsd(mint: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      console.error(`DexScreener API error: ${response.status}`);
      return 0;
    }

    const data: DexScreenerResponse = await response.json();

    // Get the first pair's USD price (most liquid pair)
    if (data.pairs && data.pairs.length > 0) {
      const priceStr = data.pairs[0].priceUsd;
      if (priceStr) {
        return parseFloat(priceStr);
      }
    }

    return 0;
  } catch (error) {
    console.error("Failed to fetch token price:", error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("wallet");
  const tokenMint = searchParams.get("mint") || SR_TOKEN_MINT;

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Missing wallet address" },
      { status: 400 }
    );
  }

  if (!HELIUS_API_KEY) {
    console.error("HELIUS_API_KEY not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // Fetch balance and price in parallel
    const [balanceResponse, priceUsd] = await Promise.all([
      fetch(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
              walletAddress,
              { mint: tokenMint },
              { encoding: "jsonParsed" }
            ],
          }),
        }
      ),
      getTokenPriceUsd(tokenMint),
    ]);

    if (!balanceResponse.ok) {
      console.error(`Helius API error: ${balanceResponse.status}`);
      return NextResponse.json(
        { error: `Helius API error: ${balanceResponse.status}` },
        { status: 502 }
      );
    }

    const data: RpcResponse = await balanceResponse.json();

    if (data.error) {
      console.error("Helius RPC error:", data.error.message);
      return NextResponse.json(
        { error: data.error.message },
        { status: 400 }
      );
    }

    // Extract balance from token account
    let balance = 0;
    const accounts = data.result?.value || [];

    if (accounts.length > 0) {
      balance = accounts[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
    }

    // Calculate USD value
    const usdValue = balance * priceUsd;

    return NextResponse.json({
      balance,
      priceUsd,
      usdValue,
      mint: tokenMint,
      wallet: walletAddress,
    });
  } catch (error) {
    console.error("Token balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
