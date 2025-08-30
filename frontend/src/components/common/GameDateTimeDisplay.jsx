import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

// Clean Date/Time Display Component - Matches Second Screenshot Design
const GameDateTimeDisplay = ({ 
  scheduledTime, 
  bettingClosesAt, 
  gameType = '',
  houseName = '',
  compact = false,
  showGameDay = true,
  className = '' 
}) => {
  
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Format date for display
  const formatGameDate = (dateString) => {
    if (!dateString) return { display: 'TBA', dayName: 'TBA', isToday: false };
    
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
    
    if (isToday) {
      return { display: 'Today', dayName, isToday: true };
    } else if (isTomorrow) {
      return { display: 'Tomorrow', dayName, isToday: false };
    } else {
      return { display: dayName, dayName, isToday: false };
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate countdown timer
  const updateCountdown = () => {
    if (!bettingClosesAt) {
      setTimeLeft('');
      return;
    }
    
    const deadline = new Date(bettingClosesAt);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeLeft('Closed');
      setIsUrgent(false);
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Set urgency if less than 30 minutes
    setIsUrgent(diff <= 30 * 60 * 1000);
    
    if (hours > 0) {
      setTimeLeft(`${hours}h ${minutes}m left`);
    } else if (minutes > 0) {
      setTimeLeft(`${minutes}m ${seconds}s left`);
    } else {
      setTimeLeft(`${seconds}s left`);
    }
  };

  // Update countdown every second
  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [bettingClosesAt]);

  const gameDate = formatGameDate(scheduledTime);
  const gameTime = formatTime(scheduledTime);

  // Clean design matching second screenshot
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header with Day and Time */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-semibold text-gray-900">
                {gameDate.display}
              </div>
              {gameTime && (
                <div className="text-sm text-gray-600">
                  @ {gameTime}
                </div>
              )}
            </div>
          </div>
          
          {/* Countdown Timer */}
          {timeLeft && (
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
              timeLeft === 'Closed' 
                ? 'bg-red-100 text-red-700' 
                : isUrgent 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-green-100 text-green-700'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{timeLeft}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDateTimeDisplay;
