import { NextRequest, NextResponse } from "next/server";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const SR_TOKEN_MINT = process.env.NEXT_PUBLIC_SR_TOKEN_MINT || "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump";

interface BirdeyeTokenBalance {
  address: string;
  decimals: number;
  price: number;
  balance: string;
  amount: number;
  network: string;
  name: string;
  symbol: string;
  value: string;
}

interface BirdeyeResponse {
  success: boolean;
  data: BirdeyeTokenBalance[];
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

  if (!BIRDEYE_API_KEY) {
    console.error("BIRDEYE_API_KEY not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // Use Birdeye wallet token balance API
    const response = await fetch("https://public-api.birdeye.so/wallet/v2/token-balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY": BIRDEYE_API_KEY,
        "x-chain": "solana",
      },
      body: JSON.stringify({
        wallet: walletAddress,
        token_addresses: [tokenMint],
      }),
    });

    if (!response.ok) {
      console.error(`Birdeye API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Response:", text);
      return NextResponse.json(
        { error: `Birdeye API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data: BirdeyeResponse = await response.json();

    if (!data.success) {
      console.error("Birdeye returned unsuccessful response");
      return NextResponse.json(
        { error: "Failed to fetch balance from Birdeye" },
        { status: 502 }
      );
    }

    // Find the token in the response
    let balance = 0;
    if (data.data && data.data.length > 0) {
      const tokenData = data.data.find(t => t.address === tokenMint);
      if (tokenData) {
        balance = tokenData.amount; // Human-readable balance
      }
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
