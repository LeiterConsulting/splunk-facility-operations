"""Build-specific entry point isolates persistent imports across app upgrades.

Splunk may retain imported packages after restmap reload. A new entry-point
path and private package namespace let this build load without replacing
modules used by an in-flight investigation from an earlier build.
"""
import importlib
import importlib.util
import sys
from pathlib import Path

RUNTIME_NAMESPACE = 'facility_ops_runtime_b16'
runtime = Path(__file__).resolve().parent / 'facility_ops_runtime'
if RUNTIME_NAMESPACE not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        RUNTIME_NAMESPACE, runtime / '__init__.py', submodule_search_locations=[str(runtime)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[RUNTIME_NAMESPACE] = module
    spec.loader.exec_module(module)
FacilityOperations = importlib.import_module(RUNTIME_NAMESPACE + '.rest_handler').FacilityOperations
