# Supabase Database Setup

This directory contains SQL migrations for the superRouter analytics features.

## Quick Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migrations/001_create_analytics_tables.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success - you should see "Success. No rows returned"

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (get project-id from dashboard URL)
supabase link --project-ref your-project-id

# Apply the migration
supabase db push

# Or run the migration file directly
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < migrations/001_create_analytics_tables.sql
```

### Option 3: Quick Copy-Paste

If you just want to get started quickly:

1. Open your Supabase dashboard SQL Editor
2. Copy and run this:

```sql
-- Create token_ai_analysis_log table
CREATE TABLE IF NOT EXISTS public.token_ai_analysis_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_mint TEXT NOT NULL,
    token_symbol TEXT,
    token_name TEXT,
    trigger_type TEXT NOT NULL,
    decision TEXT NOT NULL,
    confidence NUMERIC NOT NULL,
    reasoning TEXT NOT NULL,
    entry_score NUMERIC,
    reasons TEXT[],
    warnings TEXT[],
    price_usd NUMERIC,
    market_cap NUMERIC,
    liquidity NUMERIC,
    volume_24h NUMERIC,
    pump_multiple NUMERIC,
    drawdown_percent NUMERIC,
    resulted_in_trade BOOLEAN,
    position_id TEXT,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_token_mint ON public.token_ai_analysis_log(token_mint);
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_analyzed_at ON public.token_ai_analysis_log(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_decision ON public.token_ai_analysis_log(decision);

-- Enable RLS and create policies
ALTER TABLE public.token_ai_analysis_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.token_ai_analysis_log
    FOR ALL USING (true) WITH CHECK (true);
```

## Verify Installation

After running the migration, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('token_ai_analysis_log', 'token_market_snapshots');
```

You should see both tables listed.

## Environment Variables

Make sure your `.env.local` has the Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: Supabase Dashboard → Project Settings → API

## Troubleshooting

### "relation already exists" error
This is fine - it means the table was already created. The migration uses `IF NOT EXISTS` to be safe.

### "permission denied" error
Make sure you're using the service_role key or postgres password, not the anon key, when running migrations directly.

### Tables not showing up in app
1. Check that `.env.local` has the correct Supabase credentials
2. Restart your Next.js dev server: `npm run dev`
3. Clear browser cache and reload

## What These Tables Do

- **token_ai_analysis_log**: Stores every AI trading decision (buy/sell/skip) with reasoning, confidence scores, and market data at the time of decision
- **token_market_snapshots**: Tracks token price and market data over time for historical analysis

These power the Analytics Panel's "Recent Decisions" section and historical charts.
