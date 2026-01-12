/**
 * Ponzinomics API Client
 * Connects SuperRouter to the backend services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_PONZINOMICS_API_URL || 'https://ponzinomics-production.up.railway.app';
const PROJECT_ID = process.env.PONZINOMICS_PROJECT_ID || '';
const API_KEY = process.env.PONZINOMICS_API_KEY || '';

interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
    profile_image_url?: string;
  };
  created_at: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

interface TrackedAccount {
  id: string;
  twitterHandle: string;
  displayName: string;
  events: string[];
  tweets?: Tweet[];
  error?: string;
}

class PonzinomicsAPI {
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': PROJECT_ID,
        'Authorization': `Bearer ${API_KEY}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all tracked Twitter accounts
   */
  async getTrackedAccounts(): Promise<TrackedAccount[]> {
    return this.fetch<TrackedAccount[]>('/twitter-tracking');
  }

  /**
   * Get recent tweets from tracked accounts
   */
  async getRecentTweets(limit: number = 10): Promise<TrackedAccount[]> {
    return this.fetch<TrackedAccount[]>(`/twitter-tracking/recent?limit=${limit}`);
  }

  /**
   * Start tracking a new Twitter account
   */
  async trackAccount(twitterHandle: string, events: string[] = ['tweet', 'retweet']): Promise<TrackedAccount> {
    return this.fetch<TrackedAccount>('/twitter-tracking', {
      method: 'POST',
      body: JSON.stringify({ twitterHandle, events }),
    });
  }

  /**
   * Stop tracking an account
   */
  async stopTracking(accountId: string): Promise<void> {
    await this.fetch(`/twitter-tracking/${accountId}`, {
      method: 'DELETE',
    });
  }
}

export const ponzinomicsAPI = new PonzinomicsAPI();
export type { Tweet, TrackedAccount };
