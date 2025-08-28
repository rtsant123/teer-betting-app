import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Target, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';
import api from '../services/api';

const PlayTypeSelectionPage = () => {
  const navigate = useNavigate();
  const { houseId } = useParams();
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

  const getPlayTypeInfo = (playType) => {
    const gameTypes = houseData?.game_types || {};
    const rounds = houseData?.rounds || {};
    
    switch (playType) {
      case 'FR':
        return {
          name: 'First Round',
          description: 'Play the opening round',
          icon: '🥇',
          available: gameTypes.FR?.available || false,
          modes: ['Direct (00-99)', 'House (0-9)', 'Ending (0-9)'],
          payoutRates: {
            direct: houseData?.house?.fr_direct_payout_rate || 80,
            house: houseData?.house?.fr_house_payout_rate || 8,
            ending: houseData?.house?.fr_ending_payout_rate || 8
          },
          closesAt: rounds.FR?.betting_closes_at,
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'SR':
        return {
          name: 'Second Round',
          description: 'Play the closing round',
          icon: '🥈',
          available: gameTypes.SR?.available || false,
          modes: ['Direct (00-99)', 'House (0-9)', 'Ending (0-9)'],
          payoutRates: {
            direct: houseData?.house?.sr_direct_payout_rate || 80,
            house: houseData?.house?.sr_house_payout_rate || 8,
            ending: houseData?.house?.sr_ending_payout_rate || 8
          },
          closesAt: rounds.SR?.betting_closes_at,
          color: 'from-green-500 to-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'FORECAST':
        return {
          name: 'Forecast',
          description: 'Predict both FR & SR outcomes',
          icon: '🔮',
          available: gameTypes.FORECAST?.available || false,
          modes: ['Direct (FR+SR)', 'House (FR+SR)', 'Ending (FR+SR)'],
          payoutRates: {
            direct: houseData?.house?.forecast_direct_payout_rate || 400,
            house: houseData?.house?.forecast_house_payout_rate || 40,
            ending: houseData?.house?.forecast_ending_payout_rate || 40
          },
          closesAt: rounds.FR?.betting_closes_at, // Forecast depends on FR deadline
          color: 'from-purple-500 to-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading play types...</p>
        </div>
      </div>
    );
  }

  if (!houseData) {
    return null;
  }

  const availablePlayTypes = ['FR', 'SR', 'FORECAST'].filter(type => {
    const info = getPlayTypeInfo(type);
    return info && info.available;
  });

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
              <h1 className="text-lg font-semibold text-gray-800">Play Types</h1>
              {houseData && <p className="text-sm text-gray-600">{houseData.house.name}</p>}
            </div>
            
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Select Play Type</h2>
          <p className="text-gray-600">Choose your preferred game mode</p>
        </div>

        {availablePlayTypes.length === 0 ? (
          <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="text-center py-12 px-4">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Play Types</h3>
              <p className="text-gray-600 mb-6">This house currently has no active rounds</p>
              <button 
                onClick={() => navigate('/houses')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Choose Another House
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {availablePlayTypes.map(playType => {
              const info = getPlayTypeInfo(playType);
              const timeUntilClose = getTimeUntilClose(info.closesAt);
              
              return (
                <div 
                  key={playType}
                  className="w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                  onClick={() => navigate(`/house/${houseId}/playtype/${playType}`)}
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${info.color} p-4 text-white rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">{info.icon}</div>
                        <div>
                          <h3 className="text-lg font-bold">{info.name}</h3>
                          <p className="text-white/80 text-sm">{info.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                          {timeUntilClose === 'Closed' ? 'CLOSED' : 'LIVE'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-gray-500">Closes in</div>
                          <div className="font-semibold text-gray-900 text-sm">{timeUntilClose}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-gray-500">Max Payout</div>
                          <div className="font-semibold text-gray-900 text-sm">{info.payoutRates.direct}x</div>
                        </div>
                      </div>
                    </div>

                    {/* Available Modes */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Available Modes:</div>
                      <div className="space-y-2">
                        {info.modes.map((mode, index) => {
                          const modeType = ['direct', 'house', 'ending'][index];
                          return (
                            <div key={mode} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <span className="text-sm text-gray-700">{mode}</span>
                              <span className="text-sm font-semibold text-green-600">
                                {info.payoutRates[modeType]}x
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">3 game modes available</span>
                        <div className="flex items-center text-blue-600">
                          <span className="text-sm font-medium mr-1">Select Mode</span>
                          <Target className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default PlayTypeSelectionPage;
