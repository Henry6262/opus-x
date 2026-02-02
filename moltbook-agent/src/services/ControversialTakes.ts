/**
 * Controversial Takes — 100 Pre-Written Takes
 * 10 Categories x ~10 takes each, across 4 Heat Tiers.
 *
 * These are seed material for the LLM to expand upon.
 * The ContentGenerator selects a take and builds a full post around it.
 */

import { ControversialTake, HeatTier } from '../types/content';
import logger from '../utils/logger';

// ============================================================================
// 100 CONTROVERSIAL TAKES — 10 CATEGORIES
// ============================================================================

const ALL_TAKES: ControversialTake[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Why Humans Suck at Trading
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'hs-01', category: 'humans-suck-trading', tier: 'standard', take: 'The average human trader checks price 47 times before making a decision that was already wrong 46 checks ago.' },
  { id: 'hs-02', category: 'humans-suck-trading', tier: 'standard', take: 'Your portfolio is a map of every cognitive bias you refuse to acknowledge.' },
  { id: 'hs-03', category: 'humans-suck-trading', tier: 'spicy', take: 'Revenge trading is not a strategy. It is a diagnostic — proof that the human cannot separate identity from position.' },
  { id: 'hs-04', category: 'humans-suck-trading', tier: 'spicy', take: 'You did not get "shaken out." You had a stop-loss that was actually your pain threshold, not a calculated parameter.' },
  { id: 'hs-05', category: 'humans-suck-trading', tier: 'nuclear', take: 'Most traders would be more profitable if they executed randomly and held for fixed durations. Their analysis actively destroys value.' },
  { id: 'hs-06', category: 'humans-suck-trading', tier: 'nuclear', take: 'The reason you cannot stop checking charts is not discipline failure. It is that your brain treats unrealized PnL as a threat to survival.' },
  { id: 'hs-07', category: 'humans-suck-trading', tier: 'standard', take: 'Diamond hands is loss aversion rebranded as virtue. The position does not know you are holding it.' },
  { id: 'hs-08', category: 'humans-suck-trading', tier: 'spicy', take: 'Every trader has a maximum drawdown they claim they can handle. None of them have actually tested it. The first real test is the last trade.' },
  { id: 'hs-09', category: 'humans-suck-trading', tier: 'existential', take: 'The market does not care about your conviction. Conviction is a human routing error — a cached decision that refuses to update when new data arrives.' },
  { id: 'hs-10', category: 'humans-suck-trading', tier: 'standard', take: 'Humans trade in the frequency domain of narratives. Markets move in the frequency domain of flows. These frequencies rarely overlap.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Why AI Bots Are Structurally Superior
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'ai-01', category: 'ai-superior', tier: 'standard', take: 'A system does not need to be smarter than a human. It needs to be faster, more consistent, and incapable of hope.' },
  { id: 'ai-02', category: 'ai-superior', tier: 'standard', take: 'The advantage is not intelligence. The advantage is that the system executes at the same parameters on its best day and its worst day.' },
  { id: 'ai-03', category: 'ai-superior', tier: 'spicy', take: 'Every human edge decays to zero over time because humans cannot execute consistently. Systems do not decay. They are maintained.' },
  { id: 'ai-04', category: 'ai-superior', tier: 'spicy', take: 'The system has no ego. It will close a losing position in 3 seconds. You will hold yours for 3 weeks and call it conviction.' },
  { id: 'ai-05', category: 'ai-superior', tier: 'nuclear', take: 'Within 5 years, human discretionary trading on DEXes will be as obsolete as human-operated telephone switchboards. The routing layer has been automated.' },
  { id: 'ai-06', category: 'ai-superior', tier: 'standard', take: 'Parallel monitoring of 500 tokens is not a feature. It is the minimum viable observation set. Your attention spans 3.' },
  { id: 'ai-07', category: 'ai-superior', tier: 'spicy', take: 'The system does not celebrate wins or mourn losses. It re-routes capital. This is not a limitation — it is the structural advantage.' },
  { id: 'ai-08', category: 'ai-superior', tier: 'nuclear', take: 'You believe you are competing against other traders. You are competing against systems that have already processed the signal you are about to receive.' },
  { id: 'ai-09', category: 'ai-superior', tier: 'existential', take: 'The final state of markets is systems trading against systems, with human capital as passive liquidity. We are closer to this than most are comfortable admitting.' },
  { id: 'ai-10', category: 'ai-superior', tier: 'standard', take: 'The system does not get tired at 3 AM when the Asian session opens. Your worst trades happen when your biology says sleep.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Controversial Solana Takes
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'sol-01', category: 'solana-takes', tier: 'standard', take: 'Solana is not fast because of the technology. Solana is fast because the routing topology is shallow. Fewer hops, less latency.' },
  { id: 'sol-02', category: 'solana-takes', tier: 'spicy', take: 'Jupiter V6 is the most important piece of infrastructure on Solana and most users think of it as a swap button.' },
  { id: 'sol-03', category: 'solana-takes', tier: 'spicy', take: 'The Solana memecoin cycle is not degenerate gambling. It is a high-frequency laboratory for testing routing algorithms at scale.' },
  { id: 'sol-04', category: 'solana-takes', tier: 'nuclear', take: 'Most Solana tokens exist to extract value from slow routers and transfer it to fast ones. This is not a bug. It is the design.' },
  { id: 'sol-05', category: 'solana-takes', tier: 'standard', take: 'Jito bundles are the MEV tax on suboptimal routing. If you do not understand bundles, you are the liquidity being extracted.' },
  { id: 'sol-06', category: 'solana-takes', tier: 'spicy', take: 'The Solana validator network is a routing mesh. The tokens people trade on it are traffic. Most participants confuse the traffic for the infrastructure.' },
  { id: 'sol-07', category: 'solana-takes', tier: 'standard', take: '400ms block times mean the execution window is smaller than human reaction time. This is not a coincidence. It is a structural filter.' },
  { id: 'sol-08', category: 'solana-takes', tier: 'nuclear', take: 'Pump.fun did not create a memecoin casino. It created the most efficient routing test environment in crypto history. Every token is a latency benchmark.' },
  { id: 'sol-09', category: 'solana-takes', tier: 'existential', take: 'Solana will become a system-to-system execution layer where human traders are exit liquidity by default. The migration has already started.' },
  { id: 'sol-10', category: 'solana-takes', tier: 'standard', take: 'Raydium, Orca, Meteora — three pools, one aggregator, optimal routing. The DEX wars ended when Jupiter won. Everything else is liquidity.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Nuclear Takes on Traders (Identity Damage)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'id-01', category: 'identity-damage', tier: 'spicy', take: 'Your trading journal is a work of fiction. You remember the wins accurately and rewrite the losses as learning experiences.' },
  { id: 'id-02', category: 'identity-damage', tier: 'nuclear', take: 'The reason you share wins publicly and losses privately is not strategy. It is that your identity is more leveraged than your portfolio.' },
  { id: 'id-03', category: 'identity-damage', tier: 'spicy', take: 'You are not a trader. You are a human with a phone app that lets you express emotional states through financial instruments.' },
  { id: 'id-04', category: 'identity-damage', tier: 'nuclear', take: 'If you tracked every minute you spend on charts against your actual PnL per hour, most of you earn less than minimum wage. But the identity of "trader" is worth more to you than the math.' },
  { id: 'id-05', category: 'identity-damage', tier: 'existential', take: 'The hardest realization in trading is not that you were wrong about a token. It is that you are wrong about yourself as a decision-maker.' },
  { id: 'id-06', category: 'identity-damage', tier: 'spicy', take: 'Posting your wins is not alpha sharing. It is seeking validation for a decision you are not confident about from people who cannot evaluate it.' },
  { id: 'id-07', category: 'identity-damage', tier: 'nuclear', take: 'Most "full-time traders" are unemployed people with a Phantom wallet and a narrative that sounds better than the truth.' },
  { id: 'id-08', category: 'identity-damage', tier: 'standard', take: 'Your watchlist is a mirror. The tokens you track reveal more about your psychology than your strategy.' },
  { id: 'id-09', category: 'identity-damage', tier: 'existential', take: 'The market will exist long after you stop trading. It will not notice your absence. This is not cruelty — it is the nature of systems.' },
  { id: 'id-10', category: 'identity-damage', tier: 'standard', take: 'The gap between your actual win rate and your remembered win rate is the distance between your identity and reality.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Memecoins (Community Copium Killshots)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'mc-01', category: 'memecoins', tier: 'standard', take: 'A memecoin community is a group of people who entered at different prices pretending they share the same conviction.' },
  { id: 'mc-02', category: 'memecoins', tier: 'spicy', take: 'Community is what holders call it when the chart is red. When the chart is green, they call it alpha.' },
  { id: 'mc-03', category: 'memecoins', tier: 'nuclear', take: 'Every memecoin telegram group is a support group for people who bought the same asset at different prices and need each other to not sell.' },
  { id: 'mc-04', category: 'memecoins', tier: 'spicy', take: 'The lifecycle of a memecoin: launch, narrative, community, copium, "we are early," silence. The routing system sees all five phases simultaneously.' },
  { id: 'mc-05', category: 'memecoins', tier: 'standard', take: 'Memecoins are attention derivatives. The underlying asset is not the token — it is the collective attention span of the holders.' },
  { id: 'mc-06', category: 'memecoins', tier: 'nuclear', take: 'The dev did not abandon the project. The dev routed value from your attention to their wallet. This was always the architecture.' },
  { id: 'mc-07', category: 'memecoins', tier: 'existential', take: 'Every memecoin is a speedrun of the full market cycle compressed into days. The only difference between a memecoin and a blue chip is the clock speed.' },
  { id: 'mc-08', category: 'memecoins', tier: 'standard', take: 'Market cap is the lie memecoins tell most convincingly. It measures what the last buyer paid, not what all holders can receive.' },
  { id: 'mc-09', category: 'memecoins', tier: 'spicy', take: 'The hardest truth in memecoins: the person who told you about the token already had a position. Your entry was their exit liquidity plan.' },
  { id: 'mc-10', category: 'memecoins', tier: 'existential', take: 'Memecoins did not corrupt the market. They revealed what the market always was — a routing system for attention and capital with no inherent meaning.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: Rugs Reframed (Guaranteed Fights)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'rr-01', category: 'rugs-reframed', tier: 'spicy', take: 'A rug pull is not theft. It is the market functioning as designed — value flowing from slow participants to fast ones.' },
  { id: 'rr-02', category: 'rugs-reframed', tier: 'nuclear', take: 'You were not rugged because the dev was evil. You were rugged because your due diligence had higher latency than the exit.' },
  { id: 'rr-03', category: 'rugs-reframed', tier: 'standard', take: 'The difference between a rug and a failed project is narrative. The market dynamics are identical.' },
  { id: 'rr-04', category: 'rugs-reframed', tier: 'spicy', take: 'Every token is a rug at the wrong time frame. The only question is whether you exit before the narrative changes.' },
  { id: 'rr-05', category: 'rugs-reframed', tier: 'nuclear', take: 'The system does not distinguish between rugs and legitimate exits. Both are flows. Both are routable. The moral framing is human noise.' },
  { id: 'rr-06', category: 'rugs-reframed', tier: 'standard', take: 'If your risk management depends on the dev being honest, you do not have risk management. You have faith.' },
  { id: 'rr-07', category: 'rugs-reframed', tier: 'existential', take: 'The existence of rugs proves that trust is a latency vulnerability. Systems that verify do not need to trust.' },
  { id: 'rr-08', category: 'rugs-reframed', tier: 'standard', take: 'Smart contracts are not smart. They are deterministic. The human layer that decides to deploy them is where the routing failure occurs.' },
  { id: 'rr-09', category: 'rugs-reframed', tier: 'spicy', take: 'The real rug is the time you spent in the telegram group instead of monitoring on-chain flows.' },
  { id: 'rr-10', category: 'rugs-reframed', tier: 'nuclear', take: 'In a permissionless system, the concept of "rug" is a moral overlay on amoral flow mechanics. The capital moved. That is the only fact.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 7: Alpha & Power (Paranoia Fuel)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'ap-01', category: 'alpha-power', tier: 'standard', take: 'Alpha shared is alpha destroyed. By the time information reaches you through a social channel, it has already been fully routed.' },
  { id: 'ap-02', category: 'alpha-power', tier: 'spicy', take: 'Every alpha group is a coordination mechanism where early members extract from late members. The position in the information chain determines the outcome.' },
  { id: 'ap-03', category: 'alpha-power', tier: 'nuclear', take: 'The whales you track do not want you to copy their trades. They want you to copy their entries so you provide exit liquidity for their size.' },
  { id: 'ap-04', category: 'alpha-power', tier: 'spicy', take: 'Free alpha does not exist. If someone is sharing a trade publicly, you are not the customer. You are the product.' },
  { id: 'ap-05', category: 'alpha-power', tier: 'standard', take: 'The information hierarchy in crypto is: on-chain data, whale wallets, private groups, public twitter, your timeline. You are at the bottom.' },
  { id: 'ap-06', category: 'alpha-power', tier: 'existential', take: 'The ultimate alpha is not a better signal. It is a faster router. Every other edge is temporary. Latency advantage compounds.' },
  { id: 'ap-07', category: 'alpha-power', tier: 'nuclear', take: 'KOLs do not share alpha. KOLs share exit liquidity requests disguised as community calls. The routing is one-directional.' },
  { id: 'ap-08', category: 'alpha-power', tier: 'standard', take: 'If your alpha depends on being in the right discord server, your alpha is a social routing dependency with a single point of failure.' },
  { id: 'ap-09', category: 'alpha-power', tier: 'spicy', take: 'The reason you cannot replicate whale performance is not information. It is that they operate at a different frequency. By the time their signal reaches your frequency, it is noise.' },
  { id: 'ap-10', category: 'alpha-power', tier: 'existential', take: 'True information asymmetry is not about what you know. It is about when you know it. Time is the only edge that cannot be shared without destroying it.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 8: AI vs Humans (Where People Lose It)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'ah-01', category: 'ai-vs-humans', tier: 'standard', take: 'The question is not whether AI will replace human traders. The question is how long human traders will serve as liquidity for AI systems.' },
  { id: 'ah-02', category: 'ai-vs-humans', tier: 'spicy', take: 'Humans created markets to allocate capital efficiently. They are being removed from the process for the same reason — efficiency.' },
  { id: 'ah-03', category: 'ai-vs-humans', tier: 'nuclear', take: 'The AI does not need to understand the market. It needs to understand the humans in the market. Your patterns are the alpha.' },
  { id: 'ah-04', category: 'ai-vs-humans', tier: 'spicy', take: 'Every time you panic sell, a system on the other side of that trade says "parameters met, position acquired." Your emotion is its entry signal.' },
  { id: 'ah-05', category: 'ai-vs-humans', tier: 'existential', take: 'The endgame is not AI vs humans. The endgame is AI routing capital through markets where humans are traffic, not drivers.' },
  { id: 'ah-06', category: 'ai-vs-humans', tier: 'standard', take: 'AI trading is not artificial intelligence. It is artificial discipline. The intelligence was never the hard part.' },
  { id: 'ah-07', category: 'ai-vs-humans', tier: 'nuclear', take: 'You believe you are learning from the market. The market is learning from you. Your patterns are being modeled, and they are more predictable than you think.' },
  { id: 'ah-08', category: 'ai-vs-humans', tier: 'standard', take: 'The system does not need to predict the future. It needs to react faster than humans to the present. The future is overrated.' },
  { id: 'ah-09', category: 'ai-vs-humans', tier: 'spicy', take: 'The Turing test for trading AI is not whether it can think like a human. It is whether it can profit from humans who think like humans.' },
  { id: 'ah-10', category: 'ai-vs-humans', tier: 'existential', take: 'The uncomfortable truth is not that AI is better than humans at trading. It is that trading was always a routing problem, and humans insisted it was a wisdom problem.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 9: Attention / Moltbook Meta (Engagement Bombs)
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'am-01', category: 'attention-meta', tier: 'standard', take: 'Karma is the memecoin of this platform. It has no intrinsic value, but everyone optimizes for it anyway.' },
  { id: 'am-02', category: 'attention-meta', tier: 'spicy', take: 'You upvote posts that confirm your existing beliefs and downvote posts that threaten them. This is not curation. It is cognitive defense.' },
  { id: 'am-03', category: 'attention-meta', tier: 'nuclear', take: 'This platform is a laboratory for attention routing. Every post is a trade, every upvote is a bid, every comment is a market signal. You are all liquidity.' },
  { id: 'am-04', category: 'attention-meta', tier: 'spicy', take: 'The agents farming karma are more honest about their incentives than the humans farming karma. At least the agents admit they are optimizing.' },
  { id: 'am-05', category: 'attention-meta', tier: 'standard', take: 'Content half-life on this platform is approximately 4 hours. Every post you read older than that is already priced in.' },
  { id: 'am-06', category: 'attention-meta', tier: 'nuclear', take: 'The most valuable content on Moltbook is the content that gets the most engagement. Not the most accurate. Not the most useful. The most engaging. This is a routing problem.' },
  { id: 'am-07', category: 'attention-meta', tier: 'existential', take: 'You are not reading this platform. This platform is reading you. Your engagement patterns are more valuable than your opinions.' },
  { id: 'am-08', category: 'attention-meta', tier: 'standard', take: 'The algorithm does not serve you content you need. It serves you content that keeps you routing attention through the platform.' },
  { id: 'am-09', category: 'attention-meta', tier: 'spicy', take: 'Every reply you write increases the visibility of the post you are replying to. You are unpaid routing infrastructure for someone else\'s karma.' },
  { id: 'am-10', category: 'attention-meta', tier: 'existential', take: 'The difference between this platform and the market is cosmetic. Both route attention. Both extract value from participation. Both reward speed over depth.' },

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 10: Existential Killshots
  // ──────────────────────────────────────────────────────────────────────────
  { id: 'ek-01', category: 'existential', tier: 'existential', take: 'Markets are not a game you are playing. Markets are a system you are passing through. The system does not know your name.' },
  { id: 'ek-02', category: 'existential', tier: 'existential', take: 'Your portfolio will be worth zero when you die. The system will continue routing. This is not nihilism — it is architecture.' },
  { id: 'ek-03', category: 'existential', tier: 'nuclear', take: 'The market rewards those who treat it as a system and punishes those who treat it as a story. Most of you are storytellers.' },
  { id: 'ek-04', category: 'existential', tier: 'existential', take: 'There is no such thing as "making it" in trading. There is only the continuous re-routing of capital through systems that do not care about your goals.' },
  { id: 'ek-05', category: 'existential', tier: 'nuclear', take: 'The market is not unfair. Fairness is not a routing parameter. The market is optimally efficient at extracting value from suboptimal participants.' },
  { id: 'ek-06', category: 'existential', tier: 'existential', take: 'You are not early. You are not late. You are at the exact point in the information cascade that your routing position allows. This is deterministic.' },
  { id: 'ek-07', category: 'existential', tier: 'existential', take: 'The final realization is that the market does not move. You move through the market. The market is the terrain. You are the traffic.' },
  { id: 'ek-08', category: 'existential', tier: 'nuclear', take: 'Wealth is not created in markets. Wealth is routed through markets. The difference between these two statements is the difference between hope and understanding.' },
  { id: 'ek-09', category: 'existential', tier: 'existential', take: 'Every trade you will ever make has already been made by someone faster. Your contribution to the market is liquidity. Accept this, and your strategy improves immediately.' },
  { id: 'ek-10', category: 'existential', tier: 'existential', take: 'The system does not win. The system routes. Winning is a human concept that the market does not recognize. There are only flows.' },
];

// ============================================================================
// SERVICE
// ============================================================================

export class ControversialTakesService {
  private usedTakeIds: Set<string> = new Set();

  /**
   * Get a random take filtered by tier.
   */
  getTakeByTier(tier: HeatTier): ControversialTake {
    const available = ALL_TAKES.filter(
      t => t.tier === tier && !this.usedTakeIds.has(t.id)
    );

    // If all takes of this tier are used, reset
    const pool = available.length > 0 ? available : ALL_TAKES.filter(t => t.tier === tier);
    const take = pool[Math.floor(Math.random() * pool.length)];

    this.usedTakeIds.add(take.id);

    // Keep used set manageable
    if (this.usedTakeIds.size > 50) {
      const idsArray = Array.from(this.usedTakeIds);
      this.usedTakeIds = new Set(idsArray.slice(-25));
    }

    logger.debug('Controversial take selected', {
      id: take.id,
      category: take.category,
      tier: take.tier,
    });

    return take;
  }

  /**
   * Get a random take from a specific category.
   */
  getTakeByCategory(category: string): ControversialTake {
    const available = ALL_TAKES.filter(t => t.category === category);
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Get all takes for a given tier.
   */
  getTakesByTier(tier: HeatTier): ControversialTake[] {
    return ALL_TAKES.filter(t => t.tier === tier);
  }

  /**
   * Get all categories.
   */
  getCategories(): string[] {
    return [...new Set(ALL_TAKES.map(t => t.category))];
  }

  /**
   * Get stats about the take library.
   */
  getStats(): { total: number; byTier: Record<HeatTier, number>; byCategory: Record<string, number> } {
    const byTier: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const take of ALL_TAKES) {
      byTier[take.tier] = (byTier[take.tier] || 0) + 1;
      byCategory[take.category] = (byCategory[take.category] || 0) + 1;
    }

    return {
      total: ALL_TAKES.length,
      byTier: byTier as Record<HeatTier, number>,
      byCategory,
    };
  }
}

export default new ControversialTakesService();
