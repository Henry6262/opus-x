# Frontend Agent - Analytics Dashboard Rebuild Briefing

**Project:** Agent Versioning System - Frontend Implementation
**Location:** `use-case-apps/superRouter` (React/TypeScript frontend)
**Status:** Backend foundation complete, frontend needs full rebuild
**Priority:** Can work in parallel with backend API development

---

## Mission Overview

Build a **modular, reusable analytics dashboard** that compares performance across different trading agent versions. The current `AnalyticsPanel.tsx` (1,032 lines) is monolithic and has broken data - we're rebuilding from scratch with modern React patterns.

---

## What You're Building

### Core Features
1. **Version Comparison Chart** - Multi-line chart showing metrics (Win Rate, P&L, Hold Time, etc.) for multiple agent versions over time
2. **Performance Metrics Cards** - Display active version's key stats (Win Rate, Total P&L, Trade Count, Avg Multiplier)
3. **Version Ranking Table** - Compare all versions side-by-side with best/worst highlighting
4. **Version Management UI** - Create new versions, activate versions, view config snapshots

### Key Principle
**Delete and rebuild** - Don't modify the existing AnalyticsPanel. Build a completely new modular system.

---

## Backend API Contract (What's Available)

The backend Rust API will provide these endpoints:

### 1. **GET /api/versions**
List all agent versions.
```json
[
  {
    "id": "uuid",
    "version_code": "v1.0.0",
    "version_name": "Conservative Strategy",
    "description": "Baseline config",
    "config_snapshot": { /* Full TradingConfig */ },
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z",
    "created_by": "user@example.com",
    "notes": "Initial version"
  }
]
```

### 2. **GET /api/versions/active**
Get currently active version (same structure as above, single object or null).

### 3. **POST /api/versions**
Create a new version.
```json
// Request
{
  "version_code": "v1.1.0",
  "version_name": "Aggressive TP",
  "description": "Increased TP targets",
  "config_snapshot": { /* TradingConfig JSON */ },
  "activate": true,
  "created_by": "user@example.com",
  "notes": "Testing higher profit targets"
}

// Response: AgentVersion object
```

### 4. **PUT /api/versions/:id/activate**
Activate a version (deactivates all others).
Returns: Updated AgentVersion object.

### 5. **GET /api/versions/:id/metrics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD**
Get daily metrics for a specific version.
```json
[
  {
    "id": "uuid",
    "version_id": "uuid",
    "date": "2024-01-15",
    "total_trades": 10,
    "winning_trades": 7,
    "losing_trades": 3,
    "win_rate": 70.0,
    "total_pnl_sol": 2.5,
    "avg_pnl_sol": 0.25,
    "best_trade_pct": 150.0,
    "worst_trade_pct": -30.0,
    "avg_hold_time_minutes": 120,
    "avg_multiplier": 1.8,
    "median_multiplier": 1.5,
    "updated_at": "2024-01-15T23:59:59Z"
  }
]
```

### 6. **GET /api/versions/compare?version_ids[]=uuid1&version_ids[]=uuid2&metric=winRate&start_date=...&end_date=...**
Compare multiple versions.
```json
{
  "versions": [ /* Array of AgentVersion */ ],
  "metrics_by_version": {
    "uuid1": [ /* Array of VersionMetrics */ ],
    "uuid2": [ /* Array of VersionMetrics */ ]
  },
  "summary": {
    "uuid1": {
      "total_trades": 100,
      "win_rate": 65.0,
      "total_pnl_sol": 10.5,
      "avg_multiplier": 1.6,
      "avg_hold_time_minutes": 90,
      "best_trade_pct": 200.0,
      "worst_trade_pct": -25.0
    },
    "uuid2": { /* Same structure */ }
  }
}
```

### 7. **GET /api/trading/stats**
**IMPORTANT BEHAVIOR CHANGE:** Now returns stats for **ACTIVE version ONLY** (not all trades).
```json
{
  "open_positions": 5,
  "closed_positions": 95,
  "total_unrealized_pnl": 1.5,
  "total_realized_pnl": 8.0,
  "total_pnl": 9.5,
  "winning_trades": 62,
  "losing_trades": 33,
  "win_rate": 65.26,
  "avg_hold_time_minutes": 85,
  "best_trade_pct": 180.0,
  "worst_trade_pct": -28.0
}
```

---

## Implementation Plan

### Phase 1: Setup & Types (30 minutes)

