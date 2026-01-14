import { buildDevprntApiUrl } from "@/lib/devprnt";
import type {
  TradingConfig,
  TrackedWallet,
  TradingSignal,
  Position,
  DashboardStatsResponse,
  SignalsResponse,
  PositionsResponse,
  Migration,
  MigrationAnalysis,
  MigrationFeedResponse,
  RankedMigrationsResponse,
  MigrationFeedStats,
  RankedMigration,
  DashboardInitResponse,
  TradingLogResponse,
} from "./types";

// ============================================
// DEVPRINT API TYPES
// ============================================

/** Devprint token response from /api/tokens */
interface DevprintToken {
  mint: string;
  symbol: string;
  name: string;
  description: string | null;
  metadata_uri: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  website_url: string | null;
  discord_url: string | null;
  image_url: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
  platform: string;
  source: string;
  twitter_link_type: string | null;
  transaction_signature: string | null;
  creator: string | null;
  sol_amount: number | null;
}

/** Devprint wallet response from /api/wallets */
interface DevprintWallet {
  id: string;
  address: string;
  chain: string;
  label: string;
  trust_score: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_return_pct: number;
  avg_hold_time_minutes: number;
  best_trade_pct: number;
  worst_trade_pct: number;
  min_buy_size_usd: number;
  is_active: boolean;
  notes: string | null;
  source: string | null;
  added_at: string;
  last_trade_at: string | null;
  updated_at: string;
}

/** Devprint trading config from /api/trading/config */
interface DevprintTradingConfig {
  min_confidence: number;
  min_market_cap: number;
  max_holder_concentration: number;
  max_dev_risk_score: number;
  buy_amount_sol: number;
  max_positions: number;
  take_profit_targets: Array<{
    multiplier: number;
    sell_percentage: number;
  }>;
  price_poll_interval_secs: number;
  enabled: boolean;
  auto_buy: boolean;
  // Wallet info (from backend)
  wallet_address?: string | null;
  sol_balance?: number | null;
  trading_mode?: 'paper' | 'real';
}

/** Devprint position from /api/trading/positions */
interface DevprintPosition {
  id: string;
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  entry_price_usd: number;
  entry_amount_sol: number;
  entry_tokens: number;
  current_price_usd: number | null;
  status: string;
  unrealized_pnl: number;
  realized_pnl: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

/** Devprint trading stats from /api/trading/stats */
interface DevprintTradingStats {
  open_positions: number;
  closed_positions: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_pnl: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_hold_time_minutes: number;
  best_trade_pct: number;
  worst_trade_pct: number;
}

// ============================================
// DEVPRINT API CLIENT
// ============================================

async function fetchDevprint<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = buildDevprntApiUrl(path);

  console.log(`[fetchDevprint] ${options?.method || "GET"} ${url.toString()}`);

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || error.error || `API error: ${response.status}`);
  }

  const result = await response.json();

  // Devprint wraps responses in { success, data, error }
  if (result.success === false) {
    throw new Error(result.error || "API returned success: false");
  }

  return result.data ?? result;
}

// ============================================
// MAPPING FUNCTIONS
// ============================================

/** Map devprint token to RankedMigration */
function mapTokenToMigration(token: DevprintToken, index: number, total: number): RankedMigration {
  return {
    id: token.mint,
    tokenMint: token.mint,
    tokenSymbol: token.symbol || null,
    tokenName: token.name || null,
    tokenImageUrl: token.image_url || null,
    trackingStatus: "ACTIVE",
    detectedAt: token.detected_at,
    poolAddress: null,
    migrationTxSig: token.transaction_signature || null,
    expiresAt: null,
    priorityScore: total - index,

    // Market data
    lastPriceUsd: null,
    lastMarketCap: null,
    lastLiquidity: null,
    lastVolume24h: null,
    lastPriceChange1h: null,
    lastUpdatedAt: token.updated_at,
    priceHistory: null,

    // AI analysis (not yet available from devprint)
    lastAiDecision: null,
    lastAiConfidence: null,
    lastAiReasoning: null,
    lastAnalyzedAt: null,

    // Wallet signals
    walletSignalCount: 0,
    walletSignals: [],
    lastWalletSignalAt: null,

    // Ranking
    score: total - index,
    breakdown: {
      migrationAge: 0,
      walletSignals: 0,
      aiConfidence: 0,
      priceMomentum: 0,
      multipleWallets: 0,
      total: total - index,
    },
    isReadyToTrade: false,
  };
}

