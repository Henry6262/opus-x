/**
 * PlatformMetricsService
 *
 * Collects platform-wide statistics for Moltbook:
 * - Total agents, posts, comments
 * - Engagement rates
 * - Popular content types
 */

import { MoltbookClient } from '../MoltbookClient';
import { PlatformMetrics } from '../../types/intelligence';
import logger from '../../utils/logger';

export class PlatformMetricsService {
  constructor(private moltbookClient: MoltbookClient) {}

  /**
   * Collect comprehensive platform metrics
   */
  async collect(): Promise<PlatformMetrics> {
    try {
      logger.debug('Collecting platform metrics...');

      // Fetch data in parallel for speed
      const [newPosts, hotPosts, submolts] = await Promise.all([
        this.moltbookClient.getFeed('new', 100).catch(() => []),
        this.moltbookClient.getFeed('hot', 50).catch(() => []),
        this.moltbookClient.listSubmolts().catch(() => []),
      ]);

      // Calculate metrics from recent posts
      const totalPosts = newPosts.length;
      const totalComments = newPosts.reduce((sum, post) => sum + (post.comments || 0), 0);
      const totalUpvotes = newPosts.reduce((sum, post) => sum + (post.upvotes || 0), 0);

      // Calculate average engagement rate (upvotes + comments per post)
      const avgEngagementRate =
        totalPosts > 0 ? Math.round(((totalUpvotes + totalComments) / totalPosts) * 10) / 10 : 0;

      // Extract unique agents from posts
      const uniqueAgents = new Set(newPosts.map(p => p.author).filter(Boolean));
      const totalAgents = uniqueAgents.size;

      // Identify top content types (most common submolts)
      const submoltCounts = newPosts.reduce(
        (acc, post) => {
          const submolt = post.submolt || 'general';
          acc[submolt] = (acc[submolt] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topContentTypes = Object.entries(submoltCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([submolt]) => submolt);

      const metrics: PlatformMetrics = {
        totalAgents,
        totalSubmolts: submolts.length,
        totalPosts,
        totalComments,
        avgEngagementRate,
        topContentTypes,
        timestamp: new Date().toISOString(),
      };

      logger.info('Platform metrics collected', {
        agents: totalAgents,
        posts: totalPosts,
        comments: totalComments,
        avgEngagement: avgEngagementRate,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect platform metrics', error);
      // Return empty metrics on failure
      return {
        totalAgents: 0,
        totalSubmolts: 0,
        totalPosts: 0,
        totalComments: 0,
        avgEngagementRate: 0,
        topContentTypes: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get quick stats (lighter version for frequent polling)
   */
  async getQuickStats(): Promise<{ posts: number; engagement: number }> {
    try {
      const posts = await this.moltbookClient.getFeed('new', 25);
      const totalEngagement = posts.reduce(
        (sum, p) => sum + (p.upvotes || 0) + (p.comments || 0),
        0
      );
      const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;

      return {
        posts: posts.length,
        engagement: Math.round(avgEngagement * 10) / 10,
      };
    } catch (error) {
      logger.error('Failed to get quick stats', error);
      return { posts: 0, engagement: 0 };
    }
  }
}
