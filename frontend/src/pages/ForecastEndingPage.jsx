import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dice1, Clock, Plus, Minus, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';

const ForecastEndingPage = () => {
  const navigate = useNavigate();
  const { houseId } = useParams();
  const { balance, fetchWalletInfo } = useWallet();
  
  // State
  const [houseData, setHouseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [frInput, setFrInput] = useState('');
  const [srInput, setSrInput] = useState('');
  const [amountInput, setAmountInput] = useState('10');
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
  }, [houseId, fetchHouseData]);

  const addCombination = () => {
    console.log('🔍 Add Combination Called:', { 
      frInput, 
      srInput, 
      amountInput, 
      currentCombinations: selectedCombinations.length 
    });

    if (!frInput || frInput.length !== 1) {
      toast.error('Please enter a single digit for FR ending (0-9)');
      return;
    }
    
    if (!srInput || srInput.length !== 1) {
      toast.error('Please enter a single digit for SR ending (0-9)');
      return;
    }
    
    const fr = parseInt(frInput);
    const sr = parseInt(srInput);
    
    if (fr < 0 || fr > 9 || sr < 0 || sr > 9) {
      toast.error('Ending digits must be between 0 and 9');
      return;
    }
    
    const amount = parseFloat(amountInput);
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
    setAmountInput('10');
  };

  const removeCombination = (id) => {
    setSelectedCombinations(prev => prev.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    const total = selectedCombinations.reduce((sum, item) => sum + item.amount, 0);
    return total;
  };

  const getTotalPotentialPayout = () => {
    const payoutRate = houseData?.house?.forecast_ending_payout_rate || 40;
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
        fr_number: parseInt(combo.frInput),
        sr_number: parseInt(combo.srInput),
        amount: parseFloat(combo.amount)
      }));

      const betData = {
        house_id: parseInt(houseId),
        forecast_pairs: forecastPairs,
        forecast_type: "ending"  // Add forecast type for ending
      };

      await api.post('/bet/ticket', betData);
      
      toast.success('Forecast ending bet placed successfully!');
      
      setSelectedCombinations([]);
      setFrInput('');
      setSrInput('');
      setAmountInput('10');
      
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

  const payoutRate = houseData?.house?.forecast_ending_payout_rate || 40;
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Forecast Ending</h1>
              {houseData && <p className="text-sm text-gray-600">{houseData.house.name}</p>}
            </div>
            
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Round Info Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Dice1 className="w-6 h-6 mr-3" />
              <div>
                <div className="font-bold text-lg">Forecast Ending</div>
                <div className="text-purple-100 text-sm">Predict FR & SR ending digits</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl">{payoutRate}x</div>
              <div className="text-purple-100 text-xs">Payout</div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-purple-400 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-sm">Closes in: {timeUntilClose}</span>
            </div>
            <div className="bg-purple-400 px-2 py-1 rounded text-xs font-semibold">
              LIVE
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-40 space-y-6">
        {/* Quick Selection Grid */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Quick Select Ending Digits</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">FR Ending (0-9)</label>
                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setFrInput(num.toString())}
                      className={`h-10 rounded font-bold text-sm transition-colors ${
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">SR Ending (0-9)</label>
                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setSrInput(num.toString())}
                      className={`h-10 rounded font-bold text-sm transition-colors ${
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
            <h3 className="text-lg font-semibold text-gray-800">Add Ending Combination</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  FR Ending (0-9)
                </label>
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
                  placeholder="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  SR Ending (0-9)
                </label>
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
                  placeholder="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <button 
              onClick={addCombination}
              disabled={!frInput || !srInput || !amountInput}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center ${
                !frInput || !srInput || !amountInput
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 active:transform active:scale-95'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Ending Combination
            </button>
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
                Selected Ending Combinations ({selectedCombinations.length})
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

        {/* Betting Summary */}
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

export default ForecastEndingPage;