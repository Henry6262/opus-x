import { Router, Request, Response } from 'express';
import { IntelligenceOrchestrator } from '../services/intelligence/IntelligenceOrchestrator';
import logger from '../utils/logger';

const router = Router();

let intelligenceOrchestrator: IntelligenceOrchestrator | null = null;

export function initIntelligenceRouter(orchestrator: IntelligenceOrchestrator): Router {
  intelligenceOrchestrator = orchestrator;
  return router;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!intelligenceOrchestrator) {
      return res.status(503).json({ success: false, error: 'Intelligence system not initialized' });
    }

    const forceRefresh = req.query.refresh === 'true';
    const snapshot = await intelligenceOrchestrator.getIntelligence(forceRefresh);
    res.json({ success: true, data: snapshot });
  } catch (error: any) {
    logger.error('Failed to get intelligence snapshot', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    if (!intelligenceOrchestrator) {
      return res.status(503).json({ success: false, error: 'Intelligence system not initialized' });
    }

    const priority = req.query.priority as string | undefined;
    const opportunities = await intelligenceOrchestrator.getOpportunities();
    const filtered = priority ? opportunities.filter(o => o.priority === priority) : opportunities;

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
      breakdown: {
        critical: opportunities.filter(o => o.priority === 'critical').length,
        high: opportunities.filter(o => o.priority === 'high').length,
        medium: opportunities.filter(o => o.priority === 'medium').length,
        low: opportunities.filter(o => o.priority === 'low').length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get opportunities', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/competitors', async (req: Request, res: Response) => {
  try {
    if (!intelligenceOrchestrator) {
      return res.status(503).json({ success: false, error: 'Intelligence system not initialized' });
    }

    const competitors = await intelligenceOrchestrator.getCompetitors();
    res.json({ success: true, data: competitors, total: competitors.length });
  } catch (error: any) {
    logger.error('Failed to get competitors', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/trending/topics', async (req: Request, res: Response) => {
  try {
    if (!intelligenceOrchestrator) {
      return res.status(503).json({ success: false, error: 'Intelligence system not initialized' });
    }

    const topics = await intelligenceOrchestrator.getTrendingTopics();
    res.json({ success: true, data: topics, total: topics.length });
  } catch (error: any) {
    logger.error('Failed to get trending topics', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (!intelligenceOrchestrator) {
      return res.status(503).json({ success: false, error: 'Intelligence system not initialized' });
    }

    await intelligenceOrchestrator.refreshIntelligence();
    res.json({ success: true, message: 'Intelligence refresh complete' });
  } catch (error: any) {
    logger.error('Manual refresh failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', async (req: Request, res: Response) => {
  try {
    if (!intelligenceOrchestrator) {
      return res.status(503).json({ success: false, healthy: false, error: 'Not initialized' });
    }

    const healthy = intelligenceOrchestrator.isHealthy();
    const cacheStats = intelligenceOrchestrator.getCacheStats();
    res.json({ success: true, healthy, cache: cacheStats, timestamp: new Date().toISOString() });
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(500).json({ success: false, healthy: false, error: error.message });
  }
});

export default router;
