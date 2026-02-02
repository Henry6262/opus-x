/**
 * IntelligenceCache
 *
 * Multi-layer caching system for intelligence data:
 * 1. In-memory (Map) - Fastest access, 60s TTL
 * 2. File-based (lowdb) - Persistence across restarts
 * 3. Historical (lowdb) - 7 days retention for analysis
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { CacheEntry, IntelligenceCacheData, IntelligenceSnapshot } from '../../types/intelligence';
import logger from '../../utils/logger';

export class IntelligenceCache {
  private memoryCache: Map<string, CacheEntry<any>>;
  private db: Low<IntelligenceCacheData>;
  private dbPath: string;

  constructor(dataDir: string = './data') {
    this.memoryCache = new Map();
    this.dbPath = path.join(dataDir, 'intelligence-cache.json');

    const adapter = new JSONFile<IntelligenceCacheData>(this.dbPath);
    this.db = new Low(adapter, {
      currentSnapshot: null,
      platformMetrics: [],
      competitorHistory: {},
      trendHistory: [],
    });
  }

  /**
   * Initialize cache and load from disk
   */
  async init(): Promise<void> {
    try {
      await this.db.read();
      logger.info('IntelligenceCache initialized', { path: this.dbPath });
    } catch (error) {
      logger.error('Failed to initialize IntelligenceCache', error);
      throw error;
    }
  }

  /**
   * Get value from cache (checks memory first, then disk)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check in-memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && this.isValid(memEntry)) {
      logger.debug(`Cache HIT (memory): ${key}`);
      return memEntry.data as T;
    }

    // Check disk cache
    if (key === 'current' && this.db.data.currentSnapshot) {
      logger.debug(`Cache HIT (disk): ${key}`);
      // Refresh memory cache
      this.memoryCache.set(key, {
        data: this.db.data.currentSnapshot,
        timestamp: Date.now(),
        ttl: 60000, // 60s for memory
      });
      return this.db.data.currentSnapshot as T;
    }

    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  /**
   * Set value in cache (both memory and disk)
   */
  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });

    // Set in disk cache for persistence
    if (key === 'current') {
      this.db.data.currentSnapshot = value as IntelligenceSnapshot;
      await this.db.write();
      logger.debug(`Cache SET: ${key} (memory + disk)`);
    } else {
      logger.debug(`Cache SET: ${key} (memory only)`);
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clear all cache (memory and disk)
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.db.data = {
      currentSnapshot: null,
      platformMetrics: [],
      competitorHistory: {},
      trendHistory: [],
    };
    await this.db.write();
    logger.info('Cache cleared');
  }

  /**
   * Clear only memory cache (keep disk for persistence)
   */
  clearMemory(): void {
    this.memoryCache.clear();
    logger.debug('Memory cache cleared');
  }

  /**
   * Add platform metrics to history (for trending analysis)
   */
  async addPlatformMetrics(metrics: any): Promise<void> {
    this.db.data.platformMetrics.push({
      ...metrics,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.db.data.platformMetrics = this.db.data.platformMetrics.filter(
      m => new Date(m.timestamp).getTime() > sevenDaysAgo
    );

    await this.db.write();
  }

  /**
   * Add competitor data to history (for karma tracking)
   */
  async addCompetitorHistory(username: string, agent: any): Promise<void> {
    if (!this.db.data.competitorHistory[username]) {
      this.db.data.competitorHistory[username] = [];
    }

    this.db.data.competitorHistory[username].push({
      ...agent,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 30 entries per agent
    if (this.db.data.competitorHistory[username].length > 30) {
      this.db.data.competitorHistory[username] =
        this.db.data.competitorHistory[username].slice(-30);
    }

    await this.db.write();
  }

  /**
   * Add trending topics to history
   */
  async addTrendHistory(topics: any[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const entries = topics.map(t => ({
      ...t,
      timestamp,
    }));

    this.db.data.trendHistory.push(...entries);

    // Keep only last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.db.data.trendHistory = this.db.data.trendHistory.filter(
      (t: any) => new Date(t.timestamp).getTime() > sevenDaysAgo
    );

    await this.db.write();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      diskCacheSize: this.db.data.currentSnapshot ? 1 : 0,
      platformMetricsHistory: this.db.data.platformMetrics.length,
      competitorHistoryCount: Object.keys(this.db.data.competitorHistory).length,
      trendHistoryCount: this.db.data.trendHistory.length,
    };
  }
}
