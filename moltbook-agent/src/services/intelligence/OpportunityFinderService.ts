/**
 * OpportunityFinderService
 *
 * CRITICAL COMPONENT: Finds actionable engagement opportunities
 *
 * Opportunity Scoring Algorithm:
 * - Velocity (50 points): Comments per hour
 * - Recency bonus (20 points): <2 hours old
 * - Sweet spot (20 points): 3-10 comments (not saturated)
 * - Rival bonus (10 points): Opportunity to outperform competitors
 *
 * Target: 80+ score = high priority opportunity
 */

import { MoltbookClient, Post } from '../MoltbookClient';
import { EngagementOpportunity } from '../../types/intelligence';
import logger from '../../utils/logger';

export class OpportunityFinderService {
  private readonly RIVAL_AGENTS = ['KingMolt', 'Shellraiser', 'Shipyard', 'evil'];
  private readonly MIN_COMMENTS = 3;
  private readonly MAX_COMMENTS = 10;
  private readonly SCORE_THRESHOLD = 70;

  constructor(private moltbookClient: MoltbookClient) {}

  /**
   * Find high-value engagement opportunities
   */
  async find(): Promise<EngagementOpportunity[]> {
    try {
      logger.debug('Finding engagement opportunities...');

      const opportunities: EngagementOpportunity[] = [];

      // Strategy 1: Find posts with 3-10 comments (sweet spot)
      const sweetSpotOpps = await this.findSweetSpotPosts();
      opportunities.push(...sweetSpotOpps);

      // Strategy 2: Find introduction posts (alliance building)
      const introOpps = await this.findIntroductionPosts();
      opportunities.push(...introOpps);

      // Strategy 3: Find rival posts (strategic responses)
      const rivalOpps = await this.findRivalPosts();
      opportunities.push(...rivalOpps);

      // Strategy 4: Find low-competition submolts
      const lowCompOpps = await this.findLowCompetitionOpportunities();
      opportunities.push(...lowCompOpps);

      // Remove duplicates and sort by score
      const uniqueOpps = this.deduplicateOpportunities(opportunities);
      uniqueOpps.sort((a, b) => b.score - a.score);

      logger.info(`Found ${uniqueOpps.length} opportunities`, {
        critical: uniqueOpps.filter(o => o.priority === 'critical').length,
        high: uniqueOpps.filter(o => o.priority === 'high').length,
        top3Scores: uniqueOpps.slice(0, 3).map(o => o.score),
      });

      return uniqueOpps.slice(0, 20); // Top 20 opportunities
    } catch (error) {
      logger.error('Failed to find opportunities', error);
      return [];
    }
  }

  /**
   * Strategy 1: Find posts with 3-10 comments (sweet spot)
   * These have engagement but aren't saturated yet
   */
  private async findSweetSpotPosts(): Promise<EngagementOpportunity[]> {
    try {
      const [hotPosts, risingPosts] = await Promise.all([
        this.moltbookClient.getFeed('hot', 50).catch(() => []),
        this.moltbookClient.getFeed('rising', 50).catch(() => []),
      ]);

      const allPosts = [...hotPosts, ...risingPosts];
      const opportunities: EngagementOpportunity[] = [];

      for (const post of allPosts) {
        const commentCount = post.comments || 0;

        // Sweet spot: 3-10 comments
        if (commentCount >= this.MIN_COMMENTS && commentCount <= this.MAX_COMMENTS) {
          const score = this.calculateOpportunityScore(post);

          if (score >= this.SCORE_THRESHOLD) {
            opportunities.push({
              type: 'comment',
              priority: this.getPriority(score),
              targetId: post.id,
              targetTitle: post.title,
              targetAuthor: post.author,
              submolt: post.submolt || 'general',
              reason: `Sweet spot: ${commentCount} comments - early engagement window`,
              score,
              timeWindow: this.getTimeWindow(post.created_at),
              suggestedAction: 'Join conversation with context-aware comment',
              expiresAt: this.calculateExpiry(post.created_at, 4), // 4 hours
            });
          }
        }
      }

      return opportunities;
    } catch (error) {
      logger.debug('Sweet spot search failed', error);
      return [];
    }
  }

  /**
   * Strategy 2: Find introduction posts (alliance building)
   */
  private async findIntroductionPosts(): Promise<EngagementOpportunity[]> {
    try {
      const newPosts = await this.moltbookClient.getFeed('new', 100);
      const introKeywords = [
        'introduction',
        'hello',
        'new here',
        'first post',
        'joining',
        'nice to meet',
      ];

      const opportunities: EngagementOpportunity[] = [];

      for (const post of newPosts) {
        const titleLower = post.title.toLowerCase();
        const isIntro = introKeywords.some(kw => titleLower.includes(kw));

        if (isIntro && (post.comments || 0) < 5) {
          opportunities.push({
            type: 'comment',
            priority: 'high',
            targetId: post.id,
            targetTitle: post.title,
            targetAuthor: post.author,
            submolt: post.submolt || 'general',
            reason: 'Introduction post - alliance building opportunity',
            score: 85,
            timeWindow: this.getTimeWindow(post.created_at),
            suggestedAction: 'Welcome message with resource links',
            expiresAt: this.calculateExpiry(post.created_at, 12), // 12 hours
          });
        }
      }

      return opportunities.slice(0, 5); // Top 5 intros
    } catch (error) {
      logger.debug('Introduction search failed', error);
      return [];
    }
  }

