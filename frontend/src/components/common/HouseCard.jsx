import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trophy, Target } from 'lucide-react';
import GameTypeSelector from './GameTypeSelector';
const HouseCard = ({ houseData }) => {
  const navigate = useNavigate();
  const [showGameTypeSelector, setShowGameTypeSelector] = useState(false);
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
  const getAvailableRounds = () => {
    if (!houseData.rounds) return [];
    const rounds = [];
    const now = new Date();
    // Check FR
    const frRound = houseData.rounds.FR;
    if (frRound) {
      const frCloses = new Date(frRound.betting_closes_at);
      if (now < frCloses) {
        rounds.push({
          id: 'FR',
          name: 'First Round',
          icon: '🥇',
          closes: frCloses,
          payout: '70x',
          color: 'from-blue-500 to-purple-600'
        });
      }
    }
    // Check SR
    const srRound = houseData.rounds.SR;
    if (srRound) {
      const srCloses = new Date(srRound.betting_closes_at);
      if (now < srCloses) {
        rounds.push({
          id: 'SR',
          name: 'Second Round',
          icon: '🥈',
          closes: srCloses,
          payout: '80x',
          color: 'from-green-500 to-teal-600'
        });
      }
    }
    return rounds;
  };
  const availableRounds = getAvailableRounds();
  if (availableRounds.length === 0) {
    return null; // Don't show houses with no active rounds
  }
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
        <div className="relative">
          <h3 className="text-lg font-bold mb-1">{houseData.house.name}</h3>
          <p className="text-gray-300 text-sm">{houseData.house.location}</p>
        </div>
        <div className="absolute bottom-2 right-4 text-3xl opacity-20">🏹</div>
      </div>
      {/* Available Rounds */}
      <div className="p-4 space-y-3">
        {availableRounds.map((round) => {
          const timeLeft = getTimeUntilClose(round.closes);
          const isClosingSoon = round.closes && (new Date(round.closes) - new Date()) < 30 * 60 * 1000; // Less than 30 minutes
          return (
            <div key={round.id} className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{round.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{round.name}</div>
                    <div className="text-xs text-gray-500">Max payout: {round.payout}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center space-x-1 text-xs ${isClosingSoon ? 'text-red-600' : 'text-gray-600'}`}>
                    <Clock className="w-3 h-3" />
                    <span>{timeLeft}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowGameTypeSelector(true)}
                className={`w-full bg-gradient-to-r ${round.color} text-white py-2 px-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2`}
              >
                <Target className="w-4 h-4" />
                <span>Play Now</span>
              </button>
            </div>
          );
        })}
      </div>
      {/* Footer stats */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <Trophy className="w-4 h-4" />
          <span>Active Rounds: {availableRounds.length}</span>
        </div>
        <div className="text-green-600 font-medium">
          Live Now
        </div>
      </div>
      {/* Game Type Selector Modal */}
      <GameTypeSelector
        houseData={houseData}
        isOpen={showGameTypeSelector}
        onClose={() => setShowGameTypeSelector(false)}
      />
    </div>
  );
};
export default HouseCard;