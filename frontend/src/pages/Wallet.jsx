import React, { useState, useEffect, useCallback } from 'react';
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
  Copy,
  Upload,
  Image as ImageIcon,
  CreditCard,
  Smartphone,
  FileText,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const Wallet = () => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  
  // UI state
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Payment methods
  const [depositMethods, setDepositMethods] = useState([]);
  const [withdrawMethods, setWithdrawMethods] = useState([]);
  
  // Form data - Enhanced with required fields
  const [depositForm, setDepositForm] = useState({
    amount: '',
    payment_method_id: '',
    transaction_id: '',
    screenshot: null,
    notes: '',
    transaction_details: {}
  });
  
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    payment_method_id: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    notes: '',
    transaction_details: {}
  });

  // Form validation and UI states
  const [depositFormErrors, setDepositFormErrors] = useState({});
  const [withdrawFormErrors, setWithdrawFormErrors] = useState({});
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Get balance function
  const getBalance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await walletService.getBalance();
      setBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  }, [isAuthenticated]);

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
      // Add timestamp to bypass cache
      const timestamp = Date.now();
      const [depositResponse, withdrawResponse] = await Promise.all([
        paymentService.getDepositMethods(`?_t=${timestamp}`),
        paymentService.getWithdrawalMethods(`?_t=${timestamp}`)
      ]);
      
      const depositMethods = depositResponse.data || [];
      const withdrawMethods = withdrawResponse.data || [];
      
      setDepositMethods(depositMethods);
      setWithdrawMethods(withdrawMethods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  // Refresh balance function
  const refreshBalance = async () => {
    setLoading(true);
    try {
      await getBalance();
      toast.success('Balance refreshed');
    } catch (error) {
      toast.error('Failed to refresh balance');
    } finally {
      setLoading(false);
    }
  };

  // Handle screenshot upload
  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size should be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload only JPG or PNG files');
        return;
      }
      
      setDepositForm({ ...depositForm, screenshot: file });
      toast.success('Screenshot uploaded successfully');
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  // Form validation functions
  const validateDepositForm = () => {
    const errors = {};
    
    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    if (parseFloat(depositForm.amount) < 10) {
      errors.amount = 'Minimum deposit amount is ₹10';
    }
    if (!depositForm.payment_method_id) {
      errors.payment_method_id = 'Please select a payment method';
    }
    if (!depositForm.transaction_id.trim()) {
      errors.transaction_id = 'Please enter transaction ID/reference number';
    }
    
    setDepositFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateWithdrawForm = () => {
    const errors = {};
    
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    if (parseFloat(withdrawForm.amount) < 100) {
      errors.amount = 'Minimum withdrawal amount is ₹100';
    }
    if (parseFloat(withdrawForm.amount) > balance) {
      errors.amount = 'Insufficient balance';
    }
    if (!withdrawForm.payment_method_id) {
      errors.payment_method_id = 'Please select a payment method';
    }

    const selectedMethod = withdrawMethods.find(m => m.id === parseInt(withdrawForm.payment_method_id));
    if (selectedMethod) {
      if (selectedMethod.type === 'BANK_TRANSFER') {
        if (!withdrawForm.account_holder_name.trim()) {
          errors.account_holder_name = 'Please enter account holder name';
        }
        if (!withdrawForm.account_number.trim()) {
          errors.account_number = 'Please enter account number';
        }
        if (!withdrawForm.ifsc_code.trim()) {
          errors.ifsc_code = 'Please enter IFSC code';
        }
      } else if (selectedMethod.type === 'UPI') {
        if (!withdrawForm.upi_id.trim()) {
          errors.upi_id = 'Please enter UPI ID';
        }
      }
    }
    
    setWithdrawFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // File handling for screenshots
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setDepositForm(prev => ({ ...prev, screenshot: file }));
    }
  };

  const handleDeposit = async (e) => {
    if (e) e.preventDefault();
    
    if (!validateDepositForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('amount', parseFloat(depositForm.amount));
      formData.append('payment_method_id', parseInt(depositForm.payment_method_id));
      formData.append('transaction_id', depositForm.transaction_id);
      formData.append('notes', depositForm.notes || '');
      
      if (depositForm.screenshot) {
        formData.append('screenshot', depositForm.screenshot);
      }

      await walletService.deposit(formData);
      
      toast.success('Deposit request submitted successfully!');
      setDepositForm({ 
        amount: '', 
        payment_method_id: '', 
        transaction_id: '',
        screenshot: null,
        notes: '',
        transaction_details: {} 
      });
      setDepositFormErrors({});
      setShowDepositForm(false);
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
    
    if (!validateWithdrawForm()) {
      return;
    }

    setLoading(true);
    try {
      const withdrawData = {
        amount: parseFloat(withdrawForm.amount),
        payment_method_id: parseInt(withdrawForm.payment_method_id),
        notes: withdrawForm.notes || '',
        transaction_details: {
          account_holder_name: withdrawForm.account_holder_name,
          account_number: withdrawForm.account_number,
          ifsc_code: withdrawForm.ifsc_code,
          upi_id: withdrawForm.upi_id
        }
      };

      await walletService.withdraw(withdrawData);
      
      toast.success('Withdrawal request submitted successfully!');
      setWithdrawForm({ 
        amount: '', 
        payment_method_id: '',
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        upi_id: '',
        notes: '',
        transaction_details: {} 
      });
      setWithdrawFormErrors({});
      setShowWithdrawForm(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <HeaderBar />
      
      {/* Main Content - Mobile First Design */}
      <div className="px-3 sm:px-4 pt-20 pb-24 max-w-4xl mx-auto">
        {/* Mobile-Optimized Balance Card */}
        <div className="mb-4 sm:mb-6">
          <Card className="card-gradient overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              {/* Mobile Layout - Stacked */}
              <div className="block sm:hidden">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <WalletIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-white mb-2">My Wallet</h2>
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="text-2xl font-bold text-white">
                      {showBalance ? `₹${(balance || 0).toLocaleString()}` : '••••••'}
                    </div>
                    <button 
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-white/80 hover:text-white transition-colors p-1 rounded"
                    >
                      {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={refreshBalance}
                      className="text-white/80 hover:text-white transition-colors p-1 rounded"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setActiveTab('deposit')}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm py-3"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Money
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('withdraw')}
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-sm py-3"
                    size="sm"
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    Withdraw
                  </Button>
                </div>
              </div>

              {/* Desktop Layout - Horizontal */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <WalletIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">My Wallet</h2>
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl font-bold text-white">
                        {showBalance ? `₹${(balance || 0).toLocaleString()}` : '••••••'}
                      </div>
                      <button 
                        onClick={() => setShowBalance(!showBalance)}
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={refreshBalance}
                        className="text-white/80 hover:text-white transition-colors"
                        disabled={loading}
                      >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setActiveTab('deposit')}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Money
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('withdraw')}
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                    size="sm"
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-Optimized Navigation Tabs */}
        <Card className="mb-4 sm:mb-6 card">
          <CardContent className="p-0">
            {/* Mobile - Compact horizontal tabs */}
            <div className="sm:hidden">
              <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
                {[
                  { id: 'overview', label: 'Overview', icon: WalletIcon },
                  { id: 'transactions', label: 'History', icon: History },
                  { id: 'deposit', label: 'Deposit', icon: Plus },
                  { id: 'withdraw', label: 'Withdraw', icon: Minus }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-3 min-w-[70px] text-xs font-medium transition-colors ${
                      activeTab === tab.id 
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mb-1" />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop - Standard horizontal layout */}
            <div className="hidden sm:flex border-b border-gray-200">
              {[
                { id: 'overview', label: 'Overview', icon: WalletIcon },
                { id: 'transactions', label: 'Transactions', icon: History },
                { id: 'deposit', label: 'Add Money', icon: Plus },
                { id: 'withdraw', label: 'Withdraw', icon: Minus }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-link flex-1 ${
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

          {/* Deposit Tab - Enhanced Mobile-First Design */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="pb-3 sm:pb-4 mobile-card-padding">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-green-700 text-lg sm:text-xl font-bold">Add Money to Wallet</CardTitle>
                      <CardDescription className="text-green-600 text-sm sm:text-base">Quick and secure deposit process</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 sm:space-y-6 mobile-card-padding">
                  <form onSubmit={handleDeposit} className="space-y-4 sm:space-y-6">
                    {/* Amount Input - Mobile Optimized */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-lg">₹</span>
                        <input
                          type="number"
                          placeholder="Enter amount (min ₹10)"
                          value={depositForm.amount}
                          onChange={(e) => {
                            setDepositForm({...depositForm, amount: e.target.value});
                            if (depositFormErrors.amount) {
                              setDepositFormErrors({...depositFormErrors, amount: ''});
                            }
                          }}
                          className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-3 sm:py-4 text-lg font-semibold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all mobile-form-input ${
                            depositFormErrors.amount ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                          }`}
                        />
                      </div>
                      {depositFormErrors.amount && (
                        <p className="text-red-500 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {depositFormErrors.amount}
                        </p>
                      )}
                    </div>

                    {/* Payment Method Selection - Mobile Optimized */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={depositForm.payment_method_id}
                        onChange={(e) => {
                          setDepositForm({...depositForm, payment_method_id: e.target.value});
                          if (depositFormErrors.payment_method_id) {
                            setDepositFormErrors({...depositFormErrors, payment_method_id: ''});
                          }
                        }}
                        className={`w-full px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all mobile-form-select ${
                          depositFormErrors.payment_method_id ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <option value="">Select payment method</option>
                        {depositMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.type === 'UPI' ? '📱' : method.type === 'BANK_TRANSFER' ? '🏦' : '💳'} {method.name} ({method.type})
                          </option>
                        ))}
                      </select>
                      {depositFormErrors.payment_method_id && (
                        <p className="text-red-500 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {depositFormErrors.payment_method_id}
                        </p>
                      )}
                    </div>

                    {/* Payment Details Display - Mobile Optimized */}
                    {depositForm.payment_method_id && (
                      <div className="bg-white border-2 border-blue-200 rounded-xl p-3 sm:p-6 space-y-3 sm:space-y-4 mobile-card-padding">
                        {(() => {
                          const method = depositMethods.find(m => m.id === parseInt(depositForm.payment_method_id));
                          return method ? (
                            <>
                              <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  {method.type === 'UPI' ? <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> : <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                                </div>
                                <div>
                                  <h4 className="font-bold text-blue-900 text-sm sm:text-base">{method.name}</h4>
                                  <p className="text-xs sm:text-sm text-blue-600">Payment Details</p>
                                </div>
                              </div>
                              
                              {method.type === 'UPI' && method.details && (
                                <div className="space-y-3 sm:space-y-4">
                                  {method.details.upi_id && (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-blue-50 rounded-lg space-y-2 sm:space-y-0">
                                      <div className="flex-1">
                                        <span className="text-xs sm:text-sm font-medium text-blue-700">UPI ID:</span>
                                        <p className="font-mono text-sm sm:text-lg font-bold text-blue-900 break-all">{method.details.upi_id}</p>
                                      </div>
                                      <Button 
                                        type="button"
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => copyToClipboard(method.details.upi_id)}
                                        className="flex items-center space-x-1 text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start"
                                      >
                                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span>Copy</span>
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {method.details && method.details.image_url && (
                                    <div className="text-center">
                                      <p className="text-xs sm:text-sm font-semibold text-blue-700 mb-3">Payment Method:</p>
                                      <div className="inline-block p-2 sm:p-4 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
                                        <img 
                                          src={method.details.image_url} 
                                          alt="Payment Method Image" 
                                          className="w-32 h-32 sm:w-48 sm:h-48 mx-auto object-contain"
                                          onLoad={() => console.log('User wallet image loaded successfully:', method.details.image_url)}
                                          onError={(e) => {
                                            console.error('User wallet image failed to load:', e.target.src);
                                            e.target.style.display = 'none';
                                            const errorDiv = e.target.nextElementSibling;
                                            if (errorDiv) errorDiv.style.display = 'flex';
                                          }}
                                        />
                                        <div className="hidden flex-col items-center justify-center w-32 h-32 sm:w-48 sm:h-48 text-red-500 bg-red-50 rounded-lg border-2 border-red-200">
                                          <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 mb-2" />
                                          <p className="text-xs sm:text-sm">Image not available</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {method.instructions && (
                                <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-start space-x-2">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs sm:text-sm font-semibold text-amber-800">Instructions:</p>
                                      <p className="text-xs sm:text-sm text-amber-700 mt-1">{method.instructions}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Transaction ID Input - Mobile Optimized */}
                    {depositForm.payment_method_id && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Transaction ID / Reference Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter transaction ID after payment"
                          value={depositForm.transaction_id}
                          onChange={(e) => {
                            setDepositForm({...depositForm, transaction_id: e.target.value});
                            if (depositFormErrors.transaction_id) {
                              setDepositFormErrors({...depositFormErrors, transaction_id: ''});
                            }
                          }}
                          className={`w-full px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all mobile-form-input ${
                            depositFormErrors.transaction_id ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                          }`}
                        />
                        {depositFormErrors.transaction_id && (
                          <p className="text-red-500 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {depositFormErrors.transaction_id}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Screenshot Upload - Mobile Optimized */}
                    {depositForm.payment_method_id && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Payment Screenshot (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 sm:p-6 text-center hover:border-green-400 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            className="hidden"
                            id="screenshot-upload"
                          />
                          <label htmlFor="screenshot-upload" className="cursor-pointer">
                            <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-4" />
                            <p className="text-sm sm:text-base text-gray-600 font-medium">Click to upload payment screenshot</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                          </label>
                          {depositForm.screenshot && (
                            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs sm:text-sm text-green-700 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Screenshot uploaded successfully
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submit Button - Mobile Optimized */}
                    <Button 
                      type="submit" 
                      disabled={loading || !depositForm.payment_method_id}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl mobile-form-button"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Add Money to Wallet
                        </div>
                      )}
                    </Button>

                    {/* Notes Input */}
                    {depositForm.payment_method_id && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          placeholder="Any additional information..."
                          value={depositForm.notes}
                          onChange={(e) => setDepositForm({...depositForm, notes: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button 
                        type="submit"
                        className="w-full py-4 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        disabled={loading || !depositForm.amount || !depositForm.payment_method_id || !depositForm.transaction_id}
                      >
                        {loading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Plus className="w-5 h-5" />
                            <span>Add ₹{depositForm.amount || '0'} to Wallet</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
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
                        {withdrawMethods.length === 0 && (
                          <option value="" disabled>No withdrawal methods available</option>
                        )}
                        {withdrawMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.type === 'UPI' ? '📱' : '🏦'} {method.name} ({method.type})
                          </option>
                        ))}
                      </select>
                      {withdrawMethods.length === 0 && (
                        <small className="form-error">No payment methods available for withdrawal</small>
                      )}
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
