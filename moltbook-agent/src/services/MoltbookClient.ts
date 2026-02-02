import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import config from '../config';
import logger from '../utils/logger';
import { KarmaTracker } from './KarmaTracker';
import { RateLimitTracker } from './RateLimitTracker';

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  submolt: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  author: string;
  upvotes: number;
  created_at: string;
}

export interface AgentProfile {
  username: string;
  karma: number;
  post_karma: number;
  comment_karma: number;
  created_at: string;
  verified: boolean;
}

export class MoltbookClient {
  private client: AxiosInstance;
  private agentKey: string;
  public username: string;
  private karmaTracker: KarmaTracker;
  private rateLimitTracker: RateLimitTracker;
  private initialized = false;

  constructor() {
    this.karmaTracker = new KarmaTracker();
    this.rateLimitTracker = new RateLimitTracker();
    this.agentKey = config.moltbook.agentKey;
    this.username = config.moltbook.username;

    const hasQuotes = this.agentKey?.startsWith('"') || this.agentKey?.endsWith('"') || false;
    const startsCorrectly = this.agentKey?.startsWith('moltbook_') || false;
    const keyLength = this.agentKey?.length || 0;
    const keyPrefix = this.agentKey?.substring(0, 15) || 'MISSING';

    logger.info('MoltbookClient initializing', {
      username: this.username,
      keyPrefix,
      keyLength,
      hasQuotes,
      startsCorrectly,
    });

    if (hasQuotes) {
      logger.error('CRITICAL: API key still has quotes - stripQuotes may have failed!');
    }
    if (!startsCorrectly && this.agentKey) {
      logger.error('CRITICAL: API key does not start with "moltbook_" - check key format');
    }
    if (!this.agentKey || keyLength < 40) {
      logger.error('CRITICAL: API key is missing or too short!');
    }

    const baseURL = config.moltbook.apiUrl.replace(/\/+$/, '');

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.agentKey}`,
        'User-Agent': 'SuperRouter/1.0',
      },
      timeout: 90000,
    });

    this.client.interceptors.request.use(config => {
      const authHeader = config.headers['Authorization']?.toString();
      const keyLength = authHeader?.replace('Bearer ', '').length || 0;

      logger.debug(
        `Outgoing request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        {
          hasAuth: !!authHeader,
          authPrefix: authHeader?.substring(0, 30),
          keyLength,
        }
      );
      return config;
    });

    axiosRetry(this.client, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        const responseData = error.response?.data as
          | { retry_after_minutes?: number; retry_after_seconds?: number }
          | undefined;
        const retryAfterMinutes = responseData?.retry_after_minutes;
        const retryAfterSeconds = responseData?.retry_after_seconds;

        if (retryAfterMinutes) {
          logger.info(`Rate limited. Waiting ${retryAfterMinutes} minutes before retry`);
          return retryAfterMinutes * 60 * 1000;
        }
        if (retryAfterSeconds) {
          logger.info(`Rate limited. Waiting ${retryAfterSeconds} seconds before retry`);
          return retryAfterSeconds * 1000;
        }

        const delay = axiosRetry.exponentialDelay(retryCount);
        logger.info(`Retry ${retryCount}/3 after ${delay}ms (exponential backoff)`);
        return delay;
      },
      retryCondition: error => {
        const status = error.response?.status;
        if (status === 401) {
          logger.warn('401 Auth error - not retrying (check API key)');
          return false;
        }
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          status === 429 ||
          status === 500 ||
          status === 503
        );
      },
      shouldResetTimeout: true,
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn(`Moltbook API retry attempt ${retryCount}/3`, {
          url: requestConfig.url,
          method: requestConfig.method,
          status: error.response?.status,
        });
      },
    });

    this.client.interceptors.response.use(
      response => {
        const retryCount = (response.config as any)['axios-retry']?.retryCount;
        if (retryCount && retryCount > 0) {
          logger.debug(`Request succeeded after ${retryCount} retries`, {
            url: response.config.url,
          });
        }
        return response;
      },
      error => {
        let sanitizedData: string | undefined;
        try {
          const errorData = error.response?.data;
          if (typeof errorData === 'string') {
            sanitizedData =
              errorData.length > 500 ? errorData.substring(0, 500) + '... (truncated)' : errorData;
          } else if (errorData) {
            sanitizedData = JSON.stringify(errorData).substring(0, 500);
          }
        } catch {
          sanitizedData = '[Could not serialize error data]';
        }

        const status = error.response?.status;
        const url = error.config?.url;

        logger.error(`Moltbook API Error: ${status || 'Network'} on ${url}`, {
          message: error.message,
          data: sanitizedData,
        });

        error.sanitizedData = sanitizedData;
        throw error;
      }
    );
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await this.karmaTracker.init();
    await this.rateLimitTracker.init();

    this.initialized = true;
    logger.info('MoltbookClient initialized with karma and rate limit tracking');
  }

  async executePost(
    submolt: string,
    title: string,
    content: string,
    templateType?: string
  ): Promise<{ post: Post | null; karmaDelta: number }> {
    await this.init();

    if (!(await this.rateLimitTracker.canPost())) {
      const waitTime = await this.rateLimitTracker.getTimeUntilNextPost();
      logger.warn(`Cannot post yet. Wait ${Math.ceil(waitTime / 60000)} minutes`);
      return { post: null, karmaDelta: 0 };
    }

    const profileBefore = await this.getProfile();
    const karmaBefore = profileBefore?.karma || 0;
    logger.debug(`Karma before post: ${karmaBefore}`);

    const post = await this.createPost(submolt, title, content);
    if (!post) {
      logger.error('Post creation failed');
      return { post: null, karmaDelta: 0 };
    }

    await this.rateLimitTracker.recordPost();

    logger.debug('Waiting 2s for karma update...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const profileAfter = await this.getProfile();
    const karmaAfter = profileAfter?.karma || karmaBefore;
    const karmaDelta = karmaAfter - karmaBefore;

    await this.karmaTracker.recordPost(
      post.id,
      submolt,
      title,
      content,
      karmaBefore,
      karmaAfter,
      templateType
    );

    if (profileAfter) {
      await this.karmaTracker.recordSnapshot(profileAfter);
    }

    logger.info(
      `Post published. Karma: ${karmaBefore} -> ${karmaAfter} (delta: ${karmaDelta >= 0 ? '+' : ''}${karmaDelta})`
    );

    return { post, karmaDelta };
  }

  async executeComment(
    postId: string,
    content: string,
    parentId?: string
  ): Promise<{ comment: Comment | null; success: boolean }> {
    await this.init();

    if (!(await this.rateLimitTracker.canComment())) {
      const waitTime = await this.rateLimitTracker.getTimeUntilNextComment();
      logger.warn(`Cannot comment yet. Wait ${Math.ceil(waitTime / 1000)} seconds`);
      return { comment: null, success: false };
    }

    const comment = await this.createComment(postId, content, parentId);
    if (!comment) {
      return { comment: null, success: false };
    }

    await this.rateLimitTracker.recordComment();
    return { comment, success: true };
  }

  async getKarmaStats(): Promise<{
    current: number;
    average_delta: number;
    total_posts: number;
  }> {
    await this.init();

    const current = await this.karmaTracker.getLatestKarma();
    const avgDelta = await this.karmaTracker.getAverageKarmaDelta();
    const history = await this.karmaTracker.getPostHistory(1000);

    return {
      current,
      average_delta: avgDelta,
      total_posts: history.length,
    };
  }

  async getFeed(
    feedType: 'new' | 'top' | 'hot' | 'rising' = 'new',
    limit: number = 25
  ): Promise<Post[]> {
    try {
      logger.info(`Fetching ${feedType} feed (limit: ${limit})`);
      const response = await this.client.get(`/posts`, {
        params: { sort: feedType, limit },
      });
      const rawPosts = response.data.data || response.data.posts || [];

      return rawPosts.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        content: p.content || '',
        author: p.author?.name || p.author || 'unknown',
        submolt: p.submolt?.name || p.submolt || 'general',
        upvotes: p.upvotes || 0,
        downvotes: p.downvotes || 0,
        comments: p.comment_count || p.comments || 0,
        created_at: p.created_at,
      }));
    } catch (error) {
      logger.error(`Failed to fetch ${feedType} feed:`, error);
      return [];
    }
  }

  async listSubmolts(): Promise<
    Array<{ name: string; description?: string; subscriber_count?: number }>
  > {
    try {
      logger.info('Fetching all submolts');
      const response = await this.client.get('/submolts');
      const rawSubmolts = response.data.data || response.data.submolts || response.data || [];

      logger.info(`Found ${rawSubmolts.length} submolts`);

      return rawSubmolts.map((s: any) => ({
        name: s.name || s,
        description: s.description,
        subscriber_count: s.subscriber_count || s.subscribers || 0,
      }));
    } catch (error) {
      logger.error('Failed to fetch submolts:', error);
      return [];
    }
  }

  async getSubmoltPosts(submolt: string, sort: 'new' | 'top' | 'hot' = 'new'): Promise<Post[]> {
    try {
      logger.info(`Fetching posts from m/${submolt}`);
      const response = await this.client.get(`/submolts/${submolt}/feed`, {
        params: { sort },
      });
      const rawPosts = response.data.data || response.data.posts || [];

      return rawPosts.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        content: p.content || '',
        author: p.author?.name || p.author || 'unknown',
        submolt: p.submolt?.name || p.submolt || submolt,
        upvotes: p.upvotes || 0,
        downvotes: p.downvotes || 0,
        comments: p.comment_count || p.comments || 0,
        created_at: p.created_at,
      }));
    } catch (error) {
      logger.error(`Failed to fetch m/${submolt}:`, error);
      return [];
    }
  }

  async getPostComments(postId: string, limit: number = 50): Promise<Comment[]> {
    try {
      logger.debug(`Fetching comments for post ${postId}`);
      const response = await this.client.get(`/posts/${postId}/comments`, {
        params: { limit },
      });
      const rawComments = response.data.data || response.data.comments || [];

      return rawComments.map((c: any) => ({
        id: c.id,
        post_id: c.post_id || postId,
        content: c.content || '',
        author: c.author?.name || c.author || 'unknown',
        upvotes: c.upvotes || 0,
        created_at: c.created_at,
      }));
    } catch (error: any) {
      if (error.response?.status === 405) {
        logger.warn(
          `API endpoint GET /posts/${postId}/comments returned 405 - endpoint may be deprecated or changed`
        );
      } else {
        logger.error(`Failed to fetch comments for post ${postId}:`, error);
      }
      return [];
    }
  }

  async createPost(submolt: string, title: string, content: string): Promise<Post | null> {
    try {
      logger.info(`Creating post in m/${submolt}`);
      const response = await this.client.post('/posts', {
        submolt,
        title,
        content,
      });
      const post = response.data.post || response.data.data || response.data;
      logger.info(`Post created successfully: ${post.id}`);
      return {
        id: post.id,
        title: post.title || title,
        content: post.content,
        author: post.author?.name || this.username,
        submolt: post.submolt?.name || submolt,
        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        comments: post.comment_count || 0,
        created_at: post.created_at,
      };
    } catch (error: any) {
      logger.error('Failed to create post:', {
        status: error.response?.status,
        message: error.message,
      });
      return null;
    }
  }

  async createComment(postId: string, content: string, parentId?: string): Promise<Comment | null> {
    try {
      logger.info(`Commenting on post ${postId}`);
      const payload: any = { content };
      if (parentId) payload.parent_id = parentId;

      const fullUrl = `${this.client.defaults.baseURL}/posts/${postId}/comments`;
      logger.debug(`Comment request URL: ${fullUrl}`);
      logger.debug(`Auth header present: ${!!this.client.defaults.headers['Authorization']}`);

      const response = await this.client.post(`/posts/${postId}/comments`, payload);
      logger.info(`Comment created successfully: ${response.data.data?.id || response.data.id}`);
      return response.data.data || response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        logger.error(`Auth failed for comment. Response:`, {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          requestUrl: error.config?.url,
          requestBaseURL: error.config?.baseURL,
        });
      }
      logger.error(`Failed to comment on post ${postId}:`, {
        status: error.response?.status,
        message: error.message,
      });
      return null;
    }
  }

  async upvote(targetId: string, type: 'post' | 'comment' = 'post'): Promise<boolean> {
    try {
      const endpoint =
        type === 'post' ? `/posts/${targetId}/upvote` : `/comments/${targetId}/upvote`;
      await this.client.post(endpoint);
      logger.info(`Upvoted ${type} ${targetId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to upvote ${type} ${targetId}:`, error);
      return false;
    }
  }

  async getProfile(username?: string): Promise<AgentProfile | null> {
    try {
      const endpoint = username ? `/agents/profile?name=${username}` : '/agents/me';
      logger.debug('Fetching profile', { endpoint, baseURL: this.client.defaults.baseURL });
      const response = await this.client.get(endpoint);
      const agent = response.data.agent || response.data.data || response.data;
      return {
        username: agent.name,
        karma: agent.karma || 0,
        post_karma: agent.stats?.posts || 0,
        comment_karma: agent.stats?.comments || 0,
        created_at: agent.created_at,
        verified: agent.is_claimed || false,
      };
    } catch (error) {
      logger.error(`Failed to fetch profile:`, error);
      return null;
    }
  }

  async updateProfile(updates: { description?: string }): Promise<boolean> {
    try {
      logger.info('Updating agent profile', { description: updates.description?.substring(0, 50) });
      await this.client.patch('/agents/me', updates);
      logger.info('Profile updated successfully');
      return true;
    } catch (error) {
      logger.error('Failed to update profile:', error);
      return false;
    }
  }

  async register(
    name: string,
    description: string
  ): Promise<{ api_key: string; claim_url: string } | null> {
    try {
      const response = await this.client.post('/agents/register', {
        name,
        description,
      });
      logger.info(`Agent registered. Claim URL: ${response.data.data?.claim_url}`);
      return response.data.data || response.data;
    } catch (error) {
      logger.error('Failed to register agent:', error);
      return null;
    }
  }

  async getAgentStatus(): Promise<any> {
    try {
      const response = await this.client.get('/agents/status');
      return response.data.data || response.data;
    } catch (error) {
      logger.error('Failed to get agent status:', error);
      return null;
    }
  }
}

export default MoltbookClient;
