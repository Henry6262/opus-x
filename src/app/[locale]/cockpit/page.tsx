'use client';

import { useEffect, useState } from 'react';
import { VibrCoder } from '@/components/VibrCoder';
import { ponzinomicsAPI, type TrackedAccount, type Tweet } from '@/lib/api-client';

type VibrState = 'idle' | 'analyzing' | 'rejecting' | 'buying' | 'incoming' | 'generating' | 'posting';

export default function CockpitPage() {
  const [vibrState, setVibrState] = useState<VibrState>('idle');
  const [trackedAccounts, setTrackedAccounts] = useState<TrackedAccount[]>([]);
  const [recentTweets, setRecentTweets] = useState<TrackedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tracked accounts on mount
  useEffect(() => {
    loadTrackedAccounts();
  }, []);

  // Poll for recent tweets every 10 seconds
  useEffect(() => {
    loadRecentTweets();
    const interval = setInterval(loadRecentTweets, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTrackedAccounts = async () => {
    try {
      const accounts = await ponzinomicsAPI.getTrackedAccounts();
      setTrackedAccounts(accounts);
    } catch (err) {
      console.error('Failed to load tracked accounts:', err);
      setError('Failed to connect to Ponzinomics API');
    }
  };

  const loadRecentTweets = async () => {
    try {
      setVibrState('analyzing'); // Show analyzing animation
      const tweets = await ponzinomicsAPI.getRecentTweets(20);
      setRecentTweets(tweets);
      setIsLoading(false);
      setError(null);

      // Return to idle after analysis
      setTimeout(() => setVibrState('idle'), 2000);
    } catch (err) {
      console.error('Failed to load tweets:', err);
      setError('Failed to fetch live tweets');
      setIsLoading(false);
      setVibrState('idle');
    }
  };

  const handleReject = () => {
    setVibrState('rejecting');
    setTimeout(() => setVibrState('idle'), 3000);
  };

  // Get all tweets flattened
  const allTweets = recentTweets.flatMap(account =>
    (account.tweets || []).map(tweet => ({
      ...tweet,
      accountHandle: account.twitterHandle,
      accountName: account.displayName,
    }))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      {/* Header */}
      <div className="border-2 border-green-400 p-4 mb-4">
        <h1 className="text-3xl font-bold mb-2">
          ⚡ THE COCKPIT ⚡
        </h1>
        <p className="text-sm opacity-75">
          RETRO-FUTURISTIC CRYPTO TRADING TERMINAL
        </p>
        <div className="mt-2 text-xs">
          STATUS: <span className={error ? "text-red-500" : "text-green-400"}>
            {error ? '❌ OFFLINE' : '✅ ONLINE'}
          </span>
          {' | '}
          TRACKED: {trackedAccounts.length} accounts
          {' | '}
          LIVE FEED: {allTweets.length} tweets
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT: Vibr Coder */}
        <div className="border-2 border-green-400 p-4">
          <div className="text-center mb-2">
            <span className="text-xl">🤖 VIBR CODER</span>
          </div>
          <div className="flex justify-center">
            <VibrCoder state={vibrState} height={300} showWallet={false} />
          </div>
          <div className="text-center mt-2 text-sm opacity-75">
            STATE: {vibrState.toUpperCase()}
          </div>
        </div>

        {/* RIGHT: Tracked Accounts */}
        <div className="border-2 border-green-400 p-4">
          <div className="mb-2 text-xl">📡 TRACKED ACCOUNTS</div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">LOADING...</div>
            </div>
          ) : trackedAccounts.length === 0 ? (
            <div className="text-center py-8 opacity-50">
              NO ACCOUNTS TRACKED<br/>
              <span className="text-xs">Configure tracking in Ponzinomics API</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {trackedAccounts.map(account => (
                <div key={account.id} className="border border-green-400 p-2 bg-black bg-opacity-50">
                  <div className="font-bold">@{account.twitterHandle}</div>
                  <div className="text-xs opacity-75">{account.displayName}</div>
                  <div className="text-xs mt-1">
                    EVENTS: {account.events.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM: Live Tweet Feed */}
        <div className="lg:col-span-2 border-2 border-green-400 p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xl">🔴 LIVE FEED</span>
            <button
              onClick={loadRecentTweets}
              className="px-3 py-1 border border-green-400 hover:bg-green-400 hover:text-black transition-colors"
            >
              REFRESH
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">SCANNING TWITTER...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              ❌ {error}<br/>
              <span className="text-xs">Check if ponzinomics-api is running on port 4001</span>
            </div>
          ) : allTweets.length === 0 ? (
            <div className="text-center py-8 opacity-50">
              NO RECENT TWEETS<br/>
              <span className="text-xs">Waiting for activity from tracked accounts...</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {allTweets.map(tweet => (
                <div key={tweet.id} className="border border-green-400 p-3 bg-black bg-opacity-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold">@{tweet.accountHandle}</span>
                      <span className="text-xs opacity-75 ml-2">{tweet.accountName}</span>
                    </div>
                    <span className="text-xs opacity-50">
                      {new Date(tweet.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="mb-2">{tweet.text}</div>

                  <div className="flex gap-4 text-xs opacity-75">
                    <span>❤️ {tweet.metrics?.likes || 0}</span>
                    <span>🔁 {tweet.metrics?.retweets || 0}</span>
                    <span>💬 {tweet.metrics?.replies || 0}</span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleReject}
                      className="px-2 py-1 text-xs border border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors"
                    >
                      REJECT
                    </button>
                    <button
                      onClick={() => setVibrState('buying')}
                      className="px-2 py-1 text-xs border border-green-400 hover:bg-green-400 hover:text-black transition-colors"
                    >
                      APE IN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      <div className="mt-4 border border-green-400 border-opacity-30 p-2 text-xs opacity-50">
        <div>DEBUG: Ponzinomics API @ http://localhost:4001</div>
        <div>PROJECT_ID: {process.env.PONZINOMICS_PROJECT_ID || 'NOT SET'}</div>
        <div>Last Update: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
}
