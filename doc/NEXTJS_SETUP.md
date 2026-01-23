# Next.js Frontend Setup Guide

This guide explains how to set up the Next.js frontend connected to Supabase for the EV Charging Kiosk system.

## Prerequisites

1. **Node.js 18+**: Install from [nodejs.org](https://nodejs.org/)
2. **Supabase Project**: Follow the [Supabase Setup Guide](./SUPABASE_SETUP.md) first
3. **Supabase SQL Setup**: Run the SQL from [supabase_sql_setup.sql](./supabase_sql_setup.sql) in Supabase SQL Editor

## Step 1: Initialize Next.js Project

If you're starting fresh, create a new Next.js project:

```bash
npx create-next-app@latest ev-charging-kiosk-frontend --typescript --tailwind --app
cd ev-charging-kiosk-frontend
```

Or if you're migrating from the existing React/Vite setup, you can install Next.js dependencies:

```bash
npm install next@latest react@latest react-dom@latest
npm install @supabase/supabase-js
npm install --save-dev @types/node @types/react @types/react-dom
```

## Step 2: Install Dependencies

Install required packages:

```bash
npm install @supabase/supabase-js
npm install lucide-react
```

## Step 3: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Get your Supabase credentials:
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy your **Project URL** and **Anon Key**

3. Update `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: 
- Replace `your-project-id` with your actual Supabase project ID
- Replace `your-anon-key-here` with your actual Anon Key
- Never commit `.env.local` to version control (it should be in `.gitignore`)

## Step 4: Set Up Supabase Database

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `doc/supabase_sql_setup.sql`
5. Click **Run** to execute the SQL
6. Verify the table was created by going to **Table Editor** → you should see the `users` table

## Step 5: Create Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table name
export const USERS_TABLE = 'users';

// Database user interface (matches Supabase table structure)
export interface DatabaseUser {
  id: string;
  eid: string;
  name: string;
  contact_number: string;
  current_balance: number;
  state: boolean;
  created_at: string;
  updated_at: string;
}

// API user interface (for frontend use)
export interface APIUser {
  id: string;
  name: string;
  rfidCardId: string;
  balance: number;
  phoneNumber: string;
  state: boolean;
  createdAt: string;
  updatedAt: string;
}

// Convert database format to API format
export function convertToAPIFormat(dbUser: DatabaseUser): APIUser {
  return {
    id: dbUser.id,
    name: dbUser.name,
    rfidCardId: dbUser.eid,
    balance: parseFloat(dbUser.current_balance.toString()),
    phoneNumber: dbUser.contact_number,
    state: dbUser.state,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

// Convert API format to database format
export function convertToDBFormat(apiUser: Partial<APIUser>): Partial<DatabaseUser> {
  const dbUser: Partial<DatabaseUser> = {};
  
  if (apiUser.rfidCardId !== undefined) dbUser.eid = apiUser.rfidCardId;
  if (apiUser.name !== undefined) dbUser.name = apiUser.name;
  if (apiUser.phoneNumber !== undefined) dbUser.contact_number = apiUser.phoneNumber;
  if (apiUser.balance !== undefined) dbUser.current_balance = apiUser.balance;
  if (apiUser.state !== undefined) dbUser.state = apiUser.state;
  
  return dbUser;
}
```

## Step 6: Create API Routes (Optional - Server Actions)

For Next.js App Router, you can use Server Actions. Create `app/actions/users.ts`:

```typescript
'use server';

import { supabase, USERS_TABLE, convertToAPIFormat, convertToDBFormat, type APIUser } from '@/lib/supabase';

export async function getUsers(): Promise<APIUser[]> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data || []).map(convertToAPIFormat);
}

export async function getUserByEid(eid: string): Promise<APIUser | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('eid', eid.trim())
    .single();

  if (error) {
    console.error('Error fetching user by EID:', error);
    return null;
  }

  return data ? convertToAPIFormat(data) : null;
}

export async function createUser(user: Omit<APIUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIUser | null> {
  const dbUser = convertToDBFormat(user);
  
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert(dbUser)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data ? convertToAPIFormat(data) : null;
}

export async function updateUser(id: string, updates: Partial<APIUser>): Promise<APIUser | null> {
  const dbUpdates = convertToDBFormat(updates);
  
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return data ? convertToAPIFormat(data) : null;
}

export async function updateUserBalanceByEid(eid: string, balance: number): Promise<boolean> {
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({ current_balance: Math.max(0, balance) })
    .eq('eid', eid.trim());

  if (error) {
    console.error('Error updating balance by EID:', error);
    return false;
  }

  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { error } = await supabase
    .from(USERS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }

  return true;
}
```

## Step 7: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Database Schema

The `users` table structure:

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

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env.local` exists in the project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart the dev server after adding/changing `.env.local`

### Error: "Failed to fetch users"
- Verify your Supabase project is active
- Check that the SQL setup script ran successfully
- Verify your credentials are correct
- Check the Supabase dashboard for any error logs

### Error: "Module '@supabase/supabase-js' not found"
- Run `npm install @supabase/supabase-js`
- Verify you're in the correct directory

## Next Steps

1. Create your React components using the Supabase client
2. Implement authentication if needed
3. Set up real-time subscriptions for live updates
4. Deploy to Vercel or your preferred hosting platform

## Security Notes

- **Anon Key**: Safe to use in client-side code (protected by RLS)
- **Service Role Key**: Never expose in client-side code! Only use in server-side API routes or Server Actions
- **RLS Policies**: The SQL setup creates permissive policies. For production, consider restricting access based on authentication

