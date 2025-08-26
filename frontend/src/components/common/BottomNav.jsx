import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, FileText, Target, TrendingUp, User } from 'lucide-react';
import { roundsService } from '../../services/rounds';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [openRoundsCount, setOpenRoundsCount] = useState(0);

  useEffect(() => {
    const fetchOpenRounds = async () => {
      if (isAuthenticated) {
        try {
          const rounds = await roundsService.getOpenRounds();
          setOpenRoundsCount(rounds.length);
        } catch (error) {
          console.error('Error fetching open rounds:', error);
        }
      }
    };

    fetchOpenRounds();
    const interval = setInterval(fetchOpenRounds, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handlePlayNowClick = () => {
    navigate('/houses');
  };

  const navItems = [
    {
      path: '/home',
      icon: Home,
      label: 'Home',
      isActive: location.pathname === '/home'
    },
    {
      path: '/my-plays',
      icon: FileText,
      label: 'My Plays',
      isActive: location.pathname === '/my-plays'
    },
    {
      path: '/play',
      icon: Target,
      label: 'Play Now',
      isActive: location.pathname.startsWith('/play'),
      isMainAction: true,
      badge: openRoundsCount > 0 ? openRoundsCount : null,
      customClick: handlePlayNowClick
    },
    {
      path: isAuthenticated ? '/user-results' : '/results',
      icon: TrendingUp,
      label: 'Results',
      isActive: location.pathname === '/results' || location.pathname === '/user-results'
    },
    {
      path: '/profile',
      icon: User,
      label: 'Profile',
      isActive: location.pathname === '/profile'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 safe-area-pb z-50">
      <div className="container">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            
            if (item.isMainAction) {
              return (
                <button
                  key={item.path}
                  onClick={item.customClick || (() => navigate(item.path))}
                  className="relative flex flex-col items-center justify-center p-3 -mt-6 rounded-2xl btn btn-primary shadow-lg transform hover:scale-105 active:scale-95 transition-transform"
                >
                  <IconComponent className="w-6 h-6 text-white" />
                  <span className="text-xs text-white font-semibold mt-1">{item.label}</span>
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-danger-500 to-danger-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-white shadow-md animate-pulse">
                      {item.badge}
                    </div>
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-link flex-col py-2 px-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                  item.isActive ? 'active text-primary-600 bg-primary-50' : 'text-muted hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${item.isActive ? 'scale-110' : ''} transition-transform`} />
                <span className={`text-xs mt-1 font-medium ${item.isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
