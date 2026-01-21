/**
 * Agent Versioning API Client
 *
 * Production API client for devprint backend (Railway deployment).
 * All endpoints return {success, data, error} format.
 */

import type {
  AgentVersion,
  VersionMetrics,
  VersionComparisonData,
  CreateVersionRequest,
  MetricType,
} from '@/types/versioning';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_DEVPRINT_API_URL || 'https://devprint-v2-production.up.railway.app';

// ============================================
// API RESPONSE FORMAT
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

// ============================================
// REAL API IMPLEMENTATION
// ============================================

class ProductionVersioningAPI {
  private mapAgentVersion(raw: any): AgentVersion {
    return {
      id: raw.id,
      versionCode: raw.versionCode ?? raw.version_code ?? '',
      versionName: raw.versionName ?? raw.version_name ?? '',
      description: raw.description ?? undefined,
      configSnapshot: raw.configSnapshot ?? raw.config_snapshot ?? {},
      isActive: raw.isActive ?? raw.is_active ?? false,
      createdAt: raw.createdAt ?? raw.created_at ?? '',
      createdBy: raw.createdBy ?? raw.created_by ?? undefined,
      notes: raw.notes ?? undefined,
    };
  }

  private mapVersionMetrics(raw: any): VersionMetrics {
    // For 3-hour buckets, backend returns bucket_start (full timestamp) instead of date
    // We use bucket_start directly to preserve the time component for charting
    const date = raw.date || raw.bucket_start || '';

    return {
      id: raw.id || `${raw.version_id}-${raw.bucket_start || raw.date}`,
      versionId: raw.versionId ?? raw.version_id ?? '',
      date,
      totalTrades: raw.totalTrades ?? raw.total_trades ?? 0,
      winningTrades: raw.winningTrades ?? raw.winning_trades ?? 0,
      losingTrades: raw.losingTrades ?? raw.losing_trades ?? 0,
      winRate: raw.winRate ?? raw.win_rate ?? 0,
      totalPnlSol: raw.totalPnlSol ?? raw.total_pnl_sol ?? 0,
      avgPnlSol: raw.avgPnlSol ?? raw.avg_pnl_sol ?? undefined,
      bestTradePct: raw.bestTradePct ?? raw.best_trade_pct ?? undefined,
      worstTradePct: raw.worstTradePct ?? raw.worst_trade_pct ?? undefined,
      avgHoldTimeMinutes: raw.avgHoldTimeMinutes ?? raw.avg_hold_time_minutes ?? undefined,
      avgMultiplier: raw.avgMultiplier ?? raw.avg_multiplier ?? undefined,
      medianMultiplier: raw.medianMultiplier ?? raw.median_multiplier ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    };
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

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

    const apiResponse: ApiResponse<T> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Unknown API error');
    }

    return apiResponse.data;
  }

  async listVersions(): Promise<AgentVersion[]> {
    const data = await this.fetch<any[]>('/api/versions');
    return data.map((version) => this.mapAgentVersion(version));
  }

  async getActiveVersion(): Promise<AgentVersion | null> {
    const data = await this.fetch<any | null>('/api/versions/active');
    return data ? this.mapAgentVersion(data) : null;
  }

  async createVersion(req: CreateVersionRequest): Promise<AgentVersion> {
    const data = await this.fetch<any>('/api/versions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return this.mapAgentVersion(data);
  }

  async activateVersion(versionId: string): Promise<AgentVersion> {
    const data = await this.fetch<any>(`/api/versions/${versionId}/activate`, {
      method: 'PUT',
    });
    return this.mapAgentVersion(data);
  }

  async getVersionMetrics(
    versionId: string,
    startDate?: string,
    endDate?: string,
    bucket?: '1d' | '3h',
  ): Promise<VersionMetrics[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (bucket) params.set('bucket', bucket);
    const query = params.toString();
    const data = await this.fetch<any[]>(
      `/api/versions/${versionId}/metrics${query ? '?' + query : ''}`
    );
    return data.map((metric) => this.mapVersionMetrics(metric));
  }

  async compareVersions(
    versionIds: string[],
    metric: MetricType,
    startDate?: string,
    endDate?: string,
    bucket?: '1d' | '3h',
  ): Promise<VersionComparisonData> {
    // Backend doesn't have compare endpoint yet - do client-side comparison
    const versions = await this.listVersions();
    const filteredVersions = versions.filter(v => versionIds.includes(v.id));

    const metricsByVersion: Record<string, VersionMetrics[]> = {};
    const summary: Record<string, any> = {};

    for (const versionId of versionIds) {
      const metrics = await this.getVersionMetrics(versionId, startDate, endDate, bucket);
      metricsByVersion[versionId] = metrics;

      // Calculate summary
      const totalTrades = metrics.reduce((sum, m) => sum + m.totalTrades, 0);
      const totalPnl = metrics.reduce((sum, m) => sum + m.totalPnlSol, 0);
      const avgWinRate = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.winRate, 0) / metrics.length
        : 0;
      const avgMultiplier = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.avgMultiplier || 0), 0) / metrics.length
        : 0;
      const avgHoldTime = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.avgHoldTimeMinutes || 0), 0) / metrics.length
        : 0;

      summary[versionId] = {
        totalTrades,
        winRate: parseFloat(avgWinRate.toFixed(2)),
        totalPnlSol: parseFloat(totalPnl.toFixed(4)),
        avgMultiplier: parseFloat(avgMultiplier.toFixed(2)),
        avgHoldTimeMinutes: Math.round(avgHoldTime),
        bestTradePct: metrics.length > 0 ? Math.max(...metrics.map(m => m.bestTradePct || 0)) : 0,
        worstTradePct: metrics.length > 0 ? Math.min(...metrics.map(m => m.worstTradePct || 0)) : 0,
      };
    }

    return {
      versions: filteredVersions,
      metricsByVersion,
      summary,
    };
  }
}

// ============================================
// EXPORT API CLIENT
// ============================================

export const versioningApi = new ProductionVersioningAPI();