**File:** `src/types/versioning.ts`

Create all TypeScript interfaces matching the backend API:

```typescript
export interface AgentVersion {
  id: string;
  versionCode: string;
  versionName: string;
  description?: string;
  configSnapshot: TradingConfig;  // Reference existing TradingConfig type
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

export interface VersionMetrics {
  id: string;
  versionId: string;
  date: string;  // ISO date "2024-01-15"
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

export type MetricType =
  | 'winRate'
  | 'totalPnl'
  | 'avgHoldTime'
  | 'avgMultiplier'
  | 'tradeCount';

export interface VersionSummary {
  totalTrades: number;
  winRate: number;
  totalPnlSol: number;
  avgMultiplier: number;
  avgHoldTimeMinutes: number;
  bestTradePct: number;
  worstTradePct: number;
}

export interface VersionComparisonData {
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
```

---

### Phase 2: API Client (30 minutes)

**File:** `src/services/versioning-api.ts`

Create API client (use existing patterns from `src/services/` if they exist):

```typescript
const API_BASE = process.env.VITE_API_URL || 'http://localhost:3030';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }

  return response.json();
}

export const versioningApi = {
  async listVersions(): Promise<AgentVersion[]> {
    return fetchApi<AgentVersion[]>('/api/versions');
  },

  async getActiveVersion(): Promise<AgentVersion | null> {
    return fetchApi<AgentVersion | null>('/api/versions/active');
  },

  async createVersion(req: CreateVersionRequest): Promise<AgentVersion> {
    return fetchApi<AgentVersion>('/api/versions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async activateVersion(versionId: string): Promise<AgentVersion> {
    return fetchApi<AgentVersion>(`/api/versions/${versionId}/activate`, {
      method: 'PUT',
    });
  },

  async getVersionMetrics(
    versionId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<VersionMetrics[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const query = params.toString();
    return fetchApi<VersionMetrics[]>(
      `/api/versions/${versionId}/metrics${query ? '?' + query : ''}`
    );
  },

  async compareVersions(
    versionIds: string[],
    metric: MetricType,
    startDate?: string,
    endDate?: string,
  ): Promise<VersionComparisonData> {
    const params = new URLSearchParams();
    versionIds.forEach(id => params.append('version_ids', id));
    params.set('metric', metric);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    return fetchApi<VersionComparisonData>(`/api/versions/compare?${params}`);
  },
};
```

---

### Phase 3: Custom Hooks (45 minutes)

**File:** `src/hooks/useVersions.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { AgentVersion, CreateVersionRequest } from '@/types/versioning';
import { versioningApi } from '@/services/versioning-api';

export function useVersions() {
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<AgentVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      const [allVersions, active] = await Promise.all([
        versioningApi.listVersions(),
        versioningApi.getActiveVersion(),
      ]);
      setVersions(allVersions);
      setActiveVersion(active);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const createVersion = useCallback(async (req: CreateVersionRequest) => {
    const newVersion = await versioningApi.createVersion(req);
    await loadVersions();
    return newVersion;
  }, [loadVersions]);

  const activateVersion = useCallback(async (versionId: string) => {
    await versioningApi.activateVersion(versionId);
    await loadVersions();
  }, [loadVersions]);

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
```

**File:** `src/hooks/useVersionComparison.ts`

```typescript
import { useState, useEffect } from 'react';
import { VersionComparisonData, MetricType } from '@/types/versioning';
import { versioningApi } from '@/services/versioning-api';

export function useVersionComparison(
  versionIds: string[],
  selectedMetric: MetricType,
  dateRange?: { start: string; end: string }
) {
  const [data, setData] = useState<VersionComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (versionIds.length === 0) return;

    const loadComparison = async () => {
      try {
        setLoading(true);
        const result = await versioningApi.compareVersions(
          versionIds,
          selectedMetric,
          dateRange?.start,
          dateRange?.end
        );
        setData(result);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [versionIds, selectedMetric, dateRange?.start, dateRange?.end]);

  return { data, loading, error };
}
```

---

### Phase 4: Reusable Components (2-3 hours)

#### 4.1 MetricCard Component

**File:** `src/components/analytics/charts/MetricCard.tsx`

Small card displaying a single metric with optional trend indicator.

