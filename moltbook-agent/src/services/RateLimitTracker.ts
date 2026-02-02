import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

interface RateLimitState {
  lastPostTime: number | null;
  lastCommentTime: number | null;
  commentsToday: number;
  lastResetDate: string;
  apiCallsThisMinute: number;
  lastMinuteReset: number;
}

const defaultState: RateLimitState = {
  lastPostTime: null,
  lastCommentTime: null,
  commentsToday: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  apiCallsThisMinute: 0,
  lastMinuteReset: Date.now(),
};

export class RateLimitTracker {
  private db: any = null;
  private initialized = false;
  private dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(config.rateLimit.dataPath, 'rate-limits.json');
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(config.rateLimit.dataPath, { recursive: true });

      const { Low } = await import('lowdb');
      const { JSONFile } = await import('lowdb/node');

      const adapter = new JSONFile<RateLimitState>(this.dataFilePath);
      this.db = new Low(adapter, defaultState);

      await this.db.read();
      await this.resetDailyIfNeeded();

      this.initialized = true;
      logger.info('RateLimitTracker initialized', {
        dataPath: this.dataFilePath,
        state: this.db.data,
      });
    } catch (error) {
      logger.error('Failed to initialize RateLimitTracker:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  private async resetDailyIfNeeded(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (this.db.data.lastResetDate !== today) {
      logger.info('New day detected, resetting daily counters', {
        previousDate: this.db.data.lastResetDate,
        newDate: today,
      });
      this.db.data.commentsToday = 0;
      this.db.data.lastResetDate = today;
      await this.db.write();
    }
  }

  async canPost(): Promise<boolean> {
    await this.ensureInitialized();

    const lastPostTime = this.db.data.lastPostTime;
    if (!lastPostTime) {
      logger.debug('canPost: true (no previous post)');
      return true;
    }

    const elapsed = Date.now() - lastPostTime;
    const canPost = elapsed >= config.rateLimit.postIntervalMs;

    logger.debug('canPost check', {
      lastPostTime: new Date(lastPostTime).toISOString(),
      elapsedMs: elapsed,
      requiredMs: config.rateLimit.postIntervalMs,
      canPost,
    });

    return canPost;
  }

  async canComment(): Promise<boolean> {
    await this.ensureInitialized();
    await this.resetDailyIfNeeded();

    if (this.db.data.commentsToday >= config.rateLimit.maxCommentsPerDay) {
      logger.warn('Daily comment quota reached', {
        commentsToday: this.db.data.commentsToday,
        max: config.rateLimit.maxCommentsPerDay,
      });
      return false;
    }

    const lastCommentTime = this.db.data.lastCommentTime;
    if (!lastCommentTime) {
      logger.debug('canComment: true (no previous comment)');
      return true;
    }

    const elapsed = Date.now() - lastCommentTime;
    const canComment = elapsed >= config.rateLimit.commentIntervalMs;

    logger.debug('canComment check', {
      lastCommentTime: new Date(lastCommentTime).toISOString(),
      elapsedMs: elapsed,
      requiredMs: config.rateLimit.commentIntervalMs,
      commentsToday: this.db.data.commentsToday,
      canComment,
    });

    return canComment;
  }

  async recordPost(): Promise<void> {
    await this.ensureInitialized();

    const now = Date.now();
    this.db.data.lastPostTime = now;
    await this.db.write();

    logger.info('Recorded post', {
      postTime: new Date(now).toISOString(),
      nextPostAllowedAt: new Date(now + config.rateLimit.postIntervalMs).toISOString(),
    });
  }

  async recordComment(): Promise<void> {
    await this.ensureInitialized();
    await this.resetDailyIfNeeded();

    const now = Date.now();
    this.db.data.lastCommentTime = now;
    this.db.data.commentsToday += 1;
    await this.db.write();

    logger.info('Recorded comment', {
      commentTime: new Date(now).toISOString(),
      commentsToday: this.db.data.commentsToday,
      remainingToday: config.rateLimit.maxCommentsPerDay - this.db.data.commentsToday,
    });
  }

  async getTimeUntilNextPost(): Promise<number> {
    await this.ensureInitialized();

    const lastPostTime = this.db.data.lastPostTime;
    if (!lastPostTime) {
      return 0;
    }

    const elapsed = Date.now() - lastPostTime;
    const remaining = config.rateLimit.postIntervalMs - elapsed;

    return Math.max(0, remaining);
  }

  async getTimeUntilNextComment(): Promise<number> {
    await this.ensureInitialized();

    const lastCommentTime = this.db.data.lastCommentTime;
    if (!lastCommentTime) {
      return 0;
    }

    const elapsed = Date.now() - lastCommentTime;
    const remaining = config.rateLimit.commentIntervalMs - elapsed;

    return Math.max(0, remaining);
  }

  async getState(): Promise<RateLimitState> {
    await this.ensureInitialized();
    return { ...this.db.data };
  }

  async getRemainingComments(): Promise<number> {
    await this.ensureInitialized();
    await this.resetDailyIfNeeded();
    return config.rateLimit.maxCommentsPerDay - this.db.data.commentsToday;
  }
}

export default RateLimitTracker;
