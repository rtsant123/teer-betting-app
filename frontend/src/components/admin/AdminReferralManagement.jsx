import React, { useState, useEffect } from 'react';
import { referralService } from '../../services/referral';
const AdminReferralManagement = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Settings state
  const [settings, setSettings] = useState({
    level_1_rate: 0,
    level_2_rate: 0,
    level_3_rate: 0,
    min_bet_for_commission: 0,
    min_withdrawal_amount: 100,
    max_withdrawal_amount: 10000,
    commission_validity_days: 30,
    is_active: true
  });
  // Admin data state
  const [adminStats, setAdminStats] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  useEffect(() => {
    loadAdminData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Load each piece of data separately with individual error handling
      let settingsData, statsData, commissionsData, withdrawalsData;
      try {
        settingsData = await referralService.getReferralSettings();
      } catch (err) {
        console.error('❌ Settings loading error:', err);
        settingsData = null;
      }
      try {
        statsData = await referralService.getAdminReferralStats();
      } catch (err) {
        console.error('❌ Stats loading error:', err);
        statsData = null;
      }
      try {
        commissionsData = await referralService.getAllCommissions();
      } catch (err) {
        console.error('❌ Commissions loading error:', err);
        commissionsData = [];
      }
      try {
        withdrawalsData = await referralService.getAllWithdrawals();
      } catch (err) {
        console.error('❌ Withdrawals loading error:', err);
        withdrawalsData = [];
      }
      setSettings(settingsData || settings);
      setAdminStats(statsData);
      // Ensure we have arrays for admin data
      setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
      setWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
    } catch (err) {
      console.error('❌ Admin data loading error:', err);
      setError(err.message || 'Failed to load admin data');
      // Set safe defaults on error
      setCommissions([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await referralService.updateReferralSettings(settings);
      alert('Settings updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    }
  };
  const handleApproveCommission = async (commissionId) => {
    try {
      await referralService.approveCommission(commissionId);
      loadAdminData(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to approve commission');
    }
  };
  const handleRejectCommission = async (commissionId) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      try {
        await referralService.rejectCommission(commissionId, reason);
        loadAdminData(); // Refresh data
      } catch (err) {
        setError(err.message || 'Failed to reject commission');
      }
    }
  };
  const handleApproveWithdrawal = async (withdrawalId) => {
    try {
      await referralService.approveWithdrawal(withdrawalId);
      loadAdminData(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to approve withdrawal');
    }
  };
  const handleRejectWithdrawal = async (withdrawalId) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      try {
        await referralService.rejectWithdrawal(withdrawalId, reason);
        loadAdminData(); // Refresh data
      } catch (err) {
        setError(err.message || 'Failed to reject withdrawal');
      }
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin data...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Referral System Management</h1>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {/* Admin Stats */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commissions Paid</p>
                <p className="text-2xl font-bold text-gray-900">₹{adminStats.total_commissions_paid?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Referrers</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.active_referrers || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Commissions</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.pending_commissions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.pending_withdrawals || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'settings', name: 'Settings', icon: '⚙️' },
              { id: 'commissions', name: 'Commissions', icon: '💰' },
              { id: 'withdrawals', name: 'Withdrawals', icon: '💳' },
              { id: 'analytics', name: 'Analytics', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Referral System Settings</h3>
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level 1 Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.level_1_rate}
                      onChange={(e) => setSettings({...settings, level_1_rate: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level 2 Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.level_2_rate}
                      onChange={(e) => setSettings({...settings, level_2_rate: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level 3 Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.level_3_rate}
                      onChange={(e) => setSettings({...settings, level_3_rate: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Bet for Commission (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.min_bet_for_commission}
                      onChange={(e) => setSettings({...settings, min_bet_for_commission: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Validity (Days)
                    </label>
                    <input
                      type="number"
                      value={settings.commission_validity_days}
                      onChange={(e) => setSettings({...settings, commission_validity_days: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Withdrawal Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.min_withdrawal_amount}
                      onChange={(e) => setSettings({...settings, min_withdrawal_amount: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Withdrawal Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.max_withdrawal_amount}
                      onChange={(e) => setSettings({...settings, max_withdrawal_amount: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={settings.is_active}
                    onChange={(e) => setSettings({...settings, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Enable Referral System
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Commission Management</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referred User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">{Array.isArray(commissions) && commissions.length > 0 ? (
                      commissions.map((commission, index) => (
                        <tr key={commission.id || `admin-commission-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {commission.referrer_username || commission.referrer_phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {commission.referred_username || commission.referred_phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {commission.commission_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {commission.level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{commission.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            commission.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            commission.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {commission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {commission.status === 'PENDING' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveCommission(commission.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectCommission(commission.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <div className="text-4xl mb-2">💰</div>
                            <p className="text-lg font-medium">No commissions found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Withdrawal Management</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">{Array.isArray(withdrawals) && withdrawals.length > 0 ? (
                      withdrawals.map((withdrawal, index) => (
                        <tr key={withdrawal.id || `admin-withdrawal-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {withdrawal.username || withdrawal.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{withdrawal.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            withdrawal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            withdrawal.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            withdrawal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {withdrawal.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {withdrawal.status === 'PENDING' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <div className="text-4xl mb-2">💸</div>
                            <p className="text-lg font-medium">No withdrawals found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Referral Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Commission Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Level 1 Commissions:</span>
                      <span className="font-medium">{adminStats?.level_1_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Level 2 Commissions:</span>
                      <span className="font-medium">{adminStats?.level_2_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Level 3 Commissions:</span>
                      <span className="font-medium">{adminStats?.level_3_count || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversion Rate:</span>
                      <span className="font-medium">{adminStats?.conversion_rate?.toFixed(2) || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Commission:</span>
                      <span className="font-medium">₹{adminStats?.avg_commission?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Top Performer:</span>
                      <span className="font-medium">{adminStats?.top_referrer || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminReferralManagement;