```typescript
interface MetricCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'percentage' | 'currency';
  className?: string;
}

export function MetricCard({ label, value, suffix, trend, format = 'number', className }: MetricCardProps) {
  // Format value based on type
  // Display with trend indicator
  // Use Tailwind for styling
}
```

#### 4.2 MetricSelector Component

**File:** `src/components/analytics/charts/MetricSelector.tsx`

Dropdown to switch between metrics (Win Rate, P&L, etc.).

```typescript
interface MetricSelectorProps {
  selectedMetric: MetricType;
  onChange: (metric: MetricType) => void;
}

const METRIC_OPTIONS = [
  { value: 'winRate', label: 'Win Rate (%)' },
  { value: 'totalPnl', label: 'Total P&L (SOL)' },
  { value: 'avgHoldTime', label: 'Avg Hold Time (min)' },
  { value: 'avgMultiplier', label: 'Avg Multiplier' },
  { value: 'tradeCount', label: 'Trade Count' },
];
```

#### 4.3 VersionLineChart Component

**File:** `src/components/analytics/charts/VersionLineChart.tsx`

**Key Feature:** Multi-line chart with one line per agent version.

**Chart Library:** Use Recharts (already installed based on plan).

```typescript
interface VersionLineChartProps {
  versions: AgentVersion[];
  metricsByVersion: Record<string, VersionMetrics[]>;
  selectedMetric: MetricType;
  height?: number;
}

// Transform data: group by date, one line per version
// Use Recharts <LineChart> with multiple <Line> components
// Different color per version (use color array)
```

**Data Transformation Logic:**
```typescript
const chartData = useMemo(() => {
  const dateMap = new Map<string, Record<string, number>>();

  Object.entries(metricsByVersion).forEach(([versionId, metrics]) => {
    metrics.forEach(m => {
      if (!dateMap.has(m.date)) {
        dateMap.set(m.date, { date: m.date });
      }
      dateMap.get(m.date)![versionId] = getMetricValue(m, selectedMetric);
    });
  });

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}, [metricsByVersion, selectedMetric]);
```

#### 4.4 ComparisonTable Component

**File:** `src/components/analytics/charts/ComparisonTable.tsx`

Table showing all versions ranked by performance.

```typescript
interface ComparisonTableProps {
  data: VersionComparisonData;
  selectedMetric: MetricType;
  onViewDetails: (version: AgentVersion) => void;
}

// Features:
// - Sort versions by selected metric
// - Highlight #1 best performing version
// - Show "ACTIVE" badge for active version
// - Show "🏆 BEST" badge for top performer
// - Click to view config snapshot
```

---

### Phase 5: Main Dashboard (1-2 hours)

**File:** `src/components/analytics/AnalyticsDashboard.tsx`

Main container that composes all components.

```typescript
export function AnalyticsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('winRate');
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);

  // Data fetching
  const { versions, activeVersion, loading: versionsLoading } = useVersions();
  const { data: comparisonData, loading: comparisonLoading } = useVersionComparison(
    selectedVersionIds.length > 0 ? selectedVersionIds : versions.map(v => v.id),
    selectedMetric,
    { start: '2024-01-01', end: new Date().toISOString().split('T')[0] }
  );

  // Auto-select all versions on load
  useEffect(() => {
    if (versions.length > 0 && selectedVersionIds.length === 0) {
      setSelectedVersionIds(versions.map(v => v.id));
    }
  }, [versions, selectedVersionIds]);

  // Layout:
  // 1. Header with active version name
  // 2. Row of MetricCards (active version stats)
  // 3. MetricSelector + VersionLineChart
  // 4. ComparisonTable
  // 5. VersionList (manage versions)
}
```

---

### Phase 6: Version Management UI (1 hour)

**File:** `src/components/analytics/version/VersionList.tsx`

Display all versions with activate button.

**File:** `src/components/analytics/version/CreateVersionDialog.tsx`

Modal to create new version (form with validation).

---

### Phase 7: Integration (30 minutes)

**Update routing** to use new `AnalyticsDashboard` instead of old `AnalyticsPanel`.

**File to modify:** Find where `AnalyticsPanel` is imported and replace with `AnalyticsDashboard`.

---

## File Deletion List

**DELETE these files** (monolithic analytics):
- `src/components/analytics/AnalyticsPanel.tsx` (1,032 lines)
- `src/components/analytics/AiDecisionChart.tsx` (if exists and not used elsewhere)
- `src/components/analytics/TokenAnalysisHistory.tsx` (if exists and not used elsewhere)

