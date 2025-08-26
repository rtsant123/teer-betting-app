import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trophy, X } from 'lucide-react';
const GameTypeSelector = ({ houseData, isOpen, onClose }) => {
  const navigate = useNavigate();
  if (!isOpen || !houseData) return null;
  const getTimeUntilClose = (closeTime) => {
    if (!closeTime) return 'N/A';
    const now = new Date();
    const close = new Date(closeTime);
    const diff = close - now;
    if (diff <= 0) return 'Closed';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
          icon: '🥇',
          closes: frCloses,
          payout: '70x',
          color: 'from-blue-500 to-purple-600',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700'
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
          icon: '🥈',
          closes: srCloses,
          payout: '80x',
          color: 'from-green-500 to-teal-600',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700'
        });
      }
    }
    // Check Forecast (only if FR is open)
    if (frRound && gameTypes.some(g => g.id === 'FR')) {
      gameTypes.push({
        id: 'FORECAST',
        name: 'Forecast',
        icon: '🔮',
        closes: new Date(frRound.betting_closes_at),
        payout: '4000x',
        color: 'from-purple-500 to-pink-600',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700'
      });
    }
    return gameTypes;
  };
  const handleGameTypeSelect = (gameType) => {
    // Navigate to play page with house and game type
    navigate(`/play?house=${houseData.house.id}&type=${gameType.id}`);
    onClose();
  };
  const availableGameTypes = getAvailableGameTypes();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
              🏹
            </div>
            <div>
              <h3 className="text-xl font-bold">{houseData.house.name}</h3>
              <p className="text-gray-300 text-sm">{houseData.house.location}</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h4 className="text-lg font-semibold">🎯 Select Game Type</h4>
          </div>
        </div>
        {/* Game Types */}
        <div className="p-6 space-y-4">
          {availableGameTypes.map((gameType) => {
            const timeLeft = getTimeUntilClose(gameType.closes);
            const isClosingSoon = gameType.closes && (new Date(gameType.closes) - new Date()) < 30 * 60 * 1000;
            return (
              <div
                key={gameType.id}
                className={`${gameType.bgColor} border-2 border-transparent hover:border-gray-300 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md`}
                onClick={() => handleGameTypeSelect(gameType)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{gameType.icon}</span>
                    <div>
                      <div className="font-bold text-gray-900">{gameType.name}</div>
                      <div className="text-sm text-gray-600">Max payout: {gameType.payout}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs flex items-center space-x-1 ${isClosingSoon ? 'text-red-600' : 'text-gray-600'}`}>
                      <Clock className="w-3 h-3" />
                      <span>Closes</span>
                    </div>
                    <div className={`font-semibold ${isClosingSoon ? 'text-red-600' : 'text-gray-700'}`}>
                      {timeLeft}
                    </div>
                  </div>
                </div>
                {/* Play Button */}
                <button
                  className={`w-full bg-gradient-to-r ${gameType.color} text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameTypeSelect(gameType);
                  }}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Play Now</span>
                </button>
              </div>
            );
          })}
          {availableGameTypes.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⏰</div>
              <h4 className="font-semibold text-gray-900 mb-2">No Active Rounds</h4>
              <p className="text-gray-600 text-sm">This house has no open rounds at the moment.</p>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Trophy className="w-4 h-4" />
            <span>Available Games: {availableGameTypes.length}</span>
          </div>
          <div className="text-green-600 font-medium flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Now</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GameTypeSelector;