/**
 * Agent Versioning System - TypeScript Types
 *
 * Defines all interfaces for the agent versioning analytics system.
 * Matches backend API contract from Rust versioning module.
 */

import type { TradingConfig } from '@/features/smart-trading/types';

// ============================================
// AGENT VERSION
// ============================================

/**
 * Represents a specific version of the trading agent configuration.
 * Each version tracks a snapshot of settings and associated performance metrics.
 */
/**
 * A single changelog entry for a version release
 */
export interface ChangelogEntry {
  category: 'feature' | 'improvement' | 'performance' | 'bugfix' | 'security';
  title: string;
  description?: string;
  impact?: string;
}

export interface AgentVersion {
  id: string;
  versionCode: string;          // e.g., "v1.0.0", "v1.1.0"
  versionName: string;           // e.g., "Conservative Strategy"
  description?: string;          // Optional description of what changed
  configSnapshot: TradingConfig; // Full TradingConfig at time of version creation
  isActive: boolean;             // Only one version can be active at a time
  createdAt: string;             // ISO 8601 timestamp
  createdBy?: string;            // Email or user ID
  notes?: string;                // Optional notes about the version
  startDate?: string;            // Date version became active (ISO date)
  endDate?: string | null;       // Date version was deactivated (null = current)
  changelog?: ChangelogEntry[];  // Structured changelog entries
}

// ============================================
// VERSION METRICS
// ============================================

/**
 * Daily aggregated metrics for a specific agent version.
 * Auto-calculated when positions close.
 */
export interface VersionMetrics {
  id: string;
  versionId: string;
  date: string;                  // ISO date "2024-01-15"

  // Trade counts
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;

  // Performance metrics
  winRate: number;               // Percentage (0-100)
  totalPnlSol: number;           // Total P&L in SOL
  avgPnlSol?: number;            // Average P&L per trade
  bestTradePct?: number;         // Best single trade percentage
  worstTradePct?: number;        // Worst single trade percentage
  avgHoldTimeMinutes?: number;   // Average hold time in minutes
  avgMultiplier?: number;        // Average exit multiplier
  medianMultiplier?: number;     // Median exit multiplier

  updatedAt: string;             // ISO 8601 timestamp
}

// ============================================
// METRIC TYPES
// ============================================

/**
 * Available metric types for comparison charts.
 */
export type MetricType =
  | 'winRate'
  | 'totalPnl'
  | 'avgHoldTime'
  | 'avgMultiplier'
  | 'tradeCount';

/**
 * Metric configuration for UI selectors and charts.
 */
export interface MetricOption {
  value: MetricType;
  label: string;
  format: 'percentage' | 'number' | 'currency' | 'time';
  suffix?: string;
}

/**
 * Predefined metric options for the UI.
 */
export const METRIC_OPTIONS: MetricOption[] = [
  { value: 'winRate', label: 'Win Rate', format: 'percentage', suffix: '%' },
  { value: 'totalPnl', label: 'Total P&L', format: 'currency', suffix: ' SOL' },
  { value: 'avgHoldTime', label: 'Avg Hold Time', format: 'time', suffix: ' min' },
  { value: 'avgMultiplier', label: 'Avg Multiplier', format: 'number', suffix: 'x' },
  { value: 'tradeCount', label: 'Trade Count', format: 'number' },
];

// ============================================
// VERSION SUMMARY
// ============================================

/**
 * Aggregated summary statistics for a version across a date range.
 */
export interface VersionSummary {
  totalTrades: number;
  winRate: number;
  totalPnlSol: number;
  avgMultiplier: number;
  avgHoldTimeMinutes: number;
  bestTradePct: number;
  worstTradePct: number;
}

// ============================================
// VERSION COMPARISON
// ============================================

/**
 * Response from /api/versions/compare endpoint.
 * Contains full comparison data for multiple versions.
 */
export interface VersionComparisonData {
  versions: AgentVersion[];                         // Full version details
  metricsByVersion: Record<string, VersionMetrics[]>; // Daily metrics by version ID
  summary: Record<string, VersionSummary>;           // Aggregated stats by version ID
}

// ============================================
// CREATE VERSION REQUEST
// ============================================

/**
 * Request payload for creating a new agent version.
 */
export interface CreateVersionRequest {
  versionCode: string;
  versionName: string;
  description?: string;
  configSnapshot: TradingConfig;
  activate: boolean;              // Whether to activate this version immediately
  createdBy?: string;
  notes?: string;
}

// ============================================
// UI STATE
// ============================================

/**
 * UI state for the analytics dashboard.
 */
export interface VersioningDashboardState {
  selectedMetric: MetricType;
  selectedVersionIds: string[];
  dateRange: {
    start: string;  // ISO date
    end: string;    // ISO date
  };
  showCreateDialog: boolean;
}

// ============================================
// CHART DATA HELPERS
// ============================================

/**
 * Chart data point for multi-line version comparison charts.
 * Each point contains a date and dynamic version values.
 */
export interface ChartDataPoint {
  date: string;
  [versionId: string]: string | number; // Dynamic keys for each version
}

/**
 * Helper to extract metric value from VersionMetrics.
 */
export function getMetricValue(metrics: VersionMetrics, metricType: MetricType): number {
  switch (metricType) {
    case 'winRate':
      return metrics.winRate;
    case 'totalPnl':
      return metrics.totalPnlSol;
    case 'avgHoldTime':
      return metrics.avgHoldTimeMinutes || 0;
    case 'avgMultiplier':
      return metrics.avgMultiplier || 0;
    case 'tradeCount':
      return metrics.totalTrades;
    default:
      return 0;
  }
}

/**
 * Helper to format metric value for display.
 */
export function formatMetricValue(value: number, metricType: MetricType): string {
  const option = METRIC_OPTIONS.find(o => o.value === metricType);
  if (!option) return value.toFixed(2);

  switch (option.format) {
    case 'percentage':
      return `${value.toFixed(2)}${option.suffix || ''}`;
    case 'currency':
      return `${value.toFixed(4)}${option.suffix || ''}`;
    case 'time':
      return `${Math.round(value)}${option.suffix || ''}`;
    case 'number':
      return `${value.toFixed(2)}${option.suffix || ''}`;
    default:
      return value.toFixed(2);
  }
}
