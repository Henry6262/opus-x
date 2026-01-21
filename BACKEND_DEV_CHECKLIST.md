# Backend Developer Checklist - Agent Versioning Integration

**Status:** Frontend complete, backend integration needed
**Time Required:** ~3 hours
**Date:** 2026-01-21

---

## Quick Context

**What's Built:**
- ✅ Frontend analytics dashboards (2 dashboards)
- ✅ Backend API endpoints (6 endpoints deployed to Railway)
- ✅ Database schema (agent_versions + version_metrics tables)

**What Needs You:**
- ⏳ Backfill existing positions with version_id
- ⏳ Tag new positions with active version
- ⏳ Auto-calculate metrics when positions close

---

## Current Problem

All positions have `agent_version_id: null`:

```bash
curl https://devprint-v2-production.up.railway.app/api/trading/positions | jq '.[0].agent_version_id'
# Output: null
```

**Impact:** Version comparison charts are empty (overall trading analytics work fine)

---

## Task 1: Backfill Existing Positions (30 min)

**What:** Assign all existing positions to a baseline version

**Where:** Run this SQL on your database

```sql
-- Step 1: Create baseline version (if not exists)
INSERT INTO agent_versions (
  id,
  version_code,
  version_name,
  description,
  config_snapshot,
  is_active,
  created_at,
  created_by
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'v0.0.0',
  'Pre-Versioning Trades',
  'All trades executed before versioning system was deployed',
  '{}',
  false,
  NOW(),
  'system'
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Assign all existing positions to v0.0.0
UPDATE positions
SET version_id = '00000000-0000-0000-0000-000000000000'
WHERE version_id IS NULL;

-- Step 3: Verify
SELECT COUNT(*) FROM positions WHERE version_id IS NULL;
-- Should return 0

-- Step 4: Recalculate metrics for v0.0.0
-- Use your existing PositionDb.calculate_stats_for_version() method
-- Or manually aggregate:
INSERT INTO version_metrics (
  id,
  version_id,
  date,
  total_trades,
  winning_trades,
  losing_trades,
  win_rate,
  total_pnl_sol,
  avg_pnl_sol,
  best_trade_pct,
  worst_trade_pct,
  avg_hold_time_minutes,
  avg_multiplier,
  median_multiplier,
  updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  DATE(entry_time) as date,
  COUNT(*) as total_trades,
  COUNT(*) FILTER (WHERE tp1_hit = true OR realized_pnl_sol > 0) as winning_trades,
  COUNT(*) FILTER (WHERE tp1_hit = false AND realized_pnl_sol <= 0) as losing_trades,
  (COUNT(*) FILTER (WHERE tp1_hit = true OR realized_pnl_sol > 0)::float / COUNT(*) * 100) as win_rate,
  SUM(realized_pnl_sol + COALESCE(unrealized_pnl_sol, 0)) as total_pnl_sol,
  AVG(realized_pnl_sol + COALESCE(unrealized_pnl_sol, 0)) as avg_pnl_sol,
  MAX(peak_pnl_pct) as best_trade_pct,
  MIN(unrealized_pnl_pct) as worst_trade_pct,
  AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - entry_time)) / 60) as avg_hold_time_minutes,
  AVG((peak_pnl_pct / 100) + 1) as avg_multiplier,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (peak_pnl_pct / 100) + 1) as median_multiplier,
  NOW() as updated_at
FROM positions
WHERE version_id = '00000000-0000-0000-0000-000000000000'
GROUP BY DATE(entry_time)
ON CONFLICT (version_id, date) DO UPDATE SET
  total_trades = EXCLUDED.total_trades,
  winning_trades = EXCLUDED.winning_trades,
  losing_trades = EXCLUDED.losing_trades,
  win_rate = EXCLUDED.win_rate,
  total_pnl_sol = EXCLUDED.total_pnl_sol,
  avg_pnl_sol = EXCLUDED.avg_pnl_sol,
  best_trade_pct = EXCLUDED.best_trade_pct,
  worst_trade_pct = EXCLUDED.worst_trade_pct,
  avg_hold_time_minutes = EXCLUDED.avg_hold_time_minutes,
  avg_multiplier = EXCLUDED.avg_multiplier,
  median_multiplier = EXCLUDED.median_multiplier,
  updated_at = NOW();
```

