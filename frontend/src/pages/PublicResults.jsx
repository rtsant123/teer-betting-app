import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import roundsService from '../services/rounds';
import toast from 'react-hot-toast';
import { 
  Filter, 
  RefreshCw, 
  LogIn, 
  Clock, 
  BarChart3, 
  Target,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import BottomNav from '../components/common/BottomNav';
import HeaderBar from '../components/common/HeaderBar';

const PublicResults = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState(null);

  // Memoized helper functions for better performance
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    // Handle DD/MM/YYYY format from the new API
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    
    // Fallback for other date formats
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Load results for both authenticated and non-authenticated users
  const loadResults = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Use the new results display API that shows XX for today and actual past results
      const resultsData = await roundsService.getResultsDisplay(50);
      
      let resultsArray;
      if (Array.isArray(resultsData)) {
        resultsArray = resultsData;
      } else if (resultsData.value && Array.isArray(resultsData.value)) {
        resultsArray = resultsData.value;
      } else {
        resultsArray = [];
      }
      
      setResults(resultsArray);
      
      if (isRefresh) {
        toast.success('Results updated successfully');
      }
    } catch (error) {
      console.error('Error loading results:', error);
      setError('Failed to load results. Please try again.');
      toast.error('Failed to load results');
      setResults([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Memoized filtered results for better performance
  const filteredResults = useMemo(() => {
    let filtered = results.filter(result => {
      const houseMatch = selectedHouse === 'all' || result.house_name === selectedHouse;
      
      let dateMatch = true;
      if (selectedDate) {
        // Convert selectedDate (YYYY-MM-DD) to DD/MM/YYYY format for comparison
        const [year, month, day] = selectedDate.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        dateMatch = result.date === formattedDate;
      }
      
      return houseMatch && dateMatch;
    });

    // Sort by date with latest first (DD/MM/YYYY format)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB - dateA; // Latest first
    });

    return filtered;
  }, [results, selectedHouse, selectedDate]);

  // Memoized statistics for better performance
  const statistics = useMemo(() => {
    const uniqueHouses = [...new Set(results.map(result => result.house_name))];
    const uniqueDates = [...new Set(results.map(result => result.date))].sort((a, b) => {
      // Sort DD/MM/YYYY dates properly
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateB - dateA;
    });
    const completeResults = results.filter(result => 
      result.fr_result !== null && result.sr_result !== null
    );
    
    return {
      totalResults: results.length,
      activeHouses: uniqueHouses.length,
      filteredCount: filteredResults.length,
      completeCount: completeResults.length,
      uniqueHouses,
      uniqueDates
    };
  }, [results, filteredResults]);

  const handleRefresh = () => {
    loadResults(true);
  };

  const clearFilters = () => {
    setSelectedHouse('all');
    setSelectedDate('');
  };

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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Public Results</h1>
              <p className="text-sm text-gray-600">Latest FR & SR results from all houses</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        {/* User Results Suggestion for Authenticated Users */}
        {isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-900">
                    Looking for your betting results?
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Check your personalized results page to see your betting history and winnings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/user-results')}
                className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
              >
                My Results
              </button>
            </div>
          </div>
        )}

        {/* Mobile-Friendly Filter Section */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4">
            <div className="flex flex-col gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-gray-500" />
                  Filter Results
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredResults.length === results.length 
                    ? `Showing all ${results.length} results`
                    : `Showing ${filteredResults.length} of ${results.length} results`
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {(selectedHouse !== 'all' || selectedDate) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading || isRefreshing}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="house-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Select House
                </label>
                <select
                  id="house-filter"
                  value={selectedHouse}
                  onChange={(e) => setSelectedHouse(e.target.value)}
                  className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Houses ({statistics.activeHouses})</option>
                  {statistics.uniqueHouses.map(house => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <select
                  id="date-filter"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Dates</option>
                  {statistics.uniqueDates.map(date => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Results</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => loadResults()}
                  className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Grid */}
        <section>
          {isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900">Loading Results...</h3>
              <p className="text-gray-600 mt-1">Fetching the latest game outcomes</p>
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Latest Teer Results
                </h2>
                <div className="text-sm text-gray-500">
                  Latest results first
                </div>
              </div>

              {/* Vertical List Results */}
              <div className="space-y-3">
                {filteredResults.map((result, index) => (
                  <div key={`${result.house_name}-${result.date}-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    {/* House and Date */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{result.house_name}</h4>
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

                    {/* Show pending message for incomplete results */}
                    {(result.fr_result === null || result.sr_result === null) && (
                      <div className="mt-3 pt-2 border-t border-gray-100 text-sm text-gray-500 flex items-center justify-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Results will be published at 2:00 AM
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {filteredResults.length >= 50 && (
                <div className="text-center pt-6">
                  <button 
                    onClick={() => loadResults(true)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load More Results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600 mb-6">
                {selectedHouse !== 'all' || selectedDate 
                  ? 'Try adjusting your filters to see more results.'
                  : 'No game results are available at the moment.'}
              </p>
              {(selectedHouse !== 'all' || selectedDate) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* CTA Section - Always Visible and Prominent */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 mt-8 text-center text-white">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Ready to Play Teer?</h3>
            <p className="text-blue-100 mb-6 text-lg">
              You've seen the results, now make your predictions and win big! Join thousands of players already playing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/home?mode=play')}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-50 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Target className="w-5 h-5 mr-2" />
                Play Now
              </button>
              {!isAuthenticated && (
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-200 border-2 border-white border-opacity-30"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Login & Play
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-200 border-2 border-white border-opacity-30"
              >
                Home
              </button>
            </div>
          </div>
        </section>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default PublicResults;
