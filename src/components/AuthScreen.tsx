import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Play, Loader2, CheckCircle2, XCircle, User, Radio } from 'lucide-react';
import { hardware } from '../services/hardware';
import { getRecentLoginLogs, type AuthenticationLog } from '../services/supabase';
import { db } from '../services/database';
import type { User as UserType } from '../types';

export default function AuthScreen() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanTimeRemaining, setScanTimeRemaining] = useState(0);
  const [detectedUser, setDetectedUser] = useState<{ name: string; eid: string; log: AuthenticationLog } | null>(null);
  
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const knownLogIdsRef = useRef<Set<string>>(new Set());
  const scanStartTimeRef = useRef<number>(0);

  // Initialize known log IDs on mount (for tracking new entries during scan)
  useEffect(() => {
    const initializeLogTracking = async () => {
      try {
        const recentLogs = await getRecentLoginLogs(50);
        // Initialize known log IDs to track new entries
        knownLogIdsRef.current = new Set(recentLogs.map(log => log.id));
      } catch (error) {
        console.error('[AuthScreen] Error initializing log tracking:', error);
      }
    };

    initializeLogTracking();
  }, []);

  // Handle 7-second scan window
  useEffect(() => {
    if (!isScanning) {
      // Clean up all intervals
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setScanTimeRemaining(0);
      return;
    }

    // Start 7-second countdown
    setScanTimeRemaining(7);
    scanStartTimeRef.current = Date.now();
    
    // Countdown timer
    countdownIntervalRef.current = setInterval(() => {
      setScanTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-stop after 7 seconds
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setScanTimeRemaining(0);
    }, 7000);

    // Start RFID scanning
    let isScanningActive = true;
    scanIntervalRef.current = setInterval(async () => {
      if (!isScanningActive) return;

      try {
        const result = await hardware.scanRfid();
        if (result && result.rfidCardId) {
          // Card detected - will be handled by polling
        }
      } catch (err) {
        // Ignore scan errors
      }
    }, 500);

    // Poll authentication_logs for new entries during scan window
    pollIntervalRef.current = setInterval(async () => {
      if (!isScanningActive) return;

      try {
        const recentLogs = await getRecentLoginLogs(50);
        
        // Find new login log that we haven't seen before
        const newLog = recentLogs.find(
          log => 
            log.event_type === 'login' && 
            log.success === true &&
            log.user_name &&
            !knownLogIdsRef.current.has(log.id) &&
            new Date(log.created_at).getTime() >= scanStartTimeRef.current
        );

        if (newLog) {
          // Found new entry - stop scanning and show confirmation
          isScanningActive = false;
          setIsScanning(false);
          
          // Add to known logs
          knownLogIdsRef.current.add(newLog.id);
          
          // Show user name for confirmation
          setDetectedUser({
            name: newLog.user_name || 'Unknown User',
            eid: newLog.eid,
            log: newLog
          });
        }
      } catch (err) {
        console.error('[AuthScreen] Poll error:', err);
      }
    }, 500);

    // Cleanup
    return () => {
      isScanningActive = false;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isScanning]);

  const handleStartScan = () => {
    setDetectedUser(null);
    setIsScanning(true);
  };

  const handleStopScan = () => {
    setIsScanning(false);
    setScanTimeRemaining(0);
    setDetectedUser(null);
  };

  const handleConfirmLogin = async () => {
    if (!detectedUser) return;

    try {
      // Get user data
      const user = await db.getUserByRfid(detectedUser.eid);
      if (user && detectedUser.log.user_id === user.id) {
        // Redirect to dashboard
        navigate(`/dashboard/${user.id}`, { state: { user } });
      } else {
        alert('User not found. Please try again.');
        setDetectedUser(null);
      }
    } catch (err) {
      console.error('[AuthScreen] Error confirming login:', err);
      alert('Failed to authenticate. Please try again.');
      setDetectedUser(null);
    }
  };

  const handleCancelLogin = () => {
    setDetectedUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-4 border-blue-200">
              <CreditCard className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
            EV Charging Station
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600 text-center mb-8">
            Scan your RFID card to begin
          </p>

          {/* User Detected Display */}
          {detectedUser ? (
            <div className="text-center py-8">
              {/* User Name - Big */}
              <h2 className="text-5xl font-bold text-gray-900 mb-3">
                {detectedUser.name}
              </h2>
              
              {/* User Detected Label */}
              <p className="text-lg text-gray-600 mb-8">User Detected</p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmLogin}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm Login
                </button>
                <button
                  onClick={handleCancelLogin}
                  className="w-full px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : isScanning ? (
            <div className="text-center py-8">
              {/* Scanning Status */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-600 font-medium">Real-time scanning active</span>
              </div>

              {/* Loading Animation */}
              <div className="mb-6">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Scanning for RFID card...
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Time remaining: {scanTimeRemaining} seconds
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 max-w-xs mx-auto">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${(scanTimeRemaining / 7) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-700 text-center">
                  <span className="font-semibold">Instructions:</span> Place your RFID card near the reader and wait for detection.
                </p>
              </div>

              {/* Stop Button */}
              <button
                onClick={handleStopScan}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200"
              >
                Stop Scan
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <Radio className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 mb-2">How to scan:</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Click the "Scan RFID Card" button below</li>
                      <li>Place your RFID card near the reader</li>
                      <li>Wait for detection (7 seconds)</li>
                      <li>Confirm your identity when detected</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Start Scan Button */}
              <button
                onClick={handleStartScan}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
              >
                <CreditCard className="w-6 h-6" />
                Scan RFID Card
              </button>

              {/* Manual Selection Option */}
              <button
                onClick={() => navigate('/admin')}
                className="w-full mt-3 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Select RFID Card Manually
                <span className="ml-auto">▼</span>
              </button>
            </div>
          )}

          {/* Admin Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/admin')}
              className="w-full text-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              Recharge Balance (Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
