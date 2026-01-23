-- ============================================
-- EV Charging Kiosk - Supabase SQL Setup
-- ============================================
-- Run this SQL in Supabase SQL Editor to set up the database
-- ============================================

-- Step 1: Create the users table
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    eid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    current_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    state BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Create index on eid for faster lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_eid ON public.users(eid);

-- Step 3: Create function to automatically update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 4: Create trigger to auto-update updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
-- ============================================
-- Policy: Allow all users to read (for frontend)
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
CREATE POLICY "Allow public read access"
    ON public.users
    FOR SELECT
    USING (true);

-- Policy: Allow all users to insert (for registration)
DROP POLICY IF EXISTS "Allow public insert access" ON public.users;
CREATE POLICY "Allow public insert access"
    ON public.users
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow all users to update (for balance updates, etc.)
DROP POLICY IF EXISTS "Allow public update access" ON public.users;
CREATE POLICY "Allow public update access"
    ON public.users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy: Allow all users to delete (for admin operations)
DROP POLICY IF EXISTS "Allow public delete access" ON public.users;
CREATE POLICY "Allow public delete access"
    ON public.users
    FOR DELETE
    USING (true);

-- Step 7: Insert sample data (optional)
-- ============================================
-- Uncomment the following lines to insert sample users
INSERT INTO public.users (eid, name, contact_number, current_balance, state)
VALUES
    ('632589166397', 'Lalit', '1234567890', 110.00, TRUE),
    ('85525041880', 'Fateen', '7263072799', 100.00, TRUE),
    ('535830005069', 'Nishad', '1234567890', 150.00, TRUE)
ON CONFLICT (eid) DO NOTHING;

-- Step 8: Verify the table was created
-- ============================================
-- Run this query to verify:
-- SELECT * FROM public.users ORDER BY name;

-- Step 9: Create authentication logs table
-- ============================================
CREATE TABLE IF NOT EXISTS public.authentication_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    eid TEXT NOT NULL,
    user_name TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'failed', 'timeout')),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 10: Create indexes on logs table for faster queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.authentication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_eid ON public.authentication_logs(eid);
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON public.authentication_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.authentication_logs(created_at DESC);

-- Step 11: Enable Row Level Security for logs table
-- ============================================
ALTER TABLE public.authentication_logs ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS Policies for logs table
-- ============================================
-- Policy: Allow all users to read logs (for admin/frontend)
DROP POLICY IF EXISTS "Allow public read access" ON public.authentication_logs;
CREATE POLICY "Allow public read access"
    ON public.authentication_logs
    FOR SELECT
    USING (true);

-- Policy: Allow inserts (for logging)
DROP POLICY IF EXISTS "Allow public insert access" ON public.authentication_logs;
CREATE POLICY "Allow public insert access"
    ON public.authentication_logs
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- Setup Complete!
-- ============================================
-- Next steps:
-- 1. Go to Settings > API in Supabase dashboard
-- 2. Copy your Project URL and Anon Key
-- 3. Add them to your .env.local file (see .env.example)
-- ============================================

