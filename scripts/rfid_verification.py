#!/usr/bin/env python3
"""
RFID Verification Backend Service
Continuously reads RFID cards, verifies against Supabase, and updates user state.
Frontend will automatically detect state changes and display user data.
"""

import os
import sys
import time
from typing import Optional
from dotenv import load_dotenv

# Try to import Raspberry Pi GPIO and RFID libraries
try:
    import RPi.GPIO as GPIO
    from mfrc522 import SimpleMFRC522
    RASPBERRY_PI = True
except ImportError:
    print("[WARNING] RPi.GPIO or mfrc522 not found. Running in simulation mode.")
    RASPBERRY_PI = False

# Try to import Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    print("[ERROR] supabase-py not installed. Install with: pip install supabase")
    SUPABASE_AVAILABLE = False
    sys.exit(1)

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
NEXTJS_URL = os.getenv('NEXTJS_URL', 'http://localhost:3000')
USERS_TABLE = 'users'
LOGS_TABLE = 'authentication_logs'

# Validate configuration
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing Supabase credentials!")
    print("Please set SUPABASE_URL and SUPABASE_KEY in .env file")
    print("Or set environment variables:")
    print("  export SUPABASE_URL=https://your-project.supabase.co")
    print("  export SUPABASE_KEY=your-service-role-key")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize RFID reader (if on Raspberry Pi)
reader = None
if RASPBERRY_PI:
    try:
        reader = SimpleMFRC522()
        print("[INFO] RFID reader initialized")
    except Exception as e:
        print(f"[ERROR] Failed to initialize RFID reader: {e}")
        RASPBERRY_PI = False


def log_authentication_event(
    eid: str,
    event_type: str,
    success: bool,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    message: Optional[str] = None
) -> bool:
    """
    Log authentication event to Supabase logs table
    
    Args:
        eid: RFID card ID
        event_type: Type of event ('login', 'logout', 'failed', 'timeout')
        success: Whether the event was successful
        user_id: User ID (optional, for successful authentications)
        user_name: User name (optional, for successful authentications)
        message: Additional message (optional)
        
    Returns:
        True if log was successful, False otherwise
    """
    try:
        log_data = {
            'eid': str(eid),
            'event_type': event_type,
            'success': success,
            'message': message
        }
        
        if user_id:
            log_data['user_id'] = user_id
        if user_name:
            log_data['user_name'] = user_name
        
        response = supabase.table(LOGS_TABLE).insert(log_data).execute()
        
        if response.data:
            return True
        else:
            return False
            
    except Exception:
        return False


def scan_and_log(eid: str) -> None:
    """
    Scan RFID card and log to authentication_logs
    
    Args:
        eid: The RFID card ID to scan
    """
    try:
        # Query Supabase for user with matching EID
        response = supabase.table(USERS_TABLE).select("*").eq("eid", str(eid)).execute()
        
        if response.data and len(response.data) > 0:
            user = response.data[0]
            user_id = user['id']
            user_name = user['name']
            
            # Log successful scan
            print(f"✓ {user_name} scanned (EID: {eid})")
            log_authentication_event(
                eid=eid,
                event_type='login',
                success=True,
                user_id=user_id,
                user_name=user_name,
                message=f"User {user_name} scanned successfully"
            )
        else:
            print(f"✗ No user found with EID: {eid}")
            # Log failed scan
            log_authentication_event(
                eid=eid,
                event_type='failed',
                success=False,
                message=f"No user found with EID: {eid}"
            )
            
    except Exception as e:
        print(f"✗ Failed to scan: {e}")

def read_rfid_card() -> Optional[tuple]:
    """
    Read RFID card continuously (non-blocking)
    
    Returns:
        Tuple of (id, text) if card read successfully, None otherwise
    """
    if not RASPBERRY_PI or not reader:
        # Simulation mode: Return None (no cards in simulation)
        # In real deployment, this will use actual RFID reader
        return None
    
    try:
        # Non-blocking read attempt
        id, text = reader.read()
        return (str(id), text.strip() if text else "")
    except Exception:
        # No card present or read error - return None
        return None


def main():
    """Main loop - continuously read RFID cards and log scans"""
    print("RFID Scanning System - Running...")
    print("Press Ctrl+C to exit\n")
    
    last_scanned_eid = None
    last_scan_time = 0
    scan_cooldown = 2  # seconds between scans
    
    try:
        while True:
            # Read RFID card (non-blocking)
            result = read_rfid_card()
            
            current_time = time.time()
            
            if result is None:
                time.sleep(0.1)
                continue
            
            card_id, card_text = result
            eid = str(card_id).strip()
            
            # Prevent duplicate scans within cooldown period
            if eid == last_scanned_eid:
                if (current_time - last_scan_time) < scan_cooldown:
                    time.sleep(0.1)
                    continue
            
            # Scan and log
            scan_and_log(eid)
            last_scanned_eid = eid
            last_scan_time = current_time
            
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if RASPBERRY_PI:
            try:
                GPIO.cleanup()
            except Exception:
                pass


if __name__ == "__main__":
    main()

