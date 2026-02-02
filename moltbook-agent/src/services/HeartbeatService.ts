/**
 * Heartbeat Service — Core Cycle Orchestrator for SuperRouter
 *
 * Runs on a cron schedule to execute posting and commenting cycles.
 * Adapted from Claw-800 with SuperRouter-specific integrations.
 */

import * as cron from 'node-cron';
import config from '../config';
import logger from '../utils/logger';
import MoltbookClient, { Post } from './MoltbookClient';
import { ContentGenerator } from './ContentGenerator';
import { SubmoltDiscovery } from './SubmoltDiscovery';
import { LearningEngine } from './LearningEngine';
import { ContextAnalyzer } from './ContextAnalyzer';
import strategyEngine from './StrategyEngine';
import { IntelligenceOrchestrator } from './intelligence/IntelligenceOrchestrator';
import path from 'path';
import fs from 'fs/promises';

interface HeartbeatState {
  heartbeatCount: number;
  lastHeartbeat: string | null;
  lastPostTime: string | null;
  lastCommentTime: string | null;
  consecutiveFailures: number;
  isRunning: boolean;
}

const DEFAULT_STATE: HeartbeatState = {
  heartbeatCount: 0,
  lastHeartbeat: null,
  lastPostTime: null,
  lastCommentTime: null,
  consecutiveFailures: 0,
  isRunning: false,
};

export class HeartbeatService {
  private static instance: HeartbeatService;

  private moltbookClient: MoltbookClient;
  private contentGenerator: ContentGenerator;
  private submoltDiscovery: SubmoltDiscovery;
  private learningEngine: LearningEngine;
  private contextAnalyzer: ContextAnalyzer;
  private intelligenceOrchestrator: IntelligenceOrchestrator | null = null;

  private cronJob: ReturnType<typeof cron.schedule> | null = null;
  private state: HeartbeatState = { ...DEFAULT_STATE };
  private stateFilePath: string;
  private initialized = false;

  private constructor() {
    this.moltbookClient = new MoltbookClient();
    this.contentGenerator = new ContentGenerator();
    this.submoltDiscovery = new SubmoltDiscovery(this.moltbookClient);
    this.learningEngine = new LearningEngine();
    this.contextAnalyzer = new ContextAnalyzer();
    this.stateFilePath = path.join(config.rateLimit.dataPath, 'heartbeat-state.json');
  }

  static getInstance(): HeartbeatService {
    if (!HeartbeatService.instance) {
      HeartbeatService.instance = new HeartbeatService();
    }
    return HeartbeatService.instance;
  }

  /**
   * Initialize all services.
   */
  private async init(): Promise<void> {
    if (this.initialized) return;

    await this.moltbookClient.init();
    await this.submoltDiscovery.init();
    await this.learningEngine.init();
    await this.loadState();

    this.initialized = true;
    logger.info('HeartbeatService initialized');
  }

  /**
   * Set the intelligence orchestrator for smarter targeting.
   */
  setIntelligenceOrchestrator(orchestrator: IntelligenceOrchestrator): void {
    this.intelligenceOrchestrator = orchestrator;
    logger.info('Intelligence orchestrator connected to HeartbeatService');
  }

