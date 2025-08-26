import React, { useState, useEffect } from 'react';
import { referralService } from '../services/referral';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
const ReferralDashboard = () => {
  const [stats, setStats] = useState(null);
  const [referralLinks, setReferralLinks] = useState([]);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [referredUsers, setReferredUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  useEffect(() => {
    loadDashboardData();
  }, []);
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load data sequentially for better error tracking
      const statsData = await referralService.getReferralStats();
      const linksData = await referralService.getMyReferralLinks();
      const commissionsData = await referralService.getCommissionHistory();
      const withdrawalsData = await referralService.getWithdrawalHistory();
      const referralsData = await referralService.getReferredUsers();
      // Set states with explicit validation
      setStats(statsData || {});
      setReferralLinks(Array.isArray(linksData) ? linksData : []);
      // Ensure we have arrays for commission and withdrawal history
      const commissions = Array.isArray(commissionsData) ? commissionsData : [];
      const withdrawals = Array.isArray(withdrawalsData) ? withdrawalsData : [];
      setCommissionHistory(commissions);
      setWithdrawalHistory(withdrawals);
      setReferredUsers(Array.isArray(referralsData) ? referralsData : []);
    } catch (err) {
      console.error('❌ Dashboard loading error:', err);
      setError(err.message || 'Failed to load referral data');
      // Set default empty arrays on error
      setCommissionHistory([]);
      setWithdrawalHistory([]);
      setReferredUsers([]);
      setReferralLinks([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };
  const handleCreateLink = async (e) => {
    e.preventDefault();
    try {
      await referralService.createReferralLink(newCampaignName || 'General');
      setNewCampaignName('');
      loadDashboardData(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to create referral link');
    }
  };
  const handleWithdrawal = async (e) => {
    e.preventDefault();
    try {
      await referralService.requestWithdrawal(parseFloat(withdrawalAmount));
      setWithdrawalAmount('');
      loadDashboardData(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to request withdrawal');
    }
  };
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referral dashboard...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar />
      
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Dashboard</h1>
          <p className="text-gray-600">Manage your referral links and track your earnings</p>
        </div>
        {error && (
          <div className="alert alert-danger mb-6">
            {error}
          </div>
        )}
        {/* Stats Overview - Modern Design */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stats-card">
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="stats-number text-success-600">₹{stats.total_earnings?.toFixed(2) || '0.00'}</div>
              <div className="stats-label">Total Earnings</div>
            </div>
            
            <div className="stats-card">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stats-number text-primary-600">{stats.total_referrals || 0}</div>
              <div className="stats-label">Referred Users</div>
            </div>
            
            <div className="stats-card">
              <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="stats-number text-warning-600">₹{stats.pending_balance?.toFixed(2) || '0.00'}</div>
              <div className="stats-label">Pending Balance</div>
            </div>
            
            <div className="stats-card">
              <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="stats-number text-secondary-600">{referralLinks.filter(link => link.is_active).length}</div>
              <div className="stats-label">Active Links</div>
            </div>
          </div>
        )}
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'links', name: 'My Links', icon: '🔗' },
                { id: 'commissions', name: 'Commissions', icon: '💰' },
                { id: 'withdrawals', name: 'Withdrawals', icon: '💳' },
                { id: 'referrals', name: 'My Referrals', icon: '👥' }
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Create Your First Referral Link</h4>
                    <p className="text-blue-700 text-sm mb-4">Generate a unique referral link to start earning commissions.</p>
                    <button
                      onClick={() => setActiveTab('links')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Create Link
                    </button>
                  </div>
                  <div className="card card-success p-4">
                    <h4 className="font-medium text-success-900 mb-2">Share & Earn</h4>
                    <p className="text-success-700 text-sm mb-4">Share your links and earn lifetime commissions from referrals.</p>
                    <button
                      onClick={() => setActiveTab('commissions')}
                      className="btn btn-success"
                    >
                      View Earnings
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Links Tab - Modern Design */}
            {activeTab === 'links' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">My Referral Links</h3>
                </div>
                {/* Create New Link Form - Modern Design */}
                <div className="card mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Create New Referral Link</h4>
                  <form onSubmit={handleCreateLink} className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Campaign Name (optional)"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      Create Link
                    </button>
                  </form>
                </div>
                {/* Links List - Modern Cards */}
                <div className="space-y-4">
                  {referralLinks.map((link) => (
                    <div key={link.id} className="card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">{link.campaign_name}</h4>
                          <p className="text-sm text-muted">Code: {link.code}</p>
                        </div>
                        <span className={`badge ${
                          link.is_active ? 'badge-success' : 'badge-danger'
                        }`}>
                          {link.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                        <div className="flex justify-between items-center">
                          <code className="text-sm text-gray-700 break-all">
                            {`${window.location.origin}/register?ref=${link.code}`}
                          </code>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/register?ref=${link.code}`)}
                            className="btn btn-outline btn-sm ml-2"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted">Clicks:</span>
                          <span className="ml-2 font-semibold">{link.click_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Conversions:</span>
                          <span className="ml-2 font-medium">{link.conversion_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Commissions Tab */}
            {activeTab === 'commissions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Commission History</h3>
                  {stats?.pending_balance > 0 && (
                    <form onSubmit={handleWithdrawal} className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg w-32"
                        max={stats.pending_balance}
                        required
                      />
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                      >
                        Request Withdrawal
                      </button>
                    </form>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">{Array.isArray(commissionHistory) && commissionHistory.length > 0 ? (
                        commissionHistory.map((commission, index) => (
                          <tr key={commission.id || `commission-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {commission.created_at ? new Date(commission.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {commission.commission_type || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {commission.level || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₹{commission.amount ? commission.amount.toFixed(2) : '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                commission.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                commission.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {commission.status || 'UNKNOWN'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <div className="text-4xl mb-2">💰</div>
                              <p className="text-lg font-medium">No commissions yet</p>
                              <p className="text-sm">Start referring users to earn commissions</p>
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
                <h3 className="text-lg font-medium text-gray-900 mb-6">Withdrawal History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">{Array.isArray(withdrawalHistory) && withdrawalHistory.length > 0 ? (
                        withdrawalHistory.map((withdrawal, index) => (
                          <tr key={withdrawal.id || `withdrawal-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₹{withdrawal.amount ? withdrawal.amount.toFixed(2) : '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                withdrawal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                withdrawal.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                withdrawal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {withdrawal.status || 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <div className="text-4xl mb-2">💸</div>
                              <p className="text-lg font-medium">No withdrawals yet</p>
                              <p className="text-sm">Request a withdrawal when you have earned commissions</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">My Referrals</h3>
                <div className="space-y-4">
                  {referredUsers.map((user) => (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{user.username || user.phone}</h4>
                          <p className="text-sm text-gray-500">
                            Joined: {new Date(user.joined_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Level: {user.level}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            Total Earned: ₹{user.total_commission?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Last Activity: {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'No activity'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
export default ReferralDashboard;
