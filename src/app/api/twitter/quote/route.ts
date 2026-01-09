import { NextResponse } from "next/server";
import {
  getPonzinomicsApiBase,
  getPonzinomicsApiKey,
  getPonzinomicsProjectId,
} from "@/lib/server/ponzinomics";

interface QuoteRequest {
  tweetId?: string;
  text?: string;
  botId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuoteRequest;
    if (!body.tweetId || !body.text) {
      return NextResponse.json({ error: "Missing tweetId or text" }, { status: 400 });
    }

    const response = await fetch(
      `${getPonzinomicsApiBase()}/projects/${getPonzinomicsProjectId()}/twitter-automation/queue/quote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": getPonzinomicsApiKey(),
          Accept: "application/json",
        },
        body: JSON.stringify({
          tweetId: body.tweetId,
          text: body.text,
          botId: body.botId,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Failed to queue quote tweet" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
