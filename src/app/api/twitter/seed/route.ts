import { NextResponse } from "next/server";
import { getPonzinomicsApiBase, getPonzinomicsApiKey } from "@/lib/server/ponzinomics";

interface SeedRequest {
  handles?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SeedRequest;
    const handles = (body.handles || []).filter(Boolean);

    if (handles.length === 0) {
      return NextResponse.json({ error: "No handles provided" }, { status: 400 });
    }

    const results = await Promise.allSettled(
      handles.map(async (handle) => {
        const response = await fetch(`${getPonzinomicsApiBase()}/twitter-tracking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": getPonzinomicsApiKey(),
            Accept: "application/json",
          },
          body: JSON.stringify({
            twitterHandle: handle,
            displayName: handle,
            events: ["tweets"],
            channelIds: [],
            active: true,
          }),
        });

        if (response.ok) {
          return { handle, status: "created" as const };
        }

        if (response.status === 409) {
          return { handle, status: "existing" as const };
        }

        const payload = await response.json().catch(() => null);
        return {
          handle,
          status: "error" as const,
          message: payload?.message || "Failed to seed account",
        };
      })
    );

    const normalized = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        handle: handles[index],
        status: "error" as const,
        message: result.reason?.message || "Failed to seed account",
      };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
