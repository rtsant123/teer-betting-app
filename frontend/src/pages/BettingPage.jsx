import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
import GameDateTimeDisplay from '../components/common/GameDateTimeDisplay';
import { useWallet } from '../contexts/WalletContext';
import { roundsService } from '../services/rounds';
import { betService } from '../services/bet';
import { Target, Home, TrendingUp, ArrowLeft, Clock, Minus } from 'lucide-react';

function BettingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { balance, fetchWalletInfo } = useWallet();
  const [houseData, setHouseData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedNumbers, setSelectedNumbers] = useState({});
  const [defaultAmount, setDefaultAmount] = useState(10);
  const [betting, setBetting] = useState(false);

  const houseId = searchParams.get('house');
  const gameType = searchParams.get('type');
  const playType = searchParams.get('play');
  
  // Real-time clock update for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    const fetchHouseData = async () => {
      try {
        setLoading(true);
        // First get house data
        const housesResponse = await roundsService.getHouses();
        const house = housesResponse.find(item => item.id === parseInt(houseId));
        if (!house) {
          toast.error('House not found');
          navigate('/play');
          return;
        }

        // Then get rounds for this house
        const roundsResponse = await roundsService.getRoundsByHouse(houseId);
        
        // Filter rounds by game type (FR/SR) and status
        const availableRounds = roundsResponse.filter(round => 
          round.round_type === gameType.toUpperCase() && 
          (round.status === 'SCHEDULED' || round.status === 'ACTIVE') &&
          new Date(round.betting_closes_at) > new Date() // Not expired
        );

        if (availableRounds.length === 0) {
          toast.error(`No ${gameType.toUpperCase()} rounds available for betting`);
          navigate('/play');
          return;
        }

        // Get the next available round
        const nextRound = availableRounds[0];
        
        setHouseData({
          house: {
            id: house.id,
            name: house.name,
            fr_direct_payout_rate: house.fr_direct_payout_rate,
            fr_house_payout_rate: house.fr_house_payout_rate,
            fr_ending_payout_rate: house.fr_ending_payout_rate,
            sr_direct_payout_rate: house.sr_direct_payout_rate,
            sr_house_payout_rate: house.sr_house_payout_rate,
            sr_ending_payout_rate: house.sr_ending_payout_rate,
            forecast_payout_rate: house.forecast_payout_rate
          },
          round: {
            id: nextRound.id,
            round_type: nextRound.round_type,
            status: nextRound.status,
            scheduled_time: nextRound.scheduled_time,
            betting_closes_at: nextRound.betting_closes_at,
            bet_end_time: nextRound.betting_closes_at, // Consistent mapping
            game_type: gameType
          }
        });
      } catch (error) {
        console.error('Error fetching house data:', error);
        toast.error('Failed to load house data');
        navigate('/play');
      } finally {
        setLoading(false);
      }
    };

    if (houseId && gameType) {
      if (playType) {
        fetchHouseData();
      } else {
        // For play type selection, we still need house data to show house name
        fetchHouseData();
      }
    } else {
      navigate('/play');
    }
  }, [houseId, gameType, playType, navigate]);

  const quickAmounts = [10, 25, 50, 100, 250, 500];

  // Add or update number with amount
  const addNumber = useCallback((number) => {
    setSelectedNumbers(prev => ({
      ...prev,
      [number]: prev[number] ? prev[number] + defaultAmount : defaultAmount
    }));
  }, [defaultAmount]);

  // Remove number
  const removeNumber = useCallback((number) => {
    setSelectedNumbers(prev => {
      const updated = { ...prev };
      delete updated[number];
      return updated;
    });
  }, []);

  // Update amount for specific number
  const updateAmount = useCallback((number, amount) => {
    if (amount <= 0) {
      removeNumber(number);
    } else {
      setSelectedNumbers(prev => ({
        ...prev,
        [number]: amount
      }));
    }
  }, [removeNumber]);

  // Get countdown time
  const getCountdown = (targetTime) => {
    if (!targetTime) return { time: '00:00', isExpired: true };
    
    // Ensure we're working with UTC times properly
    const target = new Date(targetTime);
    const now = currentTime; // Use currentTime state for real-time updates
    const diff = target - now;

    if (diff <= 0) {
      return { time: '00:00', isExpired: true };
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return {
      time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      isExpired: false
    };
  };

  // Generate numbers based on play type
  const generateNumbers = () => {
    if (playType === 'direct') {
      const numbers = [];
      for (let i = 0; i <= 99; i++) {
        numbers.push(i.toString().padStart(2, '0'));
      }
      return numbers;
    } else {
      return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    }
  };

  // Calculate totals
  const totalAmount = Object.values(selectedNumbers).reduce((sum, amount) => sum + amount, 0);

  const getPayoutRate = () => {
    if (playType === 'direct') {
      return gameType === 'FR' ? 70 : 80;
    } else {
      return gameType === 'FR' ? 7 : 7;
    }
  };

  const payoutRate = getPayoutRate();
  
  // Calculate maximum possible payout (only one number can win)
  const getMaxPossiblePayout = () => {
    const amounts = Object.values(selectedNumbers);
    if (amounts.length === 0) return 0;
    const maxSingleBet = Math.max(...amounts);
    return maxSingleBet * payoutRate;
  };

  const maxPossiblePayout = getMaxPossiblePayout();

  // Place bet
  const placeBet = async () => {
    if (Object.keys(selectedNumbers).length === 0) {
      toast.error('Please select at least one number');
      return;
    }

    if (totalAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setBetting(true);
      
      // Create ticket data
      const ticketData = {
        house_id: parseInt(houseId)
      };

      // Format data for regular bets (FR/SR with direct/house/ending)
      const betKey = `${gameType.toLowerCase()}_${playType}`;
      ticketData[betKey] = selectedNumbers;

      await betService.placeBet(ticketData);
      
      // Enhanced success feedback
      const selectedCount = Object.keys(selectedNumbers).length;
      const selectedNumbersList = Object.keys(selectedNumbers).join(', ');
      
      toast.success(
        `✅ Bet Placed Successfully!\n` +
        `${selectedCount} number${selectedCount > 1 ? 's' : ''}: ${selectedNumbersList}\n` +
        `Amount: ₹${totalAmount.toLocaleString()}\n` +
        `Max Possible Win: ₹${maxPossiblePayout.toLocaleString()}`,
        {
          duration: 4000,
          style: {
            background: '#10B981',
            color: 'white',
            fontWeight: 'bold',
            padding: '16px',
            borderRadius: '12px'
          }
        }
      );
      
      setSelectedNumbers({});
      await fetchWalletInfo();
    } catch (error) {
      toast.error(error.message || 'Failed to place bet');
    } finally {
      setBetting(false);
    }
  };

  if (!houseData) {
    return null;
  }

  const countdown = getCountdown(houseData.round.bet_end_time);
  const isActive = !countdown.isExpired;

  const playTypeConfig = {
    direct: {
      title: 'Direct Play',
      icon: Target,
      description: 'Pick exact 2-digit numbers',
      color: 'bg-blue-500'
    },
    house: {
      title: 'House Play',
      icon: Home,
      description: 'Pick single digits for house',
      color: 'bg-purple-500'
    },
    ending: {
      title: 'Ending Play',
      icon: TrendingUp,
      description: 'Pick ending digits',
      color: 'bg-orange-500'
    }
  };

  const config = playType ? playTypeConfig[playType] : null;

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no house data, redirect to play page
  if (!houseData) {
    navigate('/play');
    return null;
  }

  // If no valid config or playType, redirect to proper play type selection
  if (!config || !playType || !['direct', 'house', 'ending'].includes(playType)) {
    // Redirect to PlayTypeSelection instead of showing fallback UI
    navigate(`/play/select?house=${houseId}&type=${gameType}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col pb-20">
      <HeaderBar />
      
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 shadow-lg">
        <div className="px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/play/select?house=${houseId}&type=${gameType}`)}
              className="flex items-center text-white/90 hover:text-white transition-all duration-200 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="font-medium text-sm md:text-base">Back</span>
            </button>
            <div className="text-center flex-1 mx-4">
              <h1 className="text-lg md:text-xl font-bold text-white">
                {gameType} {playTypeConfig[playType]?.title}
              </h1>
              <p className="text-sm md:text-base text-white/80">{houseData.house.name}</p>
            </div>
            <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
              <div className="text-white font-bold text-sm md:text-base">₹{balance?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto w-full">
        {/* Game Date & Time Display */}
        <GameDateTimeDisplay
          scheduledTime={houseData.round.scheduled_time}
          bettingClosesAt={houseData.round.bet_end_time}
          gameType={`${gameType} ${playTypeConfig[playType]?.title}`}
          houseName={houseData.house.name}
          compact={false}
          showGameDay={true}
        />

        {/* Enhanced Deadline Info with Animation */}
        <div className={`text-center p-4 md:p-6 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 ${
          isActive 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200' 
            : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-200'
        }`}>
          {isActive ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold text-lg md:text-xl">Betting Open</span>
              </div>
              <div className="text-sm md:text-base font-medium bg-white/20 rounded-lg px-4 py-2 inline-block">
                <Clock className="w-4 h-4 inline mr-2" />
                Closes in: <span className="font-mono text-lg">{countdown.time}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <span className="font-bold text-lg md:text-xl">Betting Closed</span>
              </div>
              <p className="text-white/90 text-sm md:text-base">Please wait for the next round</p>
            </div>
          )}
        </div>

        {/* Enhanced Betting Interface */}
        <div>
          {isActive ? (
            <div className="space-y-6">
              {/* Quick Amount Selection - Enhanced Mobile UI */}
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <label className="block text-lg font-bold text-gray-800 mb-4">
                  <Target className="w-5 h-5 inline mr-2 text-blue-600" />
                  Quick Amount Selection
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setDefaultAmount(amount)}
                      className={`py-3 px-2 md:px-4 rounded-xl font-semibold text-sm md:text-base transition-all duration-200 ${
                        defaultAmount === amount
                          ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg transform scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                      }`}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number Selection Grid - Mobile Optimized */}
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <label className="block text-lg font-bold text-gray-800 mb-4">
                  Select Numbers
                </label>
                <div className={`grid gap-2 md:gap-3 ${
                  playType === 'direct' 
                    ? 'grid-cols-5 md:grid-cols-10' 
                    : 'grid-cols-5 md:grid-cols-10'
                }`}>
                  {generateNumbers().map(number => (
                    <div key={number} className="relative">
                      <button
                        onClick={() => addNumber(number)}
                        className={`w-full aspect-square flex items-center justify-center text-base md:text-lg font-bold rounded-xl transition-all duration-200 ${
                          selectedNumbers[number]
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-95'
                            : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {number}
                      </button>
                      {selectedNumbers[number] && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-bold shadow-lg animate-bounce">
                          ₹{selectedNumbers[number]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Selected Numbers Management */}
              {Object.keys(selectedNumbers).length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      Selected Numbers ({Object.keys(selectedNumbers).length})
                    </h3>
                    <button
                      onClick={() => setSelectedNumbers({})}
                      className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(selectedNumbers).map(([number, amount]) => (
                        <div key={number} className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
                          <span className="font-bold text-gray-800 text-lg">{number}</span>
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => updateAmount(number, parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-2 border rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="1"
                            />
                            <button
                              onClick={() => removeNumber(number)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Summary and Place Bet */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl shadow-lg p-4 md:p-6 border border-blue-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Numbers</div>
                    <div className="text-lg md:text-xl font-bold text-gray-800">{Object.keys(selectedNumbers).length}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Total Amount</div>
                    <div className="text-lg md:text-xl font-bold text-gray-800">₹{totalAmount}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Payout Rate</div>
                    <div className="text-lg md:text-xl font-bold text-green-600">{payoutRate}x</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Max Win</div>
                    <div className="text-base md:text-lg font-bold text-green-600">₹{maxPossiblePayout.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">If one wins</div>
                  </div>
                </div>
                
                {/* Payout Explanation */}
                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-xs md:text-sm text-blue-700 text-center">
                    💡 <strong>Note:</strong> Only ONE number can win per round. Max payout is calculated on your highest single bet.
                  </p>
                </div>
                
                <button
                  onClick={placeBet}
                  disabled={betting || Object.keys(selectedNumbers).length === 0 || totalAmount > balance}
                  className={`w-full py-4 md:py-5 px-6 rounded-2xl font-bold text-lg md:text-xl transition-all duration-200 ${
                    betting || Object.keys(selectedNumbers).length === 0 || totalAmount > balance
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
                  }`}
                >
                  {betting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Placing Bet...</span>
                    </div>
                  ) : (
                    `🎯 Place Bet - ₹${totalAmount}`
                  )}
                </button>
                
                {totalAmount > balance && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm md:text-base text-center font-medium">
                      ⚠️ Insufficient balance. You have ₹{balance?.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 md:p-8 shadow-lg">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-yellow-800 font-bold text-xl md:text-2xl">Betting is Closed</span>
                </div>
                <p className="text-yellow-700 text-base md:text-lg">
                  Betting has closed for this round. Please check back for the next round or select a different house/game type.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={() => navigate('/play')}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-green-600 transition-all duration-200"
                  >
                    <Home className="w-5 h-5 inline mr-2" />
                    Go to Home
                  </button>
                  <button
                    onClick={() => navigate('/results')}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    <TrendingUp className="w-5 h-5 inline mr-2" />
                    View Results
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}

export default BettingPage;
