# Test Configuration for Backend
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Test environment variables
os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "postgresql://postgres:password@localhost:5432/teer_betting_test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["DEBUG"] = "True"
