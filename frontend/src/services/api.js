import axios from 'axios';

/**
 * Centralized API configuration
 * Fixed for VPS deployment
 */
const getApiBaseUrl = () => {
  // Check if VITE_API_URL is defined (not undefined)
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'undefined') {
    console.log('Using configured API URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  console.log('Auto-detecting API URL for:', { hostname, protocol });
  
  // VPS deployment - use backend port 8000
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return `${protocol}//${hostname}:8000`;
  }
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Fallback for other domains
  return `${protocol}//${hostname}:8000`;
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
