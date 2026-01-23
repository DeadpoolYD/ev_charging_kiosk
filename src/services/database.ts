import type { User, ChargingSession, SystemSettings, Transaction } from '../types';
import { supabaseService } from './supabase';

const STORAGE_KEYS = {
  USERS: 'ev_charging_users',
  SESSIONS: 'ev_charging_sessions',
  SETTINGS: 'ev_charging_settings',
  TRANSACTIONS: 'ev_charging_transactions',
};

// Initialize default settings
const DEFAULT_SETTINGS: SystemSettings = {
  fullChargeCost: 100,
  costPerKWh: 10,
  defaultBatteryCapacity: 5000, // 5 kWh
};

// Note: Default users are now managed in Supabase database

export const db = {
  // Users - Now using Supabase
  async getUsers(): Promise<User[]> {
    try {
      const apiUsers = await supabaseService.getUsers();
      // Convert APIUser to User format
      return apiUsers.map((apiUser) => ({
        id: apiUser.id,
        name: apiUser.name,
        rfidCardId: apiUser.rfidCardId,
        balance: apiUser.balance,
        phoneNumber: apiUser.phoneNumber,
        state: apiUser.state,
        createdAt: apiUser.createdAt,
        updatedAt: apiUser.updatedAt,
      }));
    } catch (error) {
      console.error('[Database] Error fetching users from Supabase:', error);
      return [];
    }
  },

  // Synchronous version for backward compatibility (returns empty array, use async version)
  getUsersSync(): User[] {
    console.warn('[Database] getUsersSync() is deprecated. Use async getUsers() instead.');
    return [];
  },

  async saveUsers(users: User[]): Promise<void> {
    // This is a bulk operation - update each user
    for (const user of users) {
      try {
        await supabaseService.updateUser(user.id, {
          name: user.name,
          rfidCardId: user.rfidCardId,
          balance: user.balance,
          phoneNumber: user.phoneNumber || '',
          state: user.state ?? true,
        });
      } catch (error) {
        console.error(`[Database] Error saving user ${user.id}:`, error);
      }
    }
  },

  async getUserByRfid(rfidCardId: string): Promise<User | null> {
    try {
      console.log('[Database] Looking up user by RFID:', rfidCardId);
      const apiUser = await supabaseService.getUserByEid(rfidCardId);
      if (!apiUser) {
        console.log('[Database] User not found for RFID:', rfidCardId);
        return null;
      }
      
      const user = {
        id: apiUser.id,
        name: apiUser.name,
        rfidCardId: apiUser.rfidCardId,
        balance: apiUser.balance,
        phoneNumber: apiUser.phoneNumber,
        state: apiUser.state,
        createdAt: apiUser.createdAt,
        updatedAt: apiUser.updatedAt,
      };
      console.log('[Database] Found user:', user.name, 'Balance:', user.balance);
      return user;
    } catch (error) {
      console.error('[Database] Error fetching user by RFID:', error);
      return null;
    }
  },

  // Synchronous version for backward compatibility (deprecated)
  getUserByRfidSync(_rfidCardId: string): User | null {
    console.warn('[Database] getUserByRfidSync() is deprecated. Use async getUserByRfid() instead.');
    return null;
  },

  async updateUserBalance(userId: string, newBalance: number): Promise<void> {
    try {
      await supabaseService.updateUserBalance(userId, newBalance);
    } catch (error) {
      console.error('[Database] Error updating user balance:', error);
    }
  },

  async addUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
    try {
      const apiUser = await supabaseService.createUser({
        name: user.name,
        rfidCardId: user.rfidCardId,
        balance: user.balance,
        phoneNumber: user.phoneNumber || '',
        state: user.state ?? true,
      });
      
      if (!apiUser) return null;
      
      return {
        id: apiUser.id,
        name: apiUser.name,
        rfidCardId: apiUser.rfidCardId,
        balance: apiUser.balance,
        phoneNumber: apiUser.phoneNumber,
        state: apiUser.state,
        createdAt: apiUser.createdAt,
        updatedAt: apiUser.updatedAt,
      };
    } catch (error) {
      console.error('[Database] Error adding user:', error);
      return null;
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const apiUser = await supabaseService.updateUser(userId, {
        name: updates.name,
        rfidCardId: updates.rfidCardId,
        balance: updates.balance,
        phoneNumber: updates.phoneNumber,
        state: updates.state,
      });
      
      if (!apiUser) return null;
      
      return {
        id: apiUser.id,
        name: apiUser.name,
        rfidCardId: apiUser.rfidCardId,
        balance: apiUser.balance,
        phoneNumber: apiUser.phoneNumber,
        state: apiUser.state,
        createdAt: apiUser.createdAt,
        updatedAt: apiUser.updatedAt,
      };
    } catch (error) {
      console.error('[Database] Error updating user:', error);
      return null;
    }
  },

  async updateUserState(rfidCardId: string, state: boolean): Promise<boolean> {
    try {
      return await supabaseService.updateUserStateByEid(rfidCardId, state);
    } catch (error) {
      console.error('[Database] Error updating user state:', error);
      return false;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      return await supabaseService.deleteUser(userId);
    } catch (error) {
      console.error('[Database] Error deleting user:', error);
      return false;
    }
  },

  // Sessions
  getSessions(): ChargingSession[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return stored ? JSON.parse(stored) : [];
  },

  saveSessions(sessions: ChargingSession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  createSession(session: ChargingSession): void {
    const sessions = this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);
  },

  updateSession(sessionId: string, updates: Partial<ChargingSession>): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      this.saveSessions(sessions);
    }
  },

  getActiveSession(): ChargingSession | null {
    const sessions = this.getSessions();
    return sessions.find((s) => s.status === 'in_progress') || null;
  },

  // Settings
  getSettings(): SystemSettings {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!stored) {
      this.saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(stored);
  },

  saveSettings(settings: SystemSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Transactions
  getTransactions(): Transaction[] {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  },

  saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    this.saveTransactions(transactions);
  },

  getUserTransactions(userId: string): Transaction[] {
    const transactions = this.getTransactions();
    return transactions.filter((t) => t.userId === userId);
  },
};

