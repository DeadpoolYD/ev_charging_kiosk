# Supabase Setup Guide for EV Charging Kiosk

This guide explains how to set up Supabase as the database backend for the EV Charging Kiosk system.

## Prerequisites

1. **Supabase Account**: Sign up for a free account at [supabase.com](https://supabase.com)
2. **Python 3.8+**: Required for the backend service
3. **pip**: Python package manager

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: `ev-charging-kiosk` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your deployment
4. Click "Create new project"
5. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need two values:
   - **Project URL**: Found under "Project URL" (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key**: Found under "Project API keys" → "service_role" key (keep this secret!)

## Step 3: Create the Database Table

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `backend/supabase_migration.sql`
4. Click "Run" to execute the migration
5. Verify the table was created by going to **Table Editor** → you should see the `users` table

## Step 4: Configure Environment Variables

1. Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

2. Add your Supabase credentials to `.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key-here
```

**Important**: 
- Replace `your-project-id` with your actual project ID
- Replace `your-service-role-key-here` with your actual service_role key
- Never commit the `.env` file to version control (it should be in `.gitignore`)

## Step 5: Install Python Dependencies

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install the required packages:

```bash
pip install -r requirements.txt
```

Or if using a virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 6: Verify the Setup

1. Start the backend service:

```bash
python rfid_service.py
```

2. Check the console output - you should see:
   - `[INFO] Starting RFID Service on port 5000`
   - No Supabase connection errors

3. Test the API endpoint:

```bash
curl http://localhost:5000/api/users
```

You should see the default users (Lalit, Nishad, Fateen) returned as JSON.

## Database Schema

The `users` table structure matches your spreadsheet format:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `eid` | TEXT | Employee ID / RFID Card ID (unique) |
| `name` | TEXT | User's name |
| `contact_number` | TEXT | Contact phone number |
| `current_balance` | DECIMAL(10,2) | Current account balance |
| `state` | BOOLEAN | Active/Inactive status (TRUE = active) |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## API Format Mapping

The backend converts between database format and API format:

**Database Format** → **API Format**:
- `eid` → `rfidCardId`
- `name` → `name`
- `contact_number` → `phoneNumber`
- `current_balance` → `balance`
- `state` → (not exposed in API, used internally)

## Security Considerations

1. **Service Role Key**: The service role key bypasses Row Level Security (RLS). Keep it secret!
2. **Environment Variables**: Never commit `.env` files to version control
3. **RLS Policies**: The migration creates a permissive policy. For production, consider:
   - Restricting access based on authenticated users
   - Using API keys with limited permissions
   - Implementing additional security layers

## Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_KEY must be set"
- Make sure you created the `.env` file in the `backend` directory
- Verify the variable names are exactly `SUPABASE_URL` and `SUPABASE_KEY`
- Check that there are no extra spaces or quotes in the `.env` file

### Error: "Failed to load users from Supabase"
- Verify your Supabase project is active
- Check that the migration script ran successfully
- Verify your credentials are correct
- Check the Supabase dashboard for any error logs

### Error: "Module 'supabase' not found"
- Make sure you installed requirements: `pip install -r requirements.txt`
- Verify you're using the correct Python environment

### Connection Timeout
- Check your internet connection
- Verify the Supabase project URL is correct
- Check if your network/firewall is blocking Supabase

## Production Deployment

For production deployment:

1. **Use Environment Variables**: Set `SUPABASE_URL` and `SUPABASE_KEY` as environment variables on your server
2. **Database Backups**: Enable automatic backups in Supabase dashboard
3. **Monitoring**: Set up monitoring and alerts in Supabase
4. **Connection Pooling**: Consider using Supabase connection pooling for better performance
5. **Rate Limiting**: Implement rate limiting on your API endpoints

## Support

- Supabase Documentation: [supabase.com/docs](https://supabase.com/docs)
- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Project Issues: Check your project's issue tracker