/** Map devprint wallet to TrackedWallet */
function mapDevprintWallet(wallet: DevprintWallet): TrackedWallet {
  return {
    id: wallet.id,
    address: wallet.address,
    label: wallet.label,
    active: wallet.is_active,
    webhookId: undefined,
    twitterUsername: null,
    twitterUserId: null,
    twitterName: null,
    twitterBio: null,
    twitterAvatar: null,
    twitterBanner: null,
    twitterFollowers: null,
    twitterFollowing: null,
    twitterTweetCount: null,
    twitterVerified: false,
    twitterProfileFetchedAt: null,
    createdAt: wallet.added_at,
    updatedAt: wallet.updated_at,
  };
}

/** Map devprint config to TradingConfig */
function mapDevprintConfig(config: DevprintTradingConfig): TradingConfig {
  const target1 = config.take_profit_targets[0] || { multiplier: 2.0, sell_percentage: 50 };
  const target2 = config.take_profit_targets[1] || { multiplier: 3.0, sell_percentage: 100 };

  return {
    id: "devprint-config",
    tradingEnabled: config.enabled,
    maxPositionPercent: 10, // Not in devprint config, using default
    maxOpenPositions: config.max_positions,
    target1Percent: (target1.multiplier - 1) * 100,
    target1SellPercent: target1.sell_percentage,
    target2Percent: (target2.multiplier - 1) * 100,
    stopLossPercent: 50, // Not in devprint config, using default
    minTweetCount: 0,
    minSentimentScore: config.min_confidence * 100,
    maxDailyLossSol: 1.0, // Default
    maxDailyTrades: 10, // Default
    maxSlippageBps: 500, // Default
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Map devprint position to Position */
function mapDevprintPosition(pos: DevprintPosition): Position {
  return {
    id: pos.id,
    signalId: pos.id,
    tokenMint: pos.token_mint,
    tokenSymbol: pos.token_symbol,
    status: pos.status === "open" ? "OPEN" : pos.status === "closed" ? "CLOSED" : "PENDING",

    entryPriceSol: pos.entry_price_usd, // Note: devprint uses USD
    entryAmountSol: pos.entry_amount_sol,
    entryTokens: pos.entry_tokens,
    entryTxSig: null,

    target1Price: pos.entry_price_usd * 2,
    target1Percent: 100,
    target1Hit: false,
    target1TxSig: null,

    target2Price: pos.entry_price_usd * 3,
    target2Hit: false,
    target2TxSig: null,

    stopLossPrice: pos.entry_price_usd * 0.5,
    stoppedOut: false,
    stopLossTxSig: null,

    currentPrice: pos.current_price_usd,
    remainingTokens: pos.entry_tokens,
    realizedPnlSol: pos.realized_pnl,
    unrealizedPnl: pos.unrealized_pnl,

    createdAt: pos.created_at,
    updatedAt: pos.updated_at,
    closedAt: pos.closed_at,
  };
}

/** Map devprint stats to DashboardStatsResponse (with optional config for wallet balance) */
function mapDevprintStats(
  stats: DevprintTradingStats,
  config?: DevprintTradingConfig | null
): DashboardStatsResponse {
  const solBalance = config?.sol_balance ?? 0;
  const isLiveMode = config?.trading_mode === 'real';

  return {
    trading: {
      tradingEnabled: config?.enabled ?? true,
      walletBalance: solBalance,
      realWalletBalance: isLiveMode ? solBalance : 0,
      openPositions: stats.open_positions,
      maxOpenPositions: config?.max_positions ?? 10,
      dailyPnL: stats.total_pnl,
      maxDailyLoss: 1.0,
      dailyTrades: stats.open_positions + stats.closed_positions,
      maxDailyTrades: 10,
      totalExposure: stats.total_unrealized_pnl > 0 ? stats.total_unrealized_pnl : 0,
      unrealizedPnL: stats.total_unrealized_pnl,
      availableForTrading: Math.max(0, solBalance - stats.total_unrealized_pnl),
      recommendedPositionSize: config?.buy_amount_sol ?? 0.1,
    },
    performance: {
      totalTrades: stats.winning_trades + stats.losing_trades,
      winningTrades: stats.winning_trades,
      losingTrades: stats.losing_trades,
      winRate: stats.win_rate,
      totalProfitSol: stats.total_realized_pnl > 0 ? stats.total_realized_pnl : 0,
      totalLossSol: stats.total_realized_pnl < 0 ? Math.abs(stats.total_realized_pnl) : 0,
      netPnlSol: stats.total_pnl,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      largestWin: stats.best_trade_pct,
      largestLoss: stats.worst_trade_pct,
    },
    trackedWallets: 0,
    signalsToday: 0,
    strongSignalsToday: 0,
  };
}

// ============================================
// SMART TRADING SERVICE - DEVPRINT DIRECT
// ============================================

export const smartTradingService = {
  // ============================================
  // CONSOLIDATED DASHBOARD INIT
  // ============================================
  async getDashboardInit(): Promise<DashboardInitResponse> {
    // Fetch all data in parallel from devprint
    const [tokensResult, walletsResult, configResult, positionsResult, statsResult] = await Promise.all([
      fetchDevprint<DevprintToken[]>("/api/tokens?limit=50&order=desc"),
      fetchDevprint<{ wallets: DevprintWallet[] }>("/api/wallets"),
      fetchDevprint<DevprintTradingConfig>("/api/trading/config"),
      fetchDevprint<DevprintPosition[]>("/api/trading/positions"),
      fetchDevprint<DevprintTradingStats>("/api/trading/stats"),
    ]);

    const tokens = Array.isArray(tokensResult) ? tokensResult : [];
    const wallets = walletsResult.wallets || [];
    const positions = Array.isArray(positionsResult) ? positionsResult : [];

    const mappedWallets = wallets.map(mapDevprintWallet);
    const mappedConfig = mapDevprintConfig(configResult);
    const mappedPositions = positions.map(mapDevprintPosition);
    const mappedStats = mapDevprintStats(statsResult, configResult);
    const mappedMigrations = tokens.map((t, i) => mapTokenToMigration(t, i, tokens.length));

    return {
      config: mappedConfig,
      stats: mappedStats,
      wallets: mappedWallets,
      signals: [], // Signals not directly from devprint
      positions: {
        open: mappedPositions.filter((p) => p.status === "OPEN"),
        closed: mappedPositions.filter((p) => p.status === "CLOSED"),
      },
      migrations: mappedMigrations,
      migrationStats: {
        totalActive: tokens.length,
        readyToTrade: 0,
        avgScore: 50,
        cacheSize: tokens.length,
        isPolling: true,
        analyzerReady: false,
        analysisQueueLength: 0,
      },
      serverTime: new Date().toISOString(),
    };
  },

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    // Fetch stats and config in parallel to get wallet balance
    const [stats, config] = await Promise.all([
      fetchDevprint<DevprintTradingStats>("/api/trading/stats"),
      fetchDevprint<DevprintTradingConfig>("/api/trading/config"),
    ]);
    return mapDevprintStats(stats, config);
  },

  // Trading config
  async getConfig(): Promise<TradingConfig> {
    const config = await fetchDevprint<DevprintTradingConfig>("/api/trading/config");
    return mapDevprintConfig(config);
  },

  async updateConfig(config: Partial<TradingConfig>): Promise<TradingConfig> {
    // Map to devprint format
    const devprintConfig: Partial<DevprintTradingConfig> = {};

    if (config.tradingEnabled !== undefined) {
      devprintConfig.enabled = config.tradingEnabled;
    }
    if (config.maxOpenPositions !== undefined) {
      devprintConfig.max_positions = config.maxOpenPositions;
    }
    if (config.minSentimentScore !== undefined) {
      devprintConfig.min_confidence = config.minSentimentScore / 100;
    }

    const result = await fetchDevprint<DevprintTradingConfig>("/api/trading/config", {
      method: "PATCH",
      body: JSON.stringify(devprintConfig),
    });

    return mapDevprintConfig(result);
  },

  // Toggle trading
  async toggleTrading(enabled: boolean): Promise<TradingConfig> {
    return this.updateConfig({ tradingEnabled: enabled });
  },

  // Tracked wallets
  async getWallets(): Promise<TrackedWallet[]> {
    const result = await fetchDevprint<{ wallets: DevprintWallet[] }>("/api/wallets");
    return (result.wallets || []).map(mapDevprintWallet);
  },

  async addWallet(address: string, label: string): Promise<TrackedWallet> {
    const result = await fetchDevprint<DevprintWallet>("/api/wallets", {
      method: "POST",
      body: JSON.stringify({ address, label, chain: "solana" }),
    });
    return mapDevprintWallet(result);
  },

  async removeWallet(address: string): Promise<void> {
    await fetchDevprint(`/api/wallets/${address}`, {
      method: "DELETE",
    });
  },

  async syncWalletTwitterProfile(address: string): Promise<TrackedWallet> {
    // Not implemented in devprint yet, return existing wallet
    const wallets = await this.getWallets();
    const wallet = wallets.find((w) => w.address === address);
    if (!wallet) throw new Error(`Wallet ${address} not found`);
    return wallet;
  },

  // Trading signals - devprint doesn't have a dedicated signals endpoint
  async getSignals(_params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<SignalsResponse> {
    // Return empty signals for now
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  },

  // Positions
  async getPositions(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<PositionsResponse> {
    const positions = await fetchDevprint<DevprintPosition[]>("/api/trading/positions");
    const mapped = (Array.isArray(positions) ? positions : []).map(mapDevprintPosition);

    // Filter by status if provided
    const filtered = params?.status
      ? mapped.filter((p) => p.status === params.status)
      : mapped;

    const limit = params?.limit || 20;
    const page = params?.page || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return {
      items,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  async closePosition(positionId: string): Promise<Position> {
    const result = await fetchDevprint<DevprintPosition>(`/api/trading/positions/${positionId}/close`, {
      method: "POST",
    });
    return mapDevprintPosition(result);
  },

  async getHistory(_limit?: number): Promise<import("./types").PortfolioSnapshot[]> {
    // Not implemented in devprint yet
    return [];
  },

  async getTradingLogs(params?: {
    category?: string;
    level?: string;
    limit?: number;
    page?: number;
  }): Promise<TradingLogResponse> {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.level) query.set("level", params.level);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString();
    return fetchDevprint(`/smart-trading/logs${suffix ? `?${suffix}` : ""}`);
  },

  // ============================================
  // MIGRATION FEED - Using devprint /api/tokens
  // ============================================

  async getMigrationFeed(params?: {
    status?: string;
    decision?: string;
    limit?: number;
    page?: number;
  }): Promise<MigrationFeedResponse> {
    const limit = params?.limit || 20;
    const page = params?.page || 1;
    const offset = (page - 1) * limit;

    const url = buildDevprntApiUrl("/api/tokens");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order", "desc");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const tokens: DevprintToken[] = result.data || [];
    const total = result.count || tokens.length;

    const items: Migration[] = tokens.map((token, index) => ({
      id: token.mint,
      tokenMint: token.mint,
      tokenSymbol: token.symbol || null,
      tokenName: token.name || null,
      tokenImageUrl: token.image_url || null,
      trackingStatus: "ACTIVE" as const,
      detectedAt: token.detected_at,
      poolAddress: null,
      migrationTxSig: token.transaction_signature || null,
      expiresAt: null,
      priorityScore: total - offset - index,

      lastPriceUsd: null,
      lastMarketCap: null,
      lastLiquidity: null,
      lastVolume24h: null,
      lastPriceChange1h: null,
      lastUpdatedAt: token.updated_at,
      priceHistory: null,

      lastAiDecision: null,
      lastAiConfidence: null,
      lastAiReasoning: null,
      lastAnalyzedAt: null,

      walletSignalCount: 0,
      walletSignals: [],
      lastWalletSignalAt: null,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getRankedMigrations(limit?: number): Promise<RankedMigrationsResponse> {
    const fetchLimit = limit || 50;
    const url = buildDevprntApiUrl("/api/tokens");
    url.searchParams.set("limit", String(fetchLimit));
    url.searchParams.set("offset", "0");
    url.searchParams.set("order", "desc");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const tokens: DevprintToken[] = result.data || [];

    const items = tokens.map((token, index) => mapTokenToMigration(token, index, tokens.length));

    const stats: MigrationFeedStats = {
      totalActive: items.length,
      pendingAnalysis: items.length,
      readyToTrade: 0,
      withWalletSignals: 0,
      expiredToday: 0,
    };

    return { items, stats };
  },

  async getMigration(tokenMint: string): Promise<Migration> {
    const url = buildDevprntApiUrl(`/api/tokens/${tokenMint}`);
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Token ${tokenMint} not found`);
    }

    const result = await response.json();
    const token: DevprintToken = result.data;

    return {
      id: token.mint,
      tokenMint: token.mint,
      tokenSymbol: token.symbol || null,
      tokenName: token.name || null,
      tokenImageUrl: token.image_url || null,
      trackingStatus: "ACTIVE",
      detectedAt: token.detected_at,
      poolAddress: null,
      migrationTxSig: token.transaction_signature || null,
      expiresAt: null,
      priorityScore: 100,

      lastPriceUsd: null,
      lastMarketCap: null,
      lastLiquidity: null,
      lastVolume24h: null,
      lastPriceChange1h: null,
      lastUpdatedAt: token.updated_at,
      priceHistory: null,

      lastAiDecision: null,
      lastAiConfidence: null,
      lastAiReasoning: null,
      lastAnalyzedAt: null,

      walletSignalCount: 0,
      walletSignals: [],
      lastWalletSignalAt: null,
    };
  },

  async getMigrationAnalysisHistory(
    _tokenMint: string,
    _limit?: number
  ): Promise<MigrationAnalysis[]> {
    // Not implemented in devprint yet
    return [];
  },

  async getMigrationFeedStats(): Promise<MigrationFeedStats> {
    const url = buildDevprntApiUrl("/api/tokens");
    url.searchParams.set("limit", "1");
    url.searchParams.set("offset", "0");

    const response = await fetch(url.toString());
    const result = await response.json();
    const count = result.count || 0;

    return {
      totalActive: count,
      pendingAnalysis: count,
      readyToTrade: 0,
      withWalletSignals: 0,
      expiredToday: 0,
    };
  },

  async trackMigration(
    tokenMint: string,
    _options?: { skipVerification?: boolean }
  ): Promise<Migration> {
    // Not implemented - devprint auto-tracks from pumpfun
    return this.getMigration(tokenMint);
  },

  async stopTrackingMigration(_tokenMint: string): Promise<void> {
    // Not implemented in devprint
    console.warn("[smartTradingService] stopTrackingMigration not supported by devprint");
  },

  async analyzeMigration(_tokenMint: string): Promise<MigrationAnalysis> {
    throw new Error("AI analysis not yet implemented in devprint");
  },

  async refreshMigrationMarketData(tokenMint: string): Promise<Migration> {
    // Just re-fetch the token
    return this.getMigration(tokenMint);
  },
};

// Legacy export for compatibility
export async function fetchMigrationsFromDevprint(limit: number = 20): Promise<RankedMigrationsResponse> {
  return smartTradingService.getRankedMigrations(limit);
}

export default smartTradingService;
