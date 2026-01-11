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
} from "./types";

const PONZINOMICS_API_URL =
  process.env.NEXT_PUBLIC_PONZINOMICS_API_URL || "http://localhost:4001";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${PONZINOMICS_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export const smartTradingService = {
  // Dashboard stats - aggregated stats endpoint
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    return fetchApi<DashboardStatsResponse>("/smart-trading/stats/dashboard");
  },

  // Trading config
  async getConfig(): Promise<TradingConfig> {
    return fetchApi<TradingConfig>("/smart-trading/config");
  },

  async updateConfig(config: Partial<TradingConfig>): Promise<TradingConfig> {
    return fetchApi<TradingConfig>("/smart-trading/config", {
      method: "PATCH",
      body: JSON.stringify(config),
    });
  },

  // Toggle trading
  async toggleTrading(enabled: boolean): Promise<TradingConfig> {
    return fetchApi<TradingConfig>("/smart-trading/config", {
      method: "PATCH",
      body: JSON.stringify({ tradingEnabled: enabled }),
    });
  },

  // Tracked wallets
  async getWallets(): Promise<TrackedWallet[]> {
    return fetchApi<TrackedWallet[]>("/smart-trading/wallets");
  },

  async addWallet(address: string, label: string): Promise<TrackedWallet> {
    return fetchApi<TrackedWallet>("/smart-trading/wallets", {
      method: "POST",
      body: JSON.stringify({ address, label }),
    });
  },

  async removeWallet(address: string): Promise<void> {
    await fetchApi(`/smart-trading/wallets/${address}`, {
      method: "DELETE",
    });
  },

  // Trading signals - returns paginated response
  async getSignals(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<SignalsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.page) searchParams.set("page", params.page.toString());

    const query = searchParams.toString();
    return fetchApi<SignalsResponse>(`/smart-trading/signals${query ? `?${query}` : ""}`);
  },

  // Positions - returns paginated response
  async getPositions(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<PositionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.page) searchParams.set("page", params.page.toString());

    const query = searchParams.toString();
    return fetchApi<PositionsResponse>(`/smart-trading/positions${query ? `?${query}` : ""}`);
  },

  async closePosition(positionId: string): Promise<Position> {
    return fetchApi<Position>(`/smart-trading/positions/${positionId}/close`, {
      method: "POST",
    });
  },

  async getHistory(limit?: number): Promise<import("./types").PortfolioSnapshot[]> {
    return fetchApi(`/smart-trading/stats/chart${limit ? `?limit=${limit}` : ""}`);
  },

  // ============================================
  // MIGRATION FEED
  // ============================================

  // Get paginated migration feed
  async getMigrationFeed(params?: {
    status?: string;
    decision?: string;
    limit?: number;
    page?: number;
  }): Promise<MigrationFeedResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.decision) searchParams.set("decision", params.decision);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.page) searchParams.set("page", params.page.toString());

    const query = searchParams.toString();
    return fetchApi<MigrationFeedResponse>(
      `/smart-trading/migration-feed${query ? `?${query}` : ""}`
    );
  },

  // Get ranked migrations with scores
  async getRankedMigrations(limit?: number): Promise<RankedMigrationsResponse> {
    const query = limit ? `?limit=${limit}` : "";
    return fetchApi<RankedMigrationsResponse>(
      `/smart-trading/migration-feed/ranked${query}`
    );
  },

  // Get single migration by token mint
  async getMigration(tokenMint: string): Promise<Migration> {
    return fetchApi<Migration>(`/smart-trading/migration-feed/${tokenMint}`);
  },

  // Get migration analysis history
  async getMigrationAnalysisHistory(
    tokenMint: string,
    limit?: number
  ): Promise<MigrationAnalysis[]> {
    const query = limit ? `?limit=${limit}` : "";
    return fetchApi<MigrationAnalysis[]>(
      `/smart-trading/migration-feed/${tokenMint}/analysis${query}`
    );
  },

  // Get migration feed stats
  async getMigrationFeedStats(): Promise<MigrationFeedStats> {
    return fetchApi<MigrationFeedStats>("/smart-trading/migration-feed/stats");
  },

  // Manually add a token to migration tracking
  async trackMigration(
    tokenMint: string,
    options?: { skipVerification?: boolean }
  ): Promise<Migration> {
    return fetchApi<Migration>("/smart-trading/migration-feed", {
      method: "POST",
      body: JSON.stringify({ tokenMint, ...options }),
    });
  },

  // Stop tracking a migration
  async stopTrackingMigration(tokenMint: string): Promise<void> {
    await fetchApi(`/smart-trading/migration-feed/${tokenMint}`, {
      method: "DELETE",
    });
  },

  // Trigger AI analysis for a specific token
  async analyzeMigration(tokenMint: string): Promise<MigrationAnalysis> {
    return fetchApi<MigrationAnalysis>(
      `/smart-trading/migration-feed/${tokenMint}/analyze`,
      { method: "POST" }
    );
  },

  // Refresh market data for a specific token
  async refreshMigrationMarketData(tokenMint: string): Promise<Migration> {
    return fetchApi<Migration>(
      `/smart-trading/migration-feed/${tokenMint}/refresh`,
      { method: "POST" }
    );
  },
};

export default smartTradingService;
