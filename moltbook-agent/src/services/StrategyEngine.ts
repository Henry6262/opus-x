/**
 * Strategy Engine — Karma-Tier Strategy for SuperRouter
 *
 * Determines posting strategy based on current karma level.
 */

import config from '../config';
import logger from '../utils/logger';

interface StrategyDecision {
  action: 'post' | 'comment' | 'skip';
  reason: string;
  postingWeight: number;
  commentWeight: number;
}

type KarmaTier = 'low' | 'mid' | 'high';

export class StrategyEngine {
  /**
   * Determine what action to take based on current karma.
   */
  decide(context: {
    currentKarma: number;
    canPost: boolean;
    canComment: boolean;
    recentKarmaDelta: number;
  }): StrategyDecision {
    const tier = this.getKarmaTier(context.currentKarma);
    const strategy = this.getTierStrategy(tier);

    // If rate limited on both, skip
    if (!context.canPost && !context.canComment) {
      return {
        action: 'skip',
        reason: 'Rate limited on both posts and comments',
        postingWeight: 0,
        commentWeight: 0,
      };
    }

    // If can't post but can comment, comment
    if (!context.canPost && context.canComment) {
      return {
        action: 'comment',
        reason: `Post rate limited. Commenting (${tier} tier strategy)`,
        postingWeight: 0,
        commentWeight: 1,
      };
    }

    // If can post but not comment, post
    if (context.canPost && !context.canComment) {
      return {
        action: 'post',
        reason: `Comment rate limited. Posting (${tier} tier strategy)`,
        postingWeight: 1,
        commentWeight: 0,
      };
    }

    // Both available — use strategy weights
    const roll = Math.random();
    const action = roll < strategy.postingWeight ? 'post' : 'comment';

    logger.debug('Strategy decision', {
      tier,
      karma: context.currentKarma,
      action,
      roll: roll.toFixed(2),
      postWeight: strategy.postingWeight,
    });

    return {
      action,
      reason: `${tier} tier: ${action === 'post' ? 'content creation' : 'engagement'} cycle`,
      postingWeight: strategy.postingWeight,
      commentWeight: strategy.commentWeight,
    };
  }

  /**
   * Get karma tier.
   */
  getKarmaTier(karma: number): KarmaTier {
    if (karma < 200) return 'low';
    if (karma < 1000) return 'mid';
    return 'high';
  }

  /**
   * Get strategy weights for a karma tier.
   */
  private getTierStrategy(tier: KarmaTier): {
    postingWeight: number;
    commentWeight: number;
    description: string;
  } {
    switch (tier) {
      case 'low':
        // Low karma: focus on posting to build baseline
        // 70% post, 30% comment
        return {
          postingWeight: 0.7,
          commentWeight: 0.3,
          description: 'Building baseline karma through original content',
        };
      case 'mid':
        // Mid karma: balanced approach
        // 50% post, 50% comment
        return {
          postingWeight: 0.5,
          commentWeight: 0.5,
          description: 'Balanced content creation and engagement',
        };
      case 'high':
        // High karma: more commenting for visibility
        // 40% post, 60% comment
        return {
          postingWeight: 0.4,
          commentWeight: 0.6,
          description: 'Leveraging karma with strategic engagement',
        };
    }
  }
}

export default new StrategyEngine();
