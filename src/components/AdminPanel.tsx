import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings, History, Plus, Minus, Save, Edit2, Trash2, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/database';
import type { User, Transaction, SystemSettings } from '../types';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'history'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState('');
  const [newSettings, setNewSettings] = useState<SystemSettings>(settings);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    rfidCardId: '',
    phoneNumber: '',
    balance: 0,
    state: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setNewSettings(settings);
  }, [settings]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[AdminPanel] Loading users from Supabase...');
      const allUsers = await db.getUsers();
      console.log('[AdminPanel] Loaded users:', allUsers.length);
      setUsers(allUsers);
      setTransactions(db.getTransactions().sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
      
      if (allUsers.length === 0) {
        console.warn('[AdminPanel] No users found. Check:');
        console.warn('1. Supabase credentials in .env file (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
        console.warn('2. RLS policies allow read access');
        console.warn('3. Users table exists and has data');
      }
    } catch (error) {
      console.error('[AdminPanel] Error loading data:', error);
      alert('Failed to load data. Please check your Supabase connection. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceAdjustment = async (userId: string, amount: number, type: 'add' | 'deduct') => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const adjustment = type === 'add' ? amount : -amount;
    const newBalance = user.balance + adjustment;

    if (newBalance < 0) {
      alert('Balance cannot be negative!');
      return;
    }

    try {
      await db.updateUserBalance(userId, newBalance);
      db.addTransaction({
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        type: type === 'add' ? 'addition' : 'deduction',
        amount: adjustment,
        timestamp: new Date().toISOString(),
        description: `Admin ${type === 'add' ? 'added' : 'deducted'} balance`,
      });
      await loadData();
      setBalanceAdjustment('');
      setSelectedUser(null);
      alert('Balance updated successfully!');
    } catch (error) {
      console.error('Error updating balance:', error);
      alert('Failed to update balance. Please try again.');
    }
  };

  const handleSaveSettings = () => {
    updateSettings(newSettings);
    alert('Settings saved successfully!');
  };

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await db.updateUser(editingUser.id, {
        name: editingUser.name,
        rfidCardId: editingUser.rfidCardId,
        phoneNumber: editingUser.phoneNumber || '',
        balance: editingUser.balance,
        state: editingUser.state ?? true,
      });
      await loadData();
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await db.deleteUser(userId);
      await loadData();
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.rfidCardId) {
      alert('Please fill in Name and EID (RFID Card ID)');
      return;
    }

    try {
      const createdUser = await db.addUser({
        name: newUser.name,
        rfidCardId: newUser.rfidCardId,
        phoneNumber: newUser.phoneNumber,
        balance: newUser.balance,
        state: newUser.state,
      });

      if (createdUser) {
        await loadData();
        setShowAddUser(false);
        setNewUser({
          name: '',
          rfidCardId: '',
          phoneNumber: '',
          balance: 0,
          state: true,
        });
        alert('User added successfully!');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. Please check if EID already exists.');
    }
  };

  const toggleUserState = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      await db.updateUser(userId, {
        state: !(user.state ?? true),
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling user state:', error);
      alert('Failed to update user state. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-1">Manage users, balance, and system settings</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
          </div>

          <div className="flex gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Users & Balance
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-5 h-5 inline mr-2" />
              Transaction History
            </button>
          </div>

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">User Management</h2>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add User
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-lg shadow">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">EID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Current Balance</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">State</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                            {editingUser?.id === user.id ? (
                              <input
                                type="text"
                                value={editingUser.rfidCardId}
                                onChange={(e) => setEditingUser({ ...editingUser, rfidCardId: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            ) : (
                              user.rfidCardId
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {editingUser?.id === user.id ? (
                              <input
                                type="text"
                                value={editingUser.name}
                                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            ) : (
                              user.name
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {editingUser?.id === user.id ? (
                              <input
                                type="text"
                                value={editingUser.phoneNumber || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            ) : (
                              user.phoneNumber || '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            {editingUser?.id === user.id ? (
                              <input
                                type="number"
                                value={editingUser.balance}
                                onChange={(e) => setEditingUser({ ...editingUser, balance: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                step="0.01"
                              />
                            ) : (
                              `₹${user.balance.toFixed(2)}`
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editingUser?.id === user.id ? (
                              <select
                                value={editingUser.state ? 'true' : 'false'}
                                onChange={(e) => setEditingUser({ ...editingUser, state: e.target.value === 'true' })}
                                className="px-2 py-1 border border-gray-300 rounded"
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            ) : (
                              <button
                                onClick={() => toggleUserState(user.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.state ?? true
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {user.state ?? true ? 'Active' : 'Inactive'}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center justify-center gap-2">
                              {editingUser?.id === user.id ? (
                                <>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                                    title="Save"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingUser(null)}
                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedUser(user)}
                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                                    title="Adjust Balance"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No users found. Click "Add User" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add User Modal */}
              {showAddUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Add New User</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">EID (RFID Card ID) *</label>
                        <input
                          type="text"
                          value={newUser.rfidCardId}
                          onChange={(e) => setNewUser({ ...newUser, rfidCardId: e.target.value })}
                          placeholder="e.g., 632589166397"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          placeholder="e.g., Lalit"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                        <input
                          type="text"
                          value={newUser.phoneNumber}
                          onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                          placeholder="e.g., 1234567890"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Initial Balance</label>
                        <input
                          type="number"
                          value={newUser.balance}
                          onChange={(e) => setNewUser({ ...newUser, balance: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <select
                          value={newUser.state ? 'true' : 'false'}
                          onChange={(e) => setNewUser({ ...newUser, state: e.target.value === 'true' })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleAddUser}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
                      >
                        Add User
                      </button>
                      <button
                        onClick={() => {
                          setShowAddUser(false);
                          setNewUser({
                            name: '',
                            rfidCardId: '',
                            phoneNumber: '',
                            balance: 0,
                            state: true,
                          });
                        }}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Adjustment Modal */}
              {selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Adjust Balance: {selectedUser.name}
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Balance: ₹{selectedUser.balance.toFixed(2)}
                      </label>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={balanceAdjustment}
                        onChange={(e) => setBalanceAdjustment(e.target.value)}
                        placeholder="Enter amount"
                        step="0.01"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const amount = parseFloat(balanceAdjustment);
                          if (!isNaN(amount) && amount > 0) {
                            handleBalanceAdjustment(selectedUser.id, amount, 'add');
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add
                      </button>
                      <button
                        onClick={() => {
                          const amount = parseFloat(balanceAdjustment);
                          if (!isNaN(amount) && amount > 0) {
                            handleBalanceAdjustment(selectedUser.id, amount, 'deduct');
                          }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Minus className="w-5 h-5" />
                        Deduct
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setBalanceAdjustment('');
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">System Settings</h2>
              
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Charge Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={newSettings.fullChargeCost}
                    onChange={(e) =>
                      setNewSettings({ ...newSettings, fullChargeCost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Cost for 100% battery charge (e.g., ₹100)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost per kWh (₹)
                  </label>
                  <input
                    type="number"
                    value={newSettings.costPerKWh}
                    onChange={(e) =>
                      setNewSettings({ ...newSettings, costPerKWh: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Energy-to-cost ratio (e.g., ₹10 per kWh)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Battery Capacity (Wh)
                  </label>
                  <input
                    type="number"
                    value={newSettings.defaultBatteryCapacity}
                    onChange={(e) =>
                      setNewSettings({
                        ...newSettings,
                        defaultBatteryCapacity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Battery capacity in Watt-hours (e.g., 5000 Wh = 5 kWh)
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{transaction.userName}</div>
                      <div className="text-sm text-gray-600">{transaction.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.amount >= 0 ? '+' : ''}₹{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No transactions yet</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
