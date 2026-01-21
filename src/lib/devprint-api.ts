/**
 * Unified Devprint API Client
 *
 * Single source of truth for all API communication with the Devprint backend.
 * Features:
 * - Automatic snake_case → camelCase transformation
 * - Proper TypeScript typing
 * - Centralized error handling
 * - Request/response logging in development
 *
 * @module devprint-api
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL =
    process.env.NEXT_PUBLIC_DEVPRINT_API_URL ||
    'https://devprint-v2-production.up.railway.app';

const isDev = process.env.NODE_ENV === 'development';

// ============================================
// API RESPONSE TYPE
// ============================================

interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error: string | null;
}

// ============================================
// CASE TRANSFORMATION UTILITIES
// ============================================

/**
 * Convert snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/**
 * Recursively transform all object keys from snake_case to camelCase
 */
function transformKeysToCamel<T>(obj: unknown): T {
    if (Array.isArray(obj)) {
        return obj.map(transformKeysToCamel) as T;
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                snakeToCamel(key),
                transformKeysToCamel(value),
            ])
        ) as T;
    }
    return obj as T;
}

/**
 * Recursively transform all object keys from camelCase to snake_case
 */
function transformKeysToSnake<T>(obj: unknown): T {
    if (Array.isArray(obj)) {
        return obj.map(transformKeysToSnake) as T;
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                camelToSnake(key),
                transformKeysToSnake(value),
            ])
        ) as T;
    }
    return obj as T;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

// Trading Types
export interface Position {
    id: string;
    mint: string;
    tokenName: string;
    ticker: string;
    entryPrice: number;
    entryTime: string;
    initialQuantity: number;
    entrySolValue: number;
    entryLiquidity: number;
    currentQuantity: number;
    currentPrice: number;
    currentValueSol: number;
    unrealizedPnlSol: number;
    unrealizedPnlPct: number;
    peakPrice: number;
    peakPnlPct: number;
    targetsHit: TargetHit[];
    realizedPnlSol: number;
    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    status: 'open' | 'partially_closed' | 'closed';
    closedAt: string | null;
    closeReason: string | null;
    pendingSell: unknown | null;
    sellInProgress: boolean;
    buySignature: string;
    sellTransactions: SellTransaction[];
    buyCriteria: BuyCriteria | null;
    createdAt: string;
    updatedAt: string;
    agentVersionId: string | null;
    agentVersionCode: string | null;
}

export interface TargetHit {
    targetMultiplier: number;
    soldQuantity: number;
    soldPrice: number;
    soldTime: string;
    realizedSol: number;
}

export interface SellTransaction {
    signature: string;
    quantity: number;
    price: number;
    solReceived: number;
    timestamp: string;
}

export interface BuyCriteria {
    passed: boolean;
    confidenceCheck?: CheckResult;
    marketCapCheck?: CheckResult;
    liquidityUsd?: number;
    holderCountCheck?: CheckResult;
    momentumCheck?: CheckResult;
    dynamicConfidence?: DynamicConfidence;
    [key: string]: unknown;
}

export interface CheckResult {
    name: string;
    passed: boolean;
    reason: string | null;
    skipped: boolean;
    threshold: number;
    value: number;
}

export interface DynamicConfidence {
    totalScore: number;
    volumeScore: number;
    holderScore: number;
    priceScore: number;
    breakdown: string;
}

export interface TradingStats {
    openPositions: number;
    closedPositions: number;
    totalUnrealizedPnl: number;
    totalRealizedPnl: number;
    totalPnl: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgHoldTimeMinutes: number;
    bestTradePct: number;
    worstTradePct: number;
}

export interface TradingConfig {
    minConfidence: number;
    minMarketCap: number;
    maxHolderConcentration: number;
    maxDevRiskScore: number;
    buyAmountSol: number;
    maxPositions: number;
    takeProfitTargets: Array<{
        multiplier: number;
        sellPercentage: number;
    }>;
    pricePollIntervalSecs: number;
    enabled: boolean;
    autoBuy: boolean;
    walletAddress?: string | null;
    solBalance?: number | null;
    tradingMode?: 'paper' | 'real';
}

