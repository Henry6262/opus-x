import { NextRequest } from "next/server";

// WebSocket proxy to securely handle Birdeye WebSocket connections
// This prevents exposing the API key in the client
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Upgrade to WebSocket
  const upgradeHeader = request.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  // Get API key from environment (server-side only)
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return new Response("Birdeye API key not configured", { status: 500 });
  }

  const chain = request.nextUrl.searchParams.get("chain") || "solana";

  // Note: Next.js API routes don't support WebSocket upgrade directly
  // We'll need to use a different approach - redirect to a separate WebSocket server
  // or use Server-Sent Events (SSE) as an alternative

  return new Response(
    "WebSocket proxy not yet implemented. Use Server-Sent Events endpoint instead.",
    { status: 501 }
  );
}
