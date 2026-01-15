import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Birdeye Token Stats API
 * Keeps BIRDEYE_API_KEY secure on the server
 * 
 * GET /api/birdeye/token-stats?addresses=mint1,mint2,mint3
 */

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

interface TokenOverview {
    address: string;
    symbol?: string;
    name?: string;
    price?: number;
    priceChange24h?: number;
    volume24h?: number;
    liquidity?: number;
    mc?: number;
}

interface BirdeyeMultiPriceResponse {
    success: boolean;
    data: Record<string, {
        value: number;
        updateHumanTime: string;
        updateUnixTime: number;
        priceChange24h?: number;
    }>;
}

export async function GET(request: NextRequest) {
    // Check for API key
    if (!BIRDEYE_API_KEY) {
        return NextResponse.json(
            { error: "Birdeye API key not configured" },
            { status: 500 }
        );
    }

    // Get addresses from query params
    const { searchParams } = new URL(request.url);
    const addressesParam = searchParams.get("addresses");

    if (!addressesParam) {
        return NextResponse.json(
            { error: "Missing 'addresses' query parameter" },
            { status: 400 }
        );
    }

    const addresses = addressesParam.split(",").filter(Boolean).slice(0, 50); // Max 50 tokens

    if (addresses.length === 0) {
        return NextResponse.json({ data: {} }, { status: 200 });
    }

    try {
        // Use Birdeye's multi-price endpoint for efficiency
        const priceUrl = `${BIRDEYE_BASE_URL}/defi/multi_price?list_address=${addresses.join(",")}`;

        const response = await fetch(priceUrl, {
            method: "GET",
            headers: {
                "X-API-KEY": BIRDEYE_API_KEY,
                "x-chain": "solana",
                "Accept": "application/json",
            },
            next: { revalidate: 10 }, // Cache for 10 seconds
        });

        if (!response.ok) {
            console.error(`[BirdeyeProxy] API error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: `Birdeye API error: ${response.status}` },
                { status: response.status }
            );
        }

        const result: BirdeyeMultiPriceResponse = await response.json();

        if (!result.success) {
            return NextResponse.json(
                { error: "Birdeye API returned unsuccessful response" },
                { status: 500 }
            );
        }

        // Transform the response into a simpler format
        const tokenStats: Record<string, TokenOverview> = {};

        for (const [address, priceData] of Object.entries(result.data)) {
            tokenStats[address] = {
                address,
                price: priceData.value,
                priceChange24h: priceData.priceChange24h,
            };
        }

        return NextResponse.json({
            success: true,
            data: tokenStats,
            fetchedAt: Date.now(),
        });
    } catch (error) {
        console.error("[BirdeyeProxy] Error fetching token stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch token stats" },
            { status: 500 }
        );
    }
}

// Also support POST for larger address lists
export async function POST(request: NextRequest) {
    if (!BIRDEYE_API_KEY) {
        return NextResponse.json(
            { error: "Birdeye API key not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const addresses: string[] = body.addresses || [];

        if (addresses.length === 0) {
            return NextResponse.json({ data: {} }, { status: 200 });
        }

        // Limit to 50 tokens
        const limitedAddresses = addresses.slice(0, 50);

        const priceUrl = `${BIRDEYE_BASE_URL}/defi/multi_price?list_address=${limitedAddresses.join(",")}`;

        const response = await fetch(priceUrl, {
            method: "GET",
            headers: {
                "X-API-KEY": BIRDEYE_API_KEY,
                "x-chain": "solana",
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Birdeye API error: ${response.status}` },
                { status: response.status }
            );
        }

        const result: BirdeyeMultiPriceResponse = await response.json();

        if (!result.success) {
            return NextResponse.json(
                { error: "Birdeye API returned unsuccessful response" },
                { status: 500 }
            );
        }

        const tokenStats: Record<string, TokenOverview> = {};

        for (const [address, priceData] of Object.entries(result.data)) {
            tokenStats[address] = {
                address,
                price: priceData.value,
                priceChange24h: priceData.priceChange24h,
            };
        }

        return NextResponse.json({
            success: true,
            data: tokenStats,
            fetchedAt: Date.now(),
        });
    } catch (error) {
        console.error("[BirdeyeProxy] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch token stats" },
            { status: 500 }
        );
    }
}
