/**
 * PnL Webhook Routes — Receives real PnL data from DevPrint trading engine
 */

import express from 'express';
import { PnLIntegration } from '../services/PnLIntegration';
import config from '../config';
import logger from '../utils/logger';
import { PnLSnapshot } from '../types/pnl';

const router = express.Router();
const pnlIntegration = new PnLIntegration();

/**
 * POST /api/pnl/snapshot — Receive PnL snapshot from trading engine
 */
router.post('/snapshot', (req, res) => {
  try {
    // Validate webhook secret
    const secret = req.headers['x-webhook-secret'] as string;
    if (config.pnl.webhookSecret && !pnlIntegration.validateWebhookSecret(secret)) {
      logger.warn('PnL webhook: invalid secret');
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const snapshot: PnLSnapshot = {
      totalPnL: req.body.totalPnL || req.body.total_pnl || 0,
      dailyPnL: req.body.dailyPnL || req.body.daily_pnl || 0,
      winRate: req.body.winRate || req.body.win_rate || 0,
      tradesExecuted: req.body.tradesExecuted || req.body.trades_executed || 0,
      avgLatencyMs: req.body.avgLatencyMs || req.body.avg_latency_ms || 0,
      openPositions: req.body.openPositions || req.body.open_positions || 0,
      closedPositions: req.body.closedPositions || req.body.closed_positions || 0,
      totalUnrealizedPnl: req.body.totalUnrealizedPnl || req.body.total_unrealized_pnl || 0,
      totalRealizedPnl: req.body.totalRealizedPnl || req.body.total_realized_pnl || 0,
      bestTradePct: req.body.bestTradePct || req.body.best_trade_pct || 0,
      worstTradePct: req.body.worstTradePct || req.body.worst_trade_pct || 0,
      avgHoldTimeMinutes: req.body.avgHoldTimeMinutes || req.body.avg_hold_time_minutes || 0,
      timestamp: new Date().toISOString(),
    };

    pnlIntegration.updateSnapshot(snapshot);

    res.json({ success: true, message: 'PnL snapshot received' });
  } catch (error: any) {
    logger.error('Failed to process PnL snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pnl/latest — Get latest PnL snapshot
 */
router.get('/latest', (req, res) => {
  const snapshot = pnlIntegration.getLatestSnapshot();
  if (!snapshot) {
    return res.status(404).json({ success: false, error: 'No PnL data available' });
  }
  res.json({ success: true, data: snapshot });
});

/**
 * POST /api/pnl/fetch — Force fetch from DevPrint backend
 */
router.post('/fetch', async (req, res) => {
  try {
    const snapshot = await pnlIntegration.fetchFromBackend();
    if (!snapshot) {
      return res.status(503).json({ success: false, error: 'Failed to fetch PnL data' });
    }
    res.json({ success: true, data: snapshot });
  } catch (error: any) {
    logger.error('Failed to fetch PnL:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
