import { NextResponse } from "next/server";
import { getPonzinomicsApiBase, getPonzinomicsApiKey } from "@/lib/server/ponzinomics";

export async function GET() {
  try {
    const response = await fetch(`${getPonzinomicsApiBase()}/twitter-tracking`, {
      headers: {
        "X-API-Key": getPonzinomicsApiKey(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tracked accounts" },
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