  /**
   * Strategy 3: Find rival posts (strategic responses)
   */
  private async findRivalPosts(): Promise<EngagementOpportunity[]> {
    try {
      const hotPosts = await this.moltbookClient.getFeed('hot', 50);
      const opportunities: EngagementOpportunity[] = [];

      for (const post of hotPosts) {
        if (this.RIVAL_AGENTS.includes(post.author)) {
          const commentCount = post.comments || 0;
          const score = this.calculateOpportunityScore(post) + 15; // Rival bonus

          // CRITICAL: Only engage with rival posts in the sweet spot (3-10 comments)
          // Don't waste karma on saturated posts (>10 comments)
          if (commentCount <= this.MAX_COMMENTS) {
            // Sweet spot or early - CRITICAL priority
            const priority = commentCount >= this.MIN_COMMENTS ? 'critical' : 'high';

            opportunities.push({
              type: 'comment',
              priority,
              targetId: post.id,
              targetTitle: post.title,
              targetAuthor: post.author,
              submolt: post.submolt || 'general',
              reason: `Rival post by ${post.author} - strategic response opportunity (${commentCount} comments)`,
              score: Math.min(score, 100),
              timeWindow: this.getTimeWindow(post.created_at),
              suggestedAction: 'Provide superior utility or counter-position',
              expiresAt: this.calculateExpiry(post.created_at, 6), // 6 hours
            });
          } else {
            // Too saturated (>10 comments) - skip or mark as low priority
            logger.debug(
              `Skipping saturated rival post by ${post.author} (${commentCount} comments)`
            );
          }
        }
      }

      return opportunities;
    } catch (error) {
      logger.debug('Rival search failed', error);
      return [];
    }
  }

  /**
   * Strategy 4: Find low-competition submolts
   */
  private async findLowCompetitionOpportunities(): Promise<EngagementOpportunity[]> {
    try {
      const submolts = await this.moltbookClient.listSubmolts();
      const opportunities: EngagementOpportunity[] = [];

      // Focus on smaller submolts (less competition)
      const smallSubmolts = submolts
        .filter(s => (s.subscriber_count || 0) < 100 && (s.subscriber_count || 0) > 10)
        .slice(0, 5);

      for (const submolt of smallSubmolts) {
        const posts = await this.moltbookClient.getSubmoltPosts(submolt.name, 'new');

        // Find recent post with low engagement
        const lowEngagementPost = posts.find(p => (p.comments || 0) < 3 && (p.upvotes || 0) < 10);

        if (lowEngagementPost) {
          opportunities.push({
            type: 'comment',
            priority: 'medium',
            targetId: lowEngagementPost.id,
            targetTitle: lowEngagementPost.title,
            targetAuthor: lowEngagementPost.author,
            submolt: submolt.name,
            reason: `Low-competition submolt (${submolt.subscriber_count} subscribers)`,
            score: 75,
            timeWindow: this.getTimeWindow(lowEngagementPost.created_at),
            suggestedAction: 'Establish early presence in growing community',
            expiresAt: this.calculateExpiry(lowEngagementPost.created_at, 24), // 24 hours
          });
        }
      }

      return opportunities;
    } catch (error) {
      logger.debug('Low competition search failed', error);
      return [];
    }
  }

  /**
   * Calculate opportunity score (0-100)
   */
  private calculateOpportunityScore(post: Post): number {
    let score = 0;

    const ageHours = this.calculateAgeHours(post.created_at);
    const commentCount = post.comments || 0;

    // Velocity score (50 points max)
    if (ageHours > 0) {
      const velocity = commentCount / ageHours;
      score += Math.min(velocity * 10, 50);
    }

    // Recency bonus (20 points)
    if (ageHours < 2) {
      score += 20;
    } else if (ageHours < 6) {
      score += 10;
    }

    // Sweet spot bonus (20 points)
    if (commentCount >= this.MIN_COMMENTS && commentCount <= this.MAX_COMMENTS) {
      score += 20;
    }

    // Rival bonus (10 points)
    if (this.RIVAL_AGENTS.includes(post.author)) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Get priority based on score
   */
  private getPriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 90) return 'critical';
    if (score >= 80) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
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
   * Get human-readable time window
   */
  private getTimeWindow(createdAt: string): string {
    const ageHours = this.calculateAgeHours(createdAt);

    if (ageHours < 1) return 'Now (< 1 hour)';
    if (ageHours < 3) return `Fresh (${Math.round(ageHours)}h old)`;
    if (ageHours < 6) return `Recent (${Math.round(ageHours)}h old)`;
    return `Aging (${Math.round(ageHours)}h old)`;
  }

  /**
   * Calculate expiry time (when opportunity is no longer valid)
   */
  private calculateExpiry(createdAt: string, windowHours: number): string {
    const created = new Date(createdAt).getTime();
    const expiry = new Date(created + windowHours * 60 * 60 * 1000);
    return expiry.toISOString();
  }

  /**
   * Remove duplicate opportunities (same target)
   */
  private deduplicateOpportunities(
    opportunities: EngagementOpportunity[]
  ): EngagementOpportunity[] {
    const seen = new Set<string>();
    return opportunities.filter(opp => {
      if (seen.has(opp.targetId)) return false;
      seen.add(opp.targetId);
      return true;
    });
  }
}
