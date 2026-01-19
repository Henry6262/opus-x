# Analytics Setup Checklist

## Problem Summary
The analytics panel shows empty charts because the `token_ai_analysis_log` table doesn't exist in Supabase. The backend API **IS** working and returning data (117 trades, 9.7% win rate, -0.65 SOL P&L), but the Supabase logging fails with 404 errors.

## Quick Fix (5 minutes)

### Step 1: Create Database Tables

Go to your Supabase dashboard and run the SQL migration:

1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of `supabase/migrations/001_create_analytics_tables.sql`
6. Paste and click **Run**
7. Should see "Success. No rows returned"

**Quick verification:**
```sql
SELECT COUNT(*) FROM public.token_ai_analysis_log;
```
Should return `0` (empty table, not an error).

### Step 2: Add Supabase Credentials

Update `.env.local` with your real Supabase credentials:

```bash
# Replace these placeholders in .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from: **Supabase Dashboard → Project Settings → API**
- Look for "Project URL" and "Project API keys" section
- Copy the **anon/public** key (NOT the service_role key)

### Step 3: Restart Dev Server

```bash
# Kill the current dev server (Ctrl+C)
npm run dev
```

### Step 4: Test Analytics

1. Open http://localhost:3000 (or 3001 if 3000 is in use)
2. Navigate to the Analytics tab
3. You should now see:
   - ✅ Total Trades: 117
   - ✅ Win Rate: 9.72%
   - ✅ Total P&L: -0.65 SOL
   - ✅ Recent Decisions (will populate as new trades happen)

## What Was Fixed

### Before (Broken):
- ❌ 404 errors: `POST /rest/v1/token_ai_analysis_log 404 (Not Found)`
- ❌ Error: "Could not find the table 'public.token_ai_analysis_log' in the schema cache"
- ❌ Empty analytics charts despite backend having data

### After (Working):
- ✅ Tables exist: `token_ai_analysis_log` and `token_market_snapshots`
- ✅ Backend API data flows to analytics panel
- ✅ AI decisions get logged to Supabase
- ✅ Charts show real trading data

## Verification Commands

Check backend API is working:
```bash
cd /Users/henry/Documents/Gazillion-dollars/Ponzinomics/use-case-apps/superRouter
npx tsx src/scripts/test-analytics-data.ts
```

Should output:
```
✅ Data received!
📈 Stats:
   Total Trades: 117
   Winning Trades: 39
   Losing Trades: 78
   Win Rate: 9.72%
   Total P&L: -0.65 SOL
```

Check Supabase tables exist:
```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'token_%';
```

Should return:
- `token_ai_analysis_log`
- `token_market_snapshots`

## Troubleshooting

### Still seeing 404 errors?
- Verify the table was created: Run `SELECT * FROM token_ai_analysis_log LIMIT 1;` in Supabase SQL Editor
- Check `.env.local` has correct credentials (no placeholders)
- Restart Next.js dev server

### Analytics panel still empty?
- Check browser console for errors (F12 → Console)
- Verify backend API is running: Visit https://devprint-v2-production.up.railway.app/api/health
- Check WebSocket connection in Network tab (filter: WS)

### "relation already exists" error when running migration?
- This is fine! It means the table was already created. Ignore and proceed.

## What These Tables Store

**token_ai_analysis_log:**
- Every AI trading decision (buy/sell/skip)
- Confidence scores (0-100%)
- Reasoning and warnings
- Token metrics at decision time
- Links to resulting trades (position_id)

**token_market_snapshots:**
- Historical price data
- Market cap, liquidity, volume
- Price changes over time
- Used for performance charts

## Files Created/Modified

- ✅ `supabase/migrations/001_create_analytics_tables.sql` - Database schema
- ✅ `supabase/README.md` - Setup instructions
- ✅ `.env.local` - Added Supabase credential placeholders
- ✅ This checklist file

## Next Steps After Setup

Once tables are created and analytics are displaying:

1. Monitor AI decisions in real-time (Analytics → Recent Decisions)
2. Track win rate trends over time
3. Analyze which token metrics correlate with successful trades
4. Export data for deeper analysis

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Check console logs: `npm run dev` and watch for errors
- Test backend directly: `npx tsx src/scripts/test-analytics-data.ts`
