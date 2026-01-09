import { NextResponse } from "next/server";
import { DEVPRNT_CORE_URL } from "@/lib/config";

interface SimulationRunRequest {
  tweet_text?: string;
  author?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SimulationRunRequest;
    if (!body.tweet_text || !body.author) {
      return NextResponse.json({ error: "Missing tweet_text or author" }, { status: 400 });
    }

    const response = await fetch(`${DEVPRNT_CORE_URL.replace(/\/$/, "")}/api/simulation/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        tweet_text: body.tweet_text,
        author: body.author,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return NextResponse.json(
        { error: payload?.error || "Simulation request failed" },
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
