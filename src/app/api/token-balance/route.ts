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
    console.log("[token-balance API] Fetching for wallet:", walletAddress, "mint:", tokenMint);

    // Use Helius RPC - getTokenAccountsByOwner (simple, reliable)
    const response = await fetch(
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
    );

    if (!response.ok) {
      console.error(`Helius API error: ${response.status}`);
      return NextResponse.json(
        { error: `Helius API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data: RpcResponse = await response.json();

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
    console.log("[token-balance API] Found", accounts.length, "token accounts");

    if (accounts.length > 0) {
      balance = accounts[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
      console.log("[token-balance API] Balance:", balance);
    }

    return NextResponse.json({
      balance,
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
