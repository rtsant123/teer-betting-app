import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
const GameSelectionCard = ({ houseData, showHeader = true }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, []);
  if (!houseData) return null;
  const getTimeUntilClose = (closeTime) => {
    if (!closeTime) return 'N/A';
    const close = new Date(closeTime);
    const diff = close - currentTime;
    if (diff <= 0) return 'Closed';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };
  const getAvailableGameTypes = () => {
    if (!houseData.rounds) return [];
    const gameTypes = [];
    const now = new Date();
    // Check FR
    const frRound = houseData.rounds.FR;
    if (frRound) {
      const frCloses = new Date(frRound.betting_closes_at);
      if (now < frCloses) {
        gameTypes.push({
          id: 'FR',
          name: 'First Round',
          shortName: 'FR',
          icon: '🎯',
          closes: frCloses,
          payout: '70x',
          color: 'bg-blue-500'
        });
      }
    }
    // Check SR
    const srRound = houseData.rounds.SR;
    if (srRound) {
      const srCloses = new Date(srRound.betting_closes_at);
      if (now < srCloses) {
        gameTypes.push({
          id: 'SR',
          name: 'Second Round',
          shortName: 'SR',
          icon: '🎲',
          closes: srCloses,
          payout: '80x',
          color: 'bg-green-500'
        });
      }
    }
    // Check Forecast (only if FR is open)
    if (frRound && gameTypes.some(g => g.id === 'FR')) {
      gameTypes.push({
        id: 'FORECAST',
        name: 'Forecast',
        shortName: 'FC',
        icon: '🔮',
        closes: new Date(frRound.betting_closes_at),
        payout: '4000x',
        color: 'bg-purple-500'
      });
    }
    return gameTypes;
  };
  const handleGameTypeSelect = (gameType) => {
    navigate(`/play?house=${houseData.house.id}&type=${gameType.id}`);
  };
  const availableGameTypes = getAvailableGameTypes();
  if (availableGameTypes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
        {showHeader && (
          <div className="bg-gray-900 p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                <span className="text-white text-sm">🏹</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm">{houseData.house.name}</h3>
                <p className="text-gray-400 text-xs">{houseData.house.location}</p>
              </div>
            </div>
          </div>
        )}
        <div className="p-4 text-center">
          <div className="text-2xl mb-2">⏰</div>
          <p className="text-sm text-gray-600">No active rounds</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
             {/* Header */}
       {showHeader && (
         <div className="bg-gray-900 p-2">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
               <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                 <span className="text-white text-xs">🏹</span>
               </div>
               <div>
                 <h3 className="text-white font-semibold text-xs">{houseData.house.name}</h3>
                 <p className="text-gray-400 text-xs">{houseData.house.location}</p>
               </div>
             </div>
             <div className="text-xs text-gray-400">
               🎯 Select
             </div>
           </div>
         </div>
       )}
             {/* Game Types - Compact Vertical Stack */}
       <div className="p-2 space-y-2">
         {/* First Round */}
         {availableGameTypes.find(g => g.id === 'FR') && (
           <div className="bg-blue-600 rounded-lg p-3 text-white relative overflow-hidden">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                   <span className="text-lg">⏰</span>
                 </div>
                 <div>
                   <div className="font-bold text-sm">First Round</div>
                   <div className="text-xs opacity-90">
                     {getTimeUntilClose(availableGameTypes.find(g => g.id === 'FR')?.closes)}
                   </div>
                 </div>
               </div>
               <button
                 onClick={() => handleGameTypeSelect(availableGameTypes.find(g => g.id === 'FR'))}
                 className="bg-white text-blue-600 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
               >
                 Play Now
               </button>
             </div>
             {/* Background decoration */}
             <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8"></div>
           </div>
         )}
         {/* Second Round */}
         {availableGameTypes.find(g => g.id === 'SR') && (
           <div className="bg-green-600 rounded-lg p-3 text-white relative overflow-hidden">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                   <span className="text-lg">🎲</span>
                 </div>
                 <div>
                   <div className="font-bold text-sm">Second Round</div>
                   <div className="text-xs opacity-90">
                     {getTimeUntilClose(availableGameTypes.find(g => g.id === 'SR')?.closes)}
                   </div>
                 </div>
               </div>
               <button
                 onClick={() => handleGameTypeSelect(availableGameTypes.find(g => g.id === 'SR'))}
                 className="bg-white text-green-600 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
               >
                 Play Now
               </button>
             </div>
             {/* Background decoration */}
             <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8"></div>
           </div>
         )}
         {/* Forecast */}
         {availableGameTypes.find(g => g.id === 'FORECAST') && (
           <div className="bg-purple-600 rounded-lg p-3 text-white relative overflow-hidden">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                   <span className="text-lg">🔮</span>
                 </div>
                 <div>
                   <div className="font-bold text-sm">Forecast</div>
                   <div className="text-xs opacity-90">
                     {getTimeUntilClose(availableGameTypes.find(g => g.id === 'FORECAST')?.closes)}
                   </div>
                 </div>
               </div>
               <button
                 onClick={() => handleGameTypeSelect(availableGameTypes.find(g => g.id === 'FORECAST'))}
                 className="bg-white text-purple-600 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
               >
                 Play Now
               </button>
             </div>
             {/* Background decoration */}
             <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8"></div>
           </div>
         )}
       </div>
    </div>
  );
};
export default GameSelectionCard;