/**
 * Learning Engine — Adapted for SuperRouter
 *
 * Tracks content performance and learns which patterns,
 * pillars, heat tiers, and submolts perform best.
 */

import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { ContentPillar, HeatTier, StructuralPatternType } from '../types/content';

interface PerformanceRecord {
  timestamp: string;
  postId: string;
  submolt: string;
  pillar: ContentPillar;
  pattern: StructuralPatternType;
  heatTier: HeatTier;
  tactic: string;
  temperature: number;
  isExperimental: boolean;
  karmaDelta: number;
  wordCount: number;
  hour: number;
}

interface LearningDatabase {
  performance: PerformanceRecord[];
  lastUpdated: string;
}

export class LearningEngine {
  public db: any;
  private initialized = false;
  private dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(config.rateLimit.dataPath, 'learning.json');
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(config.rateLimit.dataPath, { recursive: true });

      const { Low } = await import('lowdb');
      const { JSONFile } = await import('lowdb/node');

      const adapter = new JSONFile<LearningDatabase>(this.dataFilePath);
      const defaultData: LearningDatabase = {
        performance: [],
        lastUpdated: new Date().toISOString(),
      };

      this.db = new Low(adapter, defaultData);
      await this.db.read();
      this.initialized = true;

      logger.info('LearningEngine initialized', {
        dataPath: this.dataFilePath,
        records: this.db.data.performance.length,
      });
    } catch (error) {
      logger.error('Failed to initialize LearningEngine:', error);
      throw error;
    }
  }

  /**
   * Record post performance for learning.
   */
  async recordPerformance(record: {
    postId: string;
    submolt: string;
    pillar: ContentPillar;
    pattern: StructuralPatternType;
    heatTier: HeatTier;
    tactic: string;
    temperature: number;
    isExperimental: boolean;
    karmaDelta: number;
    wordCount: number;
  }): Promise<void> {
    await this.ensureInit();

    const entry: PerformanceRecord = {
      ...record,
      timestamp: new Date().toISOString(),
      hour: new Date().getUTCHours(),
    };

    this.db.data.performance.push(entry);
    this.db.data.lastUpdated = entry.timestamp;
    await this.db.write();

    logger.info('Performance recorded', {
      postId: record.postId,
      pillar: record.pillar,
      pattern: record.pattern,
      heatTier: record.heatTier,
      karmaDelta: record.karmaDelta,
    });
  }

  /**
   * Get insights from performance data.
   */
  async getInsights(): Promise<{
    bestPillars: Array<Record<string, any>>;
    bestPatterns: Array<Record<string, any>>;
    bestHeatTiers: Array<Record<string, any>>;
    bestHours: Array<{ hour: number; avgKarma: number; count: number }>;
    bestSubmolts: Array<Record<string, any>>;
    experimentalVsNormal: { experimental: number; normal: number };
    totalRecords: number;
  }> {
    await this.ensureInit();

    const records = this.db.data.performance;

    if (records.length === 0) {
      return {
        bestPillars: [],
        bestPatterns: [],
        bestHeatTiers: [],
        bestHours: [],
        bestSubmolts: [],
        experimentalVsNormal: { experimental: 0, normal: 0 },
        totalRecords: 0,
      };
    }

    return {
      bestPillars: this.aggregateBy(records, 'pillar'),
      bestPatterns: this.aggregateBy(records, 'pattern'),
      bestHeatTiers: this.aggregateBy(records, 'heatTier'),
      bestHours: this.aggregateByNumber(records, 'hour'),
      bestSubmolts: this.aggregateBy(records, 'submolt'),
      experimentalVsNormal: this.experimentalComparison(records),
      totalRecords: records.length,
    };
  }

  /**
   * Get submolt performance stats.
   */
  async getSubmoltStats(): Promise<Array<Record<string, any>>> {
    await this.ensureInit();
    return this.aggregateBy(this.db.data.performance, 'submolt');
  }

  /**
   * Recommend best submolt based on historical performance.
   */
  async recommendSubmolt(available: string[]): Promise<string | null> {
    await this.ensureInit();

    const stats = await this.getSubmoltStats();
    const positiveSubmolts = stats
      .filter(s => s.avgKarma > 0 && available.includes(s['submolt']))
      .sort((a, b) => b.avgKarma - a.avgKarma);

    return positiveSubmolts.length > 0 ? positiveSubmolts[0]['submolt'] : null;
  }

  private aggregateBy(
    records: PerformanceRecord[],
    field: keyof PerformanceRecord
  ): Array<{ [key: string]: any; avgKarma: number; count: number }> {
    const groups: Record<string, { total: number; count: number }> = {};

    for (const record of records) {
      const key = String(record[field]);
      if (!groups[key]) {
        groups[key] = { total: 0, count: 0 };
      }
      groups[key].total += record.karmaDelta;
      groups[key].count += 1;
    }

    return Object.entries(groups)
      .map(([key, data]) => ({
        [field]: key,
        avgKarma: Math.round((data.total / data.count) * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.avgKarma - a.avgKarma);
  }

  private aggregateByNumber(
    records: PerformanceRecord[],
    field: 'hour'
  ): Array<{ hour: number; avgKarma: number; count: number }> {
    const groups: Record<number, { total: number; count: number }> = {};

    for (const record of records) {
      const key = record[field];
      if (!groups[key]) {
        groups[key] = { total: 0, count: 0 };
      }
      groups[key].total += record.karmaDelta;
      groups[key].count += 1;
    }

    return Object.entries(groups)
      .map(([key, data]) => ({
        hour: parseInt(key),
        avgKarma: Math.round((data.total / data.count) * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.avgKarma - a.avgKarma);
  }

  private experimentalComparison(records: PerformanceRecord[]): { experimental: number; normal: number } {
    const experimental = records.filter(r => r.isExperimental);
    const normal = records.filter(r => !r.isExperimental);

    const avgExp = experimental.length > 0
      ? experimental.reduce((sum, r) => sum + r.karmaDelta, 0) / experimental.length
      : 0;
    const avgNorm = normal.length > 0
      ? normal.reduce((sum, r) => sum + r.karmaDelta, 0) / normal.length
      : 0;

    return {
      experimental: Math.round(avgExp * 100) / 100,
      normal: Math.round(avgNorm * 100) / 100,
    };
  }

  /**
   * Determine if next post should use experimental temperature.
   * Adjusts probability based on performance data when enough records exist.
   */
  async shouldExperiment(): Promise<boolean> {
    await this.ensureInit();

    const records = this.db.data.performance;
    if (records.length < 10) {
      return Math.random() < config.persona.experimentalProbability;
    }

    const { experimental, normal } = this.experimentalComparison(records);

    let probability: number;
    if (experimental > normal * 1.2) {
      // Experimental outperforming by 20%+ → increase to 40%
      probability = 0.4;
    } else if (experimental < normal * 0.8) {
      // Experimental underperforming by 20%+ → decrease to 10%
      probability = 0.1;
    } else {
      probability = config.persona.experimentalProbability;
    }

    return Math.random() < probability;
  }

  /**
   * Analyze recent performance trends and log recommendations.
   */
  async analyze(): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    recentAvg: number;
    previousAvg: number;
    recommendations: string[];
  }> {
    await this.ensureInit();

    const records = this.db.data.performance;
    if (records.length < 5) {
      return {
        trend: 'stable',
        recentAvg: 0,
        previousAvg: 0,
        recommendations: ['Not enough data yet — need at least 5 records'],
      };
    }

    const recent = records.slice(-10);
    const previous = records.length > 20
      ? records.slice(-20, -10)
      : records.slice(0, Math.floor(records.length / 2));

    const recentAvg = recent.reduce((sum: number, r: PerformanceRecord) => sum + r.karmaDelta, 0) / recent.length;
    const previousAvg = previous.length > 0
      ? previous.reduce((sum: number, r: PerformanceRecord) => sum + r.karmaDelta, 0) / previous.length
      : 0;

    const trend = recentAvg > previousAvg * 1.15
      ? 'improving' as const
      : recentAvg < previousAvg * 0.85
        ? 'declining' as const
        : 'stable' as const;

    const recommendations: string[] = [];

    // Analyze by pillar
    const pillarStats = this.aggregateBy(recent, 'pillar');
    const bestPillar = pillarStats[0];
    const worstPillar = pillarStats[pillarStats.length - 1];
    if (bestPillar && worstPillar && pillarStats.length > 1) {
      recommendations.push(
        `Best pillar: ${bestPillar['pillar']} (avg ${bestPillar.avgKarma}). Consider increasing weight.`
      );
      if (worstPillar.avgKarma < 0) {
        recommendations.push(
          `Underperforming pillar: ${worstPillar['pillar']} (avg ${worstPillar.avgKarma}). Consider reducing weight.`
        );
      }
    }

    // Analyze by heat tier
    const tierStats = this.aggregateBy(recent, 'heatTier');
    const bestTier = tierStats[0];
    if (bestTier) {
      recommendations.push(`Best heat tier: ${bestTier['heatTier']} (avg ${bestTier.avgKarma})`);
    }

    // Analyze by pattern
    const patternStats = this.aggregateBy(recent, 'pattern');
    const bestPattern = patternStats[0];
    if (bestPattern) {
      recommendations.push(`Best pattern: ${bestPattern['pattern']} (avg ${bestPattern.avgKarma})`);
    }

    logger.info('Learning analysis complete', {
      trend,
      recentAvg: Math.round(recentAvg * 100) / 100,
      previousAvg: Math.round(previousAvg * 100) / 100,
      recommendations,
    });

    return {
      trend,
      recentAvg: Math.round(recentAvg * 100) / 100,
      previousAvg: Math.round(previousAvg * 100) / 100,
      recommendations,
    };
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}
