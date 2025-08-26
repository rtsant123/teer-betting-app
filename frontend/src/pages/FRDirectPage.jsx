import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, DollarSign, Minus, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';
import { useWallet } from '../contexts/WalletContext';

const FRDirectPage = () => {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const { balance, fetchWalletInfo } = useWallet();
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState('');
  const [currentAmount, setCurrentAmount] = useState('10');
  const [placing, setPlacing] = useState(false);
  const [houseData, setHouseData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    if (!currentNumber || currentNumber.length > 2) {
      toast.error('Please enter a valid 2-digit number (00-99)');
      return;
    }
    
    const number = parseInt(currentNumber);
    if (number < 0 || number > 99) {
      toast.error('Number must be between 00 and 99');
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
    
    // Pad with leading zero if needed
    const paddedNumber = currentNumber.padStart(2, '0');
    
    const existingIndex = selectedNumbers.findIndex(item => item.number === paddedNumber);
    if (existingIndex >= 0) {
      const updated = [...selectedNumbers];
      updated[existingIndex].amount = amount;
      setSelectedNumbers(updated);
    } else {
      setSelectedNumbers(prev => [...prev, {
        id: Date.now(),
        number: paddedNumber,
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
    const payoutRate = houseData?.house?.fr_direct_payout_rate || 70;
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

      const directNumbers = {};
      selectedNumbers.forEach(item => {
        directNumbers[item.number] = item.amount;
      });

      const betData = {
        house_id: parseInt(houseId),
        fr_direct: directNumbers  // Only include the field we're using
      };

      console.log('Sending bet data:', betData);

      await api.post('/bet/ticket', betData);
      
      toast.success('FR direct bet placed successfully!');
      
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
    const closeTime = new Date(houseData.rounds.FR.betting_closes_at);
    const diff = closeTime - now;
    
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading house data...</p>
        </div>
      </div>
    );
  }

  if (!houseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">House not found</p>
        </div>
      </div>
    );
  }

  const timeUntilClose = getTimeUntilClose();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar />

      {/* Game Title Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="text-lg font-semibold text-gray-800">FR Direct Betting</h1>
              <p className="text-sm text-gray-600">{houseData.house.name}</p>
            </div>
            
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Round Info Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm opacity-90">Closes in</span>
              </div>
              <div className="text-lg font-semibold">{timeUntilClose}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Payout Rate</div>
              <div className="text-lg font-semibold">{houseData?.house?.fr_direct_payout_rate || 80}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-40 space-y-6">
        {/* Number Input Section */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Add Numbers</h3>
            <p className="text-sm text-gray-600">Enter 2-digit numbers (00-99)</p>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number</label>
                <input
                  type="number"
                  value={currentNumber}
                  onChange={(e) => setCurrentNumber(e.target.value)}
                  placeholder="00-99"
                  min="0"
                  max="99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="Amount"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={addNumber}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Number
            </button>
          </div>
        </div>

        {/* Selected Numbers List */}
        {selectedNumbers.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Selected Numbers ({selectedNumbers.length})
                </h3>
                <button
                  onClick={() => setSelectedNumbers([])}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                {selectedNumbers.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">Number: {item.number}</div>
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
              <h3 className="text-lg font-semibold text-gray-800">Summary</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-lg font-semibold text-gray-800">₹{getTotalAmount()}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Potential Win</div>
                  <div className="text-lg font-semibold text-green-600">₹{getTotalPotentialPayout()}</div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 <strong>Note:</strong> Only one number can win per game. Amount shown is maximum possible payout.
                </p>
              </div>
              
              <button 
                onClick={placeBets}
                disabled={placing || getTotalAmount() > (balance || 0)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold text-base sm:text-lg transition-colors disabled:opacity-50 flex items-center justify-center"
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
        )}

        {/* Instructions */}
        <div className="w-full bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Play</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="font-semibold text-blue-600 mr-2">1.</span>
                <span>Enter any 2-digit number from 00 to 99</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-blue-600 mr-2">2.</span>
                <span>Set your bet amount for each number</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-blue-600 mr-2">3.</span>
                <span>Add multiple numbers with different amounts</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-blue-600 mr-2">4.</span>
                <span>If your number matches the result, you win {houseData?.house?.fr_direct_payout_rate || 80}x your bet!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default FRDirectPage;
