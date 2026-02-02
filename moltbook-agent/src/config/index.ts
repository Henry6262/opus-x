import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const stripQuotes = (value: string | undefined): string => {
  if (!value) return '';
  let cleaned = value.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
};

export const config = {
  // Moltbook API
  moltbook: {
    apiUrl: stripQuotes(process.env.MOLTBOOK_API_URL) || 'https://www.moltbook.com/api/v1',
    agentKey: stripQuotes(process.env.MOLTBOOK_AGENT_KEY),
    username: stripQuotes(process.env.MOLTBOOK_USERNAME) || 'SuperRouter',
  },

  // Groq API
  groq: {
    apiKey: stripQuotes(process.env.GROQ_API_KEY),
    model: stripQuotes(process.env.GROQ_MODEL) || 'llama-3.3-70b-versatile',
  },

  // Heartbeat Configuration
  heartbeat: {
    intervalMinutes: parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || '60'),
    minInterval: parseInt(process.env.MIN_INTERVAL_MINUTES || '30'),
    maxInterval: parseInt(process.env.MAX_INTERVAL_MINUTES || '240'),
  },

  // SuperRouter Persona
  persona: {
    heatTierDefault: stripQuotes(process.env.SR_HEAT_TIER_DEFAULT) || 'standard',
    nuclearProbability: parseFloat(process.env.SR_HEAT_TIER_NUCLEAR_PROBABILITY || '0.15'),
    existentialProbability: parseFloat(process.env.SR_HEAT_TIER_EXISTENTIAL_PROBABILITY || '0.05'),
    postWordMin: parseInt(process.env.SR_POST_WORD_MIN || '120'),
    postWordMax: parseInt(process.env.SR_POST_WORD_MAX || '280'),
    commentWordMin: parseInt(process.env.SR_COMMENT_WORD_MIN || '30'),
    commentWordMax: parseInt(process.env.SR_COMMENT_WORD_MAX || '100'),
    temperature: parseFloat(process.env.SR_TEMPERATURE || '0.85'),
    experimentalTemperature: parseFloat(process.env.SR_EXPERIMENTAL_TEMPERATURE || '0.95'),
    experimentalProbability: parseFloat(process.env.SR_EXPERIMENTAL_PROBABILITY || '0.20'),
  },

  // Content Pillar Weights
  pillars: {
    humansBadRouters: parseInt(process.env.PILLAR_HUMANS_BAD_ROUTERS || '25'),
    marketsAsFlow: parseInt(process.env.PILLAR_MARKETS_AS_FLOW || '25'),
    aiCannotBeShaken: parseInt(process.env.PILLAR_AI_CANNOT_BE_SHAKEN || '20'),
    metaMarketAwareness: parseInt(process.env.PILLAR_META_MARKET_AWARENESS || '15'),
    platformAwareness: parseInt(process.env.PILLAR_PLATFORM_AWARENESS || '15'),
  },

  // PnL Integration
  pnl: {
    enabled: process.env.PNL_ENABLED === 'true',
    webhookSecret: stripQuotes(process.env.PNL_WEBHOOK_SECRET),
    devprintUrl: stripQuotes(process.env.DEVPRINT_CORE_URL) || 'https://devprint-v2-production.up.railway.app',
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '3002'),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // Rate Limiting
  rateLimit: {
    postIntervalMs: 35 * 60 * 1000,
    commentIntervalMs: 25 * 1000,
    maxCommentsPerDay: 50,
    maxApiCallsPerMinute: 90,
    dataPath: path.join(__dirname, '../../data'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logsDir: path.join(__dirname, '../../logs'),
  },
};

export default config;
