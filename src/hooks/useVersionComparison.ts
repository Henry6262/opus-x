/**
 * useVersionComparison Hook
 *
 * Loads and manages comparison data for multiple agent versions.
 * Handles metric selection, date range filtering, and data transformation for charts.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AgentDefinition } from '@/lib/agents';
import type { VersionComparisonData, MetricType } from '@/types/versioning';
import { versioningApi } from '@/lib/versioning-api';

interface UseVersionComparisonOptions {
  agent?: AgentDefinition;
  versionIds: string[];
  selectedMetric: MetricType;
  dateRange?: {
    start: string; // ISO date
    end: string;   // ISO date
  };
  bucket?: '1d' | '3h'; // Timeframe bucket
  autoLoad?: boolean; // Default: true
}

interface UseVersionComparisonReturn {
  data: VersionComparisonData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook for comparing multiple agent versions.
 *
 * @example
 * ```tsx
 * const { data, loading } = useVersionComparison({
 *   versionIds: ['v1-uuid', 'v2-uuid'],
 *   selectedMetric: 'winRate',
 *   dateRange: { start: '2024-01-01', end: '2024-01-31' },
 *   bucket: '3h', // Optional: '1d' (default) or '3h'
 * });
 *
 * if (loading) return <div>Loading comparison...</div>;
 * if (!data) return null;
 *
 * return (
 *   <div>
 *     {data.versions.map(v => (
 *       <div key={v.id}>
 *         {v.versionName}: {data.summary[v.id].winRate}%
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useVersionComparison({
  agent,
  versionIds,
  selectedMetric,
  dateRange,
  bucket = '1d',
  autoLoad = true,
}: UseVersionComparisonOptions): UseVersionComparisonReturn {
  const [data, setData] = useState<VersionComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestKeyRef = useRef<string | null>(null);

  const versionIdsKey = versionIds.join('|');
  const dateStart = dateRange?.start;
  const dateEnd = dateRange?.end;
  const stableVersionIds = useMemo(
    () => (versionIdsKey ? versionIdsKey.split('|') : []),
    [versionIdsKey]
  );
  const requestKey = useMemo(
    () =>
      `${agent?.id ?? ''}|${agent?.key ?? ''}|${versionIdsKey}|${selectedMetric}|${dateStart ?? ''}|${dateEnd ?? ''}|${bucket}`,
    [agent?.id, agent?.key, versionIdsKey, selectedMetric, dateStart, dateEnd, bucket]
  );

  const loadComparison = useCallback(async (force = false) => {
    // Debug logging to trace data flow
    console.log('[useVersionComparison] loadComparison called', {
      force,
      bucket,
      dateRange: { start: dateStart, end: dateEnd },
      lastRequestKey: lastRequestKeyRef.current,
      currentRequestKey: requestKey,
      versionIds: stableVersionIds,
    });

    if (!force && lastRequestKeyRef.current === requestKey) {
      console.log('[useVersionComparison] Skipping - same request key');
      return;
    }
    lastRequestKeyRef.current = requestKey;

    // Don't load if no versions selected
    if (stableVersionIds.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useVersionComparison] Fetching with params:', {
        versionIds: stableVersionIds,
        metric: selectedMetric,
        startDate: dateStart,
        endDate: dateEnd,
        bucket,
      });

      const result = await versioningApi.compareVersions(
        stableVersionIds,
        selectedMetric,
        dateStart,
        dateEnd,
        bucket,
        agent?.id,
        agent?.key
      );

      // Debug: Log how many metrics were returned for each version
      console.log('[useVersionComparison] Received data:', {
        versionsCount: result.versions.length,
        metricsPerVersion: Object.fromEntries(
          Object.entries(result.metricsByVersion).map(([k, v]) => [k, (v as any[]).length])
        ),
      });

      setData(result);
    } catch (err: any) {
      console.error('Failed to load version comparison:', err);
      setError(err.message || 'Failed to load comparison data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [requestKey, stableVersionIds, selectedMetric, dateStart, dateEnd, bucket, agent?.id, agent?.key]);

  useEffect(() => {
    if (autoLoad) {
      loadComparison();
    }
  }, [autoLoad, loadComparison]);

  return {
    data,
    loading,
    error,
    reload: () => loadComparison(true),
  };
}
