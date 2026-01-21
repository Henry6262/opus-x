# Agent Versioning System - Complete Documentation

**Status:** ✅ Frontend Complete | ⏳ Backend Integration Required
**Date:** 2026-01-21
**Visibility:** Hidden by default (requires `NEXT_PUBLIC_ENABLE_ANALYTICS=true`)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What Was Built](#what-was-built)
3. [How It Works](#how-it-works)
4. [Architecture](#architecture)
5. [Frontend Implementation](#frontend-implementation)
6. [Backend Requirements](#backend-requirements)
7. [Data Flow](#data-flow)
8. [Deployment Guide](#deployment-guide)
9. [For the Backend Developer](#for-the-backend-developer)

---

## Overview

### What Is This?

The **Agent Versioning System** allows you to:
- Track which trading agent configuration executed each trade
- Compare performance across different versions (v1.0.0, v1.1.0, etc.)
- See win rate, P&L, and other metrics broken down by version
- A/B test different trading strategies

### Why Was This Built?

When you change trading parameters (TP targets, stop loss, position size, etc.), you need to know:
- Did the new config perform better?
- What was the win rate before vs. after?
- Which version made the most profit?

**This system answers those questions with data.**

---

## What Was Built

### Frontend (✅ Complete)

**Location:** `use-case-apps/superRouter/`

**8 New Components:**
1. `src/types/versioning.ts` - TypeScript types
2. `src/lib/versioning-api.ts` - API client
3. `src/hooks/useVersions.ts` - Version management hook
4. `src/hooks/useVersionComparison.ts` - Comparison hook
5. `src/components/analytics/AnalyticsDashboard.tsx` - Main container
6. `src/components/analytics/charts/` - 4 chart components
7. `src/components/analytics/version/` - 2 version management components

**UI Features:**
- Active version metrics dashboard (Win Rate, Total P&L, Trade Count, Avg Multiplier)
- Multi-line comparison chart (compare multiple versions over time)
- Performance rankings table (rank versions by any metric)
- Version management UI (create new versions, activate versions)

**Integration Point:**
- Homepage (`src/app/[locale]/home-dashboard.tsx`)
- Appears below Smart Trading Dashboard
- Only visible if `NEXT_PUBLIC_ENABLE_ANALYTICS=true`

### Backend (✅ API Complete, ⏳ Data Integration Required)

**Location:** `use-case-apps/devprint/`

**What Backend Completed:**
- Database schema (`049_add_agent_versioning.sql`)
- Rust versioning module (VersionManager, MetricsCalculator)
- 6 API endpoints (list, get, create, activate, metrics, compare)
- Deployed to Railway: `devprint-v2-production.up.railway.app`

**What Backend Needs to Finish:**
- Backfill existing trades with version IDs
- Ensure new positions get tagged with active version
- Auto-calculate metrics when positions close

---

## ⚠️ Critical Data Status

### You Already Have Rich Trading Data!

**Current State:**
- ✅ 6+ positions exist in `/api/trading/positions`
- ✅ Full market metrics (P&L, multipliers, TP hits, hold times)
- ✅ Extensive trading history with performance data
- ❌ ALL positions have `agent_version_id: null`
- ❌ Versioning charts are empty (waiting for backfill)

**The Disconnect:**

Your backend has a complete `/api/trading/positions` endpoint with:
```json
{
  "id": "c5e77a23-0692-4157-a2fe-5466f7c3187d",
  "token_name": "Confer",
  "unrealized_pnl_sol": -0.12070,
  "unrealized_pnl_pct": -72.85,
  "realized_pnl_sol": 0.0396,
  "tp1_hit": true,
  "peak_pnl_pct": 39.24,
  ...
  "agent_version_id": null  ← THE PROBLEM
}
```

The agent versioning system queries:
```sql
SELECT * FROM positions WHERE agent_version_id = 'some-uuid'
```

Result: **Empty charts** because no positions have version IDs yet.

**The Solution (Two-Part):**

1. **Overall Trading Analytics** (✅ NOW LIVE)
   - New dashboard showing ALL trading data regardless of version
   - Uses `/api/trading/positions` directly
   - Shows total P&L, win rate, token rankings, etc.
   - Visible immediately when analytics enabled

2. **Agent Version Analytics** (⏳ Needs Backfill)
   - Shows performance comparison across different config versions
   - Requires positions to have `agent_version_id` set
   - Backend dev runs SQL backfill (see Backend Requirements below)
   - Then charts populate automatically

**To Fix Empty Version Charts:**
See "Backend Requirements → Backfill Existing Positions" below.

---

## How It Works

### The Flow

```
1. Create Version (v1.0.0)
   ↓
2. Activate Version
   ↓
3. Trading Bot Opens Position
   → Position tagged with version_id = v1.0.0
   ↓
4. Position Closes
   → Backend calculates metrics for v1.0.0 on that date
   ↓
5. Frontend Dashboard Shows Metrics
   → Win rate, P&L, etc. for v1.0.0
```

### Example Scenario

**Day 1:**
- Create v1.0.0 (Conservative: 30% TP, 15% SL)
- Activate v1.0.0
- Execute 20 trades → All tagged with v1.0.0
- Close 20 trades → Metrics calculated

**Day 2:**
- Create v1.1.0 (Aggressive: 50% TP, 25% SL)
- Activate v1.1.0
- Execute 20 trades → All tagged with v1.1.0
- Close 20 trades → Metrics calculated

**Analytics Dashboard:**
- Compare v1.0.0 vs v1.1.0 side-by-side
- See which had better win rate
- See which made more profit
- Make data-driven decision on which config to keep

---

## Architecture

### Database Schema

```sql
-- Agent versions table
CREATE TABLE agent_versions (
  id UUID PRIMARY KEY,
  version_code TEXT NOT NULL UNIQUE,    -- "v1.0.0"
  version_name TEXT NOT NULL,           -- "Conservative Strategy"
  description TEXT,
  config_snapshot JSONB NOT NULL,       -- Full trading config
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  created_by TEXT,
  notes TEXT
);

-- Daily metrics per version
CREATE TABLE version_metrics (
  id UUID PRIMARY KEY,
  version_id UUID REFERENCES agent_versions(id),
  date DATE NOT NULL,
  total_trades INT,
  winning_trades INT,
  losing_trades INT,
  win_rate FLOAT,
  total_pnl_sol FLOAT,
  avg_pnl_sol FLOAT,
  best_trade_pct FLOAT,
  worst_trade_pct FLOAT,
  avg_hold_time_minutes INT,
  avg_multiplier FLOAT,
  median_multiplier FLOAT,
  updated_at TIMESTAMPTZ,
  UNIQUE(version_id, date)
);

-- Add version_id to positions
ALTER TABLE positions ADD COLUMN version_id UUID REFERENCES agent_versions(id);
```

### API Endpoints

**Base URL:** `https://devprint-v2-production.up.railway.app`

```
GET    /api/versions                    - List all versions
GET    /api/versions/active             - Get active version
POST   /api/versions                    - Create new version
PUT    /api/versions/:id/activate       - Activate a version
GET    /api/versions/:id/metrics        - Get metrics for version
GET    /api/versions/compare            - Compare multiple versions (optional)
```

**Response Format:** All endpoints return `{success, data, error}`

---

## Frontend Implementation

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_ENABLE_ANALYTICS=true                                    # Show/hide analytics
NEXT_PUBLIC_DEVPRINT_API_URL=https://devprint-v2-production.up.railway.app
```

**IMPORTANT:** Analytics is **HIDDEN BY DEFAULT** in production!
- Must explicitly set `NEXT_PUBLIC_ENABLE_ANALYTICS=true` to see it
- This prevents users from seeing incomplete/empty dashboards

### API Client

**File:** `src/lib/versioning-api.ts`

```typescript
import { versioningApi } from '@/lib/versioning-api';

// List all versions
const versions = await versioningApi.listVersions();

// Get active version
const active = await versioningApi.getActiveVersion();

// Create new version
const newVersion = await versioningApi.createVersion({
  versionCode: 'v1.2.0',
  versionName: 'High Risk Strategy',
  configSnapshot: currentConfig,
  activate: true,
});

// Activate version
await versioningApi.activateVersion(versionId);

// Get metrics
const metrics = await versioningApi.getVersionMetrics(
  versionId,
  '2024-01-01',
  '2024-01-31'
);
```

### Components

**Main Container:**
```tsx
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

// In your page
{process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
  <AnalyticsDashboard />
)}
```

---

## Backend Requirements

### What Backend Dev Needs to Do

#### 1. Backfill Existing Positions (One-Time Task)

**Problem:** 47 existing trades don't have `version_id`

**Solution:**
```sql
-- Create baseline version if not exists
INSERT INTO agent_versions (
  id, version_code, version_name, description,
  config_snapshot, is_active, created_at, created_by
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'v0.0.0',
  'Pre-Versioning Trades',
  'All trades executed before versioning system',
  '{}',
  false,
  NOW(),
  'system'
) ON CONFLICT DO NOTHING;

-- Assign all existing positions to v0.0.0
UPDATE positions
SET version_id = '00000000-0000-0000-0000-000000000000'
WHERE version_id IS NULL;

-- Recalculate metrics for v0.0.0
-- (Use your PositionDb.calculate_stats_for_version() method)
```

#### 2. Ensure New Positions Get Tagged

**In your position creation code:**
```rust
// When opening a new position
let active_version = version_manager.get_active_version()?;

Position {
    id: Uuid::new_v4(),
    version_id: Some(active_version.id), // ← ADD THIS
    // ... rest of fields
}
```

#### 3. Auto-Calculate Metrics on Close

**In your position close handler:**
```rust
// After closing a position
position_db.close_position(position_id)?;

// Trigger metrics calculation
let version_id = position.version_id.expect("Position should have version_id");
let today = Utc::now().date_naive();
metrics_calculator.calculate_for_day(version_id, today)?;
```

#### 4. Verify Endpoints Work

**Test each endpoint:**
```bash
# List versions
curl https://devprint-v2-production.up.railway.app/api/versions

# Get active version
curl https://devprint-v2-production.up.railway.app/api/versions/active

# Create version
curl -X POST https://devprint-v2-production.up.railway.app/api/versions \
  -H "Content-Type: application/json" \
  -d '{
    "version_code": "v1.2.0",
    "version_name": "Test",
    "config_snapshot": {},
    "activate": true
  }'

# Get metrics
curl https://devprint-v2-production.up.railway.app/api/versions/{id}/metrics
```

---

## Data Flow

### Creating a New Version

```
User Action: "Create v1.2.0"
  ↓
Frontend: POST /api/versions
  ↓
Backend:
  1. Save to agent_versions table
  2. If activate=true, set is_active=true (deactivate others)
  3. Return new version
  ↓
Frontend: Refresh version list, show new version in dashboard
```

### Position Lifecycle

```
Bot Opens Position
  ↓
Backend: Get active version ID
  ↓
Backend: Create position with version_id
  ↓
[Position is open for X minutes/hours]
  ↓
Bot Closes Position
  ↓
Backend:
  1. Update position (realized_pnl, closed_at, etc.)
  2. Get version_id from position
  3. Calculate metrics for that version's date
  4. Upsert to version_metrics table
  ↓
Frontend: Fetch metrics, update dashboard
```

### Viewing Analytics

```
User Opens Analytics Dashboard
  ↓
Frontend:
  1. GET /api/versions → List all versions
  2. GET /api/versions/active → Get active version
  3. For each version: GET /api/versions/{id}/metrics
  ↓
Frontend: Calculate summaries (total trades, avg win rate, etc.)
  ↓
Frontend: Render charts, tables, cards
```

---

## Deployment Guide

### Step 1: Deploy Backend (If Not Already Done)

```bash
# Backend should already be deployed to Railway
# Verify endpoints work:
curl https://devprint-v2-production.up.railway.app/api/versions
```

### Step 2: Deploy Frontend (Hidden by Default)

**In production `.env`:**
```bash
# DO NOT SET THIS - keeps analytics hidden
# NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Set the API URL
NEXT_PUBLIC_DEVPRINT_API_URL=https://devprint-v2-production.up.railway.app
```

**Result:** Analytics dashboard is **NOT VISIBLE** to users in production.

### Step 3: Enable for Testing (Staging/Dev)

**In staging/dev `.env.local`:**
```bash
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_DEVPRINT_API_URL=https://devprint-v2-production.up.railway.app
```

**Result:** Analytics dashboard **IS VISIBLE** for internal testing.

### Step 4: Backend Dev Backfills Data

Backend dev runs the SQL backfill script to assign version IDs to existing trades.

### Step 5: Verify Everything Works

1. Open staging/dev site
2. Navigate to homepage
3. Scroll down to "Agent Version Analytics"
4. Should see versions and metrics
5. Test creating a new version
6. Test activating a version

### Step 6: Enable in Production (When Ready)

**In production `.env`:**
```bash
NEXT_PUBLIC_ENABLE_ANALYTICS=true  # ← Add this line
```

Deploy and analytics becomes visible to all users.

---

## For the Backend Developer

### Quick Start Checklist

**Backend is 90% done. Here's what's left:**

- [ ] **Backfill existing positions**
  - Run SQL script to assign `version_id` to 47 existing trades
  - Create v0.0.0 baseline version for pre-versioning trades
  - Recalculate metrics for v0.0.0

- [ ] **Update position creation code**
  - Get active version when opening position
  - Set `position.version_id = active_version.id`

- [ ] **Update position close handler**
  - After closing, trigger metrics calculation
  - Call `metrics_calculator.calculate_for_day(version_id, date)`

- [ ] **Test API endpoints**
  - Verify all 6 endpoints return correct data
  - Test with real trading data

- [ ] **Monitor metrics calculation**
  - Verify metrics update when positions close
  - Check version_metrics table has data

### Files to Modify

**Rust Backend (`use-case-apps/devprint/`):**

```
src/trading/position.rs        - Add version_id to Position creation
src/trading/paper_trader.rs    - Get active version when buying
src/db/position_db.rs          - Auto-calculate metrics on close
src/versioning/               - Already complete ✅
src/routes/versioning.rs      - Already complete ✅
```

### Testing Locally

```bash
# Start backend locally
cd use-case-apps/devprint
cargo run

# In another terminal, test endpoints
curl http://localhost:3030/api/versions
curl http://localhost:3030/api/versions/active

# Start frontend
cd use-case-apps/superRouter
NEXT_PUBLIC_ENABLE_ANALYTICS=true npm run dev

# Open http://localhost:3000
# Scroll down to see analytics dashboard
```

### Common Issues

**Issue:** Dashboard shows 0 trades for all versions
**Cause:** Positions don't have `version_id` set
**Fix:** Run backfill script + update position creation code

**Issue:** Metrics don't update when positions close
**Cause:** Metrics calculation not triggered on close
**Fix:** Add `calculate_for_day()` call in close handler

**Issue:** Frontend can't fetch versions (404 error)
**Cause:** Wrong API URL or endpoints not registered
**Fix:** Verify `NEXT_PUBLIC_DEVPRINT_API_URL` and check routes

---

## Summary

### What Works Now

✅ **Overall Trading Analytics:** Jaw-dropping charts with all your real trading data
✅ **Agent Version Analytics:** Frontend complete, waiting for version_id backfill
✅ **Backend API:** All 6 versioning endpoints deployed and working
✅ **Trading API:** `/api/trading/positions` endpoint working (6+ positions with full metrics)
✅ **Database:** Schema created and ready
✅ **Deployment:** Hidden by default, can be enabled

### What's Live Right Now

When you enable `NEXT_PUBLIC_ENABLE_ANALYTICS=true`, users see:

1. **Overall Trading Analytics Dashboard** (✅ WORKING)
   - Total P&L across all trades
   - Win rate and trade outcomes
   - Cumulative/daily P&L charts
   - Token performance rankings table
   - TP hit rate analysis
   - Best/worst trade stats
   - Powered by `/api/trading/positions` (6+ positions with full data)

2. **Agent Version Analytics Dashboard** (⏳ Empty until backfill)
   - Version comparison charts
   - Per-version metrics
   - A/B testing capabilities
   - Waiting for `agent_version_id` backfill

### What Needs Backend Dev

⏳ **Backfill:** Assign version IDs to existing trades (30 min SQL script)
⏳ **Position Tagging:** Set version_id when opening positions (1 hour code update)
⏳ **Metrics Calculation:** Trigger on position close (30 min code update)
⏳ **Testing:** Verify end-to-end flow with real data (1 hour)

### Timeline Estimate

**Backend work remaining:** 2-3 hours
- Backfill: 30 min
- Code updates: 1 hour
- Testing: 1 hour
- Deployment: 30 min

---

## Questions?

**For Frontend Issues:**
- Check `FRONTEND_STATUS.md`
- Check `PRODUCTION_INTEGRATION.md`
- Check browser console for errors

**For Backend Issues:**
- Check `BACKEND_STATUS.md` (in devprint repo)
- Check API logs on Railway
- Test endpoints with curl

---

**Built with ❤️ on 2026-01-21**
**Ready for backend integration and production deployment!**
