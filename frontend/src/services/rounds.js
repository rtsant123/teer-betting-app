import api from './api';
const roundsService = {
  // Get upcoming rounds
  getUpcoming: async (hoursAhead = 6) => {
    const response = await api.get(`/rounds/upcoming?hours_ahead=${hoursAhead}`);
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get active rounds
  getActive: async () => {
    const response = await api.get('/rounds/active');
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get active rounds (alias)
  getActiveRounds: async () => {
    const response = await api.get('/rounds/active');
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get open rounds (for betting)
  getOpenRounds: async () => {
    const response = await api.get('/rounds/active');
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get round details
  getRound: async (roundId) => {
    const response = await api.get(`/rounds/${roundId}`);
    return response.data;
  },
  // Get round results
  getResults: async (houseId = null, limit = 10) => {
    const params = new URLSearchParams();
    if (houseId) params.append('house_id', houseId);
    params.append('limit', limit);
    const response = await api.get(`/rounds/results?${params.toString()}`);
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get recent results
  getRecentResults: async (limit = 10) => {
    const response = await api.get(`/rounds/results?limit=${limit}`);
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },

  // Get grouped recent results (FR/SR together by date and house)
  getGroupedRecentResults: async (limit = 6) => {
    const response = await api.get(`/rounds/grouped-recent-results?limit=${limit}`);
    return response.data;
  },
  
  // Get results for display - shows 'XX' for today until published, past results with actual values
  getResultsDisplay: async (limit = 10) => {
    const response = await api.get(`/rounds/results-display?limit=${limit}`);
    return response.data;
  },
  // Get rounds by house
  getRoundsByHouse: async (houseId) => {
    const response = await api.get(`/rounds/house/${houseId}`);
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get all houses
  getHouses: async () => {
    const response = await api.get('/rounds/houses');
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get today's rounds
  getTodaysRounds: async () => {
    const response = await api.get('/rounds/today');
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get upcoming rounds
  getUpcomingRounds: async (hoursAhead = 24) => {
    const response = await api.get(`/rounds/upcoming?hours_ahead=${hoursAhead}`);
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Get forecast rounds (FR and SR for specific house)
  getForecastRounds: async (houseId, targetDate = null) => {
    const params = new URLSearchParams();
    if (targetDate) params.append('target_date', targetDate);
    const response = await api.get(`/rounds/forecast/${houseId}?${params.toString()}`);
    // Backend returns {value: [...], Count: n} format
    return response.data.value || response.data;
  },
  // Publish result for a round (Admin only)
  publishResult: async (roundId, result) => {
    const response = await api.post(`/admin/rounds/${roundId}/result?result=${result}`);
    return response.data;
  }
};
export { roundsService };
export default roundsService;
