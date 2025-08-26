import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { Plus, Menu, X, Home, FileText, TrendingUp, Settings, LogOut, Wallet } from 'lucide-react';

const HeaderBar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { balance } = useWallet();
  const [showFlyMenu, setShowFlyMenu] = useState(false);

  const isLoggedIn = isAuthenticated();

  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: FileText, label: 'My Plays', path: '/my-plays' },
    { icon: TrendingUp, label: 'Results', path: isLoggedIn ? '/user-results' : '/results' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Plus, label: 'Referrals', path: '/referral' },
    { icon: Settings, label: 'Profile', path: '/profile' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setShowFlyMenu(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <div className="header bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Enhanced Logo - Modern Design */}
            <button 
              onClick={() => navigate(isLoggedIn ? '/home' : '/')}
              className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-white font-bold text-lg">🏹</span>
              </div>
              <span className="font-bold text-gray-900 text-xl hidden sm:block">Teer Central</span>
            </button>

            {/* Enhanced Right Section - Modern Design */}
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {/* Enhanced Wallet Balance Button */}
                <button
                  onClick={() => navigate('/wallet')}
                  className="btn btn-outline flex items-center gap-2 bg-success-50 text-success-700 border-success-200 hover:bg-success-100"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline font-semibold">₹{balance?.toLocaleString() || '0'}</span>
                  <span className="sm:hidden text-sm font-semibold">₹{(balance || 0).toLocaleString()}</span>
                </button>

                {/* Enhanced Add Money Button */}
                <button
                  onClick={() => navigate('/wallet')}
                  className="btn btn-primary p-3 rounded-xl"
                  title="Add Money"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Enhanced Menu Button */}
                <button
                  onClick={() => setShowFlyMenu(true)}
                  className="btn btn-secondary p-3 rounded-xl"
                  title="Menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-outline"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn btn-primary"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fly Menu Overlay - Fixed for Bottom Navigation */}
      {showFlyMenu && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowFlyMenu(false)}>
          <div className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl transform transition-transform animate-slide-up">
            <div className="p-6 h-full flex flex-col pb-20">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">🏹</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.username || 'Player'}</p>
                    <p className="text-sm text-gray-600">Teer Player</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFlyMenu(false)}
                  className="btn btn-secondary !w-9 !h-9 !p-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wallet Info */}
              <div className="card p-4 mb-6" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-90">Wallet Balance</p>
                    <p className="text-2xl font-bold">₹{balance?.toLocaleString() || '0'}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/wallet');
                      setShowFlyMenu(false);
                    }}
                    className="btn btn-secondary bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    Add Money
                  </button>
                </div>
              </div>

              {/* Menu Items - Scrollable with proper spacing */}
              <div className="space-y-1 flex-1 overflow-y-auto mb-6">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setShowFlyMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Logout - Fixed at bottom with safe area */}
              <div className="pt-4 border-t border-gray-200 mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-lg"
                >
                  <LogOut className="w-6 h-6" />
                  <span className="font-semibold">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderBar;
