import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import authService from '../services/auth';
const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  // Get redirect URL from location state
  const redirectTo = location.state?.redirectTo || '/dashboard';
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.login(formData);
      if (result.success) {
        login(result.user, result.token);
        // Redirect admin users to admin dashboard, regular users to dashboard
        if (result.user.is_admin) {
          navigate('/admin');
        } else {
          navigate(redirectTo === '/dashboard' ? '/dashboard' : redirectTo);
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="layout-main min-h-auth bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header with back button */}
      <div className="sticky-top bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container-auth py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-white hover:text-purple-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </button>
            <div className="text-white font-bold text-lg">
              🎯 Teer Central
            </div>
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center compact-padding py-4">
        <div className="container-ultra-compact w-full max-w-sm">
          <div className="card-modern bg-white/98 backdrop-blur-sm">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Welcome Back!
              </h1>
              <p className="text-xs text-gray-600">
                Sign in to your account to continue playing
              </p>
            </div>
            <form className="form-compact" onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error fade-in compact-padding">
                  <div className="alert-icon">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">{error}</span>
                  </div>
                </div>
              )}
              <div className="form-group-sm">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="input-modern w-full"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
              <div className="form-group-sm">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-modern w-full pr-8"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-mobile-responsive w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner-sm mr-2"></div>
                    <span className="text-sm">Signing in...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-3 h-3 mr-2" />
                    <span className="text-sm">Sign In</span>
                  </>
                )}
              </button>
              <div className="text-center pt-4 border-t border-gray-200">
                <div className="mb-4">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Don't have an account?
                </p>
                <Link 
                  to="/register" 
                  className="btn btn-outline-primary btn-lg w-full"
                >
                  Create Account
                </Link>
              </div>
            </form>
          </div>
          {/* Additional info */}
          <div className="mt-8 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="text-white font-semibold mb-2">✨ Why Join Teer Central?</h3>
              <div className="text-sm text-purple-200 space-y-1">
                <p>🎯 Real-time Teer results</p>
                <p>💰 Secure wallet system</p>
                <p>📱 Mobile-friendly experience</p>
                <p>🏆 Multiple gaming options</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
