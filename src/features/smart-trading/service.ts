import type {
  TradingConfig,
  TrackedWallet,
  TradingSignal,
  Position,
  DashboardStatsResponse,
  SignalsResponse,
  PositionsResponse,
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
};

export default smartTradingService;
