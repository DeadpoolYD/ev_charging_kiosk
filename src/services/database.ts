import type { User, ChargingSession, SystemSettings, Transaction } from '../types';

const API_BASE_URL = import.meta.env.VITE_RFID_API_URL || 'http://localhost:5000/api';

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

// Initialize default users for demo
const DEFAULT_USERS: User[] = [
  {
    id: '1',
    name: 'Lalit Nikumbh',
    rfidCardId: 'RFID001',
    balance: 100.0,
    phoneNumber: '+91 9876543212',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Fateen Shaikh',
    rfidCardId: 'RFID002',
    balance: 150.0,
    phoneNumber: '+91 9876543213',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Nishad Deshmukh',
    rfidCardId: 'RFID003',
    balance: 90.0,
    phoneNumber: '+91 9876543214',
    createdAt: new Date().toISOString(),
  },
];

export const db = {
  // Users - Now synced with Google Sheets via Backend API
  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        // Cache in localStorage as fallback
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return users;
      } else {
        // Fallback to localStorage if backend unavailable
        const stored = localStorage.getItem(STORAGE_KEYS.USERS);
        if (stored) {
          return JSON.parse(stored);
        }
        return DEFAULT_USERS;
      }
    } catch (error) {
      console.warn('[Database] Backend unavailable, using localStorage fallback:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_USERS;
    }
  },

  // Synchronous version for backward compatibility (uses cache)
  getUsersSync(): User[] {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_USERS;
  },

  async saveUsers(users: User[]): Promise<void> {
    // Update each user via backend API to sync with Google Sheets
    try {
      for (const user of users) {
        await fetch(`${API_BASE_URL}/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: user.name,
            phoneNumber: user.phoneNumber,
            rfidCardId: user.rfidCardId,
            balance: user.balance
          })
        });
      }
      // Also update cache
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (error) {
      console.error('[Database] Failed to sync users to backend:', error);
      // Fallback: save to localStorage
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  // Force reset to default users (useful for admin)
  resetUsers(): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  },

  async getUserByRfid(rfidCardId: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/rfid/${rfidCardId}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.warn('[Database] Backend unavailable, using localStorage fallback:', error);
      // Fallback to localStorage
      const users = this.getUsersSync();
      return users.find((u) => u.rfidCardId === rfidCardId) || null;
    }
  },

  // Synchronous version for backward compatibility
  getUserByRfidSync(rfidCardId: string): User | null {
    const users = this.getUsersSync();
    return users.find((u) => u.rfidCardId === rfidCardId) || null;
  },

  async updateUserBalance(userId: string, newBalance: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance })
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        // Update local cache
        const users = this.getUsersSync();
        const index = users.findIndex((u) => u.id === userId);
        if (index !== -1) {
          users[index] = updatedUser;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      } else {
        throw new Error('Failed to update balance');
      }
    } catch (error) {
      console.error('[Database] Failed to update balance via backend:', error);
      // Fallback: update localStorage
      const users = this.getUsersSync();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.balance = newBalance;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    }
  },

  async addUser(user: User): Promise<void> {
    // New users are automatically added when RFID cards are scanned
    // This is mainly for manual addition if needed
    const users = this.getUsersSync();
    users.push(user);
    await this.saveUsers(users);
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        // Update local cache
        const users = this.getUsersSync();
        const index = users.findIndex((u) => u.id === userId);
        if (index !== -1) {
          users[index] = updatedUser;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('[Database] Failed to update user via backend:', error);
      return null;
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

