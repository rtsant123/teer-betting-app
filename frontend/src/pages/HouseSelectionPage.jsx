import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';

const HouseSelectionPage = () => {
  const navigate = useNavigate();
  const { balance } = useWallet();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bet/houses-with-rounds');
      setHouses(response.data);
    } catch (error) {
      console.error('Error fetching houses:', error);
      toast.error('Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePlayTypes = (houseData) => {
    const gameTypes = houseData.game_types || {};
    const available = [];
    
    if (gameTypes.FR?.available) available.push('FR');
    if (gameTypes.SR?.available) available.push('SR');
    if (gameTypes.FORECAST?.available) available.push('FORECAST');
    
    return available;
  };

  const getTimeUntilClose = (houseData) => {
    const gameTypes = houseData.game_types || {};
    let earliestClose = null;
    
    // Check FR
    if (gameTypes.FR?.available && houseData.rounds?.FR?.betting_closes_at) {
      earliestClose = new Date(houseData.rounds.FR.betting_closes_at);
    }
    
    // Check SR
    if (gameTypes.SR?.available && houseData.rounds?.SR?.betting_closes_at) {
      const srClose = new Date(houseData.rounds.SR.betting_closes_at);
      if (!earliestClose || srClose < earliestClose) {
        earliestClose = srClose;
      }
    }
    
    if (!earliestClose) return 'N/A';
    
    const now = new Date();
    const diff = earliestClose - now;
    
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
          <p className="text-gray-600">Loading houses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <HeaderBar />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">🏠 All Open Houses</h1>
              <p className="text-sm text-gray-600">Live betting rounds with deadlines</p>
            </div>
            <div className="flex items-center bg-green-50 rounded-lg px-2 py-1">
              <div className="text-green-800 font-semibold text-sm">₹{balance?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-20">
        {houses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Open Houses</h3>
              <p className="text-gray-600 mb-4">There are currently no houses with active betting rounds.<br/>New rounds start every few hours!</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                🔄 Refresh
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {houses.map(houseData => {
              const availablePlayTypes = getAvailablePlayTypes(houseData);
              const timeUntilClose = getTimeUntilClose(houseData);
              
              if (availablePlayTypes.length === 0) return null;
              
              return (
                <Card 
                  key={houseData.house.id}
                  className="cursor-pointer transition-all hover:shadow-lg bg-white border border-gray-200 hover:border-blue-300"
                  onClick={() => navigate(`/house/${houseData.house.id}`)}
                >
                  <CardContent className="p-0">
                    {/* House Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold mb-1">{houseData.house.name}</h3>
                          <div className="flex items-center text-gray-300 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{houseData.house.location}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            LIVE
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Game Info */}
                    <div className="p-4">
                      {/* Deadline Banner */}
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Clock className="w-5 h-5 text-orange-600 mr-2" />
                            <div>
                              <div className="text-xs text-orange-600 font-medium">BETTING CLOSES IN</div>
                              <div className="text-lg font-bold text-orange-800">{timeUntilClose}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Available Games</div>
                            <div className="font-semibold text-gray-900">{availablePlayTypes.length} Active</div>
                          </div>
                        </div>
                      </div>

                      {/* Available Play Types */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-2 font-medium">ACTIVE GAME MODES</div>
                        <div className="flex flex-wrap gap-2">
                          {availablePlayTypes.map(playType => (
                            <span 
                              key={playType}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                playType === 'FR' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                playType === 'SR' ? 'bg-green-100 text-green-800 border border-green-200' :
                                'bg-purple-100 text-purple-800 border border-purple-200'
                              }`}
                            >
                              {playType === 'FR' ? '🎯 First Round' : 
                               playType === 'SR' ? '🎲 Second Round' : '🔮 Forecast'}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Tap to explore play modes</span>
                          <div className="flex items-center text-blue-600">
                            <span className="text-sm font-medium mr-1">Play Now</span>
                            <Target className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default HouseSelectionPage;
