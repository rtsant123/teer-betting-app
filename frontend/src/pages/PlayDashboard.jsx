import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import { betService } from '../services/bet';
import roundsService from '../services/rounds';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import BannerCarousel from '../components/common/BannerCarousel';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
import GameDateTimeDisplay from '../components/common/GameDateTimeDisplay';
import { 
  Target, 
  Home, 
  Trophy,
  ChevronRight,
  Users,
  Clock,
  PlayCircle,
  MapPin,
  AlertCircle,
  Timer
} from 'lucide-react';

// Utility function to check if deadline is close (less than 30 minutes)
const isDeadlineClose = (deadline) => {
  if (!deadline) return false;
  const now = new Date();
  const deadlineTime = new Date(deadline);
  const diff = deadlineTime.getTime() - now.getTime();
  return diff <= 30 * 60 * 1000 && diff > 0; // 30 minutes in milliseconds
};

// Professional Stopwatch Component with Mobile-First Design
const StopwatchTimer = ({ deadline, label = "Closes in", className = "", isMobile = false }) => {
  const [timeData, setTimeData] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const updateTimer = () => {
      if (!deadline) {
        setTimeData({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const now = new Date();
      const deadlineTime = new Date(deadline);
      const diff = deadlineTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeData({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeData({ hours, minutes, seconds, isExpired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  const getTimerColor = () => {
    if (timeData.isExpired) return 'text-red-600 bg-red-100';
    if (timeData.hours === 0 && timeData.minutes < 30) return 'text-red-500 bg-red-50';
    if (timeData.hours === 0) return 'text-orange-500 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getTimerBorder = () => {
    if (timeData.isExpired) return 'border-red-300';
    if (timeData.hours === 0 && timeData.minutes < 30) return 'border-red-300';
    if (timeData.hours === 0) return 'border-orange-300';
    return 'border-green-300';
  };

  const getPulseClass = () => {
    if (timeData.isExpired) return 'animate-pulse';
    if (timeData.hours === 0 && timeData.minutes < 30) return 'animate-pulse';
    return '';
  };

  if (timeData.isExpired) {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border-2 ${getTimerBorder()} ${getTimerColor()} ${getPulseClass()} ${className}`}>
        <AlertCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
        <span className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>CLOSED</span>
      </div>
    );
  }

  if (isMobile) {
    // Compact mobile version
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${getTimerBorder()} ${getTimerColor()} ${getPulseClass()} ${className}`}>
        <Timer className="w-3 h-3" />
        <div className="flex items-center gap-0.5 font-mono font-bold text-sm">
          {timeData.hours > 0 && (
            <>
              <span>{timeData.hours.toString().padStart(2, '0')}</span>
              <span className="opacity-60">h</span>
              <span className="mx-0.5">:</span>
            </>
          )}
          <span>{timeData.minutes.toString().padStart(2, '0')}</span>
          <span className="opacity-60">m</span>
          <span className="mx-0.5">:</span>
          <span>{timeData.seconds.toString().padStart(2, '0')}</span>
          <span className="opacity-60">s</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 ${getTimerBorder()} ${getTimerColor()} ${getPulseClass()} ${className}`}>
      <div className="flex items-center gap-1 text-xs font-medium opacity-75">
        <Timer className="w-3 h-3" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1 font-mono font-bold text-lg">
        <div className="flex flex-col items-center">
          <span className="text-xl leading-none">{timeData.hours.toString().padStart(2, '0')}</span>
          <span className="text-xs opacity-60">H</span>
        </div>
        <span className="text-xl leading-none mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-xl leading-none">{timeData.minutes.toString().padStart(2, '0')}</span>
          <span className="text-xs opacity-60">M</span>
        </div>
        <span className="text-xl leading-none mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-xl leading-none">{timeData.seconds.toString().padStart(2, '0')}</span>
          <span className="text-xs opacity-60">S</span>
        </div>
      </div>
    </div>
  );
};

// Modern Results Carousel Component with Mobile-First Design (Homepage - shows all results)
const ModernResultsCarousel = ({ results, onViewAll }) => {
  const scrollerRef = useRef(null);

  // Show ALL results (both pending today's and completed past) for homepage - latest date first
  const allResults = results ? [...results].sort((a, b) => {
    // Sort by date descending (latest first), with today's results always first
    if (a.is_today && !b.is_today) return -1;
    if (!a.is_today && b.is_today) return 1;
    
    // Parse dates for comparison
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  }) : [];

  if (!allResults || allResults.length === 0) {
    return (
      <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium text-sm">No results available</p>
        <p className="text-xs text-gray-500 mt-1">Check back soon for updates</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile swipe hint */}
      <div className="mb-3 text-center">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          ← Swipe to see more →
        </span>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {allResults
          .slice(0, 8) // Show top 8 results including waiting and completed
          .map((result, idx) => {
            // Parse DD/MM/YYYY date format from the new API
            const gameDate = result.date;
            const formatGameDate = (dateStr) => {
              if (!dateStr) return 'Recent';
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString();
              }
              return dateStr;
            };

            return (
              <div
                key={`${result.house_name}-${result.date}-${idx}`}
                className="min-w-[260px] snap-start"
              >
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">
                        {result.house_name}
                      </h4>
                      <div className="flex items-center text-xs text-gray-600 mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="truncate">
                          {result.house_location || 'Location'} • {formatGameDate(gameDate)}
                        </span>
                      </div>
                      {result.is_today && result.deadline && (
                        <div className="mt-2">
                          <StopwatchTimer 
                            deadline={result.deadline}
                            isMobile={true}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.is_today ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {result.is_today ? 'Live' : 'Complete'}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-between">
                    {/* FR Result */}
                    <div className="flex-1 text-center">
                      <div className="text-xs font-medium text-orange-600 mb-1">FR</div>
                      <div className="bg-orange-50 rounded-lg p-2 border border-orange-100">
                        <span className="text-lg font-bold text-orange-900">
                          {(result.is_today && (!result.fr_result && result.fr_result !== 0)) ? 'XX' : 
                            (result.fr_result !== null && result.fr_result !== undefined ? 
                              String(result.fr_result).padStart(2, '0') : 'XX')}
                        </span>
                      </div>
                      {result.fr_time && (
                        <div className="text-xs text-gray-500 mt-1">{result.fr_time}</div>
                      )}
                    </div>
                    
                    {/* VS Divider */}
                    <div className="flex items-center justify-center px-1">
                      <div className="text-xs text-gray-400 font-medium">VS</div>
                    </div>
                    
                    {/* SR Result */}
                    <div className="flex-1 text-center">
                      <div className="text-xs font-medium text-purple-600 mb-1">SR</div>
                      <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                        <span className="text-lg font-bold text-purple-900">
                          {(result.is_today && (!result.sr_result && result.sr_result !== 0)) ? 'XX' : 
                            (result.sr_result !== null && result.sr_result !== undefined ? 
                              String(result.sr_result).padStart(2, '0') : 'XX')}
                        </span>
                      </div>
                      {result.sr_time && (
                        <div className="text-xs text-gray-500 mt-1">{result.sr_time}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

// Completed Results Component (Results Tab - shows only completed results)
const CompletedResultsGrid = ({ results }) => {
  // Show only COMPLETED results (not today's pending) - latest date first
  const completedResults = results ? [...results]
    .filter(result => !result.is_today) // Only show completed past results
    .sort((a, b) => {
      // Parse dates for comparison
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          return new Date(year, month - 1, day);
        }
        return new Date(dateStr);
      };
      
      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
    }) : [];

  if (!completedResults || completedResults.length === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No completed results available</p>
        <p className="text-xs text-gray-500 mt-2">Past game results will appear here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {completedResults.map((result, idx) => {
        const gameDate = result.date;
        const formatGameDate = (dateStr) => {
          if (!dateStr) return 'Recent';
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString();
          }
          return dateStr;
        };

        return (
          <div
            key={`${result.house_name}-${result.date}-${idx}`}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-900 text-sm truncate">
                  {result.house_name}
                </h4>
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                  <span className="truncate">
                    {result.house_location || 'Location'} • {formatGameDate(gameDate)}
                  </span>
                </div>
              </div>
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Complete
              </div>
            </div>

            <div className="flex gap-2 justify-between">
              {/* FR Result */}
              <div className="flex-1 text-center">
                <div className="text-xs font-medium text-orange-600 mb-1">FR</div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <span className="text-xl font-bold text-orange-900">
                    {(result.fr_result !== null && result.fr_result !== undefined) ? 
                      String(result.fr_result).padStart(2, '0') : 'XX'}
                  </span>
                </div>
                {result.fr_time && (
                  <div className="text-xs text-gray-500 mt-1">{result.fr_time}</div>
                )}
              </div>
              
              {/* VS Divider */}
              <div className="flex items-center justify-center px-2">
                <div className="text-sm text-gray-400 font-medium">VS</div>
              </div>
              
              {/* SR Result */}
              <div className="flex-1 text-center">
                <div className="text-xs font-medium text-purple-600 mb-1">SR</div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <span className="text-xl font-bold text-purple-900">
                    {(result.sr_result !== null && result.sr_result !== undefined) ? 
                      String(result.sr_result).padStart(2, '0') : 'XX'}
                  </span>
                </div>
                {result.sr_time && (
                  <div className="text-xs text-gray-500 mt-1">{result.sr_time}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PlayDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { fetchWalletInfo } = useWallet();
  
  const playMode = searchParams.get('mode') === 'play';
  
  const [activeHouses, setActiveHouses] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [activeTab, setActiveTab] = useState('houses');
  const [myPlays, setMyPlays] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [housesResponse, resultsResponse] = await Promise.all([
        betService.getHousesWithActiveRounds().catch((error) => {
          console.error('Error fetching houses:', error);
          return { data: [] };
        }),
        roundsService.getResultsDisplay(12).catch((error) => {
          console.error('Error fetching results display:', error);
          return [];
        })
      ]);

      // The API returns houses directly in the expected format
      const housesData = housesResponse?.data || [];
      // Show only latest 3 houses on homepage for featured display
      setActiveHouses(housesData.slice(0, 3));

      let resultsData = [];
      if (resultsResponse?.value && Array.isArray(resultsResponse.value)) {
        resultsData = resultsResponse.value;
      } else if (Array.isArray(resultsResponse)) {
        resultsData = resultsResponse;
      }
      setRecentResults(resultsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  }, []);

  const loadUserPlays = useCallback(async () => {
    try {
      const response = await betService.getMyBets();
      const tickets = response || [];
      setMyPlays(tickets.filter((t) => t.status === 'PENDING'));
      
      // Note: userStats calculations removed since analytics cards were removed from homepage
    } catch (error) {
      console.error('Error loading user plays:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletInfo();
      loadUserPlays();
    }
  }, [isAuthenticated, fetchWalletInfo, loadUserPlays]);

  const tabs = [
    { id: 'houses', label: 'Active Houses', icon: Home },
    { id: 'results', label: 'Recent Results', icon: Trophy },
    ...(isAuthenticated ? [{ id: 'myplays', label: 'My Plays', icon: Users }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <HeaderBar />
      
      {/* Mobile-optimized container with proper spacing */}
      <div className="px-4 pt-4 space-y-4 max-w-md mx-auto sm:max-w-6xl">

        {/* Latest Results Section - At the very top */}
        {!playMode && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Latest Results
                </h2>
                <button 
                  onClick={() => navigate(isAuthenticated ? '/user-results' : '/results')}
                  className="text-sm text-blue-600 font-medium flex items-center gap-1"
                >
                  See More
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <ModernResultsCarousel
                results={recentResults}
                onViewAll={() => navigate(isAuthenticated ? '/user-results' : '/results')}
              />
            </div>
          </div>
        )}

        {/* Banner Section - Clean, no borders */}
        {!playMode && (
          <div className="overflow-hidden">
            <BannerCarousel />
          </div>
        )}

        {/* Tabs - Below the banner */}
        {!playMode && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 min-w-0 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Houses Section - Mobile-first design */}
        {(activeTab === 'houses' || playMode) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🏹 <span>Live Houses</span>
              </h2>
              <button
                onClick={() => navigate('/houses')}
                className="text-sm text-blue-600 font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {activeHouses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
                <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Houses</h3>
                <p className="text-gray-600 mb-4">There are currently no houses with active rounds</p>
                <Button onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeHouses.map((houseData) => {
                  // The API returns {house: {...}, rounds: {...}, game_types: {...}}
                  const house = houseData.house || houseData;
                  const gameTypes = houseData.game_types || {};
                  const activeGamesCount = Object.values(gameTypes).filter((game) => game?.available).length;
                  
                  return (
                    <div key={house.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      {/* House Header */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate">{house.name}</h3>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="truncate">{house.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            LIVE
                          </div>
                        </div>
                      </div>

                      {/* Game Date & Time Display */}
                      <div className="px-4 pt-2 pb-4">
                        <GameDateTimeDisplay
                          scheduledTime={gameTypes.FR?.scheduled_time || gameTypes.SR?.scheduled_time}
                          bettingClosesAt={gameTypes.FR?.deadline || gameTypes.SR?.deadline}
                          gameType="Games"
                          houseName={house.name}
                          compact={true}
                          showGameDay={false}
                          className="mb-3"
                        />
                      </div>

                      {/* Game Options Grid */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-3">
                          {/* FR Game Option */}
                          {gameTypes.FR?.available && (
                            <button 
                              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                                isDeadlineClose(gameTypes.FR?.deadline) 
                                  ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                                  : 'border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300'
                              }`}
                              onClick={() => navigate(`/house/${house.id}/playtype/FR`)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                                    <Target className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-bold text-gray-900">First Round</div>
                                    <div className="text-sm text-gray-600">Direct number betting</div>
                                  </div>
                                </div>
                                {gameTypes.FR?.deadline && (
                                  <StopwatchTimer 
                                    deadline={gameTypes.FR.deadline} 
                                    isMobile={true}
                                    className="text-xs"
                                  />
                                )}
                              </div>
                            </button>
                          )}

                          {/* SR Game Option */}
                          {gameTypes.SR?.available && (
                            <button 
                              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                                isDeadlineClose(gameTypes.SR?.deadline) 
                                  ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                                  : 'border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300'
                              }`}
                              onClick={() => navigate(`/house/${house.id}/playtype/SR`)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                                    <Target className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-bold text-gray-900">Second Round</div>
                                    <div className="text-sm text-gray-600">Follow-up betting</div>
                                  </div>
                                </div>
                                {gameTypes.SR?.deadline && (
                                  <StopwatchTimer 
                                    deadline={gameTypes.SR.deadline} 
                                    isMobile={true}
                                    className="text-xs"
                                  />
                                )}
                              </div>
                            </button>
                          )}

                          {/* Forecast Game Option */}
                          {gameTypes.FORECAST?.available && (
                            <button 
                              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                                isDeadlineClose(gameTypes.FORECAST?.deadline) 
                                  ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                                  : 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
                              }`}
                              onClick={() => navigate(`/house/${house.id}/playtype/FORECAST`)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                    <PlayCircle className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-bold text-gray-900">Forecast</div>
                                    <div className="text-sm text-gray-600">Predict outcome</div>
                                  </div>
                                </div>
                                {gameTypes.FORECAST?.deadline && (
                                  <StopwatchTimer 
                                    deadline={gameTypes.FORECAST.deadline} 
                                    isMobile={true}
                                    className="text-xs"
                                  />
                                )}
                              </div>
                            </button>
                          )}
                        </div>
                        
                        {/* Active games indicator */}
                        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                          <span className="text-xs text-gray-500 font-medium">
                            {activeGamesCount} Game{activeGamesCount !== 1 ? 's' : ''} Available
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results Tab (full grid) - Shows only completed results */}
        {activeTab === 'results' && !playMode && (
          <div className="space-y-4 lg:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                Recent Results
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(isAuthenticated ? '/user-results' : '/results')}
              >
                View All
              </Button>
            </div>
            <CompletedResultsGrid results={recentResults} />
          </div>
        )}

        {/* My Plays Tab */}
        {activeTab === 'myplays' && !playMode && isAuthenticated && (
          <div className="space-y-4 lg:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-blue-600" />
                My Active Plays
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('houses')}
                className="self-start sm:self-auto"
              >
                <Target className="w-4 h-4 mr-2" />
                Place New Bet
              </Button>
            </div>
            
            {myPlays.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-12 lg:py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlayCircle className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">No Active Plays</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    You don't have any active bets at the moment. Start playing to see your tickets here!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="primary"
                      onClick={() => setActiveTab('houses')}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Place Your First Bet
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/results')}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myPlays.map((ticket) => (
                  <Card key={ticket.id} className="border-l-4 border-l-yellow-400 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                            <CardTitle className="text-lg font-bold truncate">Ticket #{ticket.id}</CardTitle>
                            <div className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full self-start">
                              <Clock className="w-3 h-3" />
                              {ticket.status}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{ticket.house_name}</span>
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-gray-500">Created</p>
                          <p className="text-sm font-medium">{new Date(ticket.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-blue-600 mb-1">Total Amount</p>
                          <p className="font-bold text-blue-900 text-sm lg:text-base">₹{ticket.total_amount}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 mb-1">Max Win</p>
                          <p className="font-bold text-green-900 text-sm lg:text-base">₹{ticket.total_potential_payout}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-purple-600 mb-1">Numbers</p>
                          <p className="font-bold text-purple-900 text-sm lg:text-base">{ticket.bets?.length || 0}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-orange-600 mb-1">Game Type</p>
                          <p className="font-bold text-orange-900 text-sm lg:text-base">{ticket.game_type || 'Mixed'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Your Numbers:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ticket.bets?.map((bet, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {bet.number}
                            </span>
                          )) || (
                            <span className="text-gray-500 text-sm">No numbers available</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PlayDashboard;
