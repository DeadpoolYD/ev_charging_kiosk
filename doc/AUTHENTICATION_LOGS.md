# Authentication Logs System

## Overview

The system now logs all RFID authentication events to a `authentication_logs` table in Supabase. This provides a complete audit trail of all authentication attempts, successes, and failures.

## Database Schema

### `authentication_logs` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to users table (nullable) |
| `eid` | TEXT | RFID card ID that was scanned |
| `user_name` | TEXT | User name (if authentication successful) |
| `event_type` | TEXT | Type of event: 'login', 'logout', 'failed', 'timeout' |
| `success` | BOOLEAN | Whether the event was successful |
| `message` | TEXT | Additional details about the event |
| `created_at` | TIMESTAMP | When the event occurred |

### Indexes

- `idx_logs_user_id` - Fast lookups by user
- `idx_logs_eid` - Fast lookups by RFID card ID
- `idx_logs_event_type` - Fast filtering by event type
- `idx_logs_created_at` - Fast sorting by date (descending)

## Event Types

### 1. `login`
- **When**: User successfully authenticates with RFID card
- **Success**: `true`
- **Data**: Includes `user_id`, `user_name`, `eid`
- **Message**: "User [name] authenticated successfully"

### 2. `logout`
- **When**: User logs out (manual or same card scan)
- **Success**: `true`
- **Data**: Includes `user_id`, `user_name`, `eid`
- **Message**: "User [name] logged out"

### 3. `failed`
- **When**: Authentication attempt fails (card not recognized)
- **Success**: `false`
- **Data**: Only `eid` (no user_id or user_name)
- **Message**: "No user found with EID: [eid]"

### 4. `timeout`
- **When**: Auto-logout after inactivity timeout
- **Success**: `true`
- **Data**: Includes `user_id`, `user_name`, `eid`
- **Message**: "Auto-logout after [X] seconds of inactivity"

## Setup

### 1. Run SQL Setup

Run the updated `doc/supabase_sql_setup.sql` in Supabase SQL Editor. This will create:
- `authentication_logs` table
- Indexes for performance
- RLS policies for access control

### 2. Python Script

The Python script (`scripts/rfid_verification.py`) automatically logs all events:
- ✅ Successful logins
- ✅ Logouts
- ✅ Failed authentication attempts
- ✅ Timeout logouts
- ✅ Errors during authentication

## Usage Examples

### Query Recent Logins

```sql
SELECT 
    created_at,
    user_name,
    eid,
    event_type,
    success,
    message
FROM authentication_logs
WHERE event_type = 'login'
ORDER BY created_at DESC
LIMIT 10;
```

### Query Failed Attempts

```sql
SELECT 
    created_at,
    eid,
    message
FROM authentication_logs
WHERE event_type = 'failed'
ORDER BY created_at DESC;
```

### Query User Activity

```sql
SELECT 
    created_at,
    event_type,
    success,
    message
FROM authentication_logs
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### Query Today's Activity

```sql
SELECT 
    event_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed
FROM authentication_logs
WHERE created_at >= CURRENT_DATE
GROUP BY event_type;
```

## Python Implementation

### Logging Function

```python
def log_authentication_event(
    eid: str,
    event_type: str,
    success: bool,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    message: Optional[str] = None
) -> bool
```

### Automatic Logging

The script automatically logs:
- ✅ **Login**: When user authenticates successfully
- ✅ **Logout**: When user logs out
- ✅ **Failed**: When card is not recognized
- ✅ **Timeout**: When auto-logout occurs

## Benefits

✅ **Complete Audit Trail** - Track all authentication events  
✅ **Security Monitoring** - Identify suspicious activity  
✅ **User Analytics** - Understand usage patterns  
✅ **Debugging** - Troubleshoot authentication issues  
✅ **Compliance** - Meet audit requirements  

## Frontend Integration

You can query logs in the frontend:

```typescript
// Get recent authentication logs
const { data, error } = await supabase
  .from('authentication_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

## Admin Panel Integration

Add a logs view to your admin panel to:
- View all authentication events
- Filter by user, event type, date
- Export logs for reporting
- Monitor system activity

## Performance Considerations

- Indexes are created for fast queries
- Logs table can grow large over time
- Consider archiving old logs (>90 days)
- Use pagination for large result sets

## Maintenance

### Archive Old Logs

```sql
-- Create archive table
CREATE TABLE authentication_logs_archive (LIKE authentication_logs);

-- Move old logs
INSERT INTO authentication_logs_archive
SELECT * FROM authentication_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete archived logs
DELETE FROM authentication_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Clean Up Failed Attempts

```sql
-- Delete failed attempts older than 30 days
DELETE FROM authentication_logs
WHERE event_type = 'failed'
AND created_at < NOW() - INTERVAL '30 days';
```

## Security Notes

- Logs contain sensitive information (EID, user names)
- RLS policies control access
- Consider encrypting sensitive fields
- Regular backups recommended

