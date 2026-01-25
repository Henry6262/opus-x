import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SR_TOKEN_MINT = process.env.NEXT_PUBLIC_SR_TOKEN_MINT || "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump";

// Build RPC URL - Helius if key available, otherwise public (will likely fail)
const SOLANA_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

interface TokenAccountResponse {
  result?: {
    value: Array<{
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: {
                uiAmount: number;
              };
            };
          };
        };
      };
    }>;
  };
  error?: {
    message: string;
  };
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

  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: tokenMint },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`RPC error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `RPC error: ${response.status}` },
        { status: 502 }
      );
    }

    const data: TokenAccountResponse = await response.json();

    if (data.error) {
      console.error("RPC returned error:", data.error);
      return NextResponse.json(
        { error: data.error.message },
        { status: 502 }
      );
    }

    let balance = 0;
    if (data.result?.value?.length > 0) {
      balance = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    }

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Token balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
