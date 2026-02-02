import express from 'express';
import MoltbookClient from '../services/MoltbookClient';
import logger from '../utils/logger';

const router = express.Router();
const moltbookClient = new MoltbookClient();

router.get('/profile', async (req, res) => {
  try {
    const username = req.query.username as string | undefined;
    const profile = await moltbookClient.getProfile(username);
    res.json(profile);
  } catch (error: any) {
    logger.error(`Failed to fetch profile: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.get('/feed/:type', async (req, res) => {
  try {
    const feedType = req.params.type as 'new' | 'top' | 'hot' | 'rising';
    const limit = parseInt(req.query.limit as string) || 25;
    const posts = await moltbookClient.getFeed(feedType, limit);
    res.json(posts);
  } catch (error: any) {
    logger.error(`Failed to fetch feed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;
