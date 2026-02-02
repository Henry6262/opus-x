import express from 'express';
import KarmaTracker from '../services/KarmaTracker';
import logger from '../utils/logger';

const router = express.Router();
const karmaTracker = new KarmaTracker();

router.get('/', async (req, res) => {
  try {
    await karmaTracker.init();

    const limit = parseInt(req.query.limit as string) || 100;
    const posts = await karmaTracker.getPostHistory(limit);
    const comments = await karmaTracker.getCommentHistory(limit);

    const postsNewestFirst = posts.reverse();
    const commentsNewestFirst = comments.reverse();

    const totalPostKarma = posts.reduce((sum, p) => sum + p.karma_delta, 0);
    const totalCommentKarma = comments.reduce((sum, c) => sum + c.karma_delta, 0);

    res.json({
      success: true,
      posts: postsNewestFirst,
      comments: commentsNewestFirst,
      totals: {
        posts: postsNewestFirst.length,
        comments: commentsNewestFirst.length,
        postKarma: totalPostKarma,
        commentKarma: totalCommentKarma,
        totalKarma: totalPostKarma + totalCommentKarma,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to fetch interactions: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await karmaTracker.init();

    const postId = req.params.id;
    const allPosts = await karmaTracker.getPostHistory(1000);
    const post = allPosts.find(p => p.id === postId);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (error: any) {
    logger.error(`Failed to fetch post: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats/karma', async (req, res) => {
  try {
    await karmaTracker.init();
    const stats = await karmaTracker.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    logger.error(`Failed to fetch karma stats: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
