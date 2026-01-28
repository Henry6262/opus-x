"use client";

import { useState, useEffect, useCallback } from "react";
import type { LeaderboardEntry } from "../types";
import { fetchLeaderboard } from "../service";

export function useLeaderboard(limit = 10) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchLeaderboard({ limit });
      if (res.success) {
        setEntries(res.data);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, refresh: load };
}
