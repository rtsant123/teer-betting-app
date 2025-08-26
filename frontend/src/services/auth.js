import api from './api';
export const authService = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      
      const { access_token, user } = response.data; // Use response.data
      
      // Store token and user info
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user, token: access_token };
    } catch (error) {
      console.error('Auth service - Login error:', error);
      
      // Provide specific error messages based on status code
      let errorMessage = 'Login failed';
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = 'Invalid username or password. Please check your credentials and try again.';
            break;
          case 403:
            errorMessage = 'Account is disabled. Please contact support.';
            break;
          case 429:
            errorMessage = 'Too many login attempts. Please wait a moment and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = error.response.data?.message || 
                          error.response.data?.detail || 
                          `Login failed (Error ${error.response.status})`;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  },
  // Register new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, user: response.data }; // Use response.data
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user info
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return { success: true, user: response.data }; // Use response.data
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: 'Failed to get user info' };
    }
  },

  // Check if user is logged in
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get stored user info
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh');
      const { access_token, user } = response.data; // Use response.data
      // Update stored token and user info
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true, user, token: access_token };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Token refresh failed' 
      };
    }
  },

  // Forgot password - request OTP
  forgotPassword: async (phoneNumber) => {
    try {
      const response = await api.post('/auth/forgot-password', { phone_number: phoneNumber });
      return { success: true, message: response.data.message }; // Use response.data
    } catch (error) {
      console.error('Forgot password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to send reset code' 
      };
    }
  },

  // Verify OTP and reset password
  resetPassword: async (phoneNumber, otpCode, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        phone_number: phoneNumber,
        otp_code: otpCode,
        new_password: newPassword
      });
      return { success: true, message: response.data.message }; // Use response.data
    } catch (error) {
      console.error('Reset password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to reset password' 
      };
    }
  },

  // Change password for authenticated user
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: true, message: response.data.message }; // Use response.data
    } catch (error) {
      console.error('Change password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to change password' 
      };
    }
  }
};
export default authService;
