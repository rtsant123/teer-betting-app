import axios from 'axios';
// Auto-detect API base URL for different environments
const getApiBaseUrl = () => {
  // If explicitly set, use it (for production)
  if (process.env.REACT_APP_API_BASE_URL) {
    console.log('Using configured API URL:', process.env.REACT_APP_API_BASE_URL);
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Auto-detect based on current location
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  console.log('Auto-detecting API URL for:', { hostname, protocol, port });
  
  // GitHub Codespaces
  if (hostname.includes('github.dev') || hostname.includes('codespaces')) {
    return `/api/v1`;
  } 
  // Local development
  else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001/api/v1';
  } 
  // Production with custom port (VPS with IP)
  else if (port === '80' || port === '443' || port === '') {
    // If on standard ports, assume backend is on :8001 or use proxy
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // IP address - likely VPS deployment
      return `http://${hostname}:8001/api/v1`;
    } else {
      // Domain - use proxy
      return '/api/v1';
    }
  } 
  // Fallback
  else {
    return '/api/v1';
  }
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Response interceptor to handle errors and token expiration
api.interceptors.response.use(
  (response) => {
    // Keep the full response object for now to maintain compatibility
    return response;
  },
  (error) => {
    // Log API errors for debugging
    console.error("API error:", {
      url: error?.config?.url,
      method: error?.config?.method,
      data: error?.config?.data,
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });

    // Only auto-logout on 401 if:
    // 1. It's NOT a login/register attempt
    // 2. We have a token (meaning user was logged in)
    // 3. The error suggests token expiration/invalidity
    if (error.response?.status === 401 && 
        !error.config?.url?.includes('/auth/login') && 
        !error.config?.url?.includes('/auth/register') &&
        localStorage.getItem('token')) {
      console.warn('Token expired or invalid, logging out...', {
        url: error.config?.url,
        hasToken: !!localStorage.getItem('token')
      });
      
      // Clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show a user-friendly message
      if (window.confirm('Your session has expired. Please log in again.')) {
        window.location.href = '/login';
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
export default api;
