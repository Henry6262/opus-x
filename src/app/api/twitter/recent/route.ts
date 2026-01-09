import { NextResponse } from "next/server";
import { getPonzinomicsApiBase, getPonzinomicsApiKey } from "@/lib/server/ponzinomics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";

  try {
    const response = await fetch(`${getPonzinomicsApiBase()}/twitter-tracking/recent${query}`, {
      headers: {
        "X-API-Key": getPonzinomicsApiKey(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch recent tweets" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
