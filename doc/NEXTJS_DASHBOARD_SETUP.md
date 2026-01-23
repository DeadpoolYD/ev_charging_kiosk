# Next.js RFID Dashboard Setup Guide

This guide explains how to set up the Next.js dashboard that displays RFID scan results.

## Project Structure

```
nextjs-app/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard page component
│   └── api/
│       └── rfid-scan/
│           └── route.ts      # API route for RFID scans
├── lib/
│   └── supabase.ts           # Supabase client configuration
└── .env.local                # Environment variables
```

## Setup Instructions

### 1. Create Next.js Project

```bash
npx create-next-app@latest ev-charging-kiosk --typescript --tailwind --app
cd ev-charging-kiosk
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 3. Copy Files

Copy the following files to your Next.js project:
- `nextjs-app/app/dashboard/page.tsx` → `app/dashboard/page.tsx`
- `nextjs-app/app/api/rfid-scan/route.ts` → `app/api/rfid-scan/route.ts`
- `nextjs-app/lib/supabase.ts` → `lib/supabase.ts`

### 4. Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run Development Server

```bash
npm run dev
```

The dashboard will be available at: `http://localhost:3000/dashboard`

## How It Works

### 1. Python Script Scans RFID
- Python script reads RFID card
- Verifies EID against Supabase
- Sends POST request to `/api/rfid-scan` with user data
- Opens browser to `/dashboard?eid=...&name=...&balance=...`

### 2. Dashboard Page
- Receives EID from URL parameters
- Fetches user data from Supabase
- Displays:
  - RFID scanned (EID)
  - User name
  - Current balance
  - Contact number
  - Status (Active/Inactive)

### 3. API Route
- Handles POST requests from Python script
- Validates user exists in Supabase
- Returns user data as JSON

## Testing

### Test API Route Directly

```bash
# GET request
curl http://localhost:3000/api/rfid-scan?eid=632589166397

# POST request
curl -X POST http://localhost:3000/api/rfid-scan \
  -H "Content-Type: application/json" \
  -d '{"eid":"632589166397","name":"Lalit","balance":110.00}'
```

### Test Dashboard

Open in browser:
```
http://localhost:3000/dashboard?eid=632589166397&name=Lalit&balance=110.00
```

## Integration with Python Script

The Python script (`scripts/rfid_verification.py`) automatically:
1. Scans RFID card
2. Verifies against Supabase
3. Opens dashboard URL in browser
4. Sends data to API endpoint

Make sure `NEXTJS_URL` in Python `.env` matches your Next.js server URL.

## Features

- ✅ Real-time RFID scan display
- ✅ User authentication verification
- ✅ Balance display
- ✅ Contact information
- ✅ Status indicators
- ✅ Responsive design
- ✅ Error handling

## Next Steps

1. Add real-time updates using Supabase Realtime
2. Add charging session management
3. Add transaction history
4. Add admin panel integration

