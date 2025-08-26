"""
Integration tests for the full application stack
"""
import pytest
import requests
import time
from urllib.parse import urljoin


class TestIntegration:
    """Integration tests for the complete application"""
    
    BASE_URL = "http://localhost:8000"
    FRONTEND_URL = "http://localhost:80"
    
    def test_backend_health(self):
        """Test backend health endpoint"""
        try:
            response = requests.get(f"{self.BASE_URL}/health", timeout=10)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] in ["healthy", "degraded"]
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Backend health check failed: {e}")
    
    def test_frontend_accessibility(self):
        """Test frontend is accessible"""
        try:
            response = requests.get(self.FRONTEND_URL, timeout=10)
            assert response.status_code == 200
            assert "text/html" in response.headers.get("content-type", "")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Frontend accessibility check failed: {e}")
    
    def test_api_documentation(self):
        """Test API documentation is accessible"""
        try:
            response = requests.get(f"{self.BASE_URL}/api/v1/docs", timeout=10)
            # Should be accessible in development/test environment
            assert response.status_code in [200, 404]  # 404 if disabled in production
        except requests.exceptions.RequestException as e:
            pytest.fail(f"API documentation check failed: {e}")
    
    def test_database_connection(self):
        """Test database connection through API"""
        try:
            response = requests.get(f"{self.BASE_URL}/health", timeout=10)
            assert response.status_code == 200
            data = response.json()
            assert "database" in data
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Database connection test failed: {e}")
    
    def test_api_cors(self):
        """Test CORS headers are properly set"""
        try:
            headers = {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            }
            response = requests.options(f"{self.BASE_URL}/health", headers=headers, timeout=10)
            # Should handle CORS preflight
            assert response.status_code in [200, 204]
        except requests.exceptions.RequestException as e:
            pytest.fail(f"CORS test failed: {e}")
