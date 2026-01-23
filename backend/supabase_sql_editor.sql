-- =====================================================
-- EV Charging Kiosk - Users Table Setup
-- Copy and paste this entire script into Supabase SQL Editor
-- =====================================================

-- Step 1: Create the users table matching spreadsheet format
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    eid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    current_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    state BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_eid ON users(eid);
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

-- Step 3: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-update updated_at on row changes
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Insert users matching your spreadsheet data
-- Format: EID | Name | Contact Number | Current Balance | State
INSERT INTO users (eid, name, contact_number, current_balance, state)
VALUES 
    ('632589166397', 'Lalit', '1234567890', 110.00, TRUE),
    ('535830005069', 'Nishad', '1234567890', 150.00, TRUE),
    ('85525041880', 'Fateen', '1234567890', 100.00, TRUE)
ON CONFLICT (eid) DO NOTHING;

-- Step 6: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policy for service role access
-- This allows your backend to read/write all users
CREATE POLICY "Service role can access all users"
    ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- Verification Query (optional - run after setup)
-- =====================================================
-- SELECT eid, name, contact_number, current_balance, state 
-- FROM users 
-- ORDER BY name;
