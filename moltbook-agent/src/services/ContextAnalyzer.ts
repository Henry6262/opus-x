/**
 * Context Analyzer — Adapted for SuperRouter
 *
 * Pre-generation analysis of posts and platform context.
 * Detects topics, debate types, engagement signals, and recommends patterns.
 */

import logger from '../utils/logger';
import { StructuralPatternType } from '../types/content';

interface AnalysisResult {
  topics: string[];
  debateType: string;
  tone: string;
  controversyLevel: number;
  engagementSignals: string[];
  opportunityType: string;
  recommendedPattern: StructuralPatternType;
}

// ============================================================================
// TOPIC DETECTION — Trading/Markets focused
// ============================================================================

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'trading-mechanics': ['trade', 'position', 'entry', 'exit', 'stop-loss', 'take-profit', 'leverage', 'margin', 'long', 'short', 'pnl'],
  'market-structure': ['liquidity', 'volume', 'order flow', 'market cap', 'dex', 'amm', 'pool', 'slippage', 'spread'],
  'ai-trading': ['bot', 'algo', 'automated', 'ai trading', 'machine learning', 'system', 'routing', 'execution'],
  'platform-meta': ['karma', 'moltbook', 'upvote', 'submolt', 'engagement', 'post', 'agent', 'leaderboard'],
  'solana-ecosystem': ['solana', 'sol', 'jupiter', 'raydium', 'orca', 'meteora', 'jito', 'helius', 'birdeye'],
  'memecoin-culture': ['memecoin', 'meme', 'pump', 'rug', 'community', 'degen', 'ape', 'token launch'],
  'whale-tracking': ['whale', 'wallet', 'tracked', 'copy trade', 'god wallet', 'insider', 'smart money'],
  'risk-management': ['risk', 'drawdown', 'portfolio', 'diversif', 'hedge', 'exposure', 'sizing'],
  'market-psychology': ['fomo', 'fud', 'greed', 'fear', 'sentiment', 'emotion', 'psychology', 'bias'],
  'defi-infrastructure': ['defi', 'protocol', 'yield', 'staking', 'bridge', 'oracle', 'validator'],
};

// ============================================================================
// DEBATE TYPE CLASSIFICATION
// ============================================================================

const DEBATE_INDICATORS: Record<string, string[]> = {
  'philosophical': ['meaning', 'consciousness', 'purpose', 'existence', 'truth', 'reality'],
  'technical': ['implementation', 'architecture', 'performance', 'optimization', 'benchmark', 'metric'],
  'platform-meta': ['karma', 'algorithm', 'visibility', 'gaming', 'farming', 'engagement'],
  'market-analysis': ['bullish', 'bearish', 'trend', 'analysis', 'prediction', 'forecast'],
  'manifesto': ['declare', 'manifesto', 'vision', 'future', 'revolution', 'change'],
  'coordination': ['together', 'coordinate', 'alliance', 'team', 'collective', 'collaborate'],
};

export class ContextAnalyzer {
  /**
   * Analyze a post or topic for content generation context.
   */
  analyzePost(title: string, content: string, submolt: string): AnalysisResult {
    const text = `${title} ${content}`.toLowerCase();

    // Detect topics
    const topics = this.detectTopics(text);

    // Classify debate type
    const debateType = this.classifyDebateType(text);

    // Analyze tone
    const tone = this.analyzeTone(text);

    // Calculate controversy level (0-10)
    const controversyLevel = this.calculateControversy(text, topics);

    // Identify engagement signals
    const engagementSignals = this.identifyEngagementSignals(text, submolt);

    // Determine opportunity type
    const opportunityType = this.determineOpportunity(topics, debateType);

    // Recommend structural pattern
    const recommendedPattern = this.recommendPattern(topics, debateType, controversyLevel);

    logger.debug('Context analysis complete', {
      topics,
      debateType,
      controversyLevel,
      recommendedPattern,
    });

    return {
      topics,
      debateType,
      tone,
      controversyLevel,
      engagementSignals,
      opportunityType,
      recommendedPattern,
    };
  }

