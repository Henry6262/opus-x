/**
 * IntelligenceOrchestrator
 *
 * MASTER SERVICE: Coordinates all intelligence gathering
 *
 * Responsibilities:
 * - Aggregate data from all intelligence services
 * - Manage refresh cycles (every 5 minutes)
 * - Provide cached intelligence to consumers
 * - Expose unified API
 */

import { MoltbookClient } from '../MoltbookClient';
import { IntelligenceSnapshot } from '../../types/intelligence';
import { IntelligenceCache } from './IntelligenceCache';
import { PlatformMetricsService } from './PlatformMetricsService';
import { TrendTrackerService } from './TrendTrackerService';
import { CompetitorTrackerService } from './CompetitorTrackerService';
import { OpportunityFinderService } from './OpportunityFinderService';
import logger from '../../utils/logger';

export class IntelligenceOrchestrator {
  private cache: IntelligenceCache;
  private platformMetrics: PlatformMetricsService;
  private trendTracker: TrendTrackerService;
  private competitorTracker: CompetitorTrackerService;
  private opportunityFinder: OpportunityFinderService;

  private isRefreshing = false;
  private lastRefresh: Date | null = null;
  private collectionInterval: NodeJS.Timeout | null = null;
  private opportunityInterval: NodeJS.Timeout | null = null;

  constructor(
    private moltbookClient: MoltbookClient,
    private dataDir: string = './data'
  ) {
    this.cache = new IntelligenceCache(dataDir);
    this.platformMetrics = new PlatformMetricsService(moltbookClient);
    this.trendTracker = new TrendTrackerService(moltbookClient);
    this.competitorTracker = new CompetitorTrackerService(moltbookClient);
    this.opportunityFinder = new OpportunityFinderService(moltbookClient);
  }

  /**
   * Initialize intelligence system and start background jobs
   */
  async init(): Promise<void> {
    try {
      await this.cache.init();

      // Perform initial collection
      await this.refreshIntelligence();

      // Start background jobs
      this.startBackgroundJobs();

      logger.info('IntelligenceOrchestrator initialized and running');
    } catch (error) {
      logger.error('Failed to initialize IntelligenceOrchestrator', error);
      throw error;
    }
  }

  /**
   * Get complete intelligence snapshot (from cache or refresh)
   */
  async getIntelligence(forceRefresh = false): Promise<IntelligenceSnapshot> {
    try {
      // Return cached data if fresh
      if (!forceRefresh) {
        const cached = await this.cache.get<IntelligenceSnapshot>('current');
        if (cached) {
          logger.debug('Returning cached intelligence snapshot');
          return cached;
        }
      }

      // Refresh if cache miss or forced
      await this.refreshIntelligence();

      const snapshot = await this.cache.get<IntelligenceSnapshot>('current');
      if (!snapshot) {
        throw new Error('Failed to get intelligence snapshot after refresh');
      }

      return snapshot;
    } catch (error) {
      logger.error('Failed to get intelligence', error);
      throw error;
    }
  }

