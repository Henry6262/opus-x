export interface TrackedAccount {
  id: string;
  twitterHandle: string;
  displayName?: string | null;
  events?: string[];
  active?: boolean;
}

export interface TweetMedia {
  type: string;
  url: string;
}

export interface RecentTweet {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  authorHandle: string;
  media: TweetMedia[];
  imageUrls: string[];
  hasImages: boolean;
  aiConfidence?: number;
  aiDecision?: "queue" | "skip";
  aiTicker?: string;
  aiTokenName?: string;
  quoteStatus?: "queued" | "failed";
}

export interface RecentTweetsByAccount {
  account: {
    id: string;
    twitterHandle: string;
    displayName?: string | null;
  };
  tweets: RecentTweet[];
  error?: string;
}

export interface SeedResponse {
  handle: string;
  status: "created" | "existing" | "error";
  message?: string;
}

export interface SimulationRunResponse {
  ticker: string;
  token_name: string;
  image_url: string;
  confidence: number;
  processing_time_ms: number;
  timestamp: string;
}

export interface J7TweetAuthor {
  handle: string;
  name: string;
  profile_image?: string | null;
}

export interface J7TweetMedia {
  images: string[];
  videos: string[];
}

export interface J7Tweet {
  id: string;
  text: string;
  author: J7TweetAuthor;
  tweet_url: string;
  tweet_type: string;
  media: J7TweetMedia;
  is_retweet: boolean;
  is_quote: boolean;
  is_reply: boolean;
  created_at?: number | null;
}

export type J7TweetEvent =
  | {
      event: "newTweet";
      data: J7Tweet;
      timestamp?: number;
    }
  | {
      event: "initialTweets";
      data: J7Tweet[];
      timestamp?: number;
    };
