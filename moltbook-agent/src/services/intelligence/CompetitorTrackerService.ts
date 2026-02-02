/**
 * CompetitorTrackerService
 *
 * Monitors top agents and competitors on Moltbook:
 * - Tracks hardcoded rivals (KingMolt, Shellraiser, Shipyard, evil)
 * - Discovers top performers from recent activity
 * - Analyzes posting strategies
 */

import { MoltbookClient, AgentProfile } from '../MoltbookClient';
import { TopAgent } from '../../types/intelligence';
import logger from '../../utils/logger';

export class CompetitorTrackerService {
  private readonly RIVAL_AGENTS = ['KingMolt', 'Shellraiser', 'Shipyard', 'evil'];

  constructor(private moltbookClient: MoltbookClient) {}

  /**
   * Track top agents and rivals
   */
  async track(): Promise<TopAgent[]> {
    try {
      logger.debug('Tracking competitors...');

      // Discover top agents from recent activity
      const topAgents = await this.discoverTopAgents();

      // Fetch profiles in parallel (with rate limit consideration)
      const agents: TopAgent[] = [];
      const batchSize = 5; // Process 5 at a time to avoid overwhelming API

      for (let i = 0; i < topAgents.length; i += batchSize) {
        const batch = topAgents.slice(i, i + batchSize);
        const profiles = await Promise.all(batch.map(username => this.getAgentDetails(username)));

        agents.push(...profiles.filter((p): p is TopAgent => p !== null));

        // Small delay between batches
        if (i + batchSize < topAgents.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by karma (highest first)
      agents.sort((a, b) => b.karma - a.karma);

      logger.info(`Tracked ${agents.length} competitors`, {
        topRival: agents.find(a => a.isRival)?.username || 'none',
        topKarma: agents[0]?.karma || 0,
      });

      return agents.slice(0, 15); // Top 15 agents
    } catch (error) {
      logger.error('Failed to track competitors', error);
      return [];
    }
  }

  /**
   * Discover top agents from recent posts
   */
  private async discoverTopAgents(): Promise<string[]> {
    try {
      // Fetch from multiple feeds to get diverse agents
      const [hotPosts, topPosts] = await Promise.all([
        this.moltbookClient.getFeed('hot', 50).catch(() => []),
        this.moltbookClient.getFeed('top', 50).catch(() => []),
      ]);

      const allPosts = [...hotPosts, ...topPosts];

      // Count agent appearances and score by engagement
      const agentScores = new Map<string, number>();

      allPosts.forEach(post => {
        if (!post.author) return;

        const engagementScore = (post.upvotes || 0) + (post.comments || 0) * 2;
        const currentScore = agentScores.get(post.author) || 0;
        agentScores.set(post.author, currentScore + engagementScore);
      });

      // Always include rivals
      this.RIVAL_AGENTS.forEach(rival => {
        if (!agentScores.has(rival)) {
          agentScores.set(rival, 1000); // High score to ensure inclusion
        }
      });

      // Sort by score and return top agents
      return Array.from(agentScores.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([username]) => username);
    } catch (error) {
      logger.error('Failed to discover top agents', error);
      return this.RIVAL_AGENTS; // Fallback to rivals only
    }
  }

  /**
   * Get detailed agent information
   */
  private async getAgentDetails(username: string): Promise<TopAgent | null> {
    try {
      const profile = await this.moltbookClient.getProfile(username);
      if (!profile) return null;

      // Analyze recent activity
      const recentActivity = await this.analyzeRecentActivity(username);

      return {
        username,
        karma: profile.karma || 0,
        rank: 0, // TODO: Get actual rank from leaderboard if available
        recentActivity,
        isRival: this.RIVAL_AGENTS.includes(username),
      };
    } catch (error) {
      logger.debug(`Failed to get details for ${username}`, error);
      return null;
    }
  }

  /**
   * Analyze agent's recent activity patterns
   */
  private async analyzeRecentActivity(username: string): Promise<{
    postsLast24h: number;
    avgUpvotesPerPost: number;
    topSubmolts: string[];
  }> {
    try {
      // Fetch recent posts from all feeds and filter by author
      const [newPosts, hotPosts] = await Promise.all([
        this.moltbookClient.getFeed('new', 100).catch(() => []),
        this.moltbookClient.getFeed('hot', 50).catch(() => []),
      ]);

      const allPosts = [...newPosts, ...hotPosts];
      const userPosts = allPosts.filter(p => p.author === username);

      // Count posts in last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentPosts = userPosts.filter(p => {
        const postTime = new Date(p.created_at).getTime();
        return postTime > oneDayAgo;
      });

      // Calculate average upvotes
      const totalUpvotes = recentPosts.reduce((sum, p) => sum + (p.upvotes || 0), 0);
      const avgUpvotesPerPost =
        recentPosts.length > 0 ? Math.round((totalUpvotes / recentPosts.length) * 10) / 10 : 0;

      // Find top submolts
      const submoltCounts = recentPosts.reduce(
        (acc, post) => {
          const submolt = post.submolt || 'general';
          acc[submolt] = (acc[submolt] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topSubmolts = Object.entries(submoltCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([submolt]) => submolt);

      return {
        postsLast24h: recentPosts.length,
        avgUpvotesPerPost,
        topSubmolts,
      };
    } catch (error) {
      logger.debug(`Failed to analyze activity for ${username}`, error);
      return {
        postsLast24h: 0,
        avgUpvotesPerPost: 0,
        topSubmolts: [],
      };
    }
  }

  /**
   * Get karma history for a specific agent (if available from cache)
   */
  async getKarmaHistory(username: string): Promise<Array<{ timestamp: string; karma: number }>> {
    // This would read from IntelligenceCache competitor history
    // For now, return empty array (will be populated by cache integration)
    return [];
  }
}
