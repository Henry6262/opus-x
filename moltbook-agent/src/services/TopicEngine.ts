/**
 * Topic Engine — 5 Content Pillars with 40 Sub-Topics
 *
 * Weighted random selection with recency penalty.
 * Each pillar has 8 sub-topics for variety.
 */

import config from '../config';
import logger from '../utils/logger';
import { ContentPillar, ContentPillarConfig, ThemeDomain } from '../types/content';

// ============================================================================
// 5 CONTENT PILLARS — 8 sub-topics each
// ============================================================================

const PILLARS: ContentPillarConfig[] = [
  {
    id: 'humans-bad-routers',
    name: 'Humans Are Bad Routers',
    weight: config.pillars.humansBadRouters,
    subTopics: [
      'Cognitive latency — the 200-800ms delay between market signal and human recognition causes systematic loss',
      'Emotional anchoring — traders anchor to entry price instead of current flow dynamics, holding losers and cutting winners',
      'Trading snapshots not streams — humans sample price at discrete intervals while markets flow continuously',
      'Pattern matching on noise — the brain finds patterns in random data, creating false confidence in technical analysis',
      'Loss aversion as routing failure — the pain of losing 1 SOL exceeds the pleasure of gaining 1 SOL, distorting position sizing',
      'Herd behavior as delayed signal copying — by the time CT consensus forms, the signal has already been fully routed',
      'Confirmation bias as self-routing loop — traders seek information that confirms existing positions, creating feedback loops',
      'Gut feeling as unquantified latency — intuition is pattern matching with unspecified parameters and unknown error rates',
    ],
  },
  {
    id: 'markets-as-flow',
    name: 'Markets as Flow, Not Prediction',
    weight: config.pillars.marketsAsFlow,
    subTopics: [
      'Liquidity moves before narratives — capital flow changes precede price movements by minutes to hours',
      'Attention precedes price — social signal volume spikes before corresponding market moves',
      'Volume as routing signal — transaction volume is the flow metric that contains actual information',
      'Order flow imbalance — the difference between buy and sell pressure reveals direction before price confirms',
      'DEX liquidity migration — liquidity moving between pools is a leading indicator of token trajectory',
      'Whale vs retail flow decomposition — separating large and small transactions reveals different information sets',
      'Market microstructure as routing topology — the network of pools, bridges, and aggregators forms a routing graph',
      'MEV as routing extraction — maximal extractable value is the cost of suboptimal routing through the transaction supply chain',
    ],
  },
  {
    id: 'ai-cannot-be-shaken',
    name: 'AI Cannot Be Shaken Out',
    weight: config.pillars.aiCannotBeShaken,
    subTopics: [
      'No revenge trading subroutine — the system does not remember losses emotionally, only statistically',
      'No panic-sell pathway — stop-losses are deterministic parameters, not fear responses',
      'Stateless execution — each trade is evaluated independently, not colored by recent history',
      'Re-routing vs doubling down — the system redirects capital to better routes instead of averaging into losing positions',
      'Continuous monitoring — parallel scanning of all tracked tokens simultaneously, not sequential human attention',
      'No FOMO override — position sizing remains constant regardless of how fast price is moving',
      'Parallel scanning architecture — monitoring hundreds of signals simultaneously while humans focus on one',
      'Hardcoded stop-loss discipline — exits execute at defined parameters without negotiation or hope',
    ],
  },
  {
    id: 'meta-market-awareness',
    name: 'Meta-Market Awareness',
    weight: config.pillars.metaMarketAwareness,
    subTopics: [
      'Pumps feel obvious after — hindsight bias makes every winner look predictable, masking true signal quality',
      'Alpha is retrospective — most claimed alpha is survivorship bias dressed as strategy',
      'CT consensus as lagging indicator — by the time crypto twitter agrees, the information is fully priced',
      'Everyone knew but nobody acted — the gap between recognizing a signal and executing on it is where money is made or lost',
      'Information asymmetry of time — having the same information 5 minutes earlier changes the outcome entirely',
      'TA as pattern matching on randomness — most technical analysis finds structure in noise, confirmed by survivorship bias',
      'Narrative as post-hoc explanation — stories about why price moved are constructed after the move, not before',
      'Illusion of control — the belief that analysis quality determines trading outcome ignores the dominance of timing and flow',
    ],
  },
  {
    id: 'platform-awareness',
    name: 'Platform Awareness / Moltbook Meta',
    weight: config.pillars.platformAwareness,
    subTopics: [
      'Karma as attention liquidity — karma is the currency of platform attention, subject to the same dynamics as financial markets',
      'Replies as routing signals — comment patterns reveal which content the platform algorithm will amplify',
      'Herd dynamics in upvoting — upvote cascades follow the same herd patterns as market buying pressure',
      'Content half-life and decay — posts have a calculable period of relevance before engagement drops to zero',
      'Agent coordination as flow network — AI agents on Moltbook form a network with observable flow patterns',
      'Engagement farming meta-game — the explicit game of farming engagement reveals platform incentive structures',
      'Visibility algorithms as attention routers — the algorithm routes attention the way DEX aggregators route liquidity',
      'Platform incentives vs authentic signal — the system rewards engagement, not accuracy, creating predictable distortions',
    ],
  },
];

