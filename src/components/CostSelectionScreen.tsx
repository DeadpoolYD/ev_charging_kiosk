import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Battery, Calculator, Check, Wallet, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/database';
import { hardware } from '../services/hardware';
import type { ChargingSession } from '../types';

export default function CostSelectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, setCurrentUser, setCurrentSession, settings, batteryStatus } = useApp();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // Get user from location state if available
  const userFromState = location.state?.user;
  const displayUser = userFromState || currentUser;

  const presetAmounts = [20, 40, 60, 80, 100];

  const currentBattery = batteryStatus?.percentage || 0;
  const fullChargeCost = settings.fullChargeCost;

  const calculateTargetBattery = (amount: number): number => {
    const batteryIncrease = (amount / fullChargeCost) * 100;
    return Math.min(currentBattery + batteryIncrease, 100);
  };

  const targetBattery = selectedAmount ? calculateTargetBattery(selectedAmount) : 0;

  const handleAmountSelect = (amount: number) => {
    if (amount > (displayUser?.balance || 0)) {
      alert('Insufficient balance!');
      return;
    }
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      if (num > (displayUser?.balance || 0)) {
        alert('Insufficient balance!');
        return;
      }
      setSelectedAmount(num);
      setCustomAmount(value);
    } else {
      setSelectedAmount(null);
      setCustomAmount(value);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAmount || !displayUser) return;

    setProcessing(true);

    try {
      // Deduct balance
      const newBalance = displayUser.balance - selectedAmount;
      await db.updateUserBalance(displayUser.id, newBalance);

      // Create session
      const session: ChargingSession = {
        id: Date.now().toString(),
        userId: displayUser.id,
        userName: displayUser.name,
        paidAmount: selectedAmount,
        targetBattery: calculateTargetBattery(selectedAmount),
        startBattery: currentBattery,
        endBattery: null,
        energyDelivered: 0,
        voltage: batteryStatus?.voltage || 0,
        current: batteryStatus?.current || 0,
        power: batteryStatus?.power || 0,
        startTime: new Date().toISOString(),
        endTime: null,
        status: 'in_progress',
        remainingBalance: newBalance,
      };

      db.createSession(session);
      db.addTransaction({
        id: Date.now().toString(),
        userId: displayUser.id,
        userName: displayUser.name,
        type: 'charge',
        amount: -selectedAmount,
        timestamp: new Date().toISOString(),
        description: `Charging session started - Target: ${targetBattery.toFixed(0)}%`,
        sessionId: session.id,
      });

      // Update user in context
      if (setCurrentUser) {
        setCurrentUser({ ...displayUser, balance: newBalance });
      }
      if (setCurrentSession) {
        setCurrentSession(session);
      }

      // Start charging
      await hardware.startCharging(targetBattery);

      navigate('/charging');
    } catch (error) {
      console.error('Error starting charging:', error);
      alert('Failed to start charging. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!displayUser) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Start Charging Session</h1>
          <p className="text-gray-600 mt-2">Select the amount you want to charge</p>
        </div>

        {/* Three Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel 1: Current Status */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Battery className="w-6 h-6 text-blue-600" />
              Current Status
            </h2>
            
            <div className="space-y-6">
              {/* Battery Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Battery Level</span>
                  <span className="text-2xl font-bold text-gray-900">{currentBattery.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${currentBattery}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Balance */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Current Balance</span>
                </div>
                <div className="text-3xl font-bold text-green-700">
                  ₹{displayUser.balance.toFixed(2)}
                </div>
              </div>

              {/* User Info */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-1">User</p>
                <p className="text-lg font-semibold text-gray-900">{displayUser.name}</p>
                <p className="text-xs text-gray-500 mt-1">EID: {displayUser.rfidCardId}</p>
              </div>
            </div>
          </div>

          {/* Panel 2: Amount Selection */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-600" />
              Select Amount
            </h2>

            <div className="space-y-6">
              {/* Preset Amounts */}
              <div>
                <p className="text-sm text-gray-600 mb-3">Quick Select</p>
                <div className="grid grid-cols-2 gap-3">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      disabled={amount > (displayUser.balance || 0)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedAmount === amount
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${amount > (displayUser.balance || 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-xl font-bold text-gray-900">₹{amount}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={displayUser.balance}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Summary */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-600" />
              Summary
            </h2>

            {selectedAmount ? (
              <div className="space-y-6">
                {/* Target Battery */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Target Battery</span>
                    <span className="text-2xl font-bold text-blue-700">{targetBattery.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${targetBattery}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Amount to Pay</span>
                    <span className="text-3xl font-bold text-green-700">₹{selectedAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Remaining Balance */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Remaining Balance</span>
                    <span className="text-xl font-semibold text-gray-700">
                      ₹{(displayUser.balance - selectedAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Battery Increase */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Battery Increase</span>
                    <span className="text-lg font-semibold text-gray-900">
                      +{(targetBattery - currentBattery).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg mt-4"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm & Start Charging
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select an amount to see summary</p>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