export interface WatchlistToken {
    mint: string;
    symbol: string;
    name: string;
    addedAt: string;
    evaluationCount: number;
    lastEvaluatedAt: string | null;
    expiresAt: string;
    source: string;
    latestReasoning: string | null;
}

export interface WatchlistStats {
    totalTokens: number;
    averageEvaluations: number;
    oldestTokenMinutes: number;
}

export interface WatchlistResponse {
    tokens: WatchlistToken[];
    stats: WatchlistStats;
}

// Versioning Types
export interface AgentVersion {
    id: string;
    versionCode: string;
    versionName: string;
    description?: string;
    configSnapshot: TradingConfig;
    isActive: boolean;
    createdAt: string;
    createdBy?: string;
    notes?: string;
}

export interface VersionMetrics {
    id?: string;
    versionId: string;
    date: string;
    bucketStart?: string; // For 3h buckets
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnlSol: number;
    avgPnlSol?: number;
    bestTradePct?: number;
    worstTradePct?: number;
    avgHoldTimeMinutes?: number;
    avgMultiplier?: number;
    medianMultiplier?: number;
    updatedAt: string;
}

export interface VersionSummary {
    totalTrades: number;
    winRate: number;
    totalPnlSol: number;
    avgMultiplier: number;
    avgHoldTimeMinutes: number;
    bestTradePct: number;
    worstTradePct: number;
}

export interface VersionComparison {
    versions: AgentVersion[];
    metricsByVersion: Record<string, VersionMetrics[]>;
    summary: Record<string, VersionSummary>;
}

export interface CreateVersionRequest {
    versionCode: string;
    versionName: string;
    description?: string;
    configSnapshot: TradingConfig;
    activate: boolean;
    createdBy?: string;
    notes?: string;
}

// Query Parameter Types
export interface PositionsQueryParams {
    status?: 'open' | 'closed' | 'partially_closed';
    versionId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface MetricsQueryParams {
    startDate?: string;
    endDate?: string;
    bucket?: '1d' | '3h';
}

export interface CompareParams {
    versionIds: string[];
    metric?: 'winRate' | 'totalPnl' | 'avgHoldTime' | 'avgMultiplier' | 'tradeCount';
    startDate?: string;
    endDate?: string;
    bucket?: '1d' | '3h';
}

// ============================================
// DEVPRINT API CLIENT
// ============================================

class DevprintApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Make a request to the API with automatic case transformation
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        if (isDev) {
            console.log(`[DevprintAPI] ${options.method || 'GET'} ${url}`);
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const json: ApiResponse<unknown> = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Unknown API error');
        }

