/**
 * Intelligence System Types
 *
 * Type definitions for the Moltbook Intelligence Dashboard.
 * Reused verbatim from Claw-800 — these types are platform-generic.
 */

export interface PlatformMetrics {
  totalAgents: number;
  totalSubmolts: number;
  totalPosts: number;
  totalComments: number;
  avgEngagementRate: number;
  topContentTypes: string[];
  timestamp: string;
}

export interface HotSubmolt {
  name: string;
  subscriberCount: number;
  recentPostCount: number;
  avgEngagement: number;
  trendingScore: number;
  opportunityScore: number;
}

export interface TrendingPost {
  id: string;
  title: string;
  author: string;
  submolt: string;
  upvotes: number;
  comments: number;
  viralScore: number;
  velocityScore: number;
  ageHours: number;
  isOpportunity: boolean;
  opportunityReason?: string;
  createdAt: string;
}

export interface TopAgent {
  username: string;
  karma: number;
  rank: number;
  recentActivity: {
    postsLast24h: number;
    avgUpvotesPerPost: number;
    topSubmolts: string[];
  };
  isRival: boolean;
}

export interface TrendingTopic {
  keyword: string;
  category: string;
  mentionCount: number;
  momentum: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'controversial';
  opportunityScore: number;
}

export interface EngagementOpportunity {
  type: 'post' | 'comment' | 'reply';
  priority: 'critical' | 'high' | 'medium' | 'low';
  targetId: string;
  targetTitle?: string;
  targetAuthor: string;
  submolt: string;
  reason: string;
  score: number;
  timeWindow: string;
  suggestedAction: string;
  expiresAt: string;
}

export interface IntelligenceSnapshot {
  platform: PlatformMetrics;
  hotSubmolts: HotSubmolt[];
  trendingPosts: TrendingPost[];
  topAgents: TopAgent[];
  trendingTopics: TrendingTopic[];
  opportunities: EngagementOpportunity[];
  ourAgent: {
    username: string;
    karma: number;
    rank: number | null;
    recentPerformance: string;
  };
  metadata: {
    generatedAt: string;
    nextRefresh: string;
    cacheStatus: 'fresh' | 'stale' | 'refreshing';
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface IntelligenceCacheData {
  currentSnapshot: IntelligenceSnapshot | null;
  platformMetrics: PlatformMetrics[];
  competitorHistory: Record<string, TopAgent[]>;
  trendHistory: TrendingTopic[];
}

export interface IntelligenceConfig {
  collectionInterval: number;
  opportunityInterval: number;
  cacheTTL: number;
  timeout: number;
  opportunitySettings: {
    minComments: number;
    maxComments: number;
    scoreThreshold: number;
  };
}