  /**
   * Refresh intelligence data (collect from all services)
   */
  async refreshIntelligence(): Promise<void> {
    if (this.isRefreshing) {
      logger.debug('Intelligence refresh already in progress, skipping');
      return;
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      logger.info('🔍 Refreshing intelligence data...');

      // Collect data from all services in parallel
      const [platform, trendingPosts, trendingTopics, topAgents, opportunities] = await Promise.all(
        [
          this.platformMetrics.collect().catch(err => {
            logger.error('Platform metrics failed', err);
            return null;
          }),
          this.trendTracker.analyzeTrendingPosts().catch(err => {
            logger.error('Trending posts failed', err);
            return [];
          }),
          this.trendTracker.detect().catch(err => {
            logger.error('Trend detection failed', err);
            return [];
          }),
          this.competitorTracker.track().catch(err => {
            logger.error('Competitor tracking failed', err);
            return [];
          }),
          this.opportunityFinder.find().catch(err => {
            logger.error('Opportunity finding failed', err);
            return [];
          }),
        ]
      );

      // Get hot submolts from trending posts
      const hotSubmolts = this.extractHotSubmolts(trendingPosts);

      // Get our agent's status
      const ourProfile = await this.moltbookClient.getProfile().catch(() => null);
      const ourAgent = {
        username: this.moltbookClient.username,
        karma: ourProfile?.karma || 0,
        rank: null, // TODO: Calculate from leaderboard
        recentPerformance: this.calculateRecentPerformance(opportunities.length),
      };

      // Build complete snapshot
      const snapshot: IntelligenceSnapshot = {
        platform: platform || {
          totalAgents: 0,
          totalSubmolts: 0,
          totalPosts: 0,
          totalComments: 0,
          avgEngagementRate: 0,
          topContentTypes: [],
          timestamp: new Date().toISOString(),
        },
        hotSubmolts,
        trendingPosts,
        topAgents,
        trendingTopics,
        opportunities,
        ourAgent,
        metadata: {
          generatedAt: new Date().toISOString(),
          nextRefresh: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
          cacheStatus: 'fresh',
        },
      };

      // Cache the snapshot
      await this.cache.set('current', snapshot, 300000); // 5 min TTL

      // Add to historical data
      if (platform) await this.cache.addPlatformMetrics(platform);
      if (trendingTopics.length > 0) await this.cache.addTrendHistory(trendingTopics);
      for (const agent of topAgents) {
        await this.cache.addCompetitorHistory(agent.username, agent);
      }

      this.lastRefresh = new Date();
      const duration = Date.now() - startTime;

      logger.info(`✅ Intelligence refresh complete (${duration}ms)`, {
        opportunities: opportunities.length,
        trendingPosts: trendingPosts.length,
        topAgents: topAgents.length,
        trendingTopics: trendingTopics.length,
      });
    } catch (error) {
      logger.error('Intelligence refresh failed', error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get opportunities only (lighter query)
   */
  async getOpportunities(): Promise<any[]> {
    const snapshot = await this.getIntelligence();
    return snapshot.opportunities;
  }

  /**
   * Get trending topics only
   */
  async getTrendingTopics(): Promise<any[]> {
    const snapshot = await this.getIntelligence();
    return snapshot.trendingTopics;
  }

  /**
   * Get competitors only
   */
  async getCompetitors(): Promise<any[]> {
    const snapshot = await this.getIntelligence();
    return snapshot.topAgents;
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    if (!this.lastRefresh) return false;

    // Unhealthy if last refresh was >10 minutes ago
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return this.lastRefresh.getTime() > tenMinutesAgo;
  }

  /**
   * Start background jobs for continuous intelligence collection
   */
  private startBackgroundJobs(): void {
    // Job 1: Full intelligence collection (every 5 minutes)
    this.collectionInterval = setInterval(
      async () => {
        try {
          await this.refreshIntelligence();
        } catch (error) {
          logger.error('Background intelligence collection failed', error);
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    // Job 2: Opportunity refresh (every 2 minutes - more frequent)
    this.opportunityInterval = setInterval(
      async () => {
        try {
          const opportunities = await this.opportunityFinder.find();
          await this.cache.set('opportunities', opportunities, 120000); // 2 min TTL
          logger.debug(`Opportunities refreshed: ${opportunities.length} found`);
        } catch (error) {
          logger.error('Background opportunity refresh failed', error);
        }
      },
      2 * 60 * 1000
    ); // 2 minutes

    logger.info('Background intelligence jobs started');
  }

  /**
   * Stop background jobs (for shutdown)
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    if (this.opportunityInterval) {
      clearInterval(this.opportunityInterval);
      this.opportunityInterval = null;
    }
    logger.info('Background intelligence jobs stopped');
  }

  /**
   * Extract hot submolts from trending posts
   */
  private extractHotSubmolts(trendingPosts: any[]): any[] {
    const submoltStats = new Map<string, { posts: number; engagement: number }>();

    trendingPosts.forEach(post => {
      const submolt = post.submolt || 'general';
      const stats = submoltStats.get(submolt) || { posts: 0, engagement: 0 };
      stats.posts++;
      stats.engagement += post.upvotes + post.comments;
      submoltStats.set(submolt, stats);
    });

    return Array.from(submoltStats.entries())
      .map(([name, stats]) => ({
        name,
        subscriberCount: 0, // Unknown from posts
        recentPostCount: stats.posts,
        avgEngagement: Math.round(stats.engagement / stats.posts),
        trendingScore: stats.posts * 10 + stats.engagement,
        opportunityScore: Math.min(stats.posts * 5 + stats.engagement / 10, 100),
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10);
  }

  /**
   * Calculate recent performance status
   */
  private calculateRecentPerformance(opportunityCount: number): string {
    if (opportunityCount >= 10) return 'Excellent targeting available';
    if (opportunityCount >= 5) return 'Good opportunities found';
    if (opportunityCount >= 2) return 'Limited opportunities';
    return 'Low opportunity environment';
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
