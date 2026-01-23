# RFID Authentication Flow Documentation

## How It Works

### 1. **Python Backend (rfid_verification.py)**
   - Reads RFID card
   - Verifies user exists in Supabase
   - **Sets `state = TRUE`** in Supabase after successful authentication
   - Opens dashboard/notifies frontend

### 2. **Frontend Authentication Check**
   - When user scans RFID, frontend checks `state` field
   - **Only allows access if `state = TRUE`**
   - Shows error if `state = FALSE` (not authenticated)

### 3. **Logout Process**
   - When user clicks "Logout" in frontend → **Sets `state = FALSE`**
   - When same RFID card is scanned again → **Sets `state = FALSE`** (logout)

## Authentication Flow

```
┌─────────────────┐
│  RFID Card Scan │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Python Backend  │
│ Verifies User   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Supabase │
│ state = TRUE    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Frontend Checks │
│ state = TRUE?   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Allow  │ │  Deny    │
│ Access │ │  Access  │
└────────┘ └──────────┘
```

## State Management

### Initial State
- All users start with `state = TRUE` (or FALSE, depending on your setup)

### After RFID Scan (Authentication)
- Python backend sets `state = TRUE` in Supabase
- Frontend checks `state` before allowing access
- If `state = TRUE` → User can proceed
- If `state = FALSE` → User is denied access

### Logout
- Frontend logout button → Sets `state = FALSE`
- Scanning same card again → Sets `state = FALSE` (logout)

## Code Changes Made

### Python Backend (`scripts/rfid_verification.py`)
1. ✅ `verify_user_by_eid()` - Now sets `state = TRUE` after verification
2. ✅ `logout_user_by_eid()` - New function to set `state = FALSE`
3. ✅ Main loop - Logs out user if same card scanned again

### Frontend (`src/`)
1. ✅ `supabase.ts` - Added `updateUserStateByEid()` function
2. ✅ `database.ts` - Added `updateUserState()` wrapper
3. ✅ `AuthScreen.tsx` - Checks `state` before allowing access
4. ✅ `AppContext.tsx` - Checks `state` in `scanRfid()` function
5. ✅ Logout button - Sets `state = FALSE` when clicked

## Testing

### Test Authentication Flow:
1. **Start Python backend:**
   ```bash
   cd scripts
   python rfid_verification.py
   ```

2. **Scan RFID card** (or enter EID in simulation mode)
   - Should see: `[SUCCESS] User authenticated: [Name] - State set to TRUE`
   - Check Supabase: User's `state` should be `TRUE`

3. **Frontend should allow access** if `state = TRUE`

4. **Test logout:**
   - Click "Logout" button → `state` should become `FALSE`
   - Or scan same card again → `state` should become `FALSE`

5. **Test denied access:**
   - If `state = FALSE`, frontend should show error
   - User cannot proceed until authenticated again

## Database Schema

The `users` table has a `state` column (BOOLEAN):
- `TRUE` = Authenticated (can access system)
- `FALSE` = Not authenticated (access denied)

## Security Notes

- ✅ Backend controls authentication state
- ✅ Frontend checks state before allowing access
- ✅ State persists in Supabase database
- ✅ Multiple users can be authenticated simultaneously (each has their own state)

## Next Steps

1. **Add timeout:** Auto-logout after X minutes of inactivity
2. **Add session tracking:** Track when user authenticated/logged out
3. **Add admin override:** Allow admin to manually set user states
4. **Add real-time updates:** Use Supabase Realtime to sync state changes

