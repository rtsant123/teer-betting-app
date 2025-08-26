import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Target, Home, Dice1, Clock, Plus, Minus, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import HeaderBar from './HeaderBar';
import BottomNav from './BottomNav';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWallet } from '../../contexts/WalletContext';
import api from '../../services/api';

const GameModePage = ({ 
  playType, 
  mode, 
  title, 
  description, 
  icon, 
  color, 
  bgGradient,
  numberRange,
  placeholder,
  maxDigits 
}) => {
  const navigate = useNavigate();
  const { houseId } = useParams();
  const { balance, fetchWalletInfo } = useWallet();
  
  // State
  const [houseData, setHouseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState('');
  const [currentAmount, setCurrentAmount] = useState('10');
  const [placing, setPlacing] = useState(false);

  const fetchHouseData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bet/houses-with-rounds');
      const data = response.data;
      const house = data.find(h => h.house.id === parseInt(houseId));
      
      if (!house) {
        toast.error('House not found');
        navigate('/houses');
        return;
      }
      
      if (!house.game_types?.[playType]?.available) {
        toast.error(`${playType} is not available`);
        navigate(`/house/${houseId}`);
        return;
      }
      
      setHouseData(house);
    } catch (error) {
      console.error('Error fetching house data:', error);
      toast.error('Failed to load house data');
      navigate('/houses');
    } finally {
      setLoading(false);
    }
  }, [houseId, navigate, playType]);

  useEffect(() => {
    fetchHouseData();
  }, [houseId, fetchHouseData]);

  const getPayoutRate = () => {
    if (!houseData?.house) return 1;
    
    const rates = {
      FR: {
        direct: houseData.house.fr_direct_payout_rate || 80,
        house: houseData.house.fr_house_payout_rate || 8,
        ending: houseData.house.fr_ending_payout_rate || 8
      },
      SR: {
        direct: houseData.house.sr_direct_payout_rate || 80,
        house: houseData.house.sr_house_payout_rate || 8,
        ending: houseData.house.sr_ending_payout_rate || 8
      },
      FORECAST: {
        direct: houseData.house.forecast_direct_payout_rate || 400,
        house: houseData.house.forecast_house_payout_rate || 40,
        ending: houseData.house.forecast_ending_payout_rate || 40
      }
    };
    
    return rates[playType]?.[mode] || 1;
  };

  const getRoundId = () => {
    if (playType === 'FORECAST') {
      return {
        fr_round_id: houseData?.rounds?.FR?.id || null,
        sr_round_id: houseData?.rounds?.SR?.id || null
      };
    }
    return {
      fr_round_id: playType === 'FR' ? houseData?.rounds?.FR?.id || null : null,
      sr_round_id: playType === 'SR' ? houseData?.rounds?.SR?.id || null : null
    };
  };

  const validateNumber = (number) => {
    if (playType === 'FORECAST') {
      // For forecast, we'll handle this differently
      return true;
    }
    
    if (mode === 'direct') {
      return number.length === 2 && parseInt(number) >= 0 && parseInt(number) <= 99;
    } else {
      return number.length === 1 && parseInt(number) >= 0 && parseInt(number) <= 9;
    }
  };

  const addNumber = () => {
    if (!currentNumber) {
      toast.error(`Please enter a ${mode === 'direct' ? '2-digit' : 'single digit'} number`);
      return;
    }
    
    if (!validateNumber(currentNumber)) {
      toast.error(`Invalid number for ${mode} mode`);
      return;
    }
    
    const amount = parseFloat(currentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > (balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }
    
    const existingIndex = selectedNumbers.findIndex(item => item.number === currentNumber);
    if (existingIndex >= 0) {
      const updated = [...selectedNumbers];
      updated[existingIndex].amount = amount;
      setSelectedNumbers(updated);
    } else {
      setSelectedNumbers(prev => [...prev, {
        id: Date.now(),
        number: currentNumber,
        amount: amount
      }]);
    }
    
    setCurrentNumber('');
    setCurrentAmount('10');
  };

  const removeNumber = (id) => {
    setSelectedNumbers(prev => prev.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return selectedNumbers.reduce((sum, item) => sum + item.amount, 0);
  };

  const getTotalPotentialPayout = () => {
    const payoutRate = getPayoutRate();
    // Show max single bet payout (only one winner possible)
    if (selectedNumbers.length === 0) return 0;
    const maxBetAmount = Math.max(...selectedNumbers.map(item => item.amount));
    return maxBetAmount * payoutRate;
  };

  const placeBets = async () => {
    if (selectedNumbers.length === 0) {
      toast.error('Please select at least one number');
      return;
    }
    
    const totalAmount = getTotalAmount();
    if (totalAmount > (balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }
    
    try {
      setPlacing(true);
      
      const roundIds = getRoundId();
      
      let betData = {
        house_id: parseInt(houseId),
        ...roundIds
      };
      
      // Organize numbers by mode
      const numbersObj = {};
      selectedNumbers.forEach(item => {
        numbersObj[item.number] = item.amount;
      });
      
      // Use the correct schema based on playType and mode
      if (playType === 'FR') {
        if (mode === 'direct') {
          betData.fr_direct = numbersObj;
        } else if (mode === 'house') {
          betData.fr_house = numbersObj;
        } else if (mode === 'ending') {
          betData.fr_ending = numbersObj;
        }
      } else if (playType === 'SR') {
        if (mode === 'direct') {
          betData.sr_direct = numbersObj;
        } else if (mode === 'house') {
          betData.sr_house = numbersObj;
        } else if (mode === 'ending') {
          betData.sr_ending = numbersObj;
        }
      }
      
      const response = await api.post('/bet/ticket', betData);
      
      const result = response.data;
      toast.success(`Bet placed successfully! Ticket ID: ${result.ticket_id}`);
      
      setSelectedNumbers([]);
      setCurrentNumber('');
      setCurrentAmount('10');
      
      await fetchWalletInfo();
      
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error(error.message || 'Failed to place bet');
    } finally {
      setPlacing(false);
    }
  };

  const getTimeUntilClose = () => {
    let closesAt;
    if (playType === 'FORECAST') {
      closesAt = houseData?.rounds?.FR?.betting_closes_at;
    } else {
      closesAt = houseData?.rounds?.[playType]?.betting_closes_at;
    }
    
    if (!closesAt) return 'N/A';
    
    const now = new Date();
    const close = new Date(closesAt);
    const diff = close - now;
    
    if (diff <= 0) return 'Closed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getIconComponent = () => {
    switch (icon) {
      case 'target': return Target;
      case 'home': return Home;
      case 'dice': return Dice1;
      default: return Target;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${color}-600 mx-auto mb-4`}></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!houseData) {
    return null;
  }

  const payoutRate = getPayoutRate();
  const timeUntilClose = getTimeUntilClose();
  const IconComponent = getIconComponent();
  const playTypeEmoji = playType === 'FR' ? '🥇' : playType === 'SR' ? '🥈' : '🔮';

  return (
    <div className={`min-h-screen ${bgGradient} pb-20`}>
      <HeaderBar />
      
      {/* Enhanced Header */}
      <div className={`bg-gradient-to-r from-${color}-600 to-${color}-700 shadow-lg`}>
        <div className="px-3 sm:px-4 py-3 sm:py-4 md:py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-white/90 hover:text-white transition-all duration-200 bg-white/10 hover:bg-white/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-1 sm:mr-2" />
              <span className="font-medium text-xs sm:text-sm md:text-base">Back</span>
            </button>
            <div className="text-center flex-1 mx-2 sm:mx-4">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">{houseData.house.name}</h1>
              <div className="flex items-center justify-center text-xs sm:text-sm md:text-base text-white/80">
                <span className="mr-1 sm:mr-2">{playTypeEmoji}</span>
                <span className="truncate">{playType} - {title}</span>
              </div>
            </div>
            <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 border border-white/20">
              <div className="text-white font-bold text-xs sm:text-sm md:text-base">₹{balance?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Info Banner */}
      <div className={`bg-gradient-to-r from-${color}-500 to-${color}-600 text-white p-3 sm:p-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center min-w-0 flex-1">
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-base sm:text-lg truncate">{title}</div>
              <div className={`text-${color}-100 text-xs sm:text-sm truncate`}>{description}</div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-lg sm:text-xl">{payoutRate}x</div>
            <div className={`text-${color}-100 text-xs`}>Payout</div>
          </div>
        </div>
        
        <div className={`mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-${color}-400 flex items-center justify-between flex-wrap gap-2`}>
          <div className="flex items-center">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Closes in: {timeUntilClose}</span>
          </div>
          <div className={`bg-${color}-400 px-2 py-1 rounded text-xs font-semibold`}>
            LIVE
          </div>
        </div>
      </div>

      {/* Quick Selection for single digits */}
      {mode !== 'direct' && (
        <div className="p-3 sm:p-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Quick Select</h3>
              <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-4">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => setCurrentNumber(num.toString())}
                    className={`h-10 sm:h-12 rounded-lg font-bold text-base sm:text-lg transition-colors ${
                      currentNumber === num.toString()
                        ? `bg-${color}-600 text-white`
                        : `bg-${color}-100 text-${color}-800 hover:bg-${color}-200`
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-3 sm:px-4 pb-20 space-y-3 sm:space-y-4">
        {/* Number Input */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Add Number</h3>
            
            {/* Mobile-first responsive grid */}
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3 mb-4">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 block">
                  {numberRange}
                </label>
                <Input
                  type="number"
                  min="0"
                  max={mode === 'direct' ? '99' : '9'}
                  value={currentNumber}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length <= maxDigits) {
                      setCurrentNumber(value);
                    }
                  }}
                  placeholder={placeholder}
                  className="text-center text-lg font-bold"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                  Amount (₹)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="10"
                  className="text-center text-lg font-bold"
                />
              </div>
            </div>
            
            <Button 
              onClick={addNumber}
              className={`w-full bg-${color}-600 hover:bg-${color}-700`}
              disabled={!currentNumber || !currentAmount}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Number
            </Button>
          </CardContent>
        </Card>

        {/* Selected Numbers */}
        {selectedNumbers.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                Selected Numbers ({selectedNumbers.length})
              </h3>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedNumbers.map(item => (
                  <div key={item.id} className={`flex items-center justify-between bg-${color}-50 p-3 rounded-lg`}>
                    <div className="flex items-center">
                      <div className={`w-12 h-12 bg-${color}-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mr-3`}>
                        {mode === 'direct' ? item.number.padStart(2, '0') : item.number}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">₹{item.amount}</div>
                        <div className="text-sm text-gray-600">Payout: ₹{item.amount * payoutRate}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeNumber(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary & Place Bet */}
        {selectedNumbers.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-lg">₹{getTotalAmount()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Max Potential Win:</span>
                  <span className="font-bold text-lg text-green-600">₹{getTotalPotentialPayout()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  *Only one number can win per game. Amount shown is maximum possible payout.
                </p>
                <div className="pt-3 border-t">
                  <Button 
                    onClick={placeBets}
                    disabled={placing || getTotalAmount() > (balance || 0)}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                  >
                    {placing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Placing Bet...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Place Bet - ₹{getTotalAmount()}
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default GameModePage;
