# Quick Setup Guide

## 1. Supabase SQL Setup

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New query**
4. Copy and paste the entire contents of `doc/supabase_sql_setup.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Verify success - you should see "Success. No rows returned"

## 2. Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon Key** (public key, safe for frontend)

## 3. Set Up Environment Variables

1. Copy the example file:
   ```bash
   cp doc/env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 4. Verify Database Setup

Run this query in Supabase SQL Editor to verify:

```sql
SELECT eid, name, contact_number, current_balance 
FROM public.users 
ORDER BY name;
```

You should see the sample users (Lalit, Fateen, Nishad) if the setup was successful.

## Database Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `eid` | TEXT | Employee ID / RFID Card ID (unique) |
| `name` | TEXT | User's name |
| `contact_number` | TEXT | Contact phone number |
| `current_balance` | DECIMAL(10,2) | Current account balance |
| `state` | BOOLEAN | Active/Inactive status |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## Sample Data

The SQL setup includes these sample users:

- **EID**: 632589166397 | **Name**: Lalit | **Balance**: 110.00
- **EID**: 85525041880 | **Name**: Fateen | **Balance**: 100.00
- **EID**: 535830005069 | **Name**: Nishad | **Balance**: 150.00

## Next Steps

- See `doc/NEXTJS_SETUP.md` for Next.js frontend setup
- See `doc/SUPABASE_SETUP.md` for detailed Supabase configuration

