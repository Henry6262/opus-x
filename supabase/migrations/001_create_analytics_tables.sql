-- Create token_ai_analysis_log table for AI trading decisions
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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_token_mint ON public.token_ai_analysis_log(token_mint);
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_analyzed_at ON public.token_ai_analysis_log(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_decision ON public.token_ai_analysis_log(decision);
CREATE INDEX IF NOT EXISTS idx_token_ai_analysis_position_id ON public.token_ai_analysis_log(position_id);

-- Create token_market_snapshots table for market data tracking
CREATE TABLE IF NOT EXISTS public.token_market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_mint TEXT NOT NULL,
    token_symbol TEXT,
    token_name TEXT,
    snapshot_type TEXT NOT NULL,
    price_usd NUMERIC NOT NULL,
    market_cap NUMERIC,
    liquidity NUMERIC,
    volume_24h NUMERIC,
    price_change_1h NUMERIC,
    price_change_24h NUMERIC,
    holder_count INTEGER,
    position_id TEXT,
    analysis_id TEXT,
    data_source TEXT,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_market_snapshots_token_mint ON public.token_market_snapshots(token_mint);
CREATE INDEX IF NOT EXISTS idx_token_market_snapshots_snapshot_at ON public.token_market_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_market_snapshots_position_id ON public.token_market_snapshots(position_id);
CREATE INDEX IF NOT EXISTS idx_token_market_snapshots_analysis_id ON public.token_market_snapshots(analysis_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.token_ai_analysis_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_market_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can restrict these later)
CREATE POLICY "Enable read access for all users" ON public.token_ai_analysis_log
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.token_ai_analysis_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.token_ai_analysis_log
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.token_ai_analysis_log
    FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.token_market_snapshots
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.token_market_snapshots
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.token_market_snapshots
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.token_market_snapshots
    FOR DELETE USING (true);

-- Add helpful comments
COMMENT ON TABLE public.token_ai_analysis_log IS 'Stores AI trading bot decision logs for analytics';
COMMENT ON TABLE public.token_market_snapshots IS 'Stores market data snapshots for tokens over time';
