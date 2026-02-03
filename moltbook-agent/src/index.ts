import express from 'express';
import cors from 'cors';
import config from './config';
import logger from './utils/logger';
import { HeartbeatService } from './services/HeartbeatService';
import MoltbookClient from './services/MoltbookClient';
import { IntelligenceOrchestrator } from './services/intelligence/IntelligenceOrchestrator';
import { initIntelligenceRouter } from './routes/intelligence';
import postsRouter from './routes/posts';
import pnlRouter from './routes/pnl';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/posts', postsRouter);
app.use('/api/pnl', pnlRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SuperRouter-Moltbook',
    version: '1.0.0',
  });
});

// Status endpoint
app.get('/status', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const status = await heartbeat.getStatus();
    res.status(200).json({
      ...status,
      uptime: process.uptime(),
      environment: config.server.env,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Heartbeat controls
app.get('/heartbeat/start', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    await heartbeat.start();
    res.status(200).json({ message: 'Heartbeat started', status: 'running' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start heartbeat' });
  }
});

app.get('/heartbeat/stop', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    heartbeat.stop();
    res.status(200).json({ message: 'Heartbeat stopped', status: 'stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop heartbeat' });
  }
});

// Manual posting trigger
app.post('/post/trigger', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Heartbeat execution timeout (50s)')), 50000)
    );
    const executionPromise = heartbeat.executeHeartbeat();

    await Promise.race([executionPromise, timeoutPromise]);
    res.status(200).json({ message: 'Post cycle executed successfully' });
  } catch (error: any) {
    logger.error('Manual trigger failed:', error);
    res.status(500).json({ error: 'Failed to execute posting cycle', message: error.message });
  }
});

// Viral manifesto trigger
app.post('/post/viral', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const result = await heartbeat.postViralManifesto();
    res.status(200).json({
      message: result.success ? 'Viral manifesto posted' : 'Failed to post',
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post viral manifesto' });
  }
});

// Multi-submolt posting
app.post('/post/multi', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const count = parseInt(req.query.count as string) || 3;
    const results = await heartbeat.postToMultipleSubmolts(count);
    res.status(200).json({
      message: `Posted to ${results.filter(r => r.success).length}/${results.length} submolts`,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post to multiple submolts' });
  }
});

// Comment on trending posts
app.post('/comment/trending', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const count = parseInt(req.query.count as string) || 3;
    const results = await heartbeat.commentOnTrendingPosts(count);
    res.status(200).json({
      message: `Commented on ${results.filter(r => r.success).length}/${results.length} posts`,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to comment on trending posts' });
  }
});

// Submolts discovery
app.get('/api/submolts', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const status = await heartbeat.getStatus();
    res.status(200).json({
      totalDiscovered: status.submolts.discovered,
      topCommunities: status.submolts.topCommunities,
      lastDiscovery: status.submolts.lastDiscovery,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get submolts' });
  }
});

// Learning insights
app.get('/api/learning', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const learningEngine = heartbeat.learningEngine;

    if (!learningEngine) {
      return res.status(500).json({ error: 'Learning engine not initialized' });
    }

    const insights = await learningEngine.getInsights();
    const submoltStats = await learningEngine.getSubmoltStats();

    res.status(200).json({
      success: true,
      insights,
      submoltPerformance: submoltStats.slice(0, 10),
      totalRecords: insights.totalRecords,
    });
  } catch (error: any) {
    logger.error('Failed to get learning insights:', error);
    res.status(500).json({ error: error.message || 'Failed to get learning insights' });
  }
});

const PORT = config.server.port;

// Intelligence system initialization
let intelligenceOrchestrator: IntelligenceOrchestrator | null = null;

async function initializeIntelligence() {
  try {
    logger.info('Initializing Intelligence System...');
    const moltbookClient = new MoltbookClient();
    await moltbookClient.init();

    intelligenceOrchestrator = new IntelligenceOrchestrator(moltbookClient, './data');
    await intelligenceOrchestrator.init();

    const intelligenceRouter = initIntelligenceRouter(intelligenceOrchestrator);
    app.use('/api/intelligence', intelligenceRouter);

    const heartbeat = HeartbeatService.getInstance();
    heartbeat.setIntelligenceOrchestrator(intelligenceOrchestrator);

    logger.info('Intelligence System operational');
  } catch (error) {
    logger.error('Failed to initialize Intelligence System:', error);
    logger.warn('Continuing without intelligence — using fallback targeting');
  }
}

// Start server
initializeIntelligence().then(() => {
  app.listen(PORT, async () => {
    logger.info('SuperRouter Moltbook Agent initialized');
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${config.server.env}`);

    const keyLen = config.moltbook.agentKey?.length || 0;
    const keyPreview = config.moltbook.agentKey
      ? `${config.moltbook.agentKey.substring(0, 12)}...(${keyLen} chars)`
      : 'NOT SET';
    logger.info('Moltbook config:', {
      apiUrl: config.moltbook.apiUrl,
      agentKey: keyPreview,
      username: config.moltbook.username || 'NOT SET',
    });
    logger.info(`Heartbeat interval: ${config.heartbeat.intervalMinutes} minutes`);
    logger.info(`PnL integration: ${config.pnl.enabled ? 'ENABLED' : 'DISABLED'}`);

    // Auto-start heartbeat
    logger.info('Auto-starting heartbeat system...');
    const heartbeat = HeartbeatService.getInstance();
    await heartbeat.start();

    logger.info('Humans trade narratives. Systems trade flows.');

    if (process.send) {
      process.send('ready');
    }
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  const heartbeat = HeartbeatService.getInstance();
  heartbeat.stop();

  if (intelligenceOrchestrator) {
    intelligenceOrchestrator.stop();
    logger.info('Intelligence system stopped');
  }

  try {
    await heartbeat.persistState();
    logger.info('Heartbeat state persisted successfully');
  } catch (error) {
    logger.error('Failed to persist heartbeat state:', error);
  }

  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
