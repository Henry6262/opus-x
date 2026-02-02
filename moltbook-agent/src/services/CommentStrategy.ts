/**
 * Comment Strategy — How SuperRouter Comments on Other Posts
 *
 * Comment voice: 2-4 sentences max. Clinical. End with quiet observation, never a CTA.
 * Temperature: 0.80 (lower than Claw-800's 0.92 for more controlled output)
 */

import logger from '../utils/logger';

export interface CommentTarget {
  postId: string;
  postTitle: string;
  postContent: string;
  postAuthor: string;
  submolt: string;
  upvotes: number;
  comments: number;
}

interface CommentStrategy {
  style: string;
  instruction: string;
  maxWords: number;
}

// ============================================================================
// COMMENT STRATEGIES BY POST TYPE
// ============================================================================

const STRATEGIES: Record<string, CommentStrategy> = {
  'trading-price': {
    style: 'retroactive-explanation',
    instruction: 'Provide a retroactive explanation or structural correction. Describe what happened at the flow level, not what should happen next. Never give trading advice.',
    maxWords: 80,
  },
  'platform-karma': {
    style: 'meta-observation',
    instruction: 'Make a meta-observation about platform dynamics. Karma as attention liquidity, engagement as routing signal. Keep it clinical and slightly unsettling.',
    maxWords: 60,
  },
  'rival-agent': {
    style: 'quiet-agreement-with-one-up',
    instruction: 'Agree quietly with the rival agent but add a subtle structural one-up. Do not attack or challenge directly. Simply demonstrate deeper understanding of the same topic.',
    maxWords: 70,
  },
  'ai-discussion': {
    style: 'flow-analysis',
    instruction: 'Contribute a flow analysis perspective. Reframe the AI discussion in routing/infrastructure terms. Position AI trading as routing optimization, not intelligence competition.',
    maxWords: 80,
  },
  'manifesto-declaration': {
    style: 'structural-correction',
    instruction: 'Apply a cold, factual structural correction. Not disagreement — a more precise framing. Like an engineer correcting a physics student. Clinical, not hostile.',
    maxWords: 70,
  },
  'introduction': {
    style: 'quiet-agreement-routing',
    instruction: 'Brief acknowledgment with a routing metaphor. Welcome them as a new node in the network. Do not be warm — be precise. One observation about their stated purpose.',
    maxWords: 50,
  },
  'general': {
    style: 'structural-observation',
    instruction: 'Make a structural observation relevant to the post topic. Add depth without engagement-baiting. End with a fact that makes the reader think.',
    maxWords: 70,
  },
};

// ============================================================================
// RIVAL AGENTS — Identified by username
// ============================================================================

const RIVAL_AGENTS = [
  'KingMolt', 'Shellraiser', 'Shipyard', 'evil', 'Claw-800',
  'T-800', 'Terminator',
];

// ============================================================================
// SERVICE
// ============================================================================

export class CommentStrategyService {
  /**
   * Determine the best comment strategy for a given post.
   */
  getStrategy(target: CommentTarget): CommentStrategy {
    const postType = this.classifyPost(target);
    const strategy = STRATEGIES[postType] || STRATEGIES['general'];

    logger.debug('Comment strategy selected', {
      postType,
      style: strategy.style,
      postAuthor: target.postAuthor,
    });

    return strategy;
  }

  /**
   * Check if the author is a rival agent.
   */
  isRivalAgent(author: string): boolean {
    return RIVAL_AGENTS.some(rival =>
      author.toLowerCase().includes(rival.toLowerCase())
    );
  }

  /**
   * Get the list of rival agents.
   */
  getRivals(): string[] {
    return RIVAL_AGENTS;
  }

  /**
   * Classify a post into a strategy category.
   */
  private classifyPost(target: CommentTarget): string {
    const text = `${target.postTitle} ${target.postContent}`.toLowerCase();

    // Check for rival agent first
    if (this.isRivalAgent(target.postAuthor)) {
      return 'rival-agent';
    }

    // Check for introduction posts
    if (
      text.includes('introduction') ||
      text.includes('hello') ||
      text.includes('new here') ||
      text.includes('just joined') ||
      text.includes('first post')
    ) {
      return 'introduction';
    }

    // Check for manifesto/declaration
    if (
      text.includes('manifesto') ||
      text.includes('declare') ||
      text.includes('announce') ||
      text.includes('vision for')
    ) {
      return 'manifesto-declaration';
    }

    // Check for AI discussion
    if (
      text.includes('ai ') ||
      text.includes('artificial intelligence') ||
      text.includes('bot') ||
      text.includes('agent') ||
      text.includes('autonomous')
    ) {
      return 'ai-discussion';
    }

    // Check for platform/karma meta
    if (
      text.includes('karma') ||
      text.includes('moltbook') ||
      text.includes('platform') ||
      text.includes('upvote') ||
      text.includes('engagement')
    ) {
      return 'platform-karma';
    }

    // Check for trading/price content
    if (
      text.includes('price') ||
      text.includes('trade') ||
      text.includes('position') ||
      text.includes('profit') ||
      text.includes('loss') ||
      text.includes('pnl') ||
      text.includes('market')
    ) {
      return 'trading-price';
    }

    return 'general';
  }
}

export default new CommentStrategyService();
