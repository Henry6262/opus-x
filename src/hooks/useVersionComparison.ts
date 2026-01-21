/**
 * useVersionComparison Hook
 *
 * Loads and manages comparison data for multiple agent versions.
 * Handles metric selection, date range filtering, and data transformation for charts.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { VersionComparisonData, MetricType } from '@/types/versioning';
import { versioningApi } from '@/lib/versioning-api';

interface UseVersionComparisonOptions {
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
  const stableVersionIds = useMemo(() => versionIds, [versionIdsKey]);
  const requestKey = useMemo(
    () => `${versionIdsKey}|${selectedMetric}|${dateRange?.start ?? ''}|${dateRange?.end ?? ''}|${bucket}`,
    [versionIdsKey, selectedMetric, dateRange?.start, dateRange?.end, bucket]
  );

  const loadComparison = useCallback(async (force = false) => {
    if (!force && lastRequestKeyRef.current === requestKey) {
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

      const result = await versioningApi.compareVersions(
        stableVersionIds,
        selectedMetric,
        dateRange?.start,
        dateRange?.end,
        bucket
      );

      setData(result);
    } catch (err: any) {
      console.error('Failed to load version comparison:', err);
      setError(err.message || 'Failed to load comparison data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [requestKey, stableVersionIds, selectedMetric, dateRange?.start, dateRange?.end, bucket]);

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
