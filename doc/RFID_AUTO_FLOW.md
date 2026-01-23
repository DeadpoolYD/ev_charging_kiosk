# Updated RFID Authentication Flow

## How It Works Now

### Python Backend (rfid_verification.py)
- ✅ **Runs continuously** - No user input required
- ✅ **Automatically scans** RFID cards (when on Raspberry Pi)
- ✅ **Validates** user against Supabase
- ✅ **Updates state** to `TRUE` after successful authentication
- ✅ **Auto-logout** after 30 seconds of inactivity
- ✅ **Logout** when same card scanned again

### Frontend
- ✅ **Automatically checks** user state from Supabase
- ✅ **Shows user data** when `state = TRUE`
- ✅ **Denies access** when `state = FALSE`
- ✅ **Updates in real-time** (if using Supabase Realtime subscriptions)

## Complete Flow

```
┌─────────────────┐
│ RFID Card Scan  │
│ (Automatic)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Python Backend  │
│ Validates User  │
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
│ Frontend Polls  │
│ Supabase State  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Show User Data  │
│ (if state=TRUE) │
└─────────────────┘
```

## Key Changes

### Removed:
- ❌ User input prompts
- ❌ Manual card ID entry
- ❌ Browser opening
- ❌ Interactive mode

### Added:
- ✅ Continuous scanning loop
- ✅ Automatic validation
- ✅ Auto-logout timeout (30 seconds)
- ✅ Non-blocking RFID reading
- ✅ Frontend auto-detection

## Running the Backend

```bash
cd scripts
python rfid_verification.py
```

The script will:
1. Start running continuously
2. Wait for RFID cards to be scanned
3. Automatically validate and update Supabase
4. Frontend will automatically show data

## Frontend Integration

The frontend automatically:
1. Checks user `state` from Supabase when scanning
2. Shows user data if `state = TRUE`
3. Denies access if `state = FALSE`
4. Updates when state changes in Supabase

### Optional: Real-time Updates

To enable real-time updates in frontend, add Supabase Realtime subscription:

```typescript
// In your frontend component
useEffect(() => {
  const subscription = supabase
    .channel('users')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'users' },
      (payload) => {
        // User state updated - refresh UI
        if (payload.new.eid === currentEid) {
          // Update current user state
          setCurrentUser(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [currentEid]);
```

## Testing

1. **Start Python backend:**
   ```bash
   python scripts/rfid_verification.py
   ```

2. **Scan RFID card** (or use actual RFID reader)
   - Backend will automatically detect and validate
   - State will be set to `TRUE` in Supabase

3. **Frontend will automatically show user data**
   - No manual refresh needed
   - State check happens automatically

4. **Auto-logout:**
   - After 30 seconds of no activity
   - Or scan same card again

## Configuration

### Environment Variables (scripts/.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
NEXTJS_URL=http://localhost:3000  # Optional - for API notifications
```

### Timeout Settings (in code)
- `scan_cooldown = 2` seconds - Minimum time between scans
- `scan_timeout = 30` seconds - Auto-logout timeout

## Benefits

✅ **Fully automated** - No manual intervention needed  
✅ **Continuous operation** - Runs 24/7  
✅ **Real-time updates** - Frontend detects changes automatically  
✅ **Secure** - Backend controls authentication state  
✅ **Scalable** - Can handle multiple users  

