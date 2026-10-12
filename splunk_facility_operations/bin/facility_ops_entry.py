"""Splunk persistent REST entry point for the isolated Facility Operations runtime."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from facility_ops_runtime.rest_handler import FacilityOperations
