import api from './api';
export const adminService = {
  // Users management
  getAllUsers: () => {
    return api.get('/admin/users');
  },
  updateUser: (userId, userData) => {
    return api.put(`/admin/users/${userId}`, userData);
  },
  deleteUser: (userId) => {
    return api.delete(`/admin/users/${userId}`);
  },
  // Houses management
  getAllHouses: () => {
    return api.get('/admin/houses');
  },
  createHouse: (houseData) => {
    return api.post('/admin/houses', houseData);
  },
  updateHouse: (houseId, houseData) => {
    return api.put(`/admin/houses/${houseId}`, houseData);
  },
  deleteHouse: (houseId) => {
    return api.delete(`/admin/houses/${houseId}`);
  },
  deleteAllHouseRounds: (houseId) => {
    return api.delete(`/admin/houses/${houseId}/rounds`);
  },
  // Banner management
  getAllBanners: () => {
    return api.get('/admin/banners');
  },
  createBanner: (bannerData) => {
    return api.post('/admin/banners', bannerData);
  },
  updateBanner: (bannerId, bannerData) => {
    return api.put(`/admin/banners/${bannerId}`, bannerData);
  },
  deleteBanner: (bannerId) => {
    return api.delete(`/admin/banners/${bannerId}`);
  },
  toggleBannerStatus: (bannerId) => {
    return api.patch(`/admin/banners/${bannerId}/toggle`);
  },
  // Rounds management
  getAllRounds: () => {
    return api.get('/admin/rounds');
  },
  getRoundsReadyForResults: () => {
    return api.get('/admin/rounds/ready-for-results');
  },
  createRound: (roundData) => {
    return api.post('/admin/rounds', roundData);
  },
  updateRound: (roundId, roundData) => {
    return api.put(`/admin/rounds/${roundId}`, roundData);
  },
  deleteRound: (roundId) => {
    return api.delete(`/admin/rounds/${roundId}`);
  },
  cancelRound: (roundId) => {
    return api.post(`/admin/rounds/${roundId}/cancel`);
  },
  setRoundResult: (roundId, resultData) => {
    return api.post(`/admin/rounds/${roundId}/result`, resultData);
  },
  publishResult: (roundId, result) => {
    return api.post(`/admin/rounds/${roundId}/result?result=${result}`);
  },
  updateResult: (roundId, result) => {
    return api.put(`/admin/rounds/${roundId}/result?result=${result}`);
  },
  getRoundAnalytics: (roundId) => {
    return api.get(`/admin/rounds/${roundId}/analytics`);
  },
  // Dashboard stats
  getDashboardStats: () => {
    return api.get('/admin/dashboard');
  },
  // System stats
  getSystemStats: () => {
    return api.get('/admin/stats');
  },
  // Transactions
  getPendingTransactions: () => {
    return api.get('/admin/transactions/pending');
  },
  getDetailedTransactions: (status = null, transactionType = null, limit = 50) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (transactionType) params.append('transaction_type', transactionType);
    params.append('limit', limit);
    return api.get(`/admin/transactions/detailed?${params.toString()}`);
  },
  approveTransaction: (transactionId, notes = '') => {
    return api.post(`/admin/transactions/${transactionId}/approve`, { admin_notes: notes });
  },
  rejectTransaction: (transactionId, reason) => {
    return api.post(`/admin/transactions/${transactionId}/reject`, { admin_notes: reason });
  },
  // Bets management
  getAllBets: () => {
    return api.get('/admin/bets');
  },
  // Transactions management
  getAllTransactions: () => {
    return api.get('/admin/transactions');
  },
  // Payment Methods management
  getPaymentMethods: () => {
    return api.get('/payment-methods/');
  },
  createPaymentMethod: (methodData) => {
    return api.post('/payment-methods/', methodData);
  },
  updatePaymentMethod: (methodId, methodData) => {
    return api.put(`/payment-methods/${methodId}`, methodData);
  },
  deletePaymentMethod: (methodId) => {
    return api.delete(`/payment-methods/${methodId}`);
  },
  togglePaymentMethodStatus: (methodId) => {
    return api.patch(`/payment-methods/${methodId}/toggle-status`);
  },
  // Wallet transactions management
  getAllWalletTransactions: () => {
    return api.get('/admin/transactions/detailed');
  },
  getPendingWalletTransactions: () => {
    return api.get('/admin/transactions/pending');
  }
};
export default adminService;