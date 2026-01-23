# Frontend Supabase Integration Guide

This guide explains how the frontend integrates with Supabase for CRUD operations on the users table.

## Overview

The frontend now performs all user CRUD operations directly with Supabase, matching the database table structure exactly:

- **EID** (RFID Card ID)
- **Name**
- **Contact Number**
- **Current Balance**
- **State** (Active/Inactive)

## Setup

### 1. Environment Variables

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** → `VITE_SUPABASE_URL`
- Copy the **anon/public** key → `VITE_SUPABASE_ANON_KEY`

### 2. Install Dependencies

The Supabase client is already included in `package.json`. If you need to reinstall:

```bash
npm install
```

### 3. Run the Application

```bash
npm run dev
```

## Architecture

### File Structure

```
src/
├── services/
│   ├── supabase.ts          # Supabase client and CRUD operations
│   └── database.ts          # Database abstraction layer (uses Supabase)
├── components/
│   └── AdminPanel.tsx       # Admin dashboard with table view
└── types/
    └── index.ts             # TypeScript interfaces
```

### Data Flow

1. **AdminPanel** → calls `db.getUsers()`, `db.addUser()`, `db.updateUser()`, `db.deleteUser()`
2. **database.ts** → converts between API format and calls `supabaseService`
3. **supabase.ts** → performs actual Supabase operations
4. **Supabase Database** → stores data in `users` table

## CRUD Operations

### Create (Add User)

```typescript
const newUser = await db.addUser({
  name: 'John Doe',
  rfidCardId: '123456789',
  phoneNumber: '1234567890',
  balance: 100.0,
  state: true,
});
```

### Read (Get Users)

```typescript
// Get all users
const users = await db.getUsers();

// Get user by RFID
const user = await db.getUserByRfid('123456789');
```

### Update (Edit User)

```typescript
const updatedUser = await db.updateUser(userId, {
  name: 'Jane Doe',
  balance: 150.0,
  state: false,
});
```

### Delete (Remove User)

```typescript
const success = await db.deleteUser(userId);
```

## Admin Panel Features

The Admin Panel (`src/components/AdminPanel.tsx`) provides:

1. **Table View** - Displays all users in a table matching database columns:
   - EID
   - Name
   - Contact Number
   - Current Balance
   - State (Active/Inactive toggle)

2. **Create User** - Add new users with all required fields

3. **Edit User** - Inline editing of user details:
   - Click the Edit icon to edit a row
   - Click Save (✓) to save changes
   - Click Cancel (✗) to cancel

4. **Delete User** - Remove users with confirmation

5. **Balance Adjustment** - Add or deduct balance for users

6. **State Toggle** - Activate/deactivate users

## Database Schema Mapping

| Database Column | Frontend Field | Type |
|----------------|----------------|------|
| `eid` | `rfidCardId` | string |
| `name` | `name` | string |
| `contact_number` | `phoneNumber` | string |
| `current_balance` | `balance` | number |
| `state` | `state` | boolean |
| `id` | `id` | string (UUID) |
| `created_at` | `createdAt` | string (ISO) |
| `updated_at` | `updatedAt` | string (ISO) |

## Security

### Row Level Security (RLS)

The Supabase table has RLS enabled. Make sure your RLS policies allow:
- **Read**: All authenticated/anonymous users (for frontend)
- **Write**: Service role or authenticated admin users

### API Keys

- **Anon Key**: Used by frontend (public, but RLS protects data)
- **Service Role Key**: Used by backend (bypasses RLS, keep secret!)

## Troubleshooting

### Error: "Supabase client not initialized"

- Check that `.env` file exists in project root
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after adding/changing `.env` file

### Error: "Failed to fetch users"

- Check Supabase project is active
- Verify RLS policies allow read access
- Check browser console for detailed error messages
- Verify network connectivity to Supabase

### Error: "Failed to create/update/delete user"

- Check RLS policies allow write access
- Verify user has required fields (EID, Name)
- Check for duplicate EID (must be unique)
- Verify balance is a valid number

### Table not showing data

- Check browser console for errors
- Verify Supabase connection in Network tab
- Ensure users exist in Supabase database
- Check RLS policies

## Best Practices

1. **Always use async/await** - All database operations are async
2. **Handle errors** - Wrap database calls in try-catch blocks
3. **Show loading states** - Display loading indicators during operations
4. **Validate input** - Check required fields before creating/updating
5. **Confirm destructive actions** - Ask for confirmation before deleting

## Example Usage

```typescript
// In a React component
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await db.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  loadUsers();
}, []);

const handleAddUser = async () => {
  try {
    const newUser = await db.addUser({
      name: 'New User',
      rfidCardId: '123456789',
      phoneNumber: '1234567890',
      balance: 0,
      state: true,
    });
    if (newUser) {
      await loadUsers(); // Reload list
      alert('User added successfully!');
    }
  } catch (error) {
    console.error('Failed to add user:', error);
    alert('Failed to add user');
  }
};
```

## Migration Notes

If you're migrating from localStorage:

1. All user data is now in Supabase
2. `db.getUsers()` is now async (returns Promise)
3. `db.getUserByRfid()` is now async
4. User operations require await
5. No more localStorage for users (still used for sessions/settings)

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Check your project's issue tracker
