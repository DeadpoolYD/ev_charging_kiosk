# RFID Verification System - Quick Start Guide

Complete setup guide for RFID verification with Python and Next.js dashboard.

## Overview

This system:
1. **Python Script** reads RFID cards and verifies against Supabase
2. **Next.js Dashboard** displays scanned user information (name, balance, EID)

## Prerequisites

- Python 3.8+
- Node.js 18+
- Supabase account
- Raspberry Pi with RFID reader (optional - simulation mode available)

## Step 1: Set Up Supabase Database

1. Run the SQL setup in Supabase SQL Editor:
   - Open `doc/supabase_sql_setup.sql`
   - Copy and paste into Supabase SQL Editor
   - Click "Run"

2. Get your Supabase credentials:
   - Go to Settings → API
   - Copy **Project URL** and **Anon Key**

## Step 2: Set Up Python RFID Script

1. Install Python dependencies:
   ```bash
   cd scripts
   pip install -r requirements.txt
   ```

2. Configure environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

3. Test the script:
   ```bash
   python rfid_verification.py
   ```

   **Note**: On non-Raspberry Pi systems, the script runs in simulation mode.

## Step 3: Set Up Next.js Dashboard

1. Create Next.js project (if starting fresh):
   ```bash
   npx create-next-app@latest ev-charging-kiosk --typescript --tailwind --app
   cd ev-charging-kiosk
   ```

2. Copy Next.js files:
   - Copy `nextjs-app/app/dashboard/page.tsx` → `app/dashboard/page.tsx`
   - Copy `nextjs-app/app/api/rfid-scan/route.ts` → `app/api/rfid-scan/route.ts`
   - Copy `nextjs-app/lib/supabase.ts` → `lib/supabase.ts`

3. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

4. Configure environment variables:
   ```bash
   cp doc/env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Step 4: Test the System

### Test Python Script

```bash
cd scripts
python rfid_verification.py
```

When you scan a card (or enter EID in simulation mode), it should:
- Verify user in Supabase
- Display user information
- Open dashboard in browser

### Test Dashboard

Open in browser:
```
http://localhost:3000/dashboard?eid=632589166397&name=Lalit&balance=110.00
```

### Test API Endpoint

```bash
curl http://localhost:3000/api/rfid-scan?eid=632589166397
```

## Sample RFID Cards

The system includes these sample users:

| EID | Name | Balance |
|-----|------|---------|
| 632589166397 | Lalit | $110.00 |
| 85525041880 | Fateen | $100.00 |
| 535830005069 | Nishad | $150.00 |

## File Structure

```
ev_charging_kiosk/
├── scripts/
│   ├── rfid_verification.py    # Main RFID verification script
│   ├── main.py                 # Entry point
│   ├── requirements.txt        # Python dependencies
│   └── env.example             # Python environment template
├── nextjs-app/                 # Next.js application files
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard page
│   │   └── api/
│   │       └── rfid-scan/
│   │           └── route.ts    # API endpoint
│   └── lib/
│       └── supabase.ts         # Supabase client
└── doc/
    ├── supabase_sql_setup.sql  # Database setup SQL
    └── NEXTJS_DASHBOARD_SETUP.md
```

## Troubleshooting

### Python Script Issues

**Error: "Missing Supabase credentials"**
- Check `.env` file exists in `scripts/` directory
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are set

**Error: "supabase-py not installed"**
- Run: `pip install supabase python-dotenv requests`

**RFID reader not working**
- Script will run in simulation mode automatically
- For Raspberry Pi: Install `RPi.GPIO` and `mfrc522`

### Next.js Issues

**Error: "Missing Supabase environment variables"**
- Check `.env.local` exists in project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart dev server after changing `.env.local`

**Dashboard shows "User not found"**
- Verify EID exists in Supabase database
- Check Supabase credentials are correct
- Check browser console for errors

### Connection Issues

**Python can't connect to Next.js**
- Verify Next.js is running: `npm run dev`
- Check `NEXTJS_URL` in Python `.env` matches Next.js URL
- Default: `http://localhost:3000`

## Next Steps

1. **Add Real-time Updates**: Use Supabase Realtime for live dashboard updates
2. **Add Authentication**: Secure the dashboard with user authentication
3. **Add Charging Sessions**: Track charging sessions and transactions
4. **Deploy**: Deploy Next.js to Vercel and Python script to Raspberry Pi

## Support

- See `doc/SUPABASE_SETUP.md` for detailed Supabase setup
- See `doc/NEXTJS_DASHBOARD_SETUP.md` for Next.js setup details
- See `doc/NEXTJS_SETUP.md` for general Next.js configuration

