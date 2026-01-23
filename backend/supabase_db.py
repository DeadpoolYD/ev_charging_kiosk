#!/usr/bin/env python3
"""
Supabase database helper module for EV Charging Kiosk
Handles all database operations for user management
"""

import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Initialize Supabase client (will be None if credentials not set)
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[WARNING] Failed to initialize Supabase client: {e}")
        supabase = None
else:
    print("[WARNING] SUPABASE_URL and/or SUPABASE_KEY not set. Supabase features will be disabled.")

# Table name
USERS_TABLE = "users"


def load_users() -> List[Dict[str, Any]]:
    """Load all users from Supabase"""
    if not supabase:
        return []
    try:
        response = supabase.table(USERS_TABLE).select("*").execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"[ERROR] Failed to load users from Supabase: {e}")
        return []


def get_user_by_eid(eid: str) -> Optional[Dict[str, Any]]:
    """Find user by EID (RFID Card ID)"""
    if not supabase:
        return None
    try:
        response = supabase.table(USERS_TABLE).select("*").eq("eid", str(eid).strip()).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"[ERROR] Failed to get user by EID: {e}")
        return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Find user by ID"""
    if not supabase:
        return None
    try:
        response = supabase.table(USERS_TABLE).select("*").eq("id", str(user_id)).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"[ERROR] Failed to get user by ID: {e}")
        return None


def get_user_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Find user by name (partial match)"""
    try:
        users = load_users()
        name_lower = name.lower().strip()
        for user in users:
            user_name = user.get("name", "").lower()
            if name_lower in user_name or user_name.split()[0].lower() == name_lower:
                return user
        return None
    except Exception as e:
        print(f"[ERROR] Failed to get user by name: {e}")
        return None


def update_user_balance(eid: str, new_balance: float) -> bool:
    """Update user balance by EID"""
    if not supabase:
        return False
    try:
        new_balance = max(0.0, float(new_balance))  # Ensure balance doesn't go negative
        response = supabase.table(USERS_TABLE).update({
            "current_balance": new_balance
        }).eq("eid", str(eid).strip()).execute()
        
        return len(response.data) > 0 if response.data else False
    except Exception as e:
        print(f"[ERROR] Failed to update user balance: {e}")
        return False


def update_user_balance_by_id(user_id: str, new_balance: float) -> bool:
    """Update user balance by user ID"""
    if not supabase:
        return False
    try:
        new_balance = max(0.0, float(new_balance))  # Ensure balance doesn't go negative
        response = supabase.table(USERS_TABLE).update({
            "current_balance": new_balance
        }).eq("id", str(user_id)).execute()
        
        return len(response.data) > 0 if response.data else False
    except Exception as e:
        print(f"[ERROR] Failed to update user balance by ID: {e}")
        return False


def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new user"""
    if not supabase:
        return None
    try:
        response = supabase.table(USERS_TABLE).insert(user_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"[ERROR] Failed to create user: {e}")
        return None


def update_user(eid: str, updates: Dict[str, Any]) -> bool:
    """Update user data by EID"""
    if not supabase:
        return False
    try:
        response = supabase.table(USERS_TABLE).update(updates).eq("eid", str(eid).strip()).execute()
        return len(response.data) > 0 if response.data else False
    except Exception as e:
        print(f"[ERROR] Failed to update user: {e}")
        return False


def delete_user(eid: str) -> bool:
    """Delete user by EID"""
    if not supabase:
        return False
    try:
        response = supabase.table(USERS_TABLE).delete().eq("eid", str(eid).strip()).execute()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to delete user: {e}")
        return False


def convert_to_api_format(user: Dict[str, Any]) -> Dict[str, Any]:
    """Convert database format to API format"""
    return {
        "id": str(user.get("id", "")),
        "name": user.get("name", ""),
        "rfidCardId": str(user.get("eid", "")),
        "balance": float(user.get("current_balance", 0.0)),
        "phoneNumber": user.get("contact_number", ""),
        "createdAt": user.get("created_at", "")
    }


def convert_from_api_format(user: Dict[str, Any]) -> Dict[str, Any]:
    """Convert API format to database format"""
    return {
        "eid": str(user.get("rfidCardId", "")),
        "name": user.get("name", ""),
        "contact_number": user.get("phoneNumber", ""),
        "current_balance": float(user.get("balance", 0.0)),
        "state": user.get("state", True)
    }