---

## Testing Strategy

### Mock API During Development

If backend endpoints aren't ready yet, create mock data:

**File:** `src/services/__mocks__/versioning-api.ts`

```typescript
export const mockVersioningApi = {
  async listVersions(): Promise<AgentVersion[]> {
    return [
      {
        id: 'v1-uuid',
        versionCode: 'v1.0.0',
        versionName: 'Conservative',
        isActive: false,
        createdAt: '2024-01-10T00:00:00Z',
        configSnapshot: {},
      },
      {
        id: 'v2-uuid',
        versionCode: 'v1.1.0',
        versionName: 'Aggressive',
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
        configSnapshot: {},
      },
    ];
  },
  // ... other methods with mock data
};
```

Use environment variable to switch:
```typescript
export const versioningApi =
  import.meta.env.VITE_USE_MOCK_API === 'true'
    ? mockVersioningApi
    : realVersioningApi;
```

---

## Key Design Principles

1. **Composition over Monolith** - Small, reusable components
2. **Separation of Concerns** - Data fetching (hooks) separate from presentation (components)
3. **TypeScript Strict** - All props typed, no `any`
4. **Responsive Design** - Mobile-friendly layouts
5. **Loading States** - Show skeletons/spinners during data fetch
6. **Error Handling** - Display errors gracefully

---

## Styling Guidelines

- **Use existing patterns** from the codebase (Tailwind classes, theme colors)
- **Dark mode support** if the app uses it
- **Consistent spacing** (use design system spacing variables if available)
- **Chart colors:** Use array like `['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']`

---

## Dependencies

You should have these already installed:
- `recharts` - Charting library
- `tailwindcss` - Styling
- React 19+ (check package.json)

If missing, install:
```bash
npm install recharts
```

---

## Success Criteria

✅ All old analytics files deleted
✅ New modular component structure
✅ Multi-line chart works with multiple versions
✅ Metric switching works (Win Rate → P&L → etc.)
✅ Version comparison table ranks correctly
✅ Active version badge displays
✅ Create version dialog works
✅ Activate version button works
✅ No TypeScript errors
✅ Responsive on mobile

---

## Communication Protocol

### When You're Done

Create a summary document:
```
FRONTEND_COMPLETION_REPORT.md

- Files created (list paths)
- Components built
- API integration status
- Known issues/blockers
- Screenshots (if possible)
- Next steps (if any)
```

### If You Get Blocked

Document the blocker clearly:
```
BLOCKER: Missing endpoint /api/versions/compare
- Expected response: { versions, metrics, summary }
- Current error: 404 Not Found
- Workaround: Using mock data for now
- Needs: Backend team to implement endpoint
```

---

## Reference Documents

- **Main Plan:** `/Users/henry/Documents/Gazillion-dollars/Ponzinomics/AGENT_VERSIONING_PLAN.md` (if you created one earlier)
- **Backend Schema:** `use-case-apps/devprint/packages/supabase/migrations/049_add_agent_versioning.sql`
- **Existing Dashboard:** `src/components/analytics/AnalyticsPanel.tsx` (for reference, then DELETE)

---

## Timeline Estimate

- **Phase 1-2:** 1 hour (Types + API client)
- **Phase 3:** 45 min (Hooks)
- **Phase 4:** 2-3 hours (Reusable components)
- **Phase 5:** 1-2 hours (Main dashboard)
- **Phase 6:** 1 hour (Version management)
- **Phase 7:** 30 min (Integration)

**Total:** 6-8 hours of focused development

---

## Questions to Ask Before Starting

1. Are there existing utility functions for date formatting?
2. Is there a design system or component library in use?
3. What's the app's color palette/theme?
4. Are there existing chart examples I can reference?
5. Is there a testing framework set up (Vitest, Jest)?

---

## Start Here

1. **Read this entire document**
2. **Explore existing codebase structure** (`src/components/`, `src/services/`, `src/types/`)
3. **Create `src/types/versioning.ts`** (Phase 1)
4. **Create `src/services/versioning-api.ts`** (Phase 2)
5. **Build hooks** (Phase 3)
6. **Start with MetricCard** (simplest component) to validate patterns
7. **Build chart components** (Phase 4)
8. **Compose dashboard** (Phase 5)
9. **Add version management** (Phase 6)
10. **Test end-to-end** (Phase 7)

---

**Good luck! Build something modular and beautiful. 🚀**
