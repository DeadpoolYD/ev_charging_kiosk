# Frontend Real-time Supabase State Monitoring

## Overview

The frontend now continuously monitors Supabase for user state changes (TRUE/FALSE) and automatically updates the UI when a user is authenticated or logged out.

## How It Works

### 1. Python Backend
- Scans RFID card automatically
- Validates user in Supabase
- **Sets `state = TRUE`** when user authenticated
- **Sets `state = FALSE`** when user logged out

### 2. Supabase Database
- Stores user `state` (TRUE/FALSE)
- Updates happen in real-time
- Changes are broadcast via Supabase Realtime

### 3. Frontend Monitoring
- **Subscribes to Supabase Realtime** changes
- **Automatically detects** when `state` changes
- **Shows user** when `state = TRUE`
- **Hides user** when `state = FALSE`

## Complete Flow

```
┌─────────────────┐
│ Python Backend  │
│ Scans RFID      │
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
│ Supabase        │
│ Realtime Event  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Frontend        │
│ Detects Change  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Show User Data  │
│ Automatically   │
└─────────────────┘
```

## Code Implementation

### Supabase Service (`src/services/supabase.ts`)

Added `subscribeToUserStateChanges()` function:

```typescript
export function subscribeToUserStateChanges(
  callback: (user: DatabaseUser) => void
): () => void {
  const channel = supabase
    .channel('users-state-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      },
      (payload) => {
        const updatedUser = payload.new as DatabaseUser;
        callback(updatedUser);
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}
```

### AuthScreen Component (`src/components/AuthScreen.tsx`)

Added useEffect hook to monitor state changes:

```typescript
useEffect(() => {
  // Subscribe to user state changes
  const unsubscribe = subscribeToUserStateChanges((updatedUser) => {
    if (updatedUser.state === true) {
      // Show user when authenticated
      setCurrentUser(user);
    } else {
      // Hide user when logged out
      setCurrentUser(null);
    }
  });

  return () => unsubscribe();
}, [currentUser, setCurrentUser]);
```

## Features

✅ **Real-time Updates** - No polling needed, instant updates  
✅ **Automatic Detection** - Frontend detects state changes automatically  
✅ **Show/Hide User** - UI updates based on state  
✅ **No Manual Refresh** - Everything happens automatically  

## Testing

1. **Start Python backend:**
   ```bash
   python scripts/rfid_verification.py
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Scan RFID card:**
   - Python backend sets `state = TRUE` in Supabase
   - Frontend automatically detects change
   - User data appears automatically

4. **Logout:**
   - Python backend sets `state = FALSE` (or scan same card again)
   - Frontend automatically detects change
   - User data disappears automatically

## Supabase Realtime Setup

Make sure Realtime is enabled in Supabase:

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for `users` table
4. Or use the SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

## Benefits

- ✅ **Instant Updates** - No delay, changes appear immediately
- ✅ **Efficient** - Uses WebSocket, not polling
- ✅ **Scalable** - Works with multiple users simultaneously
- ✅ **Reliable** - Automatic reconnection on errors

## Troubleshooting

### State changes not detected

1. **Check Supabase Realtime is enabled:**
   - Go to Database → Replication
   - Ensure `users` table is replicated

2. **Check browser console:**
   - Look for subscription messages
   - Check for connection errors

3. **Verify Supabase credentials:**
   - Check `.env` file has correct credentials
   - Restart dev server after changes

### User not showing

1. **Check state in Supabase:**
   - Verify `state = TRUE` in database
   - Check EID matches scanned card

2. **Check console logs:**
   - Look for "User state changed detected"
   - Verify callback is being called

## Next Steps

- Add visual indicator when state is changing
- Add sound notification on authentication
- Add session timeout warnings
- Add multiple user support (queue system)