**Verify:**
```bash
# Check version exists
curl https://devprint-v2-production.up.railway.app/api/versions | jq '.data[] | select(.version_code == "v0.0.0")'

# Check metrics calculated
curl https://devprint-v2-production.up.railway.app/api/versions/00000000-0000-0000-0000-000000000000/metrics | jq '.data | length'
# Should return > 0
```

---

## Task 2: Tag New Positions (1 hour)

**What:** When creating a position, set version_id from active version

**Where:** Your position creation code (likely `src/trading/paper_trader.rs` or similar)

**Current Code (Example):**
```rust
// In your buy handler
let position = Position {
    id: Uuid::new_v4(),
    mint: token_mint.clone(),
    token_name: token_name.clone(),
    // ... other fields
    version_id: None, // ← PROBLEM: Always None
    created_at: Utc::now(),
};
```

**New Code:**
```rust
// Add at top of file
use crate::versioning::VersionManager;

// In your buy handler (before creating position)
let version_manager = VersionManager::new(pool.clone());
let active_version = version_manager.get_active_version().await?;

let position = Position {
    id: Uuid::new_v4(),
    mint: token_mint.clone(),
    token_name: token_name.clone(),
    // ... other fields
    version_id: active_version.map(|v| v.id), // ← FIX: Use active version
    created_at: Utc::now(),
};

// Optional: Log for debugging
if let Some(version_id) = position.version_id {
    info!("Position tagged with version_id: {}", version_id);
} else {
    warn!("No active version found - position created without version_id");
}
```

**Files to Modify:**
- `src/trading/paper_trader.rs` (or wherever you create positions)
- `src/trading/position.rs` (if position creation is centralized)

**Verify:**
```bash
# After deploying, create a new position
# Then check it has version_id
curl https://devprint-v2-production.up.railway.app/api/trading/positions | jq '.[0].agent_version_id'
# Should return a UUID, not null
```

---

## Task 3: Auto-Calculate Metrics (30 min)

**What:** After closing a position, update version_metrics table

**Where:** Your position close handler

**Current Code (Example):**
```rust
// In your close/sell handler
pub async fn close_position(&self, position_id: Uuid) -> Result<()> {
    // Update position status
    self.position_db.close_position(position_id).await?;

    info!("Position {} closed", position_id);
    Ok(())
}
```

**New Code:**
```rust
use crate::versioning::MetricsCalculator;

pub async fn close_position(&self, position_id: Uuid) -> Result<()> {
    // Update position status
    let position = self.position_db.close_position(position_id).await?;

    info!("Position {} closed", position_id);

    // Trigger metrics calculation
    if let Some(version_id) = position.version_id {
        let metrics_calc = MetricsCalculator::new(self.pool.clone());
        let today = Utc::now().date_naive();

        match metrics_calc.calculate_for_day(version_id, today).await {
            Ok(_) => info!("Metrics updated for version {}", version_id),
            Err(e) => error!("Failed to update metrics: {}", e),
        }
    } else {
        warn!("Position {} has no version_id - metrics not calculated", position_id);
    }

    Ok(())
}
```

**Files to Modify:**
- `src/trading/paper_trader.rs` (sell/close handlers)
- `src/db/position_db.rs` (if close logic is centralized)

**Verify:**
```bash
# After closing a position, check metrics updated
curl https://devprint-v2-production.up.railway.app/api/versions/YOUR_VERSION_ID/metrics | jq '.data | length'
# Should increase by 1 (new day added) or update existing day
```

