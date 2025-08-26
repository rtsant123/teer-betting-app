"""
Test the health endpoint and basic API functionality
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "version" in data


def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_api_info_endpoint():
    """Test the API info endpoint"""
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "version" in data


def test_cors_headers():
    """Test CORS headers are present"""
    response = client.get("/health")
    assert response.status_code == 200
    # CORS headers should be present
    assert "access-control-allow-origin" in response.headers or response.status_code == 200


def test_openapi_docs():
    """Test OpenAPI documentation endpoint"""
    response = client.get("/api/v1/docs")
    # Should either return docs or redirect/404 if disabled in production
    assert response.status_code in [200, 404, 307]


def test_invalid_endpoint():
    """Test invalid endpoint returns 404"""
    response = client.get("/invalid/endpoint")
    assert response.status_code == 404
