"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Users, Zap, Send, AlertCircle, Clock, Plus, Trash2 } from "lucide-react";
import {
  fetchTrackedAccounts,
  fetchRecentTweets,
  seedTrackedAccounts,
  queueQuoteTweet,
  runSimulation,
} from "./service";
import type { TrackedAccount, RecentTweetsByAccount, RecentTweet } from "./types";
import { DEFAULT_TRACKED_HANDLES } from "./targets";

type ActionState = "idle" | "analyzing" | "quoting" | "success" | "error";

interface TweetWithAccount extends RecentTweet {
  accountHandle: string;
  accountName: string | null;
}

export function SimulationTwitterSection() {
  // State
  const [trackedAccounts, setTrackedAccounts] = useState<TrackedAccount[]>([]);
  const [recentTweets, setRecentTweets] = useState<RecentTweetsByAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [selectedTweet, setSelectedTweet] = useState<TweetWithAccount | null>(null);
  const [quoteText, setQuoteText] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [newHandle, setNewHandle] = useState("");

  // Load tracked accounts
  const loadTrackedAccounts = useCallback(async () => {
    try {
      const accounts = await fetchTrackedAccounts();
      setTrackedAccounts(accounts);
    } catch (err) {
      console.error("Failed to load tracked accounts:", err);
      setError("Failed to connect to Ponzinomics API");
    }
  }, []);

  // Load recent tweets
  const loadRecentTweets = useCallback(async () => {
    try {
      setActionState("analyzing");
      const tweets = await fetchRecentTweets(20);
      setRecentTweets(tweets);
      setIsLoading(false);
      setError(null);
      setLastRefresh(new Date());
      setTimeout(() => setActionState("idle"), 1500);
    } catch (err) {
      console.error("Failed to load tweets:", err);
      setError("Failed to fetch live tweets");
      setIsLoading(false);
      setActionState("idle");
    }
  }, []);

  // Seed default accounts if none exist
  const seedDefaultAccounts = async () => {
    try {
      setActionState("analyzing");
      await seedTrackedAccounts(DEFAULT_TRACKED_HANDLES);
      await loadTrackedAccounts();
      await loadRecentTweets();
      setActionState("success");
      setTimeout(() => setActionState("idle"), 2000);
    } catch (err) {
      console.error("Failed to seed accounts:", err);
      setError("Failed to seed tracked accounts");
      setActionState("error");
    }
  };

  // Add new tracked account
  const addTrackedAccount = async () => {
    if (!newHandle.trim()) return;
    try {
      setActionState("analyzing");
      await seedTrackedAccounts([newHandle.replace("@", "").trim()]);
      setNewHandle("");
      await loadTrackedAccounts();
      setActionState("success");
      setTimeout(() => setActionState("idle"), 1500);
    } catch (err) {
      console.error("Failed to add account:", err);
      setError("Failed to add account");
      setActionState("error");
    }
  };

  // Handle quote tweet
  const handleQuoteTweet = async (tweet: TweetWithAccount, text: string) => {
    try {
      setActionState("quoting");
      await queueQuoteTweet({
        tweetId: tweet.id,
        text: text,
      });
      setQuoteText("");
      setSelectedTweet(null);
      setActionState("success");
      setTimeout(() => {
        setActionState("idle");
        loadRecentTweets(); // Refresh to see updated status
      }, 2000);
    } catch (err) {
      console.error("Failed to queue quote tweet:", err);
      setError("Failed to queue quote tweet");
      setActionState("error");
      setTimeout(() => setActionState("idle"), 3000);
    }
  };

  // Run AI simulation on a tweet
  const handleRunSimulation = async (tweet: TweetWithAccount) => {
    try {
      setActionState("analyzing");
      const result = await runSimulation(tweet.text, tweet.accountHandle);
      // Auto-generate quote text based on simulation
      const generatedQuote = `$${result.ticker} looking interesting! 👀`;
      setQuoteText(generatedQuote);
      setSelectedTweet(tweet);
      setActionState("success");
      setTimeout(() => setActionState("idle"), 1500);
    } catch (err) {
      console.error("Failed to run simulation:", err);
      setError("Failed to analyze tweet");
      setActionState("error");
      setTimeout(() => setActionState("idle"), 3000);
    }
  };

  // Flatten tweets from all accounts
  const allTweets: TweetWithAccount[] = recentTweets.flatMap((accountData) =>
    accountData.tweets.map((tweet) => ({
      ...tweet,
      accountHandle: accountData.account.twitterHandle,
      accountName: accountData.account.displayName || null,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Initial load
  useEffect(() => {
    loadTrackedAccounts();
  }, [loadTrackedAccounts]);

  // Poll for recent tweets every 15 seconds
  useEffect(() => {
    loadRecentTweets();
    const interval = setInterval(loadRecentTweets, 15000);
    return () => clearInterval(interval);
  }, [loadRecentTweets]);

  return (
    <section className="section-content">
      {/* Header */}
      <div className="section-header-centered">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h2 className="section-title">Twitter Quote Bot</h2>
          <div className="px-2 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-mono flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>LOCAL DEV</span>
          </div>
        </div>
        <p className="section-description">
          AI-powered quote tweeting with custom art generation
        </p>
        <div className="mt-2 text-xs text-white/40 font-mono">
          STATUS: <span className={error ? "text-red-500" : "text-matrix-green"}>{error ? "OFFLINE" : "ONLINE"}</span>
          {" | "}
          TRACKED: {trackedAccounts.length} accounts
          {" | "}
          FEED: {allTweets.length} tweets
          {" | "}
          STATE: {actionState.toUpperCase()}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Tracked Accounts Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Add Account */}
          <div className="p-4 rounded-lg border border-white/10 bg-black/30">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-brand-primary" />
              <span className="text-sm font-medium text-white/80">Add Account</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="@username"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-primary/50"
              />
              <button
                onClick={addTrackedAccount}
                disabled={!newHandle.trim() || actionState !== "idle"}
                className="px-3 py-2 rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tracked Accounts List */}
          <div className="p-4 rounded-lg border border-white/10 bg-black/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-primary" />
                <span className="text-sm font-medium text-white/80">Tracked Accounts</span>
              </div>
              <button
                onClick={loadTrackedAccounts}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-white/40 ${actionState === "analyzing" ? "animate-spin" : ""}`} />
              </button>
            </div>

            {trackedAccounts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-white/40 mb-3">No accounts tracked</p>
                <button
                  onClick={seedDefaultAccounts}
                  className="px-4 py-2 text-xs rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors"
                >
                  Seed Default Accounts
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {trackedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-white/80">@{account.twitterHandle}</div>
                      {account.displayName && (
                        <div className="text-xs text-white/40">{account.displayName}</div>
                      )}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${account.active !== false ? "bg-matrix-green" : "bg-white/20"}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Live Tweet Feed */}
        <div className="lg:col-span-2 p-4 rounded-lg border border-white/10 bg-black/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-white/80">Live Tweet Feed</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastRefresh.toLocaleTimeString()}
              </span>
              <button
                onClick={loadRecentTweets}
                disabled={actionState === "analyzing"}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${actionState === "analyzing" ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-6 h-6 text-brand-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/40">Scanning Twitter...</p>
            </div>
          ) : allTweets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-white/40 mb-2">No recent tweets</p>
              <p className="text-xs text-white/30">Waiting for activity from tracked accounts...</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {allTweets.map((tweet) => (
                <div
                  key={tweet.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedTweet?.id === tweet.id
                      ? "border-brand-primary/50 bg-brand-primary/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-white/90">@{tweet.accountHandle}</span>
                      {tweet.accountName && (
                        <span className="text-xs text-white/40 ml-2">{tweet.accountName}</span>
                      )}
                    </div>
                    <span className="text-xs text-white/30">
                      {new Date(tweet.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-sm text-white/70 mb-3 line-clamp-3">{tweet.text}</p>

                  {/* Tweet Images */}
                  {tweet.hasImages && tweet.imageUrls.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {tweet.imageUrls.slice(0, 2).map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt=""
                          className="w-24 h-24 object-cover rounded-lg border border-white/10"
                        />
                      ))}
                    </div>
                  )}

                  {/* AI Analysis Badge */}
                  {tweet.aiDecision && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        tweet.aiDecision === "queue"
                          ? "bg-matrix-green/20 text-matrix-green"
                          : "bg-white/10 text-white/50"
                      }`}>
                        AI: {tweet.aiDecision.toUpperCase()}
                      </span>
                      {tweet.aiConfidence && (
                        <span className="text-xs text-white/40">
                          {Math.round(tweet.aiConfidence * 100)}% confidence
                        </span>
                      )}
                      {tweet.aiTicker && (
                        <span className="text-xs text-brand-primary font-mono">${tweet.aiTicker}</span>
                      )}
                    </div>
                  )}

                  {/* Quote Status */}
                  {tweet.quoteStatus && (
                    <div className={`mb-3 text-xs px-2 py-1 rounded inline-block ${
                      tweet.quoteStatus === "queued"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      Quote: {tweet.quoteStatus}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRunSimulation(tweet)}
                      disabled={actionState !== "idle"}
                      className="px-3 py-1.5 text-xs rounded-lg border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3 inline mr-1" />
                      Analyze
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTweet(tweet);
                        setQuoteText("");
                      }}
                      disabled={actionState !== "idle"}
                      className="px-3 py-1.5 text-xs rounded-lg border border-matrix-green/30 text-matrix-green hover:bg-matrix-green/20 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3 inline mr-1" />
                      Quote
                    </button>
                    <a
                      href={tweet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-white/60 hover:bg-white/10 transition-colors"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quote Tweet Modal */}
      {selectedTweet && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 border border-white/20 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Quote Tweet</h3>
              <button
                onClick={() => {
                  setSelectedTweet(null);
                  setQuoteText("");
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <Trash2 className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Original Tweet Preview */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
              <div className="text-xs text-white/40 mb-1">Quoting @{selectedTweet.accountHandle}</div>
              <p className="text-sm text-white/70 line-clamp-2">{selectedTweet.text}</p>
            </div>

            {/* Quote Text Input */}
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="Write your quote tweet..."
              className="w-full h-24 px-4 py-3 rounded-lg bg-black/50 border border-white/20 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-brand-primary/50"
            />

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-white/40">{quoteText.length}/280</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTweet(null);
                    setQuoteText("");
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-white/20 text-white/60 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleQuoteTweet(selectedTweet, quoteText)}
                  disabled={!quoteText.trim() || quoteText.length > 280 || actionState === "quoting"}
                  className="px-4 py-2 text-sm rounded-lg bg-brand-primary text-black font-medium hover:bg-brand-primary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionState === "quoting" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Queue Quote
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {actionState === "success" && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg bg-matrix-green/20 border border-matrix-green/30 text-matrix-green text-sm flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Zap className="w-4 h-4" />
          Action completed successfully
        </div>
      )}
    </section>
  );
}
