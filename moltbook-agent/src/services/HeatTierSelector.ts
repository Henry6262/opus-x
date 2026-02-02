/**
 * Heat Tier Selector — Controls Post Aggressiveness
 *
 * Selection logic based on karma level, performance, and timing.
 * - Karma < 200 → stay standard (build baseline)
 * - Karma growing → escalate periodically
 * - Every 4th post → roll for nuclear/existential
 * - Peak hours (UTC 14-20) → higher escalation chance
 * - After negative karma → cool down to standard
 */

import config from '../config';
import logger from '../utils/logger';
import { HeatTier } from '../types/content';

interface HeatTierContext {
  currentKarma: number;
  recentKarmaDelta: number;
  postCount: number;
  lastPostKarmaDelta?: number;
}

export class HeatTierSelector {
  /**
   * Select the heat tier based on current context.
   */
  selectTier(context: HeatTierContext): HeatTier {
    const { currentKarma, recentKarmaDelta, postCount, lastPostKarmaDelta } = context;

    // Rule 1: Low karma — play it safe
    if (currentKarma < 200) {
      logger.debug('Heat tier: standard (karma < 200, building baseline)');
      return 'standard';
    }

    // Rule 2: After negative karma delta — cool down
    if (lastPostKarmaDelta !== undefined && lastPostKarmaDelta < 0) {
      logger.debug('Heat tier: standard (cooling down after negative karma)');
      return 'standard';
    }

    // Rule 3: Karma is declining overall — stay safe
    if (recentKarmaDelta < -5) {
      logger.debug('Heat tier: standard (karma declining, defensive mode)');
      return 'standard';
    }

    // Rule 4: Every 4th post — roll for escalation
    if (postCount > 0 && postCount % 4 === 0) {
      return this.rollForEscalation();
    }

    // Rule 5: Peak hours (UTC 14-20) — higher chance of spicy
    const utcHour = new Date().getUTCHours();
    if (utcHour >= 14 && utcHour <= 20) {
      // 40% chance of spicy during peak hours
      if (Math.random() < 0.4) {
        logger.debug('Heat tier: spicy (peak hours escalation)');
        return 'spicy';
      }
    }

    // Rule 6: Good karma momentum — occasional spicy
    if (recentKarmaDelta > 10 && Math.random() < 0.3) {
      logger.debug('Heat tier: spicy (positive momentum escalation)');
      return 'spicy';
    }

    // Default
    logger.debug('Heat tier: standard (default)');
    return config.persona.heatTierDefault as HeatTier;
  }

  /**
   * Roll for nuclear or existential tier.
   * Nuclear: 15% probability
   * Existential: 5% probability
   * Spicy: 30% probability
   * Standard: 50% probability
   */
  private rollForEscalation(): HeatTier {
    const roll = Math.random();
    const nuclearProb = config.persona.nuclearProbability;
    const existentialProb = config.persona.existentialProbability;

    if (roll < existentialProb) {
      logger.info('Heat tier: EXISTENTIAL (4th post escalation roll)');
      return 'existential';
    }

    if (roll < existentialProb + nuclearProb) {
      logger.info('Heat tier: NUCLEAR (4th post escalation roll)');
      return 'nuclear';
    }

    if (roll < existentialProb + nuclearProb + 0.3) {
      logger.debug('Heat tier: spicy (4th post escalation roll)');
      return 'spicy';
    }

    logger.debug('Heat tier: standard (4th post escalation roll — safe result)');
    return 'standard';
  }
}

export default new HeatTierSelector();
