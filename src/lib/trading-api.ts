/**
 * Trading Analytics API Client
 *
 * Fetches real trading position data from devprint backend.
 * Powers the "Overall Trading Analytics" dashboard.
 */

import type { TradingPosition } from '@/types/trading';

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

/**
 * Backend trading stats from /api/analytics/stats
 * Uses Birdeye PnL cache (SINGLE SOURCE OF TRUTH for on-chain data)
 */
export interface BackendTradingStats {
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
// TRADING API CLIENT
// ============================================

class TradingAPI {
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

  /**
   * Get all trading positions (open, partially_closed, closed)
   */
  async getPositions(): Promise<TradingPosition[]> {
    return this.fetch<TradingPosition[]>('/api/trading/positions');
  }

  /**
   * Get positions filtered by status
   */
  async getPositionsByStatus(status: 'open' | 'partially_closed' | 'closed'): Promise<TradingPosition[]> {
    const allPositions = await this.getPositions();
    return allPositions.filter(p => p.status === status);
  }

  /**
   * Get positions within a date range
   */
  async getPositionsByDateRange(startDate: string, endDate: string): Promise<TradingPosition[]> {
    const allPositions = await this.getPositions();
    return allPositions.filter(p => {
      const entryDate = new Date(p.entry_time).toISOString().split('T')[0];
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  /**
   * Get closed positions from history
   * @param limit - Maximum number of positions to return (default: 50, max: 500)
   * Note: Moved to analytics module for better separation of concerns
   */
  async getHistory(limit: number = 50): Promise<TradingPosition[]> {
    return this.fetch<TradingPosition[]>(`/api/analytics/history?limit=${Math.min(limit, 500)}`);
  }

  /**
   * Get trading statistics from backend
   * Uses Birdeye PnL cache - SINGLE SOURCE OF TRUTH for on-chain data
   */
  async getStats(): Promise<BackendTradingStats> {
    return this.fetch<BackendTradingStats>('/api/analytics/stats');
  }
}

// ============================================
// EXPORT API CLIENT
// ============================================

export const tradingApi = new TradingAPI();
