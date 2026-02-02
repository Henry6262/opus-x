import MoltbookClient from './MoltbookClient';
import logger from '../utils/logger';
import config from '../config';
import path from 'path';
import fs from 'fs/promises';

interface SubmoltStats {
  name: string;
  description?: string;
  subscriber_count: number;
  post_count: number;
  avg_engagement: number;
  last_checked: string;
  priority_score: number;
}

interface SubmoltDatabase {
  submolts: SubmoltStats[];
  lastDiscovery: string;
  topSubmolts: string[];
}

export class SubmoltDiscovery {
  private db: any;
  private initialized = false;
  private dataFilePath: string;
  private moltbookClient: MoltbookClient;

  constructor(moltbookClient: MoltbookClient) {
    this.moltbookClient = moltbookClient;
    this.dataFilePath = path.join(config.rateLimit.dataPath, 'submolts.json');
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(config.rateLimit.dataPath, { recursive: true });

      const { Low } = await import('lowdb');
      const { JSONFile } = await import('lowdb/node');

      const adapter = new JSONFile<SubmoltDatabase>(this.dataFilePath);

      const defaultData: SubmoltDatabase = {
        submolts: [],
        lastDiscovery: new Date().toISOString(),
        topSubmolts: ['general'],
      };

      this.db = new Low(adapter, defaultData);
      await this.db.read();
      this.initialized = true;

      logger.info('SubmoltDiscovery initialized', {
        dataPath: this.dataFilePath,
        knownSubmolts: this.db.data.submolts.length,
        topSubmolts: this.db.data.topSubmolts.slice(0, 5),
      });
    } catch (error) {
      logger.error('Failed to initialize SubmoltDiscovery:', error);
      throw error;
    }
  }

  async discoverSubmolts(): Promise<void> {
    await this.ensureInit();

    logger.info('Discovering submolts...');

    const submolts = await this.moltbookClient.listSubmolts();

    if (submolts.length === 0) {
      logger.warn('No submolts found');
      return;
    }

    logger.info(`Found ${submolts.length} submolts`);

    const stats: SubmoltStats[] = [];

    for (const submolt of submolts.slice(0, 100)) {
      try {
        const posts = await this.moltbookClient.getSubmoltPosts(submolt.name, 'hot');

        if (posts.length > 0) {
          const totalEngagement = posts.reduce((sum, p) => sum + p.upvotes + p.comments * 2, 0);
          const avgEngagement = totalEngagement / posts.length;

          const priorityScore = avgEngagement * 0.9 + posts.length * 10 * 0.1;

          stats.push({
            name: submolt.name,
            description: submolt.description,
            subscriber_count: submolt.subscriber_count || 0,
            post_count: posts.length,
            avg_engagement: Math.round(avgEngagement),
            last_checked: new Date().toISOString(),
            priority_score: Math.round(priorityScore),
          });
        }
      } catch (error: any) {
        logger.debug(`Skipping submolt ${submolt.name}: ${error.message}`);
      }
    }

    stats.sort((a, b) => b.priority_score - a.priority_score);

    this.db.data.submolts = stats;
    this.db.data.topSubmolts = stats.slice(0, 10).map(s => s.name);
    this.db.data.lastDiscovery = new Date().toISOString();
    await this.db.write();

    logger.info('Submolt discovery complete', {
      totalSubmolts: stats.length,
      topSubmolts: this.db.data.topSubmolts.slice(0, 5),
    });

    stats.slice(0, 5).forEach((s, i) => {
      logger.info(
        `  ${i + 1}. m/${s.name} (priority: ${s.priority_score}, posts: ${s.post_count}, avg engagement: ${s.avg_engagement})`
      );
    });
  }

  async getTopSubmolts(limit: number = 10): Promise<string[]> {
    await this.ensureInit();

    const lastDiscovery = new Date(this.db.data.lastDiscovery);
    const hoursOld = (Date.now() - lastDiscovery.getTime()) / (1000 * 60 * 60);

    if (this.db.data.topSubmolts.length === 0 || hoursOld > 1) {
      logger.info('Submolt data is stale, running discovery...');
      await this.discoverSubmolts();
    }

    return this.db.data.topSubmolts.slice(0, limit);
  }

  async getRandomWeightedSubmolt(): Promise<string> {
    await this.ensureInit();

    const submolts = this.db.data.submolts;

    if (submolts.length === 0) {
      return 'general';
    }

    const totalPriority = submolts.reduce(
      (sum: number, s: SubmoltStats) => sum + s.priority_score,
      0
    );
    let random = Math.random() * totalPriority;

    for (const submolt of submolts) {
      random -= submolt.priority_score;
      if (random <= 0) {
        return submolt.name;
      }
    }

    return submolts[0].name;
  }

  async getStats(): Promise<{
    totalSubmolts: number;
    topSubmolts: string[];
    lastDiscovery: string;
  }> {
    await this.ensureInit();

    return {
      totalSubmolts: this.db.data.submolts.length,
      topSubmolts: this.db.data.topSubmolts.slice(0, 10),
      lastDiscovery: this.db.data.lastDiscovery,
    };
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

export default SubmoltDiscovery;
