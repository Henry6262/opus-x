/**
 * useVersions Hook
 *
 * Manages agent versions state: loading, creating, and activating versions.
 * Provides CRUD operations for the version management UI.
 */

import { useState, useEffect, useCallback } from 'react';
import type { AgentDefinition } from '@/lib/agents';
import type { AgentVersion, CreateVersionRequest } from '@/types/versioning';
import { versioningApi } from '@/lib/versioning-api';

interface UseVersionsReturn {
  versions: AgentVersion[];
  activeVersion: AgentVersion | null;
  loading: boolean;
  error: string | null;
  createVersion: (req: CreateVersionRequest) => Promise<AgentVersion>;
  activateVersion: (versionId: string) => Promise<void>;
  reload: () => Promise<void>;
}

interface UseVersionsOptions {
  agent?: AgentDefinition;
}

/**
 * Hook for managing agent versions.
 *
 * @example
 * ```tsx
 * const { versions, activeVersion, loading, createVersion } = useVersions();
 *
 * if (loading) return <div>Loading...</div>;
 *
 * return (
 *   <div>
 *     <p>Active: {activeVersion?.versionName}</p>
 *     <ul>
 *       {versions.map(v => <li key={v.id}>{v.versionCode}</li>)}
 *     </ul>
 *   </div>
 * );
 * ```
 */
export function useVersions({ agent }: UseVersionsOptions = {}): UseVersionsReturn {
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<AgentVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allVersions, active] = await Promise.all([
        versioningApi.listVersions(agent?.id, agent?.key),
        versioningApi.getActiveVersion(agent?.id, agent?.key),
      ]);

      setVersions(allVersions);
      setActiveVersion(active);
    } catch (err: any) {
      console.error('Failed to load versions:', err);
      setError(err.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [agent?.id, agent?.key]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const createVersion = useCallback(async (req: CreateVersionRequest): Promise<AgentVersion> => {
    try {
      setError(null);
      const newVersion = await versioningApi.createVersion({
        ...req,
        agentId: req.agentId ?? agent?.id,
        agentKey: req.agentKey ?? agent?.key,
      });

      // Reload all versions to get updated state
      await loadVersions();

      return newVersion;
    } catch (err: any) {
      console.error('Failed to create version:', err);
      setError(err.message || 'Failed to create version');
      throw err;
    }
  }, [agent?.id, agent?.key, loadVersions]);

  const activateVersion = useCallback(async (versionId: string): Promise<void> => {
    try {
      setError(null);
      await versioningApi.activateVersion(versionId, agent?.id, agent?.key);

      // Reload to update active status
      await loadVersions();
    } catch (err: any) {
      console.error('Failed to activate version:', err);
      setError(err.message || 'Failed to activate version');
      throw err;
    }
  }, [agent?.id, agent?.key, loadVersions]);

  return {
    versions,
    activeVersion,
    loading,
    error,
    createVersion,
    activateVersion,
    reload: loadVersions,
  };
}
