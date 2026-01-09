import type {
  RecentTweetsByAccount,
  SeedResponse,
  SimulationRunResponse,
  TrackedAccount,
} from "./types";

export async function fetchTrackedAccounts(): Promise<TrackedAccount[]> {
  const response = await fetch("/api/twitter/accounts", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load tracked accounts");
  }
  return response.json();
}

export async function seedTrackedAccounts(handles: string[]): Promise<SeedResponse[]> {
  const response = await fetch("/api/twitter/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handles }),
  });

  if (!response.ok) {
    throw new Error("Failed to seed tracked accounts");
  }

  return response.json();
}

export async function fetchRecentTweets(limit = 5): Promise<RecentTweetsByAccount[]> {
  const response = await fetch(`/api/twitter/recent?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load recent tweets");
  }
  return response.json();
}

export async function runSimulation(tweetText: string, author: string) {
  const response = await fetch("/api/simulation/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tweet_text: tweetText, author }),
  });

  if (!response.ok) {
    throw new Error("Failed to run simulation");
  }

  return response.json() as Promise<SimulationRunResponse>;
}

export async function generateCharacter(input: {
  tweetId: string;
  imageUrl: string;
  twitterHandle: string;
}) {
  const response = await fetch("/api/character/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to trigger character generation");
  }

  return response.json() as Promise<unknown>;
}

export async function queueQuoteTweet(input: {
  tweetId: string;
  text: string;
  botId?: string;
}) {
  const response = await fetch("/api/twitter/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to queue quote tweet");
  }

  return response.json() as Promise<unknown>;
}
