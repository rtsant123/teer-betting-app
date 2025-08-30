import React from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

// Centralized Date/Time Display Component for All Game Modes
const GameDateTimeDisplay = ({ 
  scheduledTime, 
  bettingClosesAt, 
  gameType = '',
  houseName = '',
  compact = false,
  showGameDay = true,
  className = '' 
}) => {
  
  // Format date consistently across the app
  const formatGameDate = (dateString) => {
    if (!dateString) return { display: 'TBA', full: 'To Be Announced', isToday: false, dayName: 'Unknown' };
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Reset time for comparison
    const gameDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    
    const isToday = gameDate.getTime() === todayDate.getTime();
    const isTomorrow = gameDate.getTime() === tomorrowDate.getTime();
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const displayDate = date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
    
    let display = displayDate;
    if (isToday) display = `Today (${displayDate})`;
    else if (isTomorrow) display = `Tomorrow (${displayDate})`;
    
    return {
      display,
      full: date.toLocaleDateString('en-IN', { 
        weekday: 'long',
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      }),
      isToday,
      isTomorrow,
      dayName,
      dateObject: date
    };
  };

  // Format time consistently
  const formatTime = (dateString) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate time remaining for deadline
  const getTimeRemaining = (deadlineString) => {
    if (!deadlineString) return { display: 'TBA', isUrgent: false, isExpired: false };
    
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { display: 'CLOSED', isUrgent: false, isExpired: true };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const isUrgent = diff <= 30 * 60 * 1000; // Less than 30 minutes
    
    if (hours > 0) {
      return { display: `${hours}h ${minutes}m left`, isUrgent, isExpired: false };
    } else {
      return { display: `${minutes}m left`, isUrgent, isExpired: false };
    }
  };

  const gameDate = formatGameDate(scheduledTime);
  const deadline = getTimeRemaining(bettingClosesAt);
  const gameTime = formatTime(scheduledTime);
  const deadlineTime = formatTime(bettingClosesAt);

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-medium">
              {gameDate.isToday ? 'Today' : gameDate.isTomorrow ? 'Tomorrow' : gameDate.dayName}
            </span>
            <span className="text-gray-600">@ {gameTime}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            deadline.isExpired 
              ? 'bg-red-100 text-red-700' 
              : deadline.isUrgent 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-green-100 text-green-700'
          }`}>
            {deadline.isExpired ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{deadline.display}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 ${className}`}>
      {/* Game Day Header */}
      {showGameDay && (
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Playing for {gameDate.display}
          </h3>
          <p className="text-sm text-gray-600">{houseName} {gameType}</p>
        </div>
      )}

      {/* Game Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="font-medium text-gray-700">Game Time</span>
          </div>
          <p className="text-lg font-bold text-green-700">{gameTime}</p>
          <p className="text-xs text-gray-500">{gameDate.full}</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            {deadline.isExpired ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <Clock className="w-4 h-4 text-orange-600" />
            )}
            <span className="font-medium text-gray-700">Betting Deadline</span>
          </div>
          <p className={`text-lg font-bold ${
            deadline.isExpired 
              ? 'text-red-700' 
              : deadline.isUrgent 
                ? 'text-orange-700' 
                : 'text-orange-700'
          }`}>
            {deadlineTime}
          </p>
          <p className={`text-xs font-medium ${
            deadline.isExpired 
              ? 'text-red-600' 
              : deadline.isUrgent 
                ? 'text-orange-600' 
                : 'text-gray-500'
          }`}>
            {deadline.display}
          </p>
        </div>
      </div>

      {/* Urgent Warning */}
      {deadline.isUrgent && !deadline.isExpired && (
        <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-800">Hurry! Betting closes soon</p>
            <p className="text-sm text-orange-700">Only {deadline.display} remaining to place bets</p>
          </div>
        </div>
      )}

      {/* Closed Warning */}
      {deadline.isExpired && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Betting Closed</p>
            <p className="text-sm text-red-700">Wait for the next round or check other houses</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDateTimeDisplay;
