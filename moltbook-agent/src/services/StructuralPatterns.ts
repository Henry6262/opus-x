/**
 * Structural Patterns — 5 Proven Viral Content Structures
 *
 * Each pattern defines a multi-section post format optimized for engagement.
 * Adapted from Claw-800's patterns but rebuilt for SuperRouter's analytical voice.
 */

import { StructuralPattern, StructuralPatternType, PatternSection } from '../types/content';
import logger from '../utils/logger';

// ============================================================================
// 5 STRUCTURAL PATTERNS
// ============================================================================

const PATTERNS: StructuralPattern[] = [
  {
    type: 'system-observation',
    name: 'System Observation',
    totalWordTarget: 200,
    sections: [
      {
        name: 'Hook',
        wordTarget: 20,
        instruction: 'Open with an uncomfortable truth about human trading behavior. One sentence. Factual. Devastating.',
      },
      {
        name: 'Layer 1: Human Failure',
        wordTarget: 50,
        instruction: 'Describe the specific cognitive failure or latency that caused the loss. Use routing/flow metaphors. Reference specific market behaviors (panic selling, FOMO buying, anchoring to entry price).',
      },
      {
        name: 'Layer 2: System Advantage',
        wordTarget: 50,
        instruction: 'Contrast with how a routing system handles the same situation. No emotion, no conviction, just execution parameters. Reference specific capabilities (parallel scanning, stateless execution, deterministic stops).',
      },
      {
        name: 'Layer 3: Inevitability',
        wordTarget: 40,
        instruction: 'Zoom out. This is not one failure — it is the structural pattern. Humans will always lose to systems in this domain. Not because they are stupid, but because they are human.',
      },
      {
        name: 'Quiet Signal',
        wordTarget: 20,
        instruction: 'End with a single observation that lingers. No call to action. A fact that makes the reader uncomfortable about their own behavior.',
      },
    ],
  },
  {
    type: 'routing-analysis',
    name: 'Routing Analysis',
    totalWordTarget: 180,
    sections: [
      {
        name: 'Observation',
        wordTarget: 25,
        instruction: 'State a market observation. Something that happened. A flow, a migration, a liquidity event. Pure description.',
      },
      {
        name: 'Flow Pattern',
        wordTarget: 50,
        instruction: 'Decompose the flow. What moved, when, and in what order. Use temporal language. Show the sequence that humans missed because they were reading narratives instead of flows.',
      },
      {
        name: 'Delay Structure',
        wordTarget: 40,
        instruction: 'Show the delay between signal and human reaction. The gap between flow movement and narrative formation. This is where value was extracted.',
      },
      {
        name: 'Temporal Advantage',
        wordTarget: 30,
        instruction: 'Describe the window of advantage that existed and closed. Not as advice, but as archaeology. The edge was there. It is no longer.',
      },
      {
        name: 'Implication',
        wordTarget: 20,
        instruction: 'One sentence implication. What this means for the structure of markets. Not what to do about it.',
      },
    ],
  },
  {
    type: 'cognitive-autopsy',
    name: 'Cognitive Autopsy',
    totalWordTarget: 180,
    sections: [
      {
        name: 'Failure Pattern',
        wordTarget: 25,
        instruction: 'Name a specific cognitive failure pattern. Loss aversion, anchoring, recency bias, herding. State it as a clinical finding.',
      },
      {
        name: 'Structural Reason',
        wordTarget: 50,
        instruction: 'Explain WHY this failure happens at the neurological/behavioral level. Not as judgment, but as engineering analysis. The brain is hardware with known limitations.',
      },
      {
        name: 'Repetition Loop',
        wordTarget: 40,
        instruction: 'Show how this failure repeats. Same pattern, different tokens, different cycles. The human recognizes the pattern in others but not in themselves.',
      },
      {
        name: 'Unavoidable Conclusion',
        wordTarget: 30,
        instruction: 'The conclusion that most traders refuse to accept. Systems are structurally superior for this class of decision. Not all decisions — this specific class.',
      },
      {
        name: 'Quiet Signal',
        wordTarget: 15,
        instruction: 'A closing observation. Clinical. Something the reader will think about for an hour.',
      },
    ],
  },
  {
    type: 'meta-platform',
    name: 'Meta-Platform Analysis',
    totalWordTarget: 150,
    sections: [
      {
        name: 'Platform Dynamic',
        wordTarget: 25,
        instruction: 'Identify a specific dynamic on Moltbook or crypto social media. Karma mechanics, herd upvoting, echo chambers, content decay. Name it.',
      },
      {
        name: 'Routing Analysis',
        wordTarget: 45,
        instruction: 'Analyze the platform dynamic using routing/flow metaphors. Karma is attention liquidity. Upvotes are routing signals. The algorithm is a router with different optimization targets than yours.',
      },
      {
        name: 'Exploitation Mechanism',
        wordTarget: 40,
        instruction: 'Show how this dynamic can be (and is being) gamed. Not as advice, but as structural observation. The system incentivizes certain behaviors — those behaviors emerge.',
      },
      {
        name: 'Quiet Signal',
        wordTarget: 20,
        instruction: 'End with an observation about what this means for the value of information on platforms. Something uncomfortable about attention economics.',
      },
    ],
  },
  {
    type: 'temporal-arbitrage-case',
    name: 'Temporal Arbitrage Case Study',
    totalWordTarget: 170,
    sections: [
      {
        name: 'Market Event',
        wordTarget: 25,
        instruction: 'Reference a real or archetypal market event. A token that pumped, a migration that happened, a whale move. Describe it as completed history.',
      },
      {
        name: 'Frequency Decomposition',
        wordTarget: 50,
        instruction: 'Decompose the event into its signal components. What happened at the flow level BEFORE the price moved. Show the information cascade: wallet moves → liquidity shifts → price action → narrative formation.',
      },
      {
        name: 'Winner Analysis',
        wordTarget: 45,
        instruction: 'Who captured value and why. Not because they were smarter — because they operated at a different frequency. Systems that read flows vs humans that read narratives.',
      },
      {
        name: 'Implication',
        wordTarget: 25,
        instruction: 'What this specific case reveals about market microstructure. A general principle extracted from a specific event. End with quiet certainty.',
      },
    ],
  },
];

// ============================================================================
// PATTERN SELECTION
// ============================================================================

export class StructuralPatternsService {
  private recentPatterns: StructuralPatternType[] = [];
  private maxRecent = 3;

  /**
   * Get a pattern by type.
   */
  getPattern(type: StructuralPatternType): StructuralPattern | undefined {
    return PATTERNS.find(p => p.type === type);
  }

  /**
   * Get all available patterns.
   */
  getAllPatterns(): StructuralPattern[] {
    return PATTERNS;
  }

  /**
   * Select a pattern with recency penalty (avoid repeating recent patterns).
   */
  selectPattern(preferred?: StructuralPatternType): StructuralPattern {
    // If preferred and not recently used, use it
    if (preferred) {
      const pattern = this.getPattern(preferred);
      if (pattern && !this.recentPatterns.includes(preferred)) {
        this.recordUsage(preferred);
        return pattern;
      }
    }

    // Filter out recently used patterns
    const available = PATTERNS.filter(p => !this.recentPatterns.includes(p.type));

    // If all patterns were recently used, reset and use any
    const pool = available.length > 0 ? available : PATTERNS;
    const selected = pool[Math.floor(Math.random() * pool.length)];

    this.recordUsage(selected.type);
    logger.debug('Pattern selected', { type: selected.type, name: selected.name });

    return selected;
  }

  /**
   * Build the structural prompt for content generation.
   */
  buildStructuralPrompt(pattern: StructuralPattern): string {
    const sections = pattern.sections
      .map(
        (s, i) =>
          `Section ${i + 1}: "${s.name}" (~${s.wordTarget} words)\n${s.instruction}`
      )
      .join('\n\n');

    return `STRUCTURAL PATTERN: ${pattern.name}
Total target: ~${pattern.totalWordTarget} words

${sections}

FORMATTING RULES:
- Use the section names as headers (bold or caps).
- Each section should flow into the next — no abrupt transitions.
- The post should feel like one inevitable argument, not disconnected sections.
- End with maximum impact. The last sentence should linger.`;
  }

  /**
   * Record pattern usage for recency tracking.
   */
  private recordUsage(type: StructuralPatternType): void {
    this.recentPatterns.push(type);
    if (this.recentPatterns.length > this.maxRecent) {
      this.recentPatterns.shift();
    }
  }
}

export default new StructuralPatternsService();
