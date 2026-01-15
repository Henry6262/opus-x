import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Birdeye Wallet Token List API
 * Keeps BIRDEYE_API_KEY secure on the server
 *
 * GET /api/birdeye/wallet-holdings?wallet=<address>
 *
 * Returns all token holdings for a wallet with prices and values
 * This is used for blockchain validation of positions
 */

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

// Native SOL mint address constant
const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface BirdeyeWalletHolding {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: number;      // Raw balance (after decimals applied)
    uiAmount: number;     // Human-readable amount
    priceUsd: number | null;
    valueUsd: number | null;
    icon?: string;
}

interface BirdeyeTokenItem {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: number;
    uiAmount: number;
    chainId: string;
    logoURI?: string;
    priceUsd?: number;
    valueUsd?: number;
}

interface BirdeyeWalletResponse {
    success: boolean;
    data: {
        wallet: string;
        totalUsd: number;
        items: BirdeyeTokenItem[];
    };
}

export async function GET(request: NextRequest) {
    // Check for API key
    if (!BIRDEYE_API_KEY) {
        return NextResponse.json(
            { success: false, error: "Birdeye API key not configured" },
            { status: 500 }
        );
    }

    // Get wallet address from query params
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
        return NextResponse.json(
            { success: false, error: "Missing 'wallet' query parameter" },
            { status: 400 }
        );
    }

    // Validate wallet address format (basic check for Solana base58)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
        return NextResponse.json(
            { success: false, error: "Invalid wallet address format" },
            { status: 400 }
        );
    }

    try {
        // Use Birdeye's wallet token_list endpoint
        const url = `${BIRDEYE_BASE_URL}/v1/wallet/token_list?wallet=${wallet}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-KEY": BIRDEYE_API_KEY,
                "x-chain": "solana",
                "Accept": "application/json",
            },
            next: { revalidate: 30 }, // Cache for 30 seconds
        });

        if (!response.ok) {
            console.error(`[BirdeyeWallet] API error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { success: false, error: `Birdeye API error: ${response.status}` },
                { status: response.status }
            );
        }

        const result: BirdeyeWalletResponse = await response.json();

        if (!result.success || !result.data) {
            return NextResponse.json(
                { success: false, error: "Birdeye API returned unsuccessful response" },
                { status: 500 }
            );
        }

        // Transform to our simplified format, filtering out SOL and dust
        const holdings: BirdeyeWalletHolding[] = result.data.items
            .filter((item) => {
                // Skip native SOL (we only care about token positions)
                if (item.address === SOL_MINT) return false;
                // Skip zero or dust balances (less than $0.01)
                if (!item.valueUsd || item.valueUsd < 0.01) return false;
                return true;
            })
            .map((item) => ({
                address: item.address,
                symbol: item.symbol || "UNKNOWN",
                name: item.name || "Unknown Token",
                decimals: item.decimals,
                balance: item.balance,
                uiAmount: item.uiAmount,
                priceUsd: item.priceUsd ?? null,
                valueUsd: item.valueUsd ?? null,
                icon: item.logoURI,
            }));

        // Create a map for quick lookup by mint address
        const holdingsMap: Record<string, BirdeyeWalletHolding> = {};
        for (const holding of holdings) {
            holdingsMap[holding.address] = holding;
        }

        return NextResponse.json({
            success: true,
            data: {
                wallet: result.data.wallet,
                totalUsd: result.data.totalUsd,
                holdings,
                holdingsMap,
                tokenCount: holdings.length,
            },
            fetchedAt: Date.now(),
        });
    } catch (error) {
        console.error("[BirdeyeWallet] Error fetching wallet holdings:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch wallet holdings" },
            { status: 500 }
        );
    }
}
