import { NextResponse } from "next/server";
import {
  getPonzinomicsApiBase,
  getPonzinomicsApiKey,
  getPonzinomicsProjectId,
} from "@/lib/server/ponzinomics";

interface CharacterRequest {
  tweetId?: string;
  imageUrl?: string;
  twitterHandle?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CharacterRequest;

    if (!body.tweetId || !body.imageUrl || !body.twitterHandle) {
      return NextResponse.json(
        { error: "Missing tweetId, imageUrl, or twitterHandle" },
        { status: 400 }
      );
    }

    const query = new URLSearchParams({
      tweetId: body.tweetId,
      imageUrl: body.imageUrl,
      twitterHandle: body.twitterHandle,
      projectId: getPonzinomicsProjectId(),
    });

    const response = await fetch(
      `${getPonzinomicsApiBase()}/character-generation/generate?${query.toString()}`,
      {
        method: "POST",
        headers: {
          "X-API-Key": getPonzinomicsApiKey(),
          Accept: "application/json",
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Character generation failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
