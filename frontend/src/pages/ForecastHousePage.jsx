import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Minus, DollarSign, X, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';
import GameDateTimeDisplay from '../components/common/GameDateTimeDisplay';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';

const ForecastHousePage = () => {
  const navigate = useNavigate();
  const { houseId } = useParams();
  const { balance, fetchWalletInfo } = useWallet();
  
  // State
  const [houseData, setHouseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [frInput, setFrInput] = useState('');
  const [srInput, setSrInput] = useState('');
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
      
      if (!house.game_types?.FORECAST?.available) {
        toast.error('Forecast is not available');
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
  }, [houseId, navigate]);

  useEffect(() => {
    fetchHouseData();
  }, [fetchHouseData]);

  const addCombination = () => {
    if (!frInput || frInput.length !== 1) {
      toast.error('Please enter a single digit for FR house (0-9)');
      return;
    }
    
    if (!srInput || srInput.length !== 1) {
      toast.error('Please enter a single digit for SR house (0-9)');
      return;
    }
    
    const fr = parseInt(frInput);
    const sr = parseInt(srInput);
    
    if (fr < 0 || fr > 9 || sr < 0 || sr > 9) {
      toast.error('House digits must be between 0 and 9');
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
    
    const combination = `${frInput}-${srInput}`;
    
    const existingIndex = selectedCombinations.findIndex(item => item.combination === combination);
    if (existingIndex >= 0) {
      const updated = [...selectedCombinations];
      updated[existingIndex].amount = amount;
      setSelectedCombinations(updated);
    } else {
      setSelectedCombinations(prev => [...prev, {
        id: Date.now(),
        combination: combination,
        frInput: frInput,
        srInput: srInput,
        amount: amount
      }]);
    }
    
    setFrInput('');
    setSrInput('');
    setCurrentAmount('10');
  };

  const removeCombination = (id) => {
    setSelectedCombinations(prev => prev.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return selectedCombinations.reduce((sum, item) => sum + item.amount, 0);
  };

  const getTotalPotentialPayout = () => {
    const payoutRate = houseData?.house?.forecast_house_payout_rate || 40;
    // Only ONE combination can win, so show max possible payout for the highest bet
    const maxSingleBet = Math.max(...selectedCombinations.map(item => item.amount), 0);
    return maxSingleBet * payoutRate;
  };

  const placeBets = async () => {
    if (selectedCombinations.length === 0) {
      toast.error('Please select at least one combination');
      return;
    }
    
    const totalAmount = getTotalAmount();
    if (totalAmount > (balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }
    
    try {
      setPlacing(true);
      
      // Check if forecast rounds are available
      if (!houseData.game_types?.FORECAST?.available) {
        throw new Error('Forecast betting is not available for this house');
      }

      // For forecast betting, we need to use the forecast round ID
      const forecastRound = houseData.rounds?.FORECAST;
      if (!forecastRound || !forecastRound.id) {
        throw new Error('No active forecast round found for this house');
      }

      const forecastPairs = selectedCombinations.map(combo => ({
        fr_number: combo.frInput,
        sr_number: combo.srInput,
        amount: parseFloat(combo.amount)
      }));

      const betData = {
        house_id: parseInt(houseId),
        forecast_pairs: forecastPairs,  // Changed to use new schema
        forecast_type: 'HOUSE'
      };

      console.log('Sending forecast house bet data:', betData);

      await api.post('/bet/ticket', betData);
      
      toast.success('Forecast house bet placed successfully!');
      
      setSelectedCombinations([]);
      setFrInput('');
      setSrInput('');
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
    if (!houseData?.rounds?.FR?.betting_closes_at) return 'N/A';
    
    const now = new Date();
    const close = new Date(houseData.rounds.FR.betting_closes_at);
    const diff = close - now;
    
    if (diff <= 0) return 'Closed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!houseData) {
    return null;
  }

  const payoutRate = houseData?.house?.forecast_house_payout_rate || 40;
  const timeUntilClose = getTimeUntilClose();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar />
      
      {/* Game Title Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Forecast House</h1>
              {houseData && <p className="text-sm text-gray-600">{houseData.house.name}</p>}
            </div>
            
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Game Date & Time Display */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <GameDateTimeDisplay
          scheduledTime={houseData?.rounds?.FORECAST?.scheduled_time}
          bettingClosesAt={houseData?.rounds?.FORECAST?.betting_closes_at}
          gameType="Forecast House"
          houseName={houseData.house.name}
          compact={true}
          showGameDay={false}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-40 space-y-6">
        {/* Quick Selection Grid */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Quick Select House Digits</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">FR House (0-9)</label>
                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setFrInput(num.toString())}
                      className={`h-8 sm:h-10 rounded font-bold text-xs sm:text-sm transition-colors ${
                        frInput === num.toString()
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">SR House (0-9)</label>
                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setSrInput(num.toString())}
                      className={`h-8 sm:h-10 rounded font-bold text-xs sm:text-sm transition-colors ${
                        srInput === num.toString()
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Combination Input */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Add House Combination</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">FR House (0-9)</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={frInput}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.length <= 1 && (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9))) {
                        setFrInput(value);
                      }
                    }}
                    placeholder="2"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">SR House (0-9)</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={srInput}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.length <= 1 && (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9))) {
                        setSrInput(value);
                      }
                    }}
                    placeholder="4"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="10"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <button 
                onClick={addCombination}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                disabled={!frInput || !srInput || !currentAmount}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add House Combination
              </button>
            </div>
          </div>
        </div>

        {/* Selected Combinations */}
        {selectedCombinations.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Selected Combinations</h3>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                Selected House Combinations ({selectedCombinations.length})
              </h3>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedCombinations.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <div className="bg-purple-600 text-white rounded-lg px-3 py-2 font-bold text-lg mr-3">
                        {item.combination}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">₹{item.amount}</div>
                        <div className="text-sm text-gray-600">Payout: ₹{item.amount * payoutRate}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCombination(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary & Place Bet */}
        {selectedCombinations.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-sm mb-8">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Betting Summary</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-lg">₹{getTotalAmount()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Max Win Potential:</span>
                  <span className="font-bold text-lg text-green-600">₹{getTotalPotentialPayout()}</span>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Note:</strong> Only ONE combination can win per round. Max payout shown is for your highest single bet.
                  </p>
                </div>
                
                <button 
                  onClick={placeBets}
                  disabled={placing || getTotalAmount() > (balance || 0)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {placing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Placing Bet...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Place Forecast Bet - ₹{getTotalAmount()}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default ForecastHousePage;




