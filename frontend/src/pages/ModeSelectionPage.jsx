import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Target, Clock, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';

const ModeSelectionPage = () => {
  const navigate = useNavigate();
  const { houseId, playType } = useParams();
  const { balance } = useWallet();
  const [houseData, setHouseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHouseData = async () => {
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
    };

    fetchHouseData();
  }, [houseId, navigate]);

  const getPlayTypeInfo = () => {
    const gameTypes = houseData?.game_types || {};
    const rounds = houseData?.rounds || {};
    
    switch (playType) {
      case 'FR':
        return {
          name: 'First Round',
          icon: '🥇',
          available: gameTypes.FR?.available || false,
          closesAt: rounds.FR?.betting_closes_at,
          color: 'from-blue-500 to-blue-600',
          payoutRates: {
            direct: houseData?.house?.fr_direct_payout_rate || 80,
            house: houseData?.house?.fr_house_payout_rate || 8,
            ending: houseData?.house?.fr_ending_payout_rate || 8
          }
        };
      case 'SR':
        return {
          name: 'Second Round',
          icon: '🥈',
          available: gameTypes.SR?.available || false,
          closesAt: rounds.SR?.betting_closes_at,
          color: 'from-green-500 to-green-600',
          payoutRates: {
            direct: houseData?.house?.sr_direct_payout_rate || 80,
            house: houseData?.house?.sr_house_payout_rate || 8,
            ending: houseData?.house?.sr_ending_payout_rate || 8
          }
        };
      case 'FORECAST':
        return {
          name: 'Forecast',
          icon: '🔮',
          available: gameTypes.FORECAST?.available || false,
          closesAt: rounds.FR?.betting_closes_at, // Forecast depends on FR deadline
          color: 'from-purple-500 to-purple-600',
          payoutRates: {
            direct: houseData?.house?.forecast_direct_payout_rate || 400,
            house: houseData?.house?.forecast_house_payout_rate || 40,
            ending: houseData?.house?.forecast_ending_payout_rate || 40
          }
        };
      default:
        return null;
    }
  };

  const getModeInfo = (mode) => {
    const playTypeInfo = getPlayTypeInfo();
    
    switch (mode) {
      case 'direct':
        return {
          name: 'Direct',
          description: playType === 'FORECAST' ? 'Predict exact FR & SR numbers (00-99)' : 'Predict exact 2-digit number (00-99)',
          icon: '🎯',
          range: playType === 'FORECAST' ? 'FR: 00-99, SR: 00-99' : '00-99',
          payout: playTypeInfo?.payoutRates.direct || 80,
          color: 'from-red-500 to-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          example: playType === 'FORECAST' ? 'Example: FR=23, SR=45' : 'Example: 23'
        };
      case 'house':
        return {
          name: 'House',
          description: playType === 'FORECAST' ? 'Predict FR & SR house digits (0-9)' : 'Predict house digit (0-9)',
          icon: '🏠',
          range: playType === 'FORECAST' ? 'FR: 0-9, SR: 0-9' : '0-9',
          payout: playTypeInfo?.payoutRates.house || 8,
          color: 'from-orange-500 to-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          example: playType === 'FORECAST' ? 'Example: FR=2, SR=4' : 'Example: 2'
        };
      case 'ending':
        return {
          name: 'Ending',
          description: playType === 'FORECAST' ? 'Predict FR & SR ending digits (0-9)' : 'Predict ending digit (0-9)',
          icon: '🎲',
          range: playType === 'FORECAST' ? 'FR: 0-9, SR: 0-9' : '0-9',
          payout: playTypeInfo?.payoutRates.ending || 8,
          color: 'from-indigo-500 to-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          example: playType === 'FORECAST' ? 'Example: FR=3, SR=5' : 'Example: 3'
        };
      default:
        return null;
    }
  };

  const getTimeUntilClose = (closesAt) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderBar />
        <div className="flex items-center justify-center min-h-screen -mt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading game modes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!houseData) {
    return null;
  }

  const playTypeInfo = getPlayTypeInfo();
  
  if (!playTypeInfo || !playTypeInfo.available) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderBar />
        
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
                <h1 className="text-lg font-semibold text-gray-800">Play Type Unavailable</h1>
              </div>

              <div className="w-9"></div>
            </div>
          </div>
        </div>
        
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Play Type Not Available</h3>
          <p className="text-gray-600 mb-6">This play type is currently not active</p>
          <button 
            onClick={() => navigate(`/house/${houseId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Choose Another Play Type
          </button>
        </div>
        
        <BottomNav />
      </div>
    );
  }

  const modes = ['direct', 'house', 'ending'];
  const timeUntilClose = getTimeUntilClose(playTypeInfo.closesAt);

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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">{playTypeInfo.name} Modes</h1>
              <p className="text-sm text-gray-600">{houseData.house.name}</p>
            </div>
            
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Game Type Info Banner */}
      <div className={`bg-gradient-to-r ${playTypeInfo.color} text-white`}>
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl mr-3">{playTypeInfo.icon}</div>
              <div>
                <div className="font-bold text-lg">{playTypeInfo.name}</div>
                <div className="text-white/80 text-sm">{playTypeInfo.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl">{playTypeInfo.payout}x</div>
              <div className="text-white/80 text-xs">Max Payout</div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-sm">Closes in: {timeUntilClose}</span>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded text-xs font-semibold">
              {timeUntilClose === 'Closed' ? 'CLOSED' : 'LIVE'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Select Game Mode</h2>
          <p className="text-gray-600">Choose your preferred betting mode</p>
        </div>

        <div className="space-y-4">
          {modes.map(mode => {
            const modeInfo = getModeInfo(mode);
            
            return (
              <div 
                key={mode}
                className="w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                onClick={() => navigate(`/house/${houseId}/playtype/${playType}/mode/${mode}`)}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${modeInfo.color} p-4 text-white rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">{modeInfo.icon}</div>
                      <div>
                        <h3 className="text-lg font-bold">{modeInfo.name}</h3>
                        <p className="text-white/80 text-sm">{modeInfo.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                        {modeInfo.payout}x
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <Target className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Range</div>
                        <div className="font-semibold text-gray-900 text-sm">{modeInfo.range}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Payout</div>
                        <div className="font-semibold text-green-600 text-sm">{modeInfo.payout}x</div>
                      </div>
                    </div>
                  </div>

                  {/* Example */}
                  <div className={`${modeInfo.bgColor} p-3 rounded-lg mb-4`}>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">💡 {modeInfo.example}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tap to start playing</span>
                      <div className="flex items-center text-blue-600">
                        <span className="text-sm font-medium mr-1">Play Now</span>
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default ModeSelectionPage;
