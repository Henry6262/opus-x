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

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

export default new LearningEngine();
