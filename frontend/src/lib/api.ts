/**
 * Centralized API configuration using Vite environment variables
 * 
 * Environment Variables:
 * - VITE_API_URL: Full API URL (e.g., https://api.example.com)
 * - Production default: /api (uses reverse proxy)
 * - Development fallback: http://localhost:8001/api/v1
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Get API base URL from environment or use smart defaults
const getApiBaseUrl = (): string => {
  // Use environment variable if set (production/staging)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production default - use reverse proxy
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // Development fallback
  const hostname = window.location.hostname;
  
  // GitHub Codespaces
  if (hostname.includes('github.dev') || hostname.includes('codespaces')) {
    return '/api/v1';
  } 
  
  // Local development
  return 'http://localhost:8001/api/v1';
};

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Centralized API client function
 * Usage: api('/users') or api('/users', { method: 'POST', data: {...} })
 */
export const api = async <T = any>(
  url: string, 
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  // Ensure URL starts with /
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return axiosInstance(cleanUrl, config);
};

// Convenience methods
export const apiGet = <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
  api<T>(url, { ...config, method: 'GET' });

export const apiPost = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
  api<T>(url, { ...config, method: 'POST', data });

export const apiPut = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
  api<T>(url, { ...config, method: 'PUT', data });

export const apiDelete = <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
  api<T>(url, { ...config, method: 'DELETE' });

// Export axios instance for compatibility
export const apiClient = axiosInstance;

export default api;
