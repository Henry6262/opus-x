export type TwitterLinkType = "tweet" | "profile" | "community" | "search" | "unknown";
export type LabelStatus = "approved" | "rejected" | "needs_review" | "flagged";
export type SortBy = "detected_at" | "market_cap" | "engagement";
export type SortOrder = "asc" | "desc";

export interface PumpToken {
  mint: string;
  symbol: string;
  name: string;
  uri: string;
  twitter_url: string | null;
  twitter_link_type: TwitterLinkType;
  telegram_url: string | null;
  website_url: string | null;
  image_url: string | null;
  video_url: string | null;
  detected_at: string;
  market_cap: number | null;
  reply_count: number | null;
  repost_count: number | null;
  like_count: number | null;
  quote_count: number | null;
  bookmark_count: number | null;
  impression_count: number | null;
}

export interface PumpTokenTweet {
  id: number;
  mint: string;
  tweet_id: string;
  tweet_text: string;
  tweet_author_username: string;
  tweet_author_name: string;
  tweet_author_avatar_url?: string | null;
  tweet_created_at: string;
  tweet_like_count: number | null;
  tweet_retweet_count: number | null;
  tweet_reply_count: number | null;
  tweet_quote_count: number | null;
  tweet_bookmark_count: number | null;
  tweet_impression_count: number | null;
  has_media: boolean;
  media_urls: string[] | null;
  fetched_at: string;
  created_at: string;
}

export interface TokenLabel {
  id: string;
  mint: string;
  reviewer_id: string;
  status: LabelStatus;
  category: string | null;
  confidence: number | null;
  notes: string | null;
  reason_tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PumpTokenWithTweet extends PumpToken {
  tweet?: PumpTokenTweet | null;
  labels?: TokenLabel[] | null;
}

export interface FetchTokensParams {
  twitterLinkType?: TwitterLinkType | "all";
  labelStatus?: "labeled" | "unlabeled" | "needs_review" | "all";
  search?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface FetchTokensResult {
  tokens: PumpTokenWithTweet[];
  total: number;
  hasMore: boolean;
}

export interface TokenStats {
  total: number;
  labeled: number;
  unlabeled: number;
  byStatus: Record<LabelStatus, number>;
}
