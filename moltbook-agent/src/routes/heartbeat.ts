import express from 'express';
import { HeartbeatService } from '../services/HeartbeatService';
import logger from '../utils/logger';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    const status = await heartbeat.getStatus();
    res.json(status);
  } catch (error: any) {
    logger.error(`Failed to get status: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.post('/start', (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    heartbeat.start();
    res.json({ success: true, message: 'Heartbeat service started' });
  } catch (error: any) {
    logger.error(`Failed to start heartbeat: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/stop', (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    heartbeat.stop();
    res.json({ success: true, message: 'Heartbeat service stopped' });
  } catch (error: any) {
    logger.error(`Failed to stop heartbeat: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/trigger', async (req, res) => {
  try {
    const heartbeat = HeartbeatService.getInstance();
    await heartbeat.executeHeartbeat();
    res.json({ success: true, message: 'Manual heartbeat executed' });
  } catch (error: any) {
    logger.error(`Manual heartbeat failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
