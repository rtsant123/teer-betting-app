import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Minus, DollarSign, Dice1 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';

const FREndingPage = () => {
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
      
      if (!house.game_types?.FR?.available) {
        toast.error('First Round is not available');
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

  const addNumber = () => {
    if (!currentNumber || currentNumber.length !== 1) {
      toast.error('Please enter a single digit (0-9)');
      return;
    }
    
    const digit = parseInt(currentNumber);
    if (digit < 0 || digit > 9) {
      toast.error('Ending digit must be between 0 and 9');
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
    const payoutRate = houseData?.house?.fr_ending_payout_rate || 8;
    // Only ONE number can win in a game, so show the maximum possible payout from a single bet
    if (selectedNumbers.length === 0) return 0;
    const maxSingleBetAmount = Math.max(...selectedNumbers.map(item => item.amount));
    return maxSingleBetAmount * payoutRate;
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
      
      if (!houseData.game_types?.FR?.available) {
        throw new Error('First Round betting is not available for this house');
      }

      const frRound = houseData.rounds?.FR;
      if (!frRound || !frRound.id) {
        throw new Error('No active FR round found for this house');
      }

      const endingNumbers = {};
      selectedNumbers.forEach(item => {
        endingNumbers[item.number] = item.amount;
      });

      const betData = {
        house_id: parseInt(houseId),
        fr_ending: endingNumbers  // Changed to use new schema
      };

      console.log('Sending FR ending bet data:', betData);

      await api.post('/bet/ticket', betData);
      
      toast.success('FR ending bet placed successfully!');
      
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!houseData) {
    return null;
  }

  const payoutRate = houseData?.house?.fr_ending_payout_rate || 8;
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">FR Ending</h1>
              {houseData && <p className="text-sm text-gray-600">{houseData.house.name}</p>}
            </div>
            
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Round Info Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Dice1 className="w-6 h-6 mr-3" />
              <div>
                <div className="font-bold text-lg">FR Ending</div>
                <div className="text-indigo-100 text-sm">First round ending digit</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl">{payoutRate}x</div>
              <div className="text-indigo-100 text-xs">Payout</div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-indigo-400 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-sm">Closes in: {timeUntilClose}</span>
            </div>
            <div className="bg-indigo-400 px-2 py-1 rounded text-xs font-semibold">
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
            <h3 className="text-lg font-semibold text-gray-800">Quick Select Ending Digit</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentNumber(num.toString())}
                  className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                    currentNumber === num.toString()
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Number Input */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Add Ending Number</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Ending Digit (0-9)</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={currentNumber}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.length <= 1 && (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9))) {
                        setCurrentNumber(value);
                      }
                    }}
                    placeholder="3"
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full h-12 px-3 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <button 
                onClick={addNumber}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                disabled={!currentNumber || !currentAmount}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ending Number
              </button>
            </div>
          </div>
        </div>

        {/* Selected Numbers */}
        {selectedNumbers.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Selected Numbers ({selectedNumbers.length})</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {selectedNumbers.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">Ending: {item.number}</div>
                      <div className="text-sm text-gray-600">₹{item.amount}</div>
                    </div>
                    <button
                      onClick={() => removeNumber(item.id)}
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
        {selectedNumbers.length > 0 && (
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
                    💡 <strong>Note:</strong> Only one number can win per game. Amount shown is maximum possible payout.
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
                      Place Bet - ₹{getTotalAmount()}
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

export default FREndingPage;
