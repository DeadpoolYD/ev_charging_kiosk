-- Supabase Migration Script for EV Charging Kiosk
-- Creates the users table matching the spreadsheet format

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    eid TEXT UNIQUE NOT NULL, -- Employee ID / RFID Card ID
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    current_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    state BOOLEAN DEFAULT TRUE NOT NULL, -- Active/Inactive state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on EID for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_eid ON users(eid);

-- Create index on state for filtering active users
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default users (matching spreadsheet format)
INSERT INTO users (eid, name, contact_number, current_balance, state)
VALUES 
    ('632589166397', 'Lalit', '1234567890', 110.00, TRUE),
    ('535830005069', 'Nishad', '1234567890', 150.00, TRUE),
    ('85525041880', 'Fateen', '1234567890', 100.00, TRUE)
ON CONFLICT (eid) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to access all rows
-- Note: This uses the service_role key which bypasses RLS
-- For production, consider more restrictive policies
CREATE POLICY "Service role can access all users"
    ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);
