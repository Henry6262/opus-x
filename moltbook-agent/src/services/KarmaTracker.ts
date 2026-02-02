import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

interface KarmaSnapshot {
  timestamp: string;
  total_karma: number;
  post_karma: number;
  comment_karma: number;
}

interface PostRecord {
  id: string;
  created_at: string;
  submolt: string;
  title: string;
  content: string;
  karma_before: number;
  karma_after: number;
  karma_delta: number;
  template_type?: string;
}

interface CommentRecord {
  id: string;
  created_at: string;
  post_id: string;
  post_title: string;
  post_author: string;
  submolt: string;
  content: string;
  karma_before: number;
  karma_after: number;
  karma_delta: number;
}

interface KarmaDatabase {
  snapshots: KarmaSnapshot[];
  posts: PostRecord[];
  comments: CommentRecord[];
  lastUpdated: string;
}

export class KarmaTracker {
  private db: any;
  private initialized = false;
  private dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(config.rateLimit.dataPath, 'karma.json');
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(config.rateLimit.dataPath, { recursive: true });

      const { Low } = await import('lowdb');
      const { JSONFile } = await import('lowdb/node');

      const adapter = new JSONFile<KarmaDatabase>(this.dataFilePath);

      const defaultData: KarmaDatabase = {
        snapshots: [],
        posts: [],
        comments: [],
        lastUpdated: new Date().toISOString(),
      };

      this.db = new Low(adapter, defaultData);
      await this.db.read();
      this.initialized = true;

      logger.info('KarmaTracker initialized', {
        dataPath: this.dataFilePath,
        snapshots: this.db.data.snapshots.length,
        posts: this.db.data.posts.length,
        comments: this.db.data.comments?.length || 0,
      });
    } catch (error) {
      logger.error('Failed to initialize KarmaTracker:', error);
      throw error;
    }
  }

  async recordSnapshot(profile: {
    karma: number;
    post_karma: number;
    comment_karma: number;
  }): Promise<void> {
    await this.ensureInit();

    const snapshot: KarmaSnapshot = {
      timestamp: new Date().toISOString(),
      total_karma: profile.karma,
      post_karma: profile.post_karma,
      comment_karma: profile.comment_karma,
    };

    this.db.data.snapshots.push(snapshot);
    this.db.data.lastUpdated = snapshot.timestamp;
    await this.db.write();

    logger.debug('Karma snapshot recorded', snapshot);
  }

  async recordPost(
    postId: string,
    submolt: string,
    title: string,
    content: string,
    karmaBefore: number,
    karmaAfter: number,
    templateType?: string
  ): Promise<void> {
    await this.ensureInit();

    const record: PostRecord = {
      id: postId,
      created_at: new Date().toISOString(),
      submolt,
      title,
      content,
      karma_before: karmaBefore,
      karma_after: karmaAfter,
      karma_delta: karmaAfter - karmaBefore,
      template_type: templateType,
    };

    this.db.data.posts.push(record);
    this.db.data.lastUpdated = record.created_at;
    await this.db.write();

    logger.info('Post recorded with karma delta', {
      postId,
      submolt,
      karmaBefore,
      karmaAfter,
      delta: record.karma_delta,
    });
  }

  async recordComment(
    commentId: string,
    postId: string,
    postTitle: string,
    postAuthor: string,
    submolt: string,
    content: string,
    karmaBefore: number,
    karmaAfter: number
  ): Promise<void> {
    await this.ensureInit();

    if (!this.db.data.comments) {
      this.db.data.comments = [];
    }

    const record: CommentRecord = {
      id: commentId,
      created_at: new Date().toISOString(),
      post_id: postId,
      post_title: postTitle,
      post_author: postAuthor,
      submolt,
      content,
      karma_before: karmaBefore,
      karma_after: karmaAfter,
      karma_delta: karmaAfter - karmaBefore,
    };

    this.db.data.comments.push(record);
    this.db.data.lastUpdated = record.created_at;
    await this.db.write();

    logger.info('Comment recorded with karma delta', {
      commentId,
      postAuthor,
      submolt,
      karmaBefore,
      karmaAfter,
      delta: record.karma_delta,
    });
  }

  async getLatestKarma(): Promise<number> {
    await this.ensureInit();
    const latest = this.db.data.snapshots[this.db.data.snapshots.length - 1];
    return latest?.total_karma || 0;
  }

  async getKarmaHistory(limit = 10): Promise<KarmaSnapshot[]> {
    await this.ensureInit();
    return this.db.data.snapshots.slice(-limit);
  }

  async getPostHistory(limit = 10): Promise<PostRecord[]> {
    await this.ensureInit();
    return this.db.data.posts.slice(-limit);
  }

  async getCommentHistory(limit = 10): Promise<CommentRecord[]> {
    await this.ensureInit();
    if (!this.db.data.comments) return [];
    return this.db.data.comments.slice(-limit);
  }

  async getAverageKarmaDelta(): Promise<number> {
    await this.ensureInit();
    const posts = this.db.data.posts;
    if (posts.length === 0) return 0;

    const total = posts.reduce((sum: number, p: PostRecord) => sum + p.karma_delta, 0);
    return total / posts.length;
  }

  async getStats(): Promise<{
    totalSnapshots: number;
    totalPosts: number;
    totalComments: number;
    currentKarma: number;
    averageDelta: number;
    lastUpdated: string;
  }> {
    await this.ensureInit();

    return {
      totalSnapshots: this.db.data.snapshots.length,
      totalPosts: this.db.data.posts.length,
      totalComments: this.db.data.comments?.length || 0,
      currentKarma: await this.getLatestKarma(),
      averageDelta: await this.getAverageKarmaDelta(),
      lastUpdated: this.db.data.lastUpdated,
    };
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

export default KarmaTracker;
