// Supabase client for frontend
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables');
}

// Create Supabase client
export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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

// Supabase CRUD operations
export const supabaseService = {
  // Read: Get all users
  async getUsers(): Promise<APIUser[]> {
    if (!supabase) {
      console.error('[Supabase] Client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[Supabase] Error fetching users:', error);
        console.error('[Supabase] Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      console.log('[Supabase] Fetched users:', data?.length || 0);
      return (data || []).map(convertToAPIFormat);
    } catch (error) {
      console.error('[Supabase] Exception fetching users:', error);
      return [];
    }
  },

  // Read: Get user by ID
  async getUserById(id: string): Promise<APIUser | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[Supabase] Error fetching user:', error);
        return null;
      }

      return data ? convertToAPIFormat(data) : null;
    } catch (error) {
      console.error('[Supabase] Exception fetching user:', error);
      return null;
    }
  },

  // Read: Get user by EID (RFID Card ID)
  async getUserByEid(eid: string): Promise<APIUser | null> {
    if (!supabase) {
      console.error('[Supabase] Client not initialized');
      return null;
    }

    const trimmedEid = eid.trim();
    console.log('[Supabase] Looking up user by EID:', trimmedEid);

    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('eid', trimmedEid)
        .single();

      if (error) {
        console.error('[Supabase] Error fetching user by EID:', error);
        console.error('[Supabase] Error code:', error.code, 'Message:', error.message);
        return null;
      }

      if (data) {
        console.log('[Supabase] Found user:', data.name, 'EID:', data.eid);
        return convertToAPIFormat(data);
      }

      console.log('[Supabase] No user found with EID:', trimmedEid);
      return null;
    } catch (error) {
      console.error('[Supabase] Exception fetching user by EID:', error);
      return null;
    }
  },

  // Create: Add new user
  async createUser(user: Omit<APIUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIUser | null> {
    if (!supabase) return null;

    try {
      const dbUser = convertToDBFormat(user);
      
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .insert(dbUser)
        .select()
        .single();

      if (error) {
        console.error('[Supabase] Error creating user:', error);
        throw error;
      }

      return data ? convertToAPIFormat(data) : null;
    } catch (error) {
      console.error('[Supabase] Exception creating user:', error);
      return null;
    }
  },

  // Update: Update user by ID
  async updateUser(id: string, updates: Partial<APIUser>): Promise<APIUser | null> {
    if (!supabase) return null;

    try {
      const dbUpdates = convertToDBFormat(updates);
      
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Supabase] Error updating user:', error);
        throw error;
      }

      return data ? convertToAPIFormat(data) : null;
    } catch (error) {
      console.error('[Supabase] Exception updating user:', error);
      return null;
    }
  },

  // Update: Update user balance by ID
  async updateUserBalance(id: string, balance: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .update({ current_balance: Math.max(0, balance) })
        .eq('id', id);

      if (error) {
        console.error('[Supabase] Error updating balance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Supabase] Exception updating balance:', error);
      return false;
    }
  },

  // Update: Update user balance by EID
  async updateUserBalanceByEid(eid: string, balance: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .update({ current_balance: Math.max(0, balance) })
        .eq('eid', eid.trim());

      if (error) {
        console.error('[Supabase] Error updating balance by EID:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Supabase] Exception updating balance by EID:', error);
      return false;
    }
  },

  // Delete: Delete user by ID
  async deleteUser(id: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Supabase] Error deleting user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Supabase] Exception deleting user:', error);
      return false;
    }
  },

  // Delete: Delete user by EID
  async deleteUserByEid(eid: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .delete()
        .eq('eid', eid.trim());

      if (error) {
        console.error('[Supabase] Error deleting user by EID:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Supabase] Exception deleting user by EID:', error);
      return false;
    }
  },
};
