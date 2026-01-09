"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Panel } from "@/components/design-system";
import { Button } from "@/components/ui";
import { useTerminal } from "@/features/terminal";
import { useWebSocket } from "@/lib/useWebSocket";
import { buildDevprntWsUrl } from "@/lib/devprnt";
import { DEFAULT_TRACKED_HANDLES } from "./targets";
import { generateCharacter, queueQuoteTweet, runSimulation } from "./service";
import type { J7Tweet, J7TweetEvent, RecentTweet } from "./types";

const MAX_TWEETS_PER_ACCOUNT = 5;
const AI_CONFIDENCE_THRESHOLD = 0.7;

function normalizeHandle(handle: string) {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

function formatTime(value: number | string | null | undefined) {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value || "");
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapJ7Tweet(tweet: J7Tweet): RecentTweet {
  return {
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ? new Date(tweet.created_at * 1000).toISOString() : "",
    url: tweet.tweet_url,
    authorHandle: tweet.author.handle,
    media: tweet.media.images.map((url) => ({ type: "image", url })),
    imageUrls: tweet.media.images,
    hasImages: tweet.media.images.length > 0,
    aiConfidence: undefined,
    aiDecision: undefined,
    aiTicker: undefined,
    aiTokenName: undefined,
  };
}

export function SimulationTwitterSection() {
  const { log } = useTerminal();
  const [feed, setFeed] = useState<Record<string, RecentTweet[]>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const seenTweetIds = useRef(new Set<string>());
  const scoredTweetIds = useRef(new Set<string>());
  const inFlightTweets = useRef(new Set<string>());
  const queuedCharacterIds = useRef(new Set<string>());
  const queuedQuoteIds = useRef(new Set<string>());
  const trackedHandles = useMemo(
    () => new Set(DEFAULT_TRACKED_HANDLES.map((handle) => normalizeHandle(handle))),
    []
  );

  const updateTweetScore = useCallback(
    (tweetId: string, handle: string, update: Partial<RecentTweet>) => {
      setFeed((prev) => {
        const key = normalizeHandle(handle);
        const list = prev[key] || [];
        const next = list.map((tweet) => (tweet.id === tweetId ? { ...tweet, ...update } : tweet));
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const buildQuoteText = useCallback((tweet: J7Tweet, ai?: Partial<RecentTweet>) => {
    const base = ai?.aiTicker
      ? `Opus-X picked ${ai.aiTokenName || "a new signal"} (${ai.aiTicker})`
      : "Opus-X queued a new signal";
    const scoreText =
      typeof ai?.aiConfidence === "number" ? ` · score ${ai.aiConfidence.toFixed(2)}` : "";
    return `${base}${scoreText} · @${tweet.author.handle}`;
  }, []);

  const scoreTweet = useCallback(
    async (tweet: J7Tweet) => {
      if (inFlightTweets.current.has(tweet.id) || scoredTweetIds.current.has(tweet.id)) {
        return;
      }

      inFlightTweets.current.add(tweet.id);
      updateTweetScore(tweet.id, tweet.author.handle, { aiDecision: "skip" });

      try {
        log({
          text: `AI analyzing tweet · @${tweet.author.handle}`,
          color: "var(--terminal-yellow)",
        });
        const result = await runSimulation(tweet.text, tweet.author.handle);
        const confidence = Number(result.confidence || 0);
        const decision = confidence >= AI_CONFIDENCE_THRESHOLD ? "queue" : "skip";

        scoredTweetIds.current.add(tweet.id);
        updateTweetScore(tweet.id, tweet.author.handle, {
          aiConfidence: confidence,
          aiDecision: decision,
          aiTicker: result.ticker,
          aiTokenName: result.token_name,
        });

        // Log AI reasoning with token signals
        if (result.ticker && result.token_name) {
          log({
            text: `AI detected signal · ${result.token_name} (${result.ticker}) · conf: ${confidence.toFixed(2)}`,
            color: "var(--terminal-blue)",
          });
        }

        // Log decision with reasoning
        if (decision === "queue") {
          log({
            text: `AI decision: QUEUE · Score ${confidence.toFixed(2)} exceeds threshold ${AI_CONFIDENCE_THRESHOLD}`,
            color: "var(--terminal-green)",
          });
        } else {
          log({
            text: `AI decision: SKIP · Score ${confidence.toFixed(2)} below threshold ${AI_CONFIDENCE_THRESHOLD}`,
            color: "var(--terminal-red)",
          });
        }

        if (decision === "queue" && tweet.media.images.length > 0) {
          const imageUrl = tweet.media.images[0];
          log({
            text: `AI workflow: Image detected · Initiating character extraction pipeline`,
            color: "var(--terminal-yellow)",
          });
          if (!queuedCharacterIds.current.has(tweet.id)) {
            queuedCharacterIds.current.add(tweet.id);
            log({
              text: `Character generation: Analyzing image from @${tweet.author.handle}`,
              color: "var(--terminal-yellow)",
            });
            try {
              await generateCharacter({
                tweetId: tweet.id,
                imageUrl,
                twitterHandle: tweet.author.handle,
              });
              log({
                text: `Character generation: Extraction complete · Compositing with golden duck`,
                color: "var(--terminal-green)",
              });

              if (!queuedQuoteIds.current.has(tweet.id)) {
                queuedQuoteIds.current.add(tweet.id);
                updateTweetScore(tweet.id, tweet.author.handle, { quoteStatus: "queued" });
                const quoteText = buildQuoteText(tweet, {
                  aiConfidence: confidence,
                  aiTicker: result.ticker,
                  aiTokenName: result.token_name,
                });
                log({
                  text: `Quote workflow: Preparing tweet · "${quoteText.slice(0, 50)}${quoteText.length > 50 ? '...' : ''}"`,
                  color: "var(--terminal-blue)",
                });
                try {
                  await queueQuoteTweet({ tweetId: tweet.id, text: quoteText });
                  log({
                    text: `Quote tweet: Successfully scheduled · Bot will post within 5 minutes`,
                    color: "var(--terminal-green)",
                  });
                } catch (error) {
                  queuedQuoteIds.current.delete(tweet.id);
                  updateTweetScore(tweet.id, tweet.author.handle, { quoteStatus: "failed" });
                  const message = error instanceof Error ? error.message : "Quote queue failed";
                  log({
                    text: `Quote tweet: Failed to queue · ${message}`,
                    color: "var(--terminal-red)",
                  });
                }
              }
            } catch (error) {
              queuedCharacterIds.current.delete(tweet.id);
              const message = error instanceof Error ? error.message : "Character generation failed";
              log({
                text: `Character generation: Failed · ${message}`,
                color: "var(--terminal-red)",
              });
            }
          }
        } else if (decision === "queue" && tweet.media.images.length === 0) {
          log({
            text: `AI workflow: SKIP character generation · Tweet has no images`,
            color: "var(--terminal-yellow)",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI scoring failed";
        updateTweetScore(tweet.id, tweet.author.handle, { aiDecision: "skip" });
        log({
          text: `AI scoring failed · @${tweet.author.handle} · ${message}`,
          color: "var(--terminal-red)",
        });
      } finally {
        inFlightTweets.current.delete(tweet.id);
      }
    },
    [log, updateTweetScore]
  );

  const handleTweet = useCallback(
    (tweet: J7Tweet) => {
      const authorHandle = normalizeHandle(tweet.author.handle);
      if (!trackedHandles.has(authorHandle)) {
        return;
      }

      const mapped = mapJ7Tweet(tweet);
      if (seenTweetIds.current.has(mapped.id)) {
        return;
      }

      seenTweetIds.current.add(mapped.id);
      setFeed((prev) => {
        const handleKey = authorHandle;
        const existing = prev[handleKey] || [];
        const next = [mapped, ...existing].slice(0, MAX_TWEETS_PER_ACCOUNT);
        return { ...prev, [handleKey]: next };
      });
      setLastUpdated(new Date().toISOString());

      log({
        text: mapped.hasImages
          ? `Media candidate from @${tweet.author.handle} (${mapped.id})`
          : `Tweet scanned from @${tweet.author.handle} (${mapped.id})`,
        color: mapped.hasImages ? "var(--terminal-green)" : "var(--terminal-blue)",
      });

      scoreTweet(tweet);
    },
    [log, trackedHandles, scoreTweet]
  );

  const onMessage = useCallback(
    (payload: J7TweetEvent) => {
      if (payload.event === "newTweet") {
        handleTweet(payload.data);
        return;
      }

      if (payload.event === "initialTweets") {
        payload.data.forEach(handleTweet);
      }
    },
    [handleTweet]
  );

  const { isConnected, reconnect } = useWebSocket<J7TweetEvent>({
    url: buildDevprntWsUrl("/ws/tweets"),
    onMessage,
    onConnect: () => {
      setConnectionError(null);
      log({
        text: "Connected to J7Tracker live tweet stream",
        color: "var(--terminal-green)",
      });
    },
    onDisconnect: () => {
      setConnectionError("Disconnected from tweet stream");
      log({
        text: "Disconnected from J7Tracker stream · reconnecting",
        color: "var(--terminal-red)",
      });
    },
  });

  const totalTweets = Object.values(feed).reduce((sum, list) => sum + list.length, 0);

  return (
    <section className="section-content">
      {/* Centered Header */}
      <div className="section-header-centered">
        <h2 className="section-title">Twitter Intelligence</h2>
        <p className="section-description">
          Track curated accounts, capture media tweets, and queue assets for character generation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
        {/* Target List Panel */}
        <div className="card-glass space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-matrix-green font-semibold">
              Target Accounts
            </p>
            <div className="status-indicator status-executing">
              <div className="w-2 h-2 rounded-full bg-current"></div>
              {DEFAULT_TRACKED_HANDLES.length}
            </div>
          </div>

          <div className="space-y-2">
            {DEFAULT_TRACKED_HANDLES.map((handle) => {
              const tracked = true;
              return (
                <div
                  key={handle}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-void-900/50 px-3 py-2 hover:border-brand-primary/50 transition-all duration-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-brand-primary">@{handle}</p>
                    <p className="text-xs text-white/40 font-mono">
                      {tracked ? "Monitoring live" : "Inactive"}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-matrix-green animate-pulse" />
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 text-xs text-white/40 font-mono">
            Last update: {lastUpdated ? formatTime(lastUpdated) : "pending"}
          </div>
        </div>

        {/* Tweets Feed Panel */}
        <div className="card-glass space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-solana-cyan font-semibold">
              Live Tweet Feed
            </p>
            <div className={`status-indicator ${connectionError ? 'status-scanning' : 'status-executing'}`}>
              <div className="w-2 h-2 rounded-full bg-current"></div>
              {connectionError ? "ERROR" : "STREAMING"}
            </div>
          </div>

          {connectionError ? (
            <div className="rounded-lg border border-alert-red/40 bg-void-900/50 p-4 text-sm text-alert-red font-mono">
              ⚠ {connectionError}
            </div>
          ) : null}

          <div className="space-y-4">
            {Object.keys(feed).length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-void-900/30 p-6 text-center">
                <div className="text-4xl mb-3 opacity-50">📡</div>
                <p className="text-sm text-white/40 font-mono">
                  Waiting for tweets...
                </p>
              </div>
            ) : null}

            {DEFAULT_TRACKED_HANDLES.map((handle) => {
              const tweets = feed[handle.toLowerCase()] || [];
              return (
              <div key={handle} className="rounded-lg border border-white/10 bg-void-900/30 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-brand-primary">@{handle}</p>
                    <p className="text-xs text-white/40 font-mono">Tracked account</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-matrix-green/20 text-matrix-green text-xs font-mono font-semibold border border-matrix-green/40">
                    {tweets.length} tweets
                  </div>
                </div>

                <div className="space-y-3">
                  {tweets.map((tweet) => (
                    <div
                      key={tweet.id}
                      className="rounded-lg border border-white/10 bg-void-900/50 p-3 hover:border-brand-primary/50 transition-all duration-200 group"
                    >
                      {/* Tweet header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/40 font-mono mb-2">
                        <span>{formatTime(tweet.createdAt)}</span>
                        <a
                          href={tweet.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-solana-cyan hover:text-brand-primary transition-colors"
                        >
                          View on X →
                        </a>
                      </div>

                      {/* Tweet text */}
                      <p className="text-sm text-white/90 leading-relaxed mb-3">{tweet.text}</p>

                      {/* AI Analysis badges */}
                      <div className="flex flex-wrap gap-2">
                        {/* Media status */}
                        <div
                          className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                            tweet.hasImages
                              ? "bg-matrix-green/20 text-matrix-green border border-matrix-green/40"
                              : "bg-white/5 text-white/40 border border-white/10"
                          }`}
                        >
                          {tweet.hasImages ? "📸 MEDIA" : "NO MEDIA"}
                        </div>

                        {/* AI Decision */}
                        <div
                          className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                            tweet.aiDecision === "queue"
                              ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/40"
                              : "bg-white/5 text-white/40 border border-white/10"
                          }`}
                        >
                          {tweet.aiDecision === "queue" ? "✓ QUEUED" : "⊘ SKIPPED"}
                        </div>

                        {/* Confidence Score */}
                        {typeof tweet.aiConfidence === "number" ? (
                          <div
                            className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                              tweet.aiConfidence >= 0.7
                                ? "bg-matrix-green/20 text-matrix-green border border-matrix-green/40"
                                : "bg-warning-amber/20 text-warning-amber border border-warning-amber/40"
                            }`}
                          >
                            SCORE {tweet.aiConfidence.toFixed(2)}
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded text-xs font-mono font-semibold bg-white/5 text-white/40 border border-white/10 animate-pulse">
                            SCORING...
                          </div>
                        )}

                        {/* Quote Status */}
                        {tweet.quoteStatus ? (
                          <div
                            className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                              tweet.quoteStatus === "queued"
                                ? "bg-solana-cyan/20 text-solana-cyan border border-solana-cyan/40"
                                : "bg-alert-red/20 text-alert-red border border-alert-red/40"
                            }`}
                          >
                            QUOTE {tweet.quoteStatus.toUpperCase()}
                          </div>
                        ) : null}
                      </div>

                      {/* AI Token Detection */}
                      {tweet.aiTicker ? (
                        <div className="mt-3 pt-3 border-t border-white/10 text-xs font-mono text-matrix-green">
                          💡 AI detected: {tweet.aiTokenName} ({tweet.aiTicker})
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {tweets.length === 0 ? (
                    <div className="rounded-lg border border-white/5 bg-void-900/20 p-4 text-center text-sm text-white/30 font-mono">
                      No recent tweets
                    </div>
                  ) : null}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