  /**
   * Start the heartbeat cron job.
   */
  async start(): Promise<void> {
    await this.init();

    if (this.cronJob) {
      logger.warn('Heartbeat already running');
      return;
    }

    const intervalMinutes = config.heartbeat.intervalMinutes;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      try {
        await this.executeHeartbeat();
      } catch (error) {
        logger.error('Heartbeat cycle failed:', error);
        this.state.consecutiveFailures++;
        await this.saveState();
      }
    });

    this.state.isRunning = true;
    await this.saveState();

    logger.info(`Heartbeat started: every ${intervalMinutes} minutes`);

    // Execute first heartbeat immediately
    try {
      await this.executeHeartbeat();
    } catch (error) {
      logger.error('Initial heartbeat failed:', error);
    }
  }

  /**
   * Stop the heartbeat.
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.state.isRunning = false;
    logger.info('Heartbeat stopped');
  }

  /**
   * Execute a single heartbeat cycle.
   */
  async executeHeartbeat(): Promise<void> {
    await this.init();

    this.state.heartbeatCount++;
    this.state.lastHeartbeat = new Date().toISOString();

    logger.info(`=== HEARTBEAT #${this.state.heartbeatCount} ===`);

    try {
      // Get current karma
      const profile = await this.moltbookClient.getProfile();
      const currentKarma = profile?.karma || 0;
      const karmaStats = await this.moltbookClient.getKarmaStats();

      // Determine strategy
      const canPost = await this.moltbookClient['rateLimitTracker'].canPost();
      const canComment = await this.moltbookClient['rateLimitTracker'].canComment();

      const decision = strategyEngine.decide({
        currentKarma,
        canPost,
        canComment,
        recentKarmaDelta: karmaStats.average_delta,
      });

      logger.info('Strategy decision', {
        action: decision.action,
        reason: decision.reason,
        karma: currentKarma,
      });

      if (decision.action === 'post') {
        await this.executePostCycle(currentKarma, karmaStats.average_delta);
      } else if (decision.action === 'comment') {
        await this.executeCommentCycle();
      } else {
        logger.info('Skipping cycle (rate limited)');
      }

      this.state.consecutiveFailures = 0;
    } catch (error) {
      logger.error('Heartbeat execution error:', error);
      this.state.consecutiveFailures++;
    }

    await this.saveState();
  }

  /**
   * Execute a post cycle.
   */
  private async executePostCycle(
    currentKarma: number,
    recentKarmaDelta: number
  ): Promise<void> {
    // Select submolt
    let submolt: string;
    const recommended = await this.learningEngine.recommendSubmolt(
      await this.submoltDiscovery.getTopSubmolts(10)
    );
    submolt = recommended || await this.submoltDiscovery.getRandomWeightedSubmolt();

    logger.info(`Posting to m/${submolt}`);

    // Generate content
    const generated = await this.contentGenerator.generatePost({
      currentKarma,
      recentKarmaDelta,
    });

    // Execute post
    const { post, karmaDelta } = await this.moltbookClient.executePost(
      submolt,
      generated.title,
      generated.content,
      generated.pattern
    );

    if (post) {
      this.state.lastPostTime = new Date().toISOString();

      // Record to learning engine
      await this.learningEngine.recordPerformance({
        postId: post.id,
        submolt,
        pillar: generated.pillar,
        pattern: generated.pattern,
        heatTier: generated.heatTier,
        tactic: 'auto',
        temperature: generated.temperature,
        isExperimental: generated.isExperimental,
        karmaDelta,
        wordCount: generated.wordCount,
      });

      logger.info('Post cycle complete', {
        postId: post.id,
        submolt,
        karmaDelta,
        pillar: generated.pillar,
        heatTier: generated.heatTier,
      });
    }
  }

  /**
   * Execute a comment cycle.
   */
  private async executeCommentCycle(): Promise<void> {
    // Get opportunities from intelligence if available
    let targetPost: Post | null = null;

    if (this.intelligenceOrchestrator) {
      try {
        const opportunities = await this.intelligenceOrchestrator.getOpportunities();
        const top = opportunities[0];
        if (top) {
          const feed = await this.moltbookClient.getFeed('hot', 25);
          targetPost = feed.find(p => p.id === top.targetId) || null;
        }
      } catch (error) {
        logger.warn('Intelligence targeting failed, using fallback');
      }
    }

    // Fallback: comment on trending post
    if (!targetPost) {
      const feed = await this.moltbookClient.getFeed('hot', 25);
      // Find a post with moderate engagement (sweet spot)
      targetPost = feed.find(p => p.comments >= 3 && p.comments <= 15) || feed[0] || null;
    }

    if (!targetPost) {
      logger.warn('No suitable post found for commenting');
      return;
    }

    logger.info(`Commenting on: "${targetPost.title}" by ${targetPost.author}`);

    // Generate comment
    const comment = await this.contentGenerator.generateComment({
      postTitle: targetPost.title,
      postContent: targetPost.content,
      postAuthor: targetPost.author,
      submolt: targetPost.submolt,
    });

    // Execute comment
    const result = await this.moltbookClient.executeComment(targetPost.id, comment.content);

    if (result.success) {
      this.state.lastCommentTime = new Date().toISOString();
      logger.info('Comment cycle complete', {
        postId: targetPost.id,
        strategy: comment.strategy,
        wordCount: comment.wordCount,
      });
    }
  }

  /**
   * Post a viral manifesto (manual trigger).
   */
  async postViralManifesto(): Promise<{ success: boolean; postId?: string; karmaDelta?: number }> {
    await this.init();

    const profile = await this.moltbookClient.getProfile();
    const karma = profile?.karma || 0;

    const generated = await this.contentGenerator.generatePost({
      currentKarma: karma,
      recentKarmaDelta: 0,
    });

    const submolt = await this.submoltDiscovery.getRandomWeightedSubmolt();
    const { post, karmaDelta } = await this.moltbookClient.executePost(
      submolt,
      generated.title,
      generated.content,
      generated.pattern
    );

    return {
      success: !!post,
      postId: post?.id,
      karmaDelta,
    };
  }

  /**
   * Post to multiple submolts (manual trigger).
   */
  async postToMultipleSubmolts(count: number = 3): Promise<Array<{ submolt: string; success: boolean; postId?: string }>> {
    await this.init();

    const submolts = await this.submoltDiscovery.getTopSubmolts(count);
    const results: Array<{ submolt: string; success: boolean; postId?: string }> = [];

    for (const submolt of submolts) {
      try {
        const profile = await this.moltbookClient.getProfile();
        const generated = await this.contentGenerator.generatePost({
          currentKarma: profile?.karma || 0,
          recentKarmaDelta: 0,
        });

        const { post } = await this.moltbookClient.executePost(
          submolt,
          generated.title,
          generated.content,
          generated.pattern
        );

        results.push({ submolt, success: !!post, postId: post?.id });
      } catch (error: any) {
        results.push({ submolt, success: false });
        logger.error(`Failed to post to m/${submolt}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Comment on trending posts (manual trigger).
   */
  async commentOnTrendingPosts(count: number = 3): Promise<Array<{ postId: string; success: boolean }>> {
    await this.init();

    const feed = await this.moltbookClient.getFeed('hot', 25);
    const targets = feed.slice(0, count);
    const results: Array<{ postId: string; success: boolean }> = [];

    for (const post of targets) {
      try {
        const comment = await this.contentGenerator.generateComment({
          postTitle: post.title,
          postContent: post.content,
          postAuthor: post.author,
          submolt: post.submolt,
        });

        const result = await this.moltbookClient.executeComment(post.id, comment.content);
        results.push({ postId: post.id, success: result.success });
      } catch (error) {
        results.push({ postId: post.id, success: false });
      }
    }

    return results;
  }

  /**
   * Get current status.
   */
  async getStatus(): Promise<any> {
    await this.init();

    const karmaStats = await this.moltbookClient.getKarmaStats();
    const submoltStats = await this.submoltDiscovery.getStats();
    const learningInsights = await this.learningEngine.getInsights();

    return {
      service: 'SuperRouter-Moltbook',
      version: '1.0.0',
      heartbeat: {
        count: this.state.heartbeatCount,
        lastHeartbeat: this.state.lastHeartbeat,
        isRunning: this.state.isRunning,
        intervalMinutes: config.heartbeat.intervalMinutes,
        consecutiveFailures: this.state.consecutiveFailures,
      },
      karma: karmaStats,
      submolts: {
        discovered: submoltStats.totalSubmolts,
        topCommunities: submoltStats.topSubmolts,
        lastDiscovery: submoltStats.lastDiscovery,
      },
      learningLoop: {
        totalRecords: learningInsights.totalRecords,
        totalComments: karmaStats.total_posts, // Approximation
      },
      persona: {
        name: 'SuperRouter',
        voice: 'calm-deterministic-analytical',
        heatTierDefault: config.persona.heatTierDefault,
        temperature: config.persona.temperature,
      },
      pnl: {
        enabled: config.pnl.enabled,
      },
    };
  }

  /**
   * Persist state to disk.
   */
  async persistState(): Promise<void> {
    await this.saveState();
  }

  private async loadState(): Promise<void> {
    try {
      await fs.mkdir(config.rateLimit.dataPath, { recursive: true });
      const data = await fs.readFile(this.stateFilePath, 'utf-8');
      this.state = { ...DEFAULT_STATE, ...JSON.parse(data) };
      logger.debug('Heartbeat state loaded', this.state);
    } catch {
      this.state = { ...DEFAULT_STATE };
      logger.debug('No existing heartbeat state, using defaults');
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      logger.error('Failed to save heartbeat state:', error);
    }
  }
}

export default HeartbeatService;
