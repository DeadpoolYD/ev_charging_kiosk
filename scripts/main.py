#!/usr/bin/env python3
"""
Main RFID Service Entry Point
This script can be used as the main entry point for the RFID verification system
"""

import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and run the RFID verification script
from rfid_verification import main

if __name__ == "__main__":
    main()

