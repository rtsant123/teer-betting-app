import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
const AdminWalletManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
    user_id: '',
    start_date: '',
    end_date: ''
  });
  useEffect(() => {
    fetchTransactions();
    fetchPendingTransactions();
  }, []);
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        toast.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Error fetching transactions');
    }
    setLoading(false);
  };
  const fetchPendingTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/transactions/detailed?status=PENDING', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingTransactions(data);
      } else {
        toast.error('Failed to fetch pending transactions');
      }
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      toast.error('Error fetching pending transactions');
    }
  };
  const handleTransactionAction = async (transactionId, action, amount = null) => {
    const token = localStorage.getItem('token');
    try {
      const adminNotes = amount ? `Manual adjustment: ${amount}` : `Transaction ${action}ed by admin`;
      const response = await fetch(`/api/v1/admin/transactions/${transactionId}/${action}?admin_notes=${encodeURIComponent(adminNotes)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        await fetchTransactions();
        await fetchPendingTransactions();
        toast.success(`Transaction ${action}ed successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.detail || `Failed to ${action} transaction`);
      }
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      toast.error(`Error ${action}ing transaction`);
    }
  };
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN');
  };
  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800'
    };
    const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';
    const colorKey = status ? status.toLowerCase() : 'unknown';
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || statusColors[colorKey] || 'bg-gray-100 text-gray-800'}`}>
        {statusText}
      </span>
    );
  };
  const getTypeBadge = (type) => {
    const typeColors = {
      deposit: 'bg-green-100 text-green-800',
      withdrawal: 'bg-red-100 text-red-800',
      bet: 'bg-blue-100 text-blue-800',
      win: 'bg-purple-100 text-purple-800',
      DEPOSIT: 'bg-green-100 text-green-800',
      WITHDRAWAL: 'bg-red-100 text-red-800',
      BET: 'bg-blue-100 text-blue-800',
      WIN: 'bg-purple-100 text-purple-800'
    };
    const typeText = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Unknown';
    const colorKey = type ? type.toLowerCase() : 'unknown';
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[type] || typeColors[colorKey] || 'bg-gray-100 text-gray-800'}`}>
        {typeText}
      </span>
    );
  };
  const filteredTransactions = transactions.filter(transaction => {
    if (filter.type !== 'all' && transaction.type !== filter.type) return false;
    if (filter.status !== 'all' && transaction.status !== filter.status) return false;
    if (filter.user_id && !transaction.user_id.toString().includes(filter.user_id)) return false;
    return true;
  });
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Wallet Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded ${activeTab === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Pending ({pendingTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded ${activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            All Transactions
          </button>
        </div>
      </div>
      {/* Filters */}
      {activeTab === 'all' && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="bet">Bet</option>
                <option value="win">Win</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="text"
                value={filter.user_id}
                onChange={(e) => setFilter(prev => ({ ...prev, user_id: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Enter user ID"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({ type: 'all', status: 'all', user_id: '', start_date: '', end_date: '' })}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">
            {activeTab === 'pending' ? 'Pending Transactions' : 'All Transactions'}
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center">Loading transactions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === 'pending' ? pendingTransactions : filteredTransactions).map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">#{transaction.id}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        <div className="font-medium">{transaction.user?.username || `User #${transaction.user_id}`}</div>
                        <div className="text-sm text-gray-500">ID: {transaction.user?.id || transaction.user_id}</div>
                        {transaction.user?.phone && <div className="text-sm text-gray-500">{transaction.user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getTypeBadge(transaction.transaction_type || transaction.type)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`font-medium ${(transaction.transaction_type || transaction.type) === 'WITHDRAWAL' || (transaction.transaction_type || transaction.type) === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                        {(transaction.transaction_type || transaction.type) === 'WITHDRAWAL' || (transaction.transaction_type || transaction.type) === 'withdrawal' ? '-' : '+'}{formatAmount(transaction.amount)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{formatDate(transaction.created_at)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{transaction.reference_id || transaction.reference_number || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      {(transaction.status === 'PENDING' || transaction.status === 'pending') ? (
                        <div className="flex flex-col gap-2">
                          {/* Transaction Details */}
                          <div className="text-xs text-gray-600 mb-2">
                            <div><strong>Description:</strong> {transaction.description || 'N/A'}</div>
                            {transaction.payment_proof_url && (
                              <div><strong>Proof:</strong> <a href={transaction.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>
                            )}
                            {transaction.deposit_method && (
                              <div><strong>Method:</strong> {transaction.deposit_method}</div>
                            )}
                            {transaction.admin_notes && (
                              <div><strong>Notes:</strong> {transaction.admin_notes}</div>
                            )}
                          </div>
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTransactionAction(transaction.id, 'approve')}
                              className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                              title="Approve this transaction"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleTransactionAction(transaction.id, 'reject')}
                              className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                              title="Reject this transaction"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">
                          {transaction.status === 'APPROVED' && '✓ Approved'}
                          {transaction.status === 'REJECTED' && '✗ Rejected'}
                          {transaction.status === 'COMPLETED' && '✓ Completed'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(activeTab === 'pending' ? pendingTransactions : filteredTransactions).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {activeTab === 'pending' ? 'No pending transactions' : 'No transactions found'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminWalletManagement;