---

## Task 4: Verify Everything Works (1 hour)

### Test 1: Endpoints Respond
```bash
# List all versions
curl https://devprint-v2-production.up.railway.app/api/versions

# Get active version
curl https://devprint-v2-production.up.railway.app/api/versions/active

# Create test version
curl -X POST https://devprint-v2-production.up.railway.app/api/versions \
  -H "Content-Type: application/json" \
  -d '{
    "version_code": "v1.2.0",
    "version_name": "Test Version",
    "description": "Testing backend integration",
    "config_snapshot": {},
    "activate": true
  }'

# Get metrics for a version
curl https://devprint-v2-production.up.railway.app/api/versions/YOUR_VERSION_ID/metrics
```

### Test 2: New Position Gets Tagged
1. Activate a version via API or dashboard
2. Execute a trade (let bot buy a token)
3. Check position has version_id:
```bash
curl https://devprint-v2-production.up.railway.app/api/trading/positions | jq '.[0] | {id, token_name, agent_version_id}'
```

### Test 3: Metrics Update on Close
1. Close a position (let it hit TP or SL)
2. Check version_metrics table updated:
```bash
curl https://devprint-v2-production.up.railway.app/api/versions/YOUR_VERSION_ID/metrics | jq '.data[-1]'
# Should show today's date with updated trade count
```

### Test 4: Frontend Charts Populate
1. Open frontend with `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
2. Navigate to homepage
3. Scroll to "Agent Version Analytics" section
4. Should see:
   - Active version metrics (non-zero)
   - Comparison chart with data points
   - Performance rankings table with versions

---

## Common Issues

### Issue: Positions still have null version_id
**Cause:** Active version not set, or code not deployed
**Fix:**
1. Check active version exists: `curl .../api/versions/active`
2. If null, activate one: `curl -X PUT .../api/versions/VERSION_ID/activate`
3. Verify code changes deployed to Railway

### Issue: Metrics not calculating
**Cause:** MetricsCalculator not called, or SQL query failing
**Fix:**
1. Check Railway logs for errors
2. Verify position has version_id before calling calculator
3. Test SQL query manually to ensure it works

### Issue: Frontend shows "Error loading versions"
**Cause:** API endpoint returning error, or CORS issue
**Fix:**
1. Check Railway logs
2. Test endpoint with curl
3. Verify CORS headers allow frontend domain

---

## Files Reference

**Backend (devprint):**
- `src/versioning/mod.rs` - VersionManager + MetricsCalculator (already complete)
- `src/routes/versioning.rs` - API endpoints (already complete)
- `src/trading/paper_trader.rs` - **YOU MODIFY THIS** (position creation + close)
- `src/db/position_db.rs` - **YOU MIGHT MODIFY THIS** (if position logic centralized)

**Frontend (superRouter):**
- `AGENT_VERSIONING_README.md` - Full documentation (you're reading a summary)
- `src/components/analytics/AnalyticsDashboard.tsx` - Version comparison UI
- `src/components/trading/TradingAnalyticsDashboard.tsx` - Overall trading UI

---

## Timeline

- ✅ **Week 1 (Done):** Frontend complete
- ✅ **Week 1 (Done):** Backend API deployed
- ⏳ **Now (You):** SQL backfill + code updates (3 hours)
- 🎯 **After:** Version comparison charts populate automatically

---

## Questions?

**Frontend Issues:**
- Ask frontend dev
- Check `AGENT_VERSIONING_README.md`
- Check browser console

**Backend Issues:**
- Check Railway logs
- Test endpoints with curl
- Review Rust compiler errors

**Database Issues:**
- Check PostgreSQL logs
- Verify schema exists: `\d agent_versions` and `\d version_metrics`
- Check foreign key constraints

---

**Good luck! 🚀**

Once you complete Tasks 1-3 and deploy, the version comparison charts will magically populate with your trading data.
