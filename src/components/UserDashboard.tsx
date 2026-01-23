import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, Wallet, Phone, CreditCard, ArrowLeft } from 'lucide-react';
import { db } from '../services/database';
import type { User as UserType } from '../types';

export default function UserDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserType | null>(location.state?.user || null);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const loadUser = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      // If user was passed via state, use it
      if (location.state?.user) {
        setUser(location.state.user);
        setLoading(false);
        return;
      }

      // Otherwise, fetch user by ID
      try {
        const users = await db.getUsers();
        const foundUser = users.find(u => u.id === id);
        if (foundUser) {
          setUser(foundUser);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('[UserDashboard] Error loading user:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, navigate, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-6">The requested user could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{user.name}'s Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-3xl font-bold text-indigo-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-gray-600">RFID: {user.rfidCardId}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium">Current Balance</span>
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700">
                  ₹{user.balance.toFixed(2)}
                </div>
              </div>

              {/* Contact Card */}
              {user.phoneNumber && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 font-medium">Contact</span>
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-xl font-semibold text-blue-700">
                    {user.phoneNumber}
                  </div>
                </div>
              )}

              {/* Status Card */}
              <div className={`rounded-lg p-6 border ${
                user.state 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                  : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span className="text-2xl">{user.state ? '✅' : '❌'}</span>
                </div>
                <div className={`text-xl font-semibold ${
                  user.state ? 'text-green-700' : 'text-red-700'
                }`}>
                  {user.state ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* EID Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium">RFID EID</span>
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm font-mono text-purple-700 break-all">
                  {user.rfidCardId}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/select-cost', { state: { user } })}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Start Charging Session
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

