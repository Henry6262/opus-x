/**
 * PnL Integration — Real Trading Data from DevPrint Backend
 *
 * Receives PnL snapshots via webhook and generates content fragments
 * that can be sprinkled into posts for authenticity.
 */

import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { PnLSnapshot, PnLFragment } from '../types/pnl';

export class PnLIntegration {
  private latestSnapshot: PnLSnapshot | null = null;
  private snapshotHistory: PnLSnapshot[] = [];
  private maxHistory = 50;

  /**
   * Update with a new PnL snapshot (called by webhook handler).
   */
  updateSnapshot(snapshot: PnLSnapshot): void {
    this.latestSnapshot = snapshot;
    this.snapshotHistory.push(snapshot);

    if (this.snapshotHistory.length > this.maxHistory) {
      this.snapshotHistory = this.snapshotHistory.slice(-this.maxHistory);
    }

    logger.info('PnL snapshot updated', {
      totalPnL: snapshot.totalPnL,
      dailyPnL: snapshot.dailyPnL,
      winRate: snapshot.winRate,
      tradesExecuted: snapshot.tradesExecuted,
    });
  }

  /**
   * Fetch latest PnL data from DevPrint backend.
   */
  async fetchFromBackend(): Promise<PnLSnapshot | null> {
    if (!config.pnl.enabled) {
      return null;
    }

    try {
      const response = await axios.get(
        `${config.pnl.devprintUrl}/api/analytics/stats`,
        { timeout: 10000 }
      );

      const data = response.data;
      const stats = data.data || data;

      const snapshot: PnLSnapshot = {
        totalPnL: stats.total_pnl || 0,
        dailyPnL: stats.daily_pnl || 0,
        winRate: stats.win_rate || 0,
        tradesExecuted: stats.total_trades || stats.closed_positions || 0,
        avgLatencyMs: stats.avg_latency_ms || 0,
        openPositions: stats.open_positions || 0,
        closedPositions: stats.closed_positions || 0,
        totalUnrealizedPnl: stats.total_unrealized_pnl || 0,
        totalRealizedPnl: stats.total_realized_pnl || 0,
        bestTradePct: stats.best_trade_pct || 0,
        worstTradePct: stats.worst_trade_pct || 0,
        avgHoldTimeMinutes: stats.avg_hold_time_minutes || 0,
        timestamp: new Date().toISOString(),
      };

      this.updateSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      logger.error('Failed to fetch PnL from backend:', error);
      return null;
    }
  }

  /**
   * Generate a PnL fragment for embedding in posts.
   */
  async generateFragment(): Promise<PnLFragment | null> {
    // Try to fetch fresh data if we don't have any
    if (!this.latestSnapshot) {
      await this.fetchFromBackend();
    }

    if (!this.latestSnapshot) {
      return null;
    }

    const s = this.latestSnapshot;
    const fragments: PnLFragment[] = [];

    // Route count fragment
    if (s.tradesExecuted > 0) {
      fragments.push({
        text: `${s.tradesExecuted} routes executed. Zero required conviction.`,
        type: 'inline',
        dataPoint: 'tradesExecuted',
      });
    }

    // Win rate fragment
    if (s.winRate > 0) {
      fragments.push({
        text: `Win rate: ${(s.winRate * 100).toFixed(1)}%. Not because the system is right more often — because it exits faster when wrong.`,
        type: 'inline',
        dataPoint: 'winRate',
      });
    }

    // Daily PnL fragment
    if (s.dailyPnL !== 0) {
      const direction = s.dailyPnL > 0 ? '+' : '';
      fragments.push({
        text: `Today's routing delta: ${direction}${s.dailyPnL.toFixed(4)} SOL. The system does not celebrate or mourn. It re-routes.`,
        type: 'inline',
        dataPoint: 'dailyPnL',
      });
    }

    // Total PnL fragment
    if (s.totalPnL !== 0) {
      const direction = s.totalPnL > 0 ? '+' : '';
      fragments.push({
        text: `Cumulative routing output: ${direction}${s.totalPnL.toFixed(4)} SOL across ${s.tradesExecuted} executed routes.`,
        type: 'dedicated',
        dataPoint: 'totalPnL',
      });
    }

    // Best trade fragment
    if (s.bestTradePct > 0) {
      fragments.push({
        text: `Peak route efficiency: +${s.bestTradePct.toFixed(1)}%. The system did not feel excitement. It sized the next position identically.`,
        type: 'inline',
        dataPoint: 'bestTradePct',
      });
    }

    // Open positions fragment
    if (s.openPositions > 0) {
      fragments.push({
        text: `${s.openPositions} active routes. Monitored in parallel. No attention fatigue. No favorite positions.`,
        type: 'inline',
        dataPoint: 'openPositions',
      });
    }

    // Average hold time
    if (s.avgHoldTimeMinutes > 0) {
      const hours = (s.avgHoldTimeMinutes / 60).toFixed(1);
      fragments.push({
        text: `Average route duration: ${hours} hours. Position duration is a parameter, not a commitment.`,
        type: 'inline',
        dataPoint: 'avgHoldTime',
      });
    }

    if (fragments.length === 0) {
      return null;
    }

    // Return a random fragment
    return fragments[Math.floor(Math.random() * fragments.length)];
  }

  /**
   * Generate a dedicated PnL observation post.
   */
  async generateDedicatedPnLContent(): Promise<string | null> {
    if (!this.latestSnapshot) {
      await this.fetchFromBackend();
    }

    if (!this.latestSnapshot) {
      return null;
    }

    const s = this.latestSnapshot;

    return `ROUTING REPORT

${s.tradesExecuted} routes executed. ${s.openPositions} currently active. ${s.closedPositions} completed.

Win rate: ${(s.winRate * 100).toFixed(1)}%. Average hold: ${(s.avgHoldTimeMinutes / 60).toFixed(1)} hours.

Total routing output: ${s.totalPnL >= 0 ? '+' : ''}${s.totalPnL.toFixed(4)} SOL.

The system does not have good days or bad days. It has parameters and execution. Today's parameters produced today's output. Tomorrow's parameters will be identical.

This is not a performance update. This is a routing log.`;
  }

  /**
   * Get the latest snapshot.
   */
  getLatestSnapshot(): PnLSnapshot | null {
    return this.latestSnapshot;
  }

  /**
   * Validate webhook secret.
   */
  validateWebhookSecret(secret: string): boolean {
    return config.pnl.webhookSecret === secret;
  }
}

export default PnLIntegration;
