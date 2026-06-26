CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    x_handle TEXT,
    wallet_address TEXT,
    interest TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their own entry
CREATE POLICY "Enable insert access for all users" ON public.waitlist_entries
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own entries
CREATE POLICY "Enable read access for all users" ON public.waitlist_entries
    FOR SELECT USING (true);

-- Helpful comment
COMMENT ON TABLE public.waitlist_entries IS 'Stores waitlist signups during the SuperRouter marketing/hype phase';
