import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
const RoundCard = ({ houseData, onPlayClick, isPublicView = false }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const house = houseData.house;
  const rounds = houseData.rounds;
  const frRound = rounds?.FR;
  const srRound = rounds?.SR;
  // Get time remaining for a round
  const getTimeRemaining = (closingTime) => {
    if (!closingTime) return { text: 'Unknown', expired: true, warning: false };
    const now = new Date();
    const closes = new Date(closingTime);
    const diffMs = closes - now;
    if (diffMs <= 0) {
      return { text: 'CLOSED', expired: true, warning: false };
    }
    const diffMinutes = Math.floor(diffMs / 60000);
    const warning = diffMinutes <= 15;
    if (diffMinutes < 60) {
      return { 
        text: `${diffMinutes}m left`, 
        expired: false, 
        warning 
      };
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return { 
        text: `${diffHours}h ${diffMinutes % 60}m left`, 
        expired: false, 
        warning 
      };
    }
    const diffDays = Math.floor(diffHours / 24);
    return { 
      text: `${diffDays}d ${diffHours % 24}h left`, 
      expired: false, 
      warning: false 
    };
  };
  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'TBA';
    }
  };
  // Handle play button click
  const handlePlayClick = (roundType) => {
    if (isPublicView || !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (onPlayClick) {
      onPlayClick(house.id, roundType);
    }
  };
  const cardClassName = isPublicView 
    ? "bg-white bg-opacity-95 backdrop-blur-md rounded-2xl shadow-2xl border border-white border-opacity-20"
    : "bg-white rounded-2xl shadow-sm border border-gray-200";
  const headerClassName = isPublicView
    ? "flex items-center justify-between mb-6 pb-4 border-b border-gray-200"
    : "bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100";
  return (
    <div className={`${cardClassName} overflow-hidden`}>
      {/* House Header */}
      <div className={headerClassName}>
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white text-xl">🏹</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{house.name}</h3>
            <p className="text-gray-600 text-sm">{house.location}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
            LIVE
          </div>
        </div>
      </div>
      {/* Game Types */}
      <div className={`${isPublicView ? 'space-y-4' : 'p-6 space-y-4'}`}>
        {/* First Round */}
        {frRound && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-semibold text-gray-900">First Round</span>
              </div>
              <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
                {house.fr_direct_payout_rate}x Direct • {house.fr_house_payout_rate}x House
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Deadline: {formatTime(frRound.betting_closes_at)}</span>
              <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                getTimeRemaining(frRound.betting_closes_at).expired 
                  ? 'bg-red-100 text-red-700'
                  : getTimeRemaining(frRound.betting_closes_at).warning
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {getTimeRemaining(frRound.betting_closes_at).text}
              </div>
            </div>
            <button 
              onClick={() => handlePlayClick('FR')}
              disabled={!isPublicView && getTimeRemaining(frRound.betting_closes_at).expired}
              className={`w-full font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                !isPublicView && getTimeRemaining(frRound.betting_closes_at).expired
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              <span className="mr-2">🎯</span>
              {isPublicView 
                ? (getTimeRemaining(frRound.betting_closes_at).expired ? 'Login to View' : 'Play Now')
                : (getTimeRemaining(frRound.betting_closes_at).expired ? 'Closed' : 'Play First Round')
              }
            </button>
          </div>
        )}
        {/* Second Round */}
        {srRound && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold text-gray-900">Second Round</span>
              </div>
              <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                {house.sr_direct_payout_rate}x Direct • {house.sr_house_payout_rate}x House
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Deadline: {formatTime(srRound.betting_closes_at)}</span>
              <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                getTimeRemaining(srRound.betting_closes_at).expired 
                  ? 'bg-red-100 text-red-700'
                  : getTimeRemaining(srRound.betting_closes_at).warning
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {getTimeRemaining(srRound.betting_closes_at).text}
              </div>
            </div>
            <button 
              onClick={() => handlePlayClick('SR')}
              disabled={!isPublicView && getTimeRemaining(srRound.betting_closes_at).expired}
              className={`w-full font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                !isPublicView && getTimeRemaining(srRound.betting_closes_at).expired
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg'
              }`}
            >
              <span className="mr-2">🎯</span>
              {isPublicView 
                ? (getTimeRemaining(srRound.betting_closes_at).expired ? 'Login to View' : 'Play Now')
                : (getTimeRemaining(srRound.betting_closes_at).expired ? 'Closed' : 'Play Second Round')
              }
            </button>
          </div>
        )}
        {/* Forecast */}
        {(frRound || srRound) && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-semibold text-gray-900">Forecast</span>
              </div>
              <span className="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded-full">
                Up to {house.forecast_payout_rate}x
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                Deadline: {frRound ? formatTime(frRound.betting_closes_at) : 'Based on FR'}
              </span>
              <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                frRound && getTimeRemaining(frRound.betting_closes_at).expired 
                  ? 'bg-red-100 text-red-700'
                  : frRound && getTimeRemaining(frRound.betting_closes_at).warning
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {frRound ? getTimeRemaining(frRound.betting_closes_at).text : 'Coming Soon'}
              </div>
            </div>
            <button 
              onClick={() => handlePlayClick('FORECAST')}
              disabled={!isPublicView && frRound && getTimeRemaining(frRound.betting_closes_at).expired}
              className={`w-full font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                !isPublicView && frRound && getTimeRemaining(frRound.betting_closes_at).expired
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg'
              }`}
            >
              <span className="mr-2">🔮</span>
              {isPublicView 
                ? (frRound && getTimeRemaining(frRound.betting_closes_at).expired ? 'Login to View' : 'Play Now')
                : (frRound && getTimeRemaining(frRound.betting_closes_at).expired ? 'Closed' : 'Play Forecast')
              }
            </button>
          </div>
        )}
      </div>
      {/* Bottom Info */}
      <div className={`${isPublicView ? 'mt-6 pt-4' : 'bg-gray-50 px-6 py-3'} border-t border-gray-100`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <span className="mr-1">🎮</span>
            <span>Available Games: {[frRound, srRound, (frRound || srRound)].filter(Boolean).length}</span>
          </div>
          <div className="flex items-center text-green-600 font-semibold">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            <span>Live Now</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RoundCard;