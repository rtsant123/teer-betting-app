import api from '../services/api';

// API Client wrapper for consistent method calls
export const apiClient = {
  // Auth endpoints
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Bet endpoints
  placeBetTicket: async (betData, token) => {
    const response = await api.post('/bet/place', betData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getMyTickets: async (token, limit = 50) => {
    const response = await api.get(`/bet/my-tickets?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getTicket: async (ticketId, token) => {
    const response = await api.get(`/bet/ticket/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // House endpoints
  getHouses: async () => {
    const response = await api.get('/houses');
    return response.data;
  },

  getHousesWithRounds: async () => {
    const response = await api.get('/bet/houses-with-rounds');
    return response.data;
  },

  // Round endpoints
  getActiveRounds: async () => {
    const response = await api.get('/rounds/active');
    return response.data;
  },

  // Wallet endpoints
  getWalletBalance: async (token) => {
    const response = await api.get('/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Results endpoints
  getResults: async (houseId = null, date = null) => {
    let url = '/results';
    const params = new URLSearchParams();
    if (houseId) params.append('house_id', houseId);
    if (date) params.append('date', date);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },

  // Admin endpoints
  getAllTickets: async (token, page = 1, limit = 50) => {
    const response = await api.get(`/admin/tickets?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Payment endpoints
  createDeposit: async (depositData, token) => {
    const response = await api.post('/payments/deposit', depositData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  createWithdrawal: async (withdrawalData, token) => {
    const response = await api.post('/payments/withdraw', withdrawalData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // User profile endpoints
  getProfile: async (token) => {
    const response = await api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  updateProfile: async (profileData, token) => {
    const response = await api.put('/auth/profile', profileData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default apiClient;
