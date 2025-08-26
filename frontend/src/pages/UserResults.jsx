import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roundsService from '../services/rounds';
import toast from 'react-hot-toast';
import { RefreshCw, BarChart3, ArrowLeft } from 'lucide-react';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';

const UserResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  // Load results for authenticated users
  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setIsLoading(true);
      // Use the new results display API that shows XX for today and actual past results
      const resultsData = await roundsService.getResultsDisplay(20);
      
      let resultsArray;
      if (Array.isArray(resultsData)) {
        resultsArray = resultsData;
      } else if (resultsData.value && Array.isArray(resultsData.value)) {
        resultsArray = resultsData.value;
      } else {
        resultsArray = [];
      }
      
      setResults(resultsArray);
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  // Since the new API returns aggregated results, we can use them directly
  const sortedResults = results.sort((a, b) => {
    // Convert DD/MM/YYYY to Date object for comparison
    const dateA = new Date(a.date.split('/').reverse().join('-'));
    const dateB = new Date(b.date.split('/').reverse().join('-'));
    return dateB - dateA;
  });

  // Filter results
  const filteredResults = sortedResults.filter((result) => {
    if (selectedDate) {
      // Convert selectedDate (YYYY-MM-DD) to DD/MM/YYYY format for comparison
      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      if (result.date !== formattedDate) return false;
    }
    if (selectedHouse !== 'all' && result.house_name !== selectedHouse) return false;
    return true;
  });

  // Get unique houses for filter
  const uniqueHouses = [...new Set(results.map(r => r.house_name))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <HeaderBar />
        
        {/* Page Title */}
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
                <h1 className="text-lg sm:text-xl font-semibold text-gray-800">My Results</h1>
                <p className="text-sm text-gray-600">Latest FR & SR results</p>
              </div>
              
              <div className="w-9"></div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Results...</h3>
            <p className="text-gray-600">Fetching the latest Teer results for you</p>
          </div>
        </div>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar />
      
      {/* Page Title */}
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">My Results</h1>
              <p className="text-sm text-gray-600">Latest FR & SR results</p>
            </div>
            
            <button 
              onClick={loadResults}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        {/* Mobile-Friendly Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Results</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">House</label>
              <select
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Houses</option>
                {uniqueHouses.map((house) => (
                  <option key={house} value={house}>{house}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {(selectedHouse !== 'all' || selectedDate) && (
              <button
                onClick={() => {
                  setSelectedHouse('all');
                  setSelectedDate('');
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Vertical List Results */}
        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-6">
              {selectedHouse !== 'all' || selectedDate 
                ? 'Try adjusting your filters or check back later'
                : 'No results available at the moment'
              }
            </p>
            <div className="space-y-3">
              {(selectedHouse !== 'all' || selectedDate) && (
                <button
                  onClick={() => {
                    setSelectedHouse('all');
                    setSelectedDate('');
                  }}
                  className="w-full px-4 py-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => navigate('/houses')}
                className="w-full px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Play Now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* House and Date */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{result.house_name}</h3>
                  <span className="text-sm text-gray-600">{result.date}</span>
                </div>
                
                {/* FR and SR Results in One Line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* FR Result */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">FR</span>
                      <div className={`inline-flex items-center justify-center w-12 h-8 rounded-lg text-lg font-bold ${
                        result.fr_result === 'XX' || result.fr_result === null || result.fr_result === undefined
                          ? 'bg-gray-100 text-gray-400' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {result.fr_result !== null && result.fr_result !== undefined ? 
                          String(result.fr_result).padStart(2, '0') : 'XX'}
                      </div>
                    </div>
                    
                    {/* SR Result */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">SR</span>
                      <div className={`inline-flex items-center justify-center w-12 h-8 rounded-lg text-lg font-bold ${
                        result.sr_result === 'XX' || result.sr_result === null || result.sr_result === undefined
                          ? 'bg-gray-100 text-gray-400' 
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {result.sr_result !== null && result.sr_result !== undefined ? 
                          String(result.sr_result).padStart(2, '0') : 'XX'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="text-right">
                    {(result.fr_result === 'XX' || result.fr_result === null || result.sr_result === 'XX' || result.sr_result === null) ? (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
                    ) : (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Complete</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default UserResults;
