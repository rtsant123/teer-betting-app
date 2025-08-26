import React, { useState, useContext, useEffect, useCallback } from 'react';
import { WalletContext } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import walletService from '../services/wallet';
import paymentService from '../services/payment';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Wallet as WalletIcon, 
  Plus, 
  Minus, 
  History, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

const Wallet = () => {
  const { isAuthenticated } = useAuth();
  const { balance, getBalance } = useContext(WalletContext);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  
  // UI state
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Payment methods
  const [depositMethods, setDepositMethods] = useState([]);
  const [withdrawMethods, setWithdrawMethods] = useState([]);
  
  // Form data
  const [depositForm, setDepositForm] = useState({
    amount: '',
    payment_method_id: '',
    transaction_details: {}
  });
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    payment_method_id: '',
    transaction_details: {}
  });

  const loadTransactions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await walletService.getTransactions();
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      if (error.response?.status === 401) {
        toast.error('Please login again to access wallet');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
      loadPaymentMethods();
      getBalance();
    }
  }, [isAuthenticated, getBalance, loadTransactions]);

  const loadPaymentMethods = async () => {
    try {
      const [depositResponse, withdrawResponse] = await Promise.all([
        paymentService.getDepositMethods(),
        paymentService.getWithdrawalMethods()
      ]);
      setDepositMethods(depositResponse.data || []);
      setWithdrawMethods(withdrawResponse.data || []);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handleDeposit = async (e) => {
    if (e) e.preventDefault();
    
    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!depositForm.payment_method_id) {
      toast.error('Please select a payment method');
      return;
    }

    setLoading(true);
    try {
      await walletService.deposit({
        amount: parseFloat(depositForm.amount),
        payment_method_id: parseInt(depositForm.payment_method_id),
        transaction_details: depositForm.transaction_details
      });
      
      toast.success('Deposit request submitted successfully!');
      setDepositForm({ amount: '', payment_method_id: '', transaction_details: {} });
      loadTransactions();
      getBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit deposit request');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    if (e) e.preventDefault();
    
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!withdrawForm.payment_method_id) {
      toast.error('Please select a payment method');
      return;
    }
    if (parseFloat(withdrawForm.amount) > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await walletService.withdraw({
        amount: parseFloat(withdrawForm.amount),
        payment_method_id: parseInt(withdrawForm.payment_method_id),
        transaction_details: withdrawForm.transaction_details
      });
      
      toast.success('Withdrawal request submitted successfully!');
      setWithdrawForm({ amount: '', payment_method_id: '', transaction_details: {} });
      loadTransactions();
      getBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="text-center">
          <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please Login</h2>
          <p className="text-muted">You need to be logged in to access your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <HeaderBar />
      
      {/* Hero Section - Modern Balance Overview */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <WalletIcon className="w-12 h-12 text-white mr-3" />
              <h1 className="text-3xl font-bold text-white">My Wallet</h1>
            </div>
            
            {/* Balance Card - Modern Design */}
            <Card className="max-w-md mx-auto bg-white/10 backdrop-blur-md border-white/20 card">
              <CardContent className="card-content p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <p className="text-white/90 text-lg font-medium">Available Balance</p>
                  <button
                    className="ml-3 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    onClick={() => setShowBalance(!showBalance)}
                  >
                    {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-4xl font-bold text-white mb-6">
                  {showBalance ? `₹${balance?.toLocaleString() || '0'}` : '₹****'}
                </div>
                
                {/* Quick Actions - Modern Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className="btn btn-success"
                  >
                    <ArrowDownLeft className="w-4 h-4 mr-2" />
                    Add Money
                  </button>
                  <button
                    onClick={() => setActiveTab('withdraw')}
                    className="btn btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Withdraw
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content - Modern Layout */}
      <div className="container content-with-bottom-nav">
        {/* Navigation Tabs - Modern Design */}
        <Card className="mb-6 card">
          <CardContent className="card-content p-0">
            <div className="flex border-b border-gray-200">
              {[
                { id: 'overview', label: 'Overview', icon: WalletIcon },
                { id: 'transactions', label: 'Transactions', icon: History },
                { id: 'deposit', label: 'Add Money', icon: Plus },
                { id: 'withdraw', label: 'Withdraw', icon: Minus }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-link whitespace-nowrap ${
                    activeTab === tab.id ? 'active' : ''
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab - Modern Stats */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards - Modern Design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="stats-card">
                  <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-success-600" />
                  </div>
                  <div className="stats-number text-success-600">
                    ₹{transactions
                      .filter(t => t.type === 'deposit' && t.status === 'completed')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString()}
                  </div>
                  <div className="stats-label">Total Deposits</div>
                </div>

                <div className="stats-card">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingDown className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="stats-number text-primary-600">
                    ₹{transactions
                      .filter(t => t.type === 'withdrawal' && t.status === 'completed')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString()}
                  </div>
                  <div className="stats-label">Total Withdrawals</div>
                </div>

                <div className="stats-card">
                  <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div className="stats-number text-secondary-600">{transactions.length}</div>
                  <div className="stats-label">Total Transactions</div>
                </div>
              </div>

              <Card className="card">
                <CardHeader className="card-header">
                  <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                  <CardDescription>Your latest wallet transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No transactions yet</p>
                      <p className="text-sm">Start by adding money to your wallet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                              transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {transaction.type === 'deposit' ? 
                                <ArrowDownLeft className="w-5 h-5 text-green-600" /> : 
                                <ArrowUpRight className="w-5 h-5 text-red-600" />
                              }
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'deposit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                            </p>
                            <div className="flex items-center">
                              {transaction.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500 mr-1" />}
                              {transaction.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500 mr-1" />}
                              {transaction.status === 'rejected' && <XCircle className="w-4 h-4 text-red-500 mr-1" />}
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {transactions.length > 5 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setActiveTab('transactions')}
                        >
                          View All Transactions
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <Card className="card">
              <CardHeader className="card-header">
                <CardTitle className="text-success-600 text-xl font-bold">Add Money to Wallet</CardTitle>
                <CardDescription>Choose a payment method and add funds to your account</CardDescription>
              </CardHeader>
              <CardContent className="card-content space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={depositForm.amount}
                        onChange={(e) => setDepositForm({...depositForm, amount: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <select
                        value={depositForm.payment_method_id}
                        onChange={(e) => setDepositForm({...depositForm, payment_method_id: e.target.value})}
                        className="form-input"
                      >
                        <option value="">Select payment method</option>
                        {depositMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.type === 'UPI' ? '📱' : '🏦'} {method.name} ({method.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleDeposit}
                      loading={loading}
                      disabled={!depositForm.amount || !depositForm.payment_method_id}
                    >
                      Add ₹{depositForm.amount || '0'} to Wallet
                    </Button>
                  </div>

                  {depositForm.payment_method_id && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      {(() => {
                        const method = depositMethods.find(m => m.id === parseInt(depositForm.payment_method_id));
                        return method ? (
                          <div>
                            <h4 className="font-medium text-blue-900 mb-3">Payment Details:</h4>
                            {method.type === 'UPI' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">UPI ID:</span>
                                  <div className="flex items-center">
                                    <code className="bg-white px-2 py-1 rounded text-sm">{method.details.upi_id}</code>
                                    <Button size="sm" variant="ghost" className="ml-2 p-1">
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                {method.details.qr_code_url && (
                                  <div className="text-center">
                                    <p className="text-sm font-medium mb-2">QR Code:</p>
                                    <img 
                                      src={method.details.qr_code_url.startsWith('http') ? method.details.qr_code_url : `/uploads/${method.details.qr_code_url}`} 
                                      alt="QR Code" 
                                      className="w-40 h-40 mx-auto border border-gray-200 rounded-lg object-contain bg-white p-2" 
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'block';
                                      }}
                                    />
                                    <div style={{display: 'none'}} className="text-red-500 text-sm mt-2">QR Code not available</div>
                                  </div>
                                )}
                              </div>
                            )}
                            {method.instructions && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                <strong>Instructions:</strong> {method.instructions}
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Withdraw Money</CardTitle>
                <CardDescription>Withdraw funds from your wallet to your preferred payment method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Withdrawal Information:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>Minimum withdrawal amount: ₹100</li>
                        <li>Processing time: 1-3 business days</li>
                        <li>Withdrawals are processed during business hours</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={withdrawForm.amount}
                        onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                        className="form-input"
                      />
                      <small className="form-success">Available: ₹{balance?.toLocaleString() || '0'}</small>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <select
                        value={withdrawForm.payment_method_id}
                        onChange={(e) => setWithdrawForm({...withdrawForm, payment_method_id: e.target.value})}
                        className="form-input"
                      >
                        <option value="">Select payment method</option>
                        {withdrawMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.type === 'UPI' ? '📱' : '🏦'} {method.name} ({method.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="btn btn-danger w-full"
                      onClick={handleWithdraw}
                      disabled={loading || !withdrawForm.amount || !withdrawForm.payment_method_id || parseFloat(withdrawForm.amount) > balance}
                    >
                      {loading ? 'Processing...' : `Withdraw ₹${withdrawForm.amount || '0'}`}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All your wallet transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                    <p className="mb-4">Start by adding money to your wallet</p>
                    <Button onClick={() => setActiveTab('deposit')}>
                      Add Money Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                              transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {transaction.type === 'deposit' ? 
                                <ArrowDownLeft className="w-6 h-6 text-green-600" /> : 
                                <ArrowUpRight className="w-6 h-6 text-red-600" />
                              }
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 capitalize">{transaction.type}</h4>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                              {transaction.status === 'pending' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Status: Processing
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${
                              transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'deposit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                            </p>
                            <div className="flex items-center justify-end mt-1">
                              {transaction.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500 mr-1" />}
                              {transaction.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500 mr-1" />}
                              {transaction.status === 'rejected' && <XCircle className="w-4 h-4 text-red-500 mr-1" />}
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Wallet;