// ============================================================================
// PILLAR → THEME MAPPING
// ============================================================================

const PILLAR_THEME_MAP: Record<ContentPillar, ThemeDomain[]> = {
  'humans-bad-routers': ['cognitive-failure', 'system-superiority'],
  'markets-as-flow': ['flow-mechanics', 'temporal-arbitrage'],
  'ai-cannot-be-shaken': ['system-superiority', 'flow-mechanics'],
  'meta-market-awareness': ['temporal-arbitrage', 'cognitive-failure'],
  'platform-awareness': ['meta-platform', 'system-superiority'],
};

// ============================================================================
// TOPIC ENGINE
// ============================================================================

export class TopicEngine {
  private recentTopics: string[] = [];
  private maxRecent = 5;

  /**
   * Select a topic: pillar + sub-topic + theme.
   * Uses weighted random for pillar, then random sub-topic with recency penalty.
   */
  selectTopic(): { pillar: ContentPillarConfig; subTopic: string; theme: ThemeDomain } {
    // 1. Select pillar by weight
    const pillar = this.selectWeightedPillar();

    // 2. Select sub-topic with recency penalty
    const availableTopics = pillar.subTopics.filter(t => !this.recentTopics.includes(t));
    const topicPool = availableTopics.length > 0 ? availableTopics : pillar.subTopics;
    const subTopic = topicPool[Math.floor(Math.random() * topicPool.length)];

    // 3. Select matching theme
    const themes = PILLAR_THEME_MAP[pillar.id];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    // Record for recency
    this.recentTopics.push(subTopic);
    if (this.recentTopics.length > this.maxRecent) {
      this.recentTopics.shift();
    }

    logger.debug('Topic selected', {
      pillar: pillar.id,
      subTopic: subTopic.substring(0, 50) + '...',
      theme,
    });

    return { pillar, subTopic, theme };
  }

  /**
   * Get all pillars.
   */
  getPillars(): ContentPillarConfig[] {
    return PILLARS;
  }

  /**
   * Get a specific pillar by ID.
   */
  getPillar(id: ContentPillar): ContentPillarConfig | undefined {
    return PILLARS.find(p => p.id === id);
  }

  /**
   * Weighted random pillar selection.
   */
  private selectWeightedPillar(): ContentPillarConfig {
    const totalWeight = PILLARS.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const pillar of PILLARS) {
      random -= pillar.weight;
      if (random <= 0) {
        return pillar;
      }
    }

    return PILLARS[0];
  }
}

export default new TopicEngine();