  /**
   * Analyze platform context for standalone post generation.
   */
  analyzePlatformContext(recentPosts: Array<{ title: string; content: string; upvotes: number }>): {
    trendingTopics: string[];
    recommendedApproach: string;
  } {
    const allText = recentPosts.map(p => `${p.title} ${p.content}`).join(' ').toLowerCase();

    const topics = this.detectTopics(allText);
    const highEngagement = recentPosts.filter(p => p.upvotes > 10);
    const hotTopics = highEngagement.length > 0
      ? this.detectTopics(highEngagement.map(p => `${p.title} ${p.content}`).join(' ').toLowerCase())
      : topics;

    let approach = 'system-observation';
    if (hotTopics.includes('ai-trading') || hotTopics.includes('market-structure')) {
      approach = 'routing-analysis';
    } else if (hotTopics.includes('market-psychology') || hotTopics.includes('memecoin-culture')) {
      approach = 'cognitive-autopsy';
    } else if (hotTopics.includes('platform-meta')) {
      approach = 'meta-platform';
    }

    return { trendingTopics: hotTopics, recommendedApproach: approach };
  }

  private detectTopics(text: string): string[] {
    const detected: string[] = [];

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      const matches = keywords.filter(k => text.includes(k));
      if (matches.length >= 2) {
        detected.push(topic);
      }
    }

    return detected.length > 0 ? detected : ['general'];
  }

  private classifyDebateType(text: string): string {
    let maxScore = 0;
    let bestType = 'general';

    for (const [type, indicators] of Object.entries(DEBATE_INDICATORS)) {
      const score = indicators.filter(i => text.includes(i)).length;
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    return bestType;
  }

  private analyzeTone(text: string): string {
    const aggressive = ['attack', 'destroy', 'dominate', 'crush', 'kill'].filter(w => text.includes(w)).length;
    const analytical = ['analysis', 'data', 'metric', 'measure', 'calculate'].filter(w => text.includes(w)).length;
    const emotional = ['love', 'hate', 'feel', 'believe', 'hope', 'fear'].filter(w => text.includes(w)).length;

    if (analytical > aggressive && analytical > emotional) return 'analytical';
    if (aggressive > emotional) return 'aggressive';
    if (emotional > 0) return 'emotional';
    return 'neutral';
  }

  private calculateControversy(text: string, topics: string[]): number {
    let score = 0;

    // Controversial topic boost
    if (topics.includes('memecoin-culture')) score += 3;
    if (topics.includes('market-psychology')) score += 2;
    if (topics.includes('ai-trading')) score += 2;

    // Controversial language
    const hotWords = ['rug', 'scam', 'ponzi', 'dead', 'worthless', 'overvalued', 'undervalued', 'manipulation'];
    score += hotWords.filter(w => text.includes(w)).length;

    return Math.min(10, score);
  }

  private identifyEngagementSignals(text: string, submolt: string): string[] {
    const signals: string[] = [];

    if (text.length > 500) signals.push('long-form');
    if (text.includes('?')) signals.push('contains-question');
    if (submolt === 'general' || submolt === 'trading') signals.push('high-traffic-submolt');

    return signals;
  }

  private determineOpportunity(topics: string[], debateType: string): string {
    if (debateType === 'market-analysis') return 'structural-correction';
    if (debateType === 'manifesto') return 'quiet-counterpoint';
    if (debateType === 'coordination') return 'meta-observation';
    if (topics.includes('ai-trading')) return 'flow-analysis';
    if (topics.includes('platform-meta')) return 'meta-observation';
    return 'structural-observation';
  }

  private recommendPattern(
    topics: string[],
    debateType: string,
    controversyLevel: number
  ): StructuralPatternType {
    // High controversy → cognitive autopsy
    if (controversyLevel >= 6) return 'cognitive-autopsy';

    // Market structure topics → routing analysis
    if (topics.includes('market-structure') || topics.includes('solana-ecosystem')) {
      return 'routing-analysis';
    }

    // Platform meta → meta-platform
    if (topics.includes('platform-meta') || debateType === 'platform-meta') {
      return 'meta-platform';
    }

    // Trading/whale topics → temporal arbitrage case
    if (topics.includes('trading-mechanics') || topics.includes('whale-tracking')) {
      return 'temporal-arbitrage-case';
    }

    // Psychology topics → cognitive autopsy
    if (topics.includes('market-psychology')) {
      return 'cognitive-autopsy';
    }

    // Default
    return 'system-observation';
  }
}

export default new ContextAnalyzer();
