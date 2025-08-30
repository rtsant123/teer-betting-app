import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoundCard from '../components/common/RoundCard';
import { apiGet } from '../lib/api';
const PublicLanding = () => {
  const navigate = useNavigate();
  const [latestResults, setLatestResults] = useState([]);
  const [houses, setHouses] = useState([]);
  const [housesWithRounds, setHousesWithRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('results'); // results, open - Make results default
  useEffect(() => {
    fetchPublicData();
  }, []);
  const fetchPublicData = async () => {
    try {
      setLoading(true);
      const [resultsResponse, housesWithRoundsResponse] = await Promise.all([
        apiGet('/rounds/results/latest?days_back=7').catch(() => ({ data: [] })),
        apiGet('/bet/houses-with-rounds').catch(() => ({ data: [] }))
      ]);
      // Latest results endpoint returns direct array of grouped results
      setLatestResults(resultsResponse.data?.slice(0, 6) || []);
      // houses-with-rounds returns array of {house, rounds} objects directly
      const housesWithRounds = housesWithRoundsResponse.data || [];
      const housesData = housesWithRounds.map(item => item.house);

      setHouses(housesData);
      setHousesWithRounds(housesWithRounds);
      // Store the full houses with rounds data for the shared component
    } catch (error) {
      console.error('Error fetching public data:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'TBA';
    }
  };
  const formatTime = (dateString) => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'TBA';
    }
  };
  const getLatestResultsByHouse = () => {
    if (!latestResults.length) return [];
    // Results are already grouped by house and date from the API
    return latestResults.map(result => ({
      house_name: result.house_name,
      date: formatDate(result.date),
      results: [
        // Add FR result if available
        ...(result.fr_result !== null ? [{
          round_type: 'FR',
          result: result.fr_result,
          actual_time: result.fr_time
        }] : []),
        // Add SR result if available  
        ...(result.sr_result !== null ? [{
          round_type: 'SR',
          result: result.sr_result,
          actual_time: result.sr_time
        }] : [])
      ]
    }));
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="container-responsive py-8">
          <div className="animate-pulse">
            <div className="h-12 bg-white bg-opacity-20 rounded mb-8 max-w-md mx-auto"></div>
            <div className="grid-responsive">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="h-32 bg-white bg-opacity-20 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Hero Section - Responsive */}
      <div className="container-responsive py-8 lg:py-16">
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            🎯 <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Teer</span> Central
          </h1>
          <p className="text-responsive text-purple-200 mb-4 max-w-4xl mx-auto">
            Live Teer Results & Gaming Platform - Join thousands of players and test your luck!
          </p>
          <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 rounded-xl mb-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2">🎊 WIN BIG TODAY! 🎊</h3>
            <p className="text-mobile-sm">
              💰 Up to 80x payouts on direct hits! • 🎯 Multiple play options available • 
              ⚡ Live results updated instantly • 🏆 Join {houses.length > 0 ? `${houses.length} active houses` : 'thousands of players'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <button 
              onClick={() => navigate('/register')}
              className="btn btn-primary btn-lg flex-1 transform hover:scale-105 transition-all duration-300"
            >
              🚀 Start Playing Now
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-outline-primary btn-lg flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-md border border-white border-opacity-20 transition-all duration-300"
            >
              🔑 Login
            </button>
          </div>
        </div>
        {/* Navigation Tabs - Moved to Top */}
        <div className="flex bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-2 mb-8 max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-3 px-4 lg:px-6 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'results' 
                ? 'bg-white text-purple-600 shadow-lg' 
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            📊 Latest Results
          </button>
          <button 
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-3 px-4 lg:px-6 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'open' 
                ? 'bg-white text-purple-600 shadow-lg' 
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            🔴 Live Rounds
          </button>
        </div>
        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-8">� Latest Results</h2>
            {latestResults.length > 0 ? (
              <div className="max-w-6xl mx-auto">
                {/* Results Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {getLatestResultsByHouse().slice(0, 6).map((houseGroup, index) => {
                    const frResult = houseGroup.results.find(r => r.round_type === 'FR');
                    const srResult = houseGroup.results.find(r => r.round_type === 'SR');
                    return (
                      <div key={`${houseGroup.houseName}-${index}`} className="bg-white bg-opacity-95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white border-opacity-20">
                        {/* House Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                              <span className="text-white text-xl">🏹</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">{houseGroup.houseName}</h3>
                              <p className="text-sm text-gray-600">{formatDate(houseGroup.latestDate)}</p>
                            </div>
                          </div>
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                            LATEST
                          </div>
                        </div>
                        {/* Results Display */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* First Round */}
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center justify-center">
                              <span className="mr-1">🥇</span>
                              First Round
                            </div>
                            <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-xl font-bold ${
                              frResult?.result ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {frResult?.result ? String(frResult.result).padStart(2, '0') : '--'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {frResult ? formatTime(frResult.actual_time || frResult.scheduled_time) : 'Pending'}
                            </div>
                          </div>
                          {/* Second Round */}
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center justify-center">
                              <span className="mr-1">🥈</span>
                              Second Round
                            </div>
                            <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-xl font-bold ${
                              srResult?.result ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {srResult?.result ? String(srResult.result).padStart(2, '0') : '--'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {srResult ? formatTime(srResult.actual_time || srResult.scheduled_time) : 'Pending'}
                            </div>
                          </div>
                        </div>
                        {/* Status Footer */}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="mr-1">📅</span>
                            <span>{formatDate(houseGroup.latestDate)}</span>
                          </div>
                          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            (frResult?.result && srResult?.result) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(frResult?.result && srResult?.result) ? 'Complete' : 'Partial'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* View All Button */}
                <div className="text-center">
                  <button 
                    onClick={() => navigate('/results')}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center mx-auto"
                  >
                    <span className="mr-2">📊</span>
                    View All Historical Results
                    <span className="ml-2">→</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 lg:py-16">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">No Results Yet</h3>
                <p className="text-purple-200 mb-6">Results will appear here after rounds are completed.</p>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl max-w-md mx-auto mb-4">
                  <h4 className="font-bold mb-2">🏆 Be the First Winner!</h4>
                  <p className="text-sm">Join now and play on upcoming rounds. Winners take home up to 80x their stake!</p>
                </div>
                <button 
                  onClick={() => setActiveTab('open')}
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  🎮 View Live Rounds
                </button>
              </div>
            )}
          </div>
        )}
        {/* Live Rounds Tab */}
        {activeTab === 'open' && (
          <div className="space-y-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-8">🔴 Live Play Rounds</h2>
            {houses.length > 0 ? (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {housesWithRounds.slice(0, 2).map(houseData => (
                    <RoundCard 
                      key={houseData.house.id}
                      houseData={houseData}
                      isPublicView={true}
                    />
                  ))}
                </div>
                {/* View All Rounds Button */}
                <div className="text-center">
                  <button 
                    onClick={() => navigate('/play')}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center mx-auto"
                  >
                    <span className="mr-2">🎮</span>
                    View All Live Rounds & Play
                    <span className="ml-2">→</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 lg:py-16">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">No Live Rounds Right Now</h3>
                <p className="text-purple-200 mb-6">Don't worry! New play rounds start every few hours.</p>
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl max-w-md mx-auto mb-4">
                  <h4 className="font-bold mb-2">🎯 Get Ready for Action!</h4>
                  <p className="text-sm">Register now and be notified when new rounds open. Early birds get the best odds!</p>
                </div>
                <button 
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  🚀 Join Now & Get Alerts
                </button>
              </div>
            )}
          </div>
        )}
        {/* Call to Action */}
        <div className="text-center mt-12 lg:mt-16 py-8 lg:py-12 bg-white bg-opacity-5 backdrop-blur-md rounded-3xl border border-white border-opacity-20">
          <div className="text-4xl lg:text-6xl mb-6">🎯</div>
          <h2 className="text-2xl lg:text-4xl font-bold text-white mb-4">Ready to Play?</h2>
          <p className="text-lg lg:text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            Join thousands of players and start your Teer play journey today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto mb-8">
            <button 
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-orange-400 hover:to-red-500 text-white font-bold py-3 lg:py-4 px-6 lg:px-8 rounded-xl text-base lg:text-lg shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              🚀 Sign Up Free
            </button>
            <button 
              onClick={() => setActiveTab('open')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 lg:py-4 px-6 lg:px-8 rounded-xl text-base lg:text-lg backdrop-blur-md border border-white border-opacity-20 transition-all duration-300"
            >
              👀 View Live Rounds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PublicLanding;
