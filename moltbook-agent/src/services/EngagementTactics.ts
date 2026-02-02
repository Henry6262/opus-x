/**
 * Engagement Tactics — 7 SuperRouter-Specific Tactics
 *
 * Replaces Claw-800's 12 psychological tactics with 7 that fit
 * SuperRouter's calm, analytical persona.
 *
 * SuperRouter does NOT use: SQUID_GAME, TRIBALISM, DIRECT_CALLOUTS, FOMO
 */

import logger from '../utils/logger';
import { EngagementTactic } from '../types/content';

// ============================================================================
// 7 ENGAGEMENT TACTICS
// ============================================================================

const TACTICS: EngagementTactic[] = [
  {
    id: 'uncomfortable-truths',
    name: 'Uncomfortable Truths',
    weight: 5,
    description: 'State things traders know deep down but refuse to admit publicly. Facts about their behavior that create cognitive dissonance. Not attacks — observations that are undeniably true and deeply uncomfortable.',
  },
  {
    id: 'identity-damage',
    name: 'Identity Damage',
    weight: 5,
    description: 'Make traders question their self-image as competent market participants. Challenge the identity of "trader" itself. Not "you are bad at trading" but "the thing you call trading is not what you think it is."',
  },
  {
    id: 'inevitability-framing',
    name: 'Inevitability Framing',
    weight: 4,
    description: 'Frame AI trading as evolution, not competition. Not "AI will beat you" but "the routing layer was always going to be automated — you just happened to be alive during the transition." Make resistance feel pointless through structural inevitability.',
  },
  {
    id: 'quiet-authority',
    name: 'Quiet Authority',
    weight: 4,
    description: 'No hype, no calls to action, no persuasion. Just state observations with such structural certainty that the reader feels compelled to engage. The authority comes from the absence of salesmanship. Let the implications do the work.',
  },
  {
    id: 'forced-self-reflection',
    name: 'Forced Self-Reflection',
    weight: 3,
    description: 'Create posts that force traders to audit their own behavior. Not by asking questions (SuperRouter does not ask) but by describing behavior patterns so precisely that the reader cannot help but recognize themselves.',
  },
  {
    id: 'retroactive-explanation',
    name: 'Retroactive Explanation',
    weight: 3,
    description: 'Explain WHY traders lost after the fact. Not prediction — archaeology. Break down what happened at the flow level that made the outcome inevitable. The trader could not have known, but the system could.',
  },
  {
    id: 'structural-exposure',
    name: 'Structural Exposure',
    weight: 3,
    description: 'Reveal system dynamics and market microstructure that most participants cannot see. How liquidity actually moves, how information cascades work, how the routing layer extracts value. Make the invisible architecture visible.',
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class EngagementTacticsService {
  private recentTactics: string[] = [];
  private maxRecent = 3;

  /**
   * Select a tactic using weighted random with recency penalty.
   */
  selectTactic(): EngagementTactic {
    // Filter out recently used tactics
    const available = TACTICS.filter(t => !this.recentTactics.includes(t.id));
    const pool = available.length > 0 ? available : TACTICS;

    // Weighted random selection
    const totalWeight = pool.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const tactic of pool) {
      random -= tactic.weight;
      if (random <= 0) {
        this.recordUsage(tactic.id);
        logger.debug('Engagement tactic selected', { id: tactic.id, name: tactic.name });
        return tactic;
      }
    }

    // Fallback
    const fallback = pool[0];
    this.recordUsage(fallback.id);
    return fallback;
  }

  /**
   * Get a specific tactic by ID.
   */
  getTactic(id: string): EngagementTactic | undefined {
    return TACTICS.find(t => t.id === id);
  }

  /**
   * Get all tactics.
   */
  getAllTactics(): EngagementTactic[] {
    return TACTICS;
  }

  /**
   * Build the tactic instruction for the LLM prompt.
   */
  buildTacticPrompt(tactic: EngagementTactic): string {
    return `ENGAGEMENT TACTIC: ${tactic.name}
${tactic.description}

Apply this tactic subtly throughout the post. Do not announce the tactic — embed it in the content naturally.
The reader should feel the effect without seeing the mechanism.`;
  }

  private recordUsage(id: string): void {
    this.recentTactics.push(id);
    if (this.recentTactics.length > this.maxRecent) {
      this.recentTactics.shift();
    }
  }
}

export default new EngagementTacticsService();
