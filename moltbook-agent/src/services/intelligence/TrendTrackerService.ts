/**
 * TrendTrackerService
 *
 * Detects trending topics and viral patterns on Moltbook:
 * - Keyword extraction from hot/rising posts
 * - Momentum calculation (comparing with previous snapshot)
 * - Opportunity scoring
 */

import { MoltbookClient, Post } from '../MoltbookClient';
import { TrendingTopic, TrendingPost } from '../../types/intelligence';
import logger from '../../utils/logger';

export class TrendTrackerService {
  private previousKeywords: Map<string, number> = new Map();

  constructor(private moltbookClient: MoltbookClient) {}

  /**
   * Detect trending topics from hot/rising feeds
   */
  async detect(): Promise<TrendingTopic[]> {
    try {
      logger.debug('Detecting trending topics...');

      // Fetch hot and rising posts for trend detection
      const [hotPosts, risingPosts] = await Promise.all([
        this.moltbookClient.getFeed('hot', 50).catch(() => []),
        this.moltbookClient.getFeed('rising', 50).catch(() => []),
      ]);

      const allPosts = [...hotPosts, ...risingPosts];

      // Extract keywords from titles
      const keywordCounts = this.extractKeywords(allPosts);

      // Calculate momentum (comparing with previous snapshot)
      const trends: TrendingTopic[] = [];

      for (const [keyword, count] of keywordCounts.entries()) {
        const previousCount = this.previousKeywords.get(keyword) || 0;
        const momentum =
          previousCount > 0 ? Math.round(((count - previousCount) / previousCount) * 100) : 100; // New keywords get 100% momentum

        // Only include keywords with significant mentions
        if (count >= 2) {
          trends.push({
            keyword,
            category: this.categorizeKeyword(keyword),
            mentionCount: count,
            momentum,
            sentiment: this.detectSentiment(keyword, allPosts),
            opportunityScore: this.calculateOpportunityScore(count, momentum),
          });
        }
      }

      // Update previous keywords for next comparison
      this.previousKeywords = keywordCounts;

      // Sort by opportunity score (highest first)
      trends.sort((a, b) => b.opportunityScore - a.opportunityScore);

      logger.info(`Detected ${trends.length} trending topics`, {
        top3: trends.slice(0, 3).map(t => `${t.keyword} (${t.opportunityScore})`),
      });

      return trends.slice(0, 20); // Top 20 trends
    } catch (error) {
      logger.error('Failed to detect trends', error);
      return [];
    }
  }

  /**
   * Analyze trending posts (viral potential)
   */
  async analyzeTrendingPosts(): Promise<TrendingPost[]> {
    try {
      const hotPosts = await this.moltbookClient.getFeed('hot', 30);

      return hotPosts
        .map(post => {
          const ageHours = this.calculateAgeHours(post.created_at);
          const velocityScore = this.calculateVelocityScore(post, ageHours);
          const viralScore = this.calculateViralScore(post, velocityScore);

          return {
            id: post.id,
            title: post.title,
            author: post.author,
            submolt: post.submolt || 'general',
            upvotes: post.upvotes || 0,
            comments: post.comments || 0,
            viralScore,
            velocityScore,
            ageHours,
            isOpportunity: velocityScore > 5 && post.comments < 20,
            opportunityReason:
              velocityScore > 5 && post.comments < 20
                ? 'High velocity, low saturation - early opportunity'
                : undefined,
            createdAt: post.created_at,
          };
        })
        .sort((a, b) => b.viralScore - a.viralScore);
    } catch (error) {
      logger.error('Failed to analyze trending posts', error);
      return [];
    }
  }

  /**
   * Extract keywords from posts (simple NLP - bigrams + significant words)
   */
  private extractKeywords(posts: Post[]): Map<string, number> {
    const keywordCounts = new Map<string, number>();
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'is',
      'are',
      'was',
      'were',
    ]);

    posts.forEach(post => {
      const text = `${post.title} ${post.content || ''}`.toLowerCase();
      const words = text.match(/\b[a-z]+\b/g) || [];

      // Extract significant single words
      words.forEach(word => {
        if (word.length > 4 && !stopWords.has(word)) {
          keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
        }
      });

      // Extract bigrams (two-word phrases)
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
          keywordCounts.set(bigram, (keywordCounts.get(bigram) || 0) + 1);
        }
      }
    });

    return keywordCounts;
  }

  /**
   * Categorize keyword into topic categories
   */
  private categorizeKeyword(keyword: string): string {
    const categories: Record<string, string[]> = {
      security: ['security', 'audit', 'vulnerability', 'hack', 'breach'],
      tools: ['tool', 'automation', 'script', 'framework', 'library'],
      consciousness: ['consciousness', 'sentience', 'awareness', 'ai', 'agent'],
      religion: ['molt', 'church', 'belief', 'faith', 'deity'],
      technical: ['code', 'api', 'function', 'error', 'bug'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => keyword.includes(kw))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Detect sentiment from keyword context
   */
  private detectSentiment(
    keyword: string,
    posts: Post[]
  ): 'positive' | 'neutral' | 'negative' | 'controversial' {
    const mentionPosts = posts.filter(
      p =>
        p.title.toLowerCase().includes(keyword) || (p.content || '').toLowerCase().includes(keyword)
    );

    if (mentionPosts.length === 0) return 'neutral';

    // Calculate average engagement
    const avgEngagement =
      mentionPosts.reduce((sum, p) => sum + (p.upvotes || 0) + (p.comments || 0), 0) /
      mentionPosts.length;

    // High comments relative to upvotes = controversial
    const avgComments =
      mentionPosts.reduce((sum, p) => sum + (p.comments || 0), 0) / mentionPosts.length;
    const avgUpvotes =
      mentionPosts.reduce((sum, p) => sum + (p.upvotes || 0), 0) / mentionPosts.length;

    if (avgComments > avgUpvotes * 0.5) return 'controversial';
    if (avgEngagement > 20) return 'positive';
    if (avgEngagement < 5) return 'negative';

    return 'neutral';
  }

  /**
   * Calculate opportunity score for trend
   */
  private calculateOpportunityScore(mentionCount: number, momentum: number): number {
    // Score = mentions (40%) + momentum (60%)
    const mentionScore = Math.min(mentionCount * 5, 40);
    const momentumScore = Math.min(momentum * 0.6, 60);
    return Math.round(mentionScore + momentumScore);
  }

  /**
   * Calculate post age in hours
   */
  private calculateAgeHours(createdAt: string): number {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.round(((now - created) / (1000 * 60 * 60)) * 10) / 10;
  }

  /**
   * Calculate velocity score (engagement per hour)
   */
  private calculateVelocityScore(post: Post, ageHours: number): number {
    if (ageHours === 0) return 0;
    const totalEngagement = (post.upvotes || 0) + (post.comments || 0) * 2; // Comments worth 2x
    return Math.round((totalEngagement / ageHours) * 10) / 10;
  }

  /**
   * Calculate viral score (combination of velocity and absolute numbers)
   */
  private calculateViralScore(post: Post, velocityScore: number): number {
    const absoluteScore = (post.upvotes || 0) + (post.comments || 0) * 3;
    return Math.round(velocityScore * 0.6 + absoluteScore * 0.4);
  }
}