        // Transform snake_case keys to camelCase
        return transformKeysToCamel<T>(json.data);
    }

    /**
     * Build query string from params object (converts camelCase to snake_case)
     */
    private buildQueryString<T extends object>(params: T): string {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                const snakeKey = camelToSnake(key);
                if (Array.isArray(value)) {
                    // Join arrays with commas (for version_ids etc.)
                    searchParams.set(snakeKey, value.join(','));
                } else {
                    searchParams.set(snakeKey, String(value));
                }
            }
        }
        const queryString = searchParams.toString();
        return queryString ? `?${queryString}` : '';
    }

    // ============================================
    // TRADING ENDPOINTS
    // ============================================

    /**
     * Get trading configuration
     */
    async getConfig(): Promise<TradingConfig> {
        return this.request<TradingConfig>('/api/trading/config');
    }

    /**
     * Update trading configuration (partial update)
     */
    async updateConfig(config: Partial<TradingConfig>): Promise<TradingConfig> {
        const snakeConfig = transformKeysToSnake(config);
        return this.request<TradingConfig>('/api/trading/config', {
            method: 'POST',
            body: JSON.stringify(snakeConfig),
        });
    }

    /**
     * Get positions with optional filtering
     *
     * @param params - Query parameters for filtering
     * @example
     * // Get all open positions
     * await devprintApi.getPositions({ status: 'open' });
     *
     * // Get positions for a specific version
     * await devprintApi.getPositions({ versionId: 'uuid-here' });
     *
     * // Get positions with pagination
     * await devprintApi.getPositions({ limit: 20, offset: 0 });
     */
    async getPositions(params: PositionsQueryParams = {}): Promise<Position[]> {
        const query = this.buildQueryString(params);
        return this.request<Position[]>(`/api/trading/positions${query}`);
    }

    /**
     * Get a specific position by mint address
     */
    async getPosition(mint: string): Promise<Position | null> {
        try {
            return await this.request<Position>(`/api/trading/positions/${mint}`);
        } catch {
            return null;
        }
    }

    /**
     * Get closed positions history
     */
    async getHistory(limit?: number): Promise<Position[]> {
        const query = limit ? `?limit=${limit}` : '';
        return this.request<Position[]>(`/api/trading/history${query}`);
    }

    /**
     * Get trading statistics
     */
    async getStats(): Promise<TradingStats> {
        return this.request<TradingStats>('/api/trading/stats');
    }

    /**
     * Get watchlist tokens
     */
    async getWatchlist(): Promise<WatchlistResponse> {
        return this.request<WatchlistResponse>('/api/trading/watchlist');
    }

    /**
     * Refresh prices for all positions
     */
    async refreshPrices(): Promise<void> {
        await this.request<string>('/api/trading/refresh', { method: 'POST' });
    }

    // ============================================
    // VERSIONING ENDPOINTS
    // ============================================

    /**
     * List all agent versions
     */
    async listVersions(): Promise<AgentVersion[]> {
        return this.request<AgentVersion[]>('/api/versions');
    }

    /**
     * Get the currently active version
     */
    async getActiveVersion(): Promise<AgentVersion | null> {
        return this.request<AgentVersion | null>('/api/versions/active');
    }

    /**
     * Create a new agent version
     */
    async createVersion(req: CreateVersionRequest): Promise<AgentVersion> {
        const snakeReq = transformKeysToSnake(req);
        return this.request<AgentVersion>('/api/versions', {
            method: 'POST',
            body: JSON.stringify(snakeReq),
        });
    }

    /**
     * Activate a specific version
     */
    async activateVersion(versionId: string): Promise<AgentVersion> {
        return this.request<AgentVersion>(`/api/versions/${versionId}/activate`, {
            method: 'PUT',
        });
    }

    /**
     * Get metrics for a specific version
     *
     * @param versionId - The version UUID
     * @param params - Query parameters (startDate, endDate, bucket)
     * @example
     * // Get daily metrics
     * await devprintApi.getVersionMetrics('uuid', { bucket: '1d' });
     *
     * // Get 3-hour bucketed metrics
     * await devprintApi.getVersionMetrics('uuid', { bucket: '3h' });
     */
    async getVersionMetrics(
        versionId: string,
        params: MetricsQueryParams = {}
    ): Promise<VersionMetrics[]> {
        const query = this.buildQueryString(params);
        return this.request<VersionMetrics[]>(
            `/api/versions/${versionId}/metrics${query}`
        );
    }

    /**
     * Compare multiple versions
     *
     * @param params - Comparison parameters
     * @example
     * // Compare two versions with 3-hour buckets
     * await devprintApi.compareVersions({
     *   versionIds: ['uuid1', 'uuid2'],
     *   bucket: '3h',
     *   startDate: '2024-01-01'
     * });
     */
    async compareVersions(params: CompareParams): Promise<VersionComparison> {
        const query = this.buildQueryString(params);
        return this.request<VersionComparison>(`/api/versions/compare${query}`);
    }

    /**
     * Get summary for multiple versions
     */
    async getVersionsSummary(
        versionIds: string[],
        startDate?: string,
        endDate?: string
    ): Promise<VersionSummary[]> {
        const query = this.buildQueryString({
            versionIds,
            startDate,
            endDate,
        });
        return this.request<VersionSummary[]>(`/api/versions/summary${query}`);
    }

    /**
     * Recalculate all metrics for a version
     */
    async recalculateMetrics(versionId: string): Promise<{
        versionId: string;
        daysRecalculated: number;
        startedAt: string;
        completedAt: string;
    }> {
        return this.request(`/api/versions/${versionId}/recalculate`, {
            method: 'POST',
        });
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const devprintApi = new DevprintApiClient();

// Also export the class for custom instances
export { DevprintApiClient };
