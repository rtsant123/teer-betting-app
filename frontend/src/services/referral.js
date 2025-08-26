import api from './api';
export const referralService = {
  // User Referral Services
  async createReferralLink(campaignName = 'General') {
    try {
      const response = await api.post('/referral/create-link', {
        campaign_name: campaignName
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async getMyReferralLinks() {
    try {
      const response = await api.get('/referral/my-links');
      // Backend returns: [...] (direct array)
      return response.data || [];
    } catch (error) {
      console.error('Error fetching referral links:', error);
      return [];
    }
  },
  async getReferralStats() {
    try {
      const response = await api.get('/referral/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async getCommissionHistory() {
    try {
      const response = await api.get('/referral/commissions');
      // Backend returns: {"commissions": [...], "total": 0, "page": 1, "pages": 0}
      return response.data.commissions || [];
    } catch (error) {
      console.error('Error fetching commission history:', error);
      return [];
    }
  },
  async requestWithdrawal(amount) {
    try {
      const response = await api.post('/referral/withdraw', { amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async getWithdrawalHistory() {
    try {
      const response = await api.get('/referral/withdrawals');
      // Backend returns: {"withdrawals": [...], "total": 0, "page": 1, "pages": 0}
      return response.data.withdrawals || [];
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      return [];
    }
  },
  async getReferredUsers() {
    try {
      const response = await api.get('/referral/referrals');
      // Backend returns: {"referrals": [...], "total": 0, "page": 1, "pages": 0}
      return response.data.referrals || [];
    } catch (error) {
      console.error('Error fetching referred users:', error);
      return [];
    }
  },
  async trackReferralClick(code) {
    try {
      const response = await api.get(`/referral/track/${code}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Admin Referral Services
  async getReferralSettings() {
    try {
      const response = await api.get('/admin/referral/settings');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async updateReferralSettings(settings) {
    try {
      const response = await api.post('/admin/referral/settings', settings);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async getAllCommissions() {
    try {
      const response = await api.get('/admin/referral/commissions');
      // Backend returns: {"commissions": [...], "total": 0, "page": 1, "pages": 0}
      return response.data.commissions || [];
    } catch (error) {
      console.error('Error fetching all commissions:', error);
      return [];
    }
  },
  async approveCommission(commissionId) {
    try {
      const response = await api.post(`/admin/referral/commissions/${commissionId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async rejectCommission(commissionId, reason) {
    try {
      const response = await api.post(`/admin/referral/commissions/${commissionId}/reject`, {
        reason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async getAllWithdrawals() {
    try {
      const response = await api.get('/admin/referral/withdrawals');
      // Backend returns: {"withdrawals": [...], "total": 0, "page": 1, "pages": 0}
      return response.data.withdrawals || [];
    } catch (error) {
      console.error('Error fetching all withdrawals:', error);
      return [];
    }
  },
  async approveWithdrawal(withdrawalId) {
    try {
      const response = await api.post(`/admin/referral/withdrawals/${withdrawalId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async rejectWithdrawal(withdrawalId, reason) {
    try {
      const response = await api.post(`/admin/referral/withdrawals/${withdrawalId}/reject`, {
        reason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  async getAdminReferralStats() {
    try {
      const response = await api.get('/admin/referral/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};