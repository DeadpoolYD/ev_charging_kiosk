# Complete RFID Verification Flow

## System Architecture

```
┌─────────────────┐
│  RFID Reader    │
│  (Raspberry Pi) │
└────────┬────────┘
         │
         │ Reads Card
         ▼
┌─────────────────┐
│ Python Script   │
│ rfid_verification│
└────────┬────────┘
         │
         │ Verifies EID
         ▼
┌─────────────────┐
│   Supabase DB   │
│   (users table) │
└────────┬────────┘
         │
         │ Returns User Data
         ▼
┌─────────────────┐
│  Next.js API    │
│  /api/rfid-scan │
└────────┬────────┘
         │
         │ Opens Dashboard
         ▼
┌─────────────────┐
│ Next.js Dashboard│
│  /dashboard      │
└─────────────────┘
```

## Complete Flow

### 1. RFID Card Scan
- User places RFID card near reader
- Python script reads card ID (EID)
- Example: `535830005069`

### 2. Supabase Verification
- Python script queries Supabase `users` table
- Searches for user with matching `eid`
- Returns user data if found:
  ```json
  {
    "eid": "535830005069",
    "name": "Nishad",
    "contact_number": "1234567890",
    "current_balance": 150.00,
    "state": true
  }
  ```

### 3. Dashboard Display
- Python script opens Next.js dashboard
- URL: `http://localhost:3000/dashboard?eid=535830005069&name=Nishad&balance=150.00`
- Dashboard fetches user data from Supabase
- Displays:
  - ✅ RFID Scanned: `535830005069`
  - ✅ User Name: `Nishad`
  - ✅ Current Balance: `$150.00`
  - ✅ Contact Number: `1234567890`
  - ✅ Status: `Active`

## Key Files

### Python Side
- `scripts/rfid_verification.py` - Main verification script
- `scripts/main.py` - Entry point
- `scripts/requirements.txt` - Python dependencies
- `scripts/env.example` - Environment variables template

### Next.js Side
- `nextjs-app/app/dashboard/page.tsx` - Dashboard UI
- `nextjs-app/app/api/rfid-scan/route.ts` - API endpoint
- `nextjs-app/lib/supabase.ts` - Supabase client

### Database
- `doc/supabase_sql_setup.sql` - Database schema

## Environment Variables

### Python (.env in scripts/)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
NEXTJS_URL=http://localhost:3000
```

### Next.js (.env.local in project root)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing the Flow

1. **Start Next.js server:**
   ```bash
   npm run dev
   ```

2. **Run Python script:**
   ```bash
   cd scripts
   python rfid_verification.py
   ```

3. **Scan RFID card** (or enter EID in simulation mode)

4. **Dashboard opens automatically** showing user information

## Sample Data

The system includes these test users:

| EID | Name | Contact | Balance |
|-----|------|---------|---------|
| 632589166397 | Lalit | 1234567890 | $110.00 |
| 85525041880 | Fateen | 7263072799 | $100.00 |
| 535830005069 | Nishad | 1234567890 | $150.00 |

## Features

✅ **RFID Reading** - Reads RFID cards using MFRC522  
✅ **Supabase Verification** - Verifies users against database  
✅ **Real-time Dashboard** - Displays user info instantly  
✅ **Error Handling** - Handles invalid cards gracefully  
✅ **Simulation Mode** - Works without hardware for testing  
✅ **Auto-refresh** - Dashboard updates on new scans  

## Security Notes

- Service Role Key is used in Python script (server-side only)
- Anon Key is used in Next.js (client-side, protected by RLS)
- RLS policies control database access
- Never expose Service Role Key in client-side code

