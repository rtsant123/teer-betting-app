import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Minus, DollarSign, X, Star, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';
import GameDateTimeDisplay from '../components/common/GameDateTimeDisplay';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';

const ForecastDirectPage = () => {
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
    console.log('addCombination called with:', { frInput, srInput, amountInput });
    
    if (!frInput || frInput === '') {
      toast.error('Please enter a FR number (0-99)');
      return;
    }
    
    if (!srInput || srInput === '') {
      toast.error('Please enter a SR number (0-99)');
      return;
    }
    
    const fr = parseInt(frInput);
    const sr = parseInt(srInput);
    
    if (fr < 0 || fr > 99 || sr < 0 || sr > 99) {
      toast.error('Numbers must be between 00 and 99');
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
    
    const combination = `${frInput.padStart(2, '0')}-${srInput.padStart(2, '0')}`;
    
    // Check if combination already exists
    const existingIndex = selectedCombinations.findIndex(item => item.combination === combination);
    if (existingIndex >= 0) {
      const updated = [...selectedCombinations];
      updated[existingIndex].amount = amount;
      setSelectedCombinations(updated);
    } else {
      console.log('Creating new combination with:', { frInput, srInput, amount });
      setSelectedCombinations(prev => [...prev, {
        id: Date.now(),
        combination: combination,
        fr_number: fr,
        sr_number: sr,
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
    return selectedCombinations.reduce((sum, item) => sum + item.amount, 0);
  };

  const getTotalPotentialPayout = () => {
    if (selectedCombinations.length === 0) return 0;
    const payoutRate = houseData?.house?.forecast_direct_payout_rate || 400;
    // Only ONE combination can win, so show max possible payout for the highest bet
    const maxSingleBet = Math.max(...selectedCombinations.map(item => item.amount));
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

      // For forecast betting, we need to use the forecast round ID, not individual FR/SR rounds
      const forecastRound = houseData.rounds?.FORECAST;
      if (!forecastRound || !forecastRound.id) {
        throw new Error('No active forecast round found for this house');
      }

      const forecastPairs = selectedCombinations.map(combo => {
        console.log('Processing combo:', combo);
        console.log('combo.fr_number:', combo.fr_number, 'type:', typeof combo.fr_number);
        console.log('combo.sr_number:', combo.sr_number, 'type:', typeof combo.sr_number);
        
        // Numbers are already parsed when stored
        const frNum = combo.fr_number;
        const srNum = combo.sr_number;
        
        console.log('Using directly - frNum:', frNum, 'srNum:', srNum);
        
        // Validate that both numbers are valid
        if (frNum === null || frNum === undefined || srNum === null || srNum === undefined) {
          console.error('Invalid numbers detected:', { frNum, srNum, combo });
          toast.error('Invalid combination detected');
          return null;
        }
        
        return {
          fr_number: frNum,
          sr_number: srNum,
          amount: parseFloat(combo.amount)
        };
      }).filter(Boolean); // Remove null entries

      console.log('Final forecastPairs:', forecastPairs);

      const betData = {
        house_id: parseInt(houseId),
        forecast_pairs: forecastPairs,
        forecast_type: "direct"  // Add the required forecast type
      };

      console.log('Sending forecast direct bet data:', betData);

      const response = await api.post('/bet/ticket', betData);
      
      await response.data; // Process response
      toast.success('Forecast bet placed successfully!');
      
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

  const payoutRate = houseData?.house?.forecast_direct_payout_rate || 400;
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Forecast Direct</h1>
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
          gameType="Forecast Direct"
          houseName={houseData.house.name}
          compact={true}
          showGameDay={false}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Combination Input */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Add Forecast Combination</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">FR Number (00-99)</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={frInput}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.length <= 2) {
                        setFrInput(value);
                      }
                    }}
                    placeholder="23"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">SR Number (00-99)</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={srInput}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.length <= 2) {
                        setSrInput(value);
                      }
                    }}
                    placeholder="45"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="10"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <button 
                onClick={addCombination}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                disabled={!frInput || !srInput || !amountInput}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Forecast Combination
              </button>
            </div>
          </div>
        </div>
        {/* Selected Combinations */}
        {selectedCombinations.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Selected Combinations ({selectedCombinations.length})</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {selectedCombinations.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{item.combination}</div>
                      <div className="text-sm text-gray-600">₹{item.amount}</div>
                    </div>
                    <button
                      onClick={() => removeCombination(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
          <div className="w-full bg-white rounded-lg shadow-sm">
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
                  <span className="font-bold text-lg text-green-600">₹{getTotalPotentialPayout().toLocaleString()}</span>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Note:</strong> Only ONE combination can win per round.
                  </p>
                </div>
                
                <button 
                  onClick={placeBets}
                  disabled={placing || getTotalAmount() > (balance || 0)}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 px-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center min-h-[48px] shadow-md hover:shadow-lg"
                >
                  {placing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
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
      
      {/* Bottom spacing for BottomNav */}
      <div className="h-20"></div>
      
      <BottomNav />
    </div>
  );
};

export default ForecastDirectPage;
