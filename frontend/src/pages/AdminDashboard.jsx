import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Settings, 
  Users, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Activity,
  Shield,
  Banknote,
  Home,
  Calendar,
  Gift,
  CheckCircle,
  RefreshCw,
  BarChart3,
  FileText,
  Eye,
  LogOut
} from 'lucide-react';

// Import admin components
import AdminPayoutDeadlineControl from '../components/admin/AdminPayoutDeadlineControl';
import AdminBannerManagement from '../components/admin/AdminBannerManagement';
import AdminPaymentMethodManagement from '../components/admin/AdminPaymentMethodManagement';
import AdminWalletManagement from '../components/admin/AdminWalletManagement';
import AdminHouseManagement from '../components/admin/AdminHouseManagement';
import AdminRoundsManagement from '../components/admin/AdminRoundsManagement';
import AdminReferralManagement from '../components/admin/AdminReferralManagement';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Results management state
  const [pendingResults, setPendingResults] = useState([]);
  const [latestResults, setLatestResults] = useState([]);
  const [publishingResult, setPublishingResult] = useState(null);
  const [resultValues, setResultValues] = useState({}); // Changed to handle multiple inputs

  // Users management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [usersLimit, setUsersLimit] = useState(50);
  const [expandedUsers, setExpandedUsers] = useState([]);

  // Admin users management state
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    username: '',
    phone: '',
    password: '',
    role: 'ADMIN'
  });

  // Task management state
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    user_id: '',
    task_type: 'RESULT_MANAGEMENT',
    task_description: '',
    priority: 'MEDIUM',
    due_date: ''
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResultsData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    try {
      const [pendingRes, latestRes] = await Promise.all([
        fetch('/api/v1/admin/results/pending', { headers }),
        fetch('/api/v1/admin/results/latest?limit=10', { headers })
      ]);
      if (pendingRes.ok) {
        const pending = await pendingRes.json();
        setPendingResults(pending);
      }
      if (latestRes.ok) {
        const latest = await latestRes.json();
        setLatestResults(latest);
      }
    } catch (error) {
      console.error('Error fetching results data:', error);
    }
  }, []);

  useEffect(() => {
    if (!user || !user.is_admin) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
    fetchResultsData();
  }, [user, navigate, fetchDashboardData, fetchResultsData]);

  const publishResult = async (roundId) => {
    const resultValue = resultValues[roundId];
    if (!resultValue || resultValue < 0 || resultValue > 99) {
      toast.error('Please enter a valid result (0-99)');
      return;
    }
    setPublishingResult(roundId);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/results/${roundId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result: parseInt(resultValue) })
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Result published! ${data.total_winners} winners processed`);
        setResultValues(prev => ({ ...prev, [roundId]: '' }));
        setPublishingResult(null);
        fetchResultsData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to publish result');
      }
    } catch (error) {
      console.error('Error publishing result:', error);
      toast.error('Failed to publish result');
    } finally {
      setPublishingResult(null);
    }
  };

  const handleUpdateRoundStatuses = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/v1/admin/schedule/update-statuses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await response.json(); // Status update successful
        toast.success('Round statuses updated successfully');
        // Refresh the results data to show any newly pending rounds
        await fetchResultsData();
      } else {
        toast.error('Failed to update round statuses');
      }
    } catch (error) {
      console.error('Error updating round statuses:', error);
      toast.error('Failed to update round statuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/users?limit=${usersLimit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const error = await response.json();
        setUsersError(error.detail || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsersError('Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  }, [usersLimit]);

  const toggleUserDetails = (userId) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Fetch users when users tab is active
  // Admin user management functions
  const fetchAdminUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/v1/admin/users?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const adminUserList = data.filter(userStat => userStat.user.is_admin);
        setAdminUsers(adminUserList);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    } finally {
      setAdminUsersLoading(false);
    }
  }, []);

  const createAdminUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/v1/admin/users/create-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdminData)
      });
      
      if (response.ok) {
        toast.success('Admin user created successfully');
        setShowCreateAdminForm(false);
        setNewAdminData({
          username: '',
          phone: '',
          password: '',
          role: 'ADMIN'
        });
        fetchAdminUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create admin user');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      toast.error('Failed to create admin user');
    }
  };

  // Task management functions
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/v1/admin/tasks/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const fetchMyTasks = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/v1/admin/tasks/my-tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyTasks(data);
      }
    } catch (error) {
      console.error('Error fetching my tasks:', error);
    }
  }, []);

  const assignTask = async () => {
    const token = localStorage.getItem('token');
    try {
      const taskPayload = {
        ...newTaskData,
        user_id: parseInt(newTaskData.user_id),
        due_date: newTaskData.due_date ? new Date(newTaskData.due_date).toISOString() : null
      };
      
      const response = await fetch('/api/v1/admin/tasks/assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskPayload)
      });
      
      if (response.ok) {
        toast.success('Task assigned successfully');
        setShowTaskForm(false);
        setNewTaskData({
          user_id: '',
          task_type: 'RESULT_MANAGEMENT',
          task_description: '',
          priority: 'MEDIUM',
          due_date: ''
        });
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to assign task');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Failed to assign task');
    }
  };

  const updateTaskStatus = async (taskId, status, completionNotes = '') => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/tasks/${taskId}/status?status=${status}&completion_notes=${encodeURIComponent(completionNotes)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Task status updated');
        fetchTasks();
        fetchMyTasks();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  // Fetch users when tabs are active - moved after function definitions
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'admin-users') {
      fetchAdminUsers();
    } else if (activeTab === 'tasks') {
      fetchTasks();
      fetchMyTasks();
    }
  }, [activeTab, fetchUsers, fetchAdminUsers, fetchTasks, fetchMyTasks]);

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'admin-users', label: 'Admin Users', icon: Shield },
    { id: 'results', label: 'Results', icon: Target },
    { id: 'houses', label: 'Houses', icon: Home },
    { id: 'rounds', label: 'Rounds', icon: Calendar },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'wallet', label: 'Wallet', icon: DollarSign },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'banners', label: 'Banners', icon: FileText },
    { id: 'payments', label: 'Payments', icon: Banknote },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (!user || !user.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600 mb-2">Access Denied</CardTitle>
            <p className="text-gray-600 mb-4">You need admin privileges to access this page</p>
            <Button onClick={() => navigate('/login')} variant="danger">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm sm:text-base lg:text-lg mb-1">
                    <span className="hidden sm:inline">Total Users</span>
                    <span className="sm:hidden">Users</span>
                  </CardTitle>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                    {dashboardData?.total_users || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-sm sm:text-base lg:text-lg mb-1">
                    <span className="hidden sm:inline">Active Rounds</span>
                    <span className="sm:hidden">Rounds</span>
                  </CardTitle>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                    {dashboardData?.active_rounds || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" />
                  </div>
                  <CardTitle className="text-sm sm:text-base lg:text-lg mb-1">
                    <span className="hidden sm:inline">Pending Results</span>
                    <span className="sm:hidden">Pending</span>
                  </CardTitle>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
                    {pendingResults.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm sm:text-base lg:text-lg mb-1">
                    <span className="hidden sm:inline">Total Revenue</span>
                    <span className="sm:hidden">Revenue</span>
                  </CardTitle>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-purple-600">
                    ₹{dashboardData?.total_revenue?.toLocaleString() || '0'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Actions */}
            {pendingResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Urgent: Pending Results
                  </CardTitle>
                  <CardDescription>
                    {pendingResults.length} round(s) waiting for result publication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(pendingResults || []).slice(0, 3).map((round) => (
                      <div key={round.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {round.house_name} - {round.round_type}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Due: {formatDateTime(round.betting_closes_at)}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setActiveTab('results')}
                        >
                          Publish Result
                        </Button>
                      </div>
                    ))}
                    {pendingResults.length > 3 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setActiveTab('results')}
                      >
                        View All Pending Results
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                <CardDescription>Latest published results</CardDescription>
              </CardHeader>
              <CardContent>
                {latestResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent results</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(latestResults || []).slice(0, 5).map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {result.house_name} - {result.round_type}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(result.scheduled_time)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {result.result !== null && result.result !== undefined ? result.result.toString().padStart(2, '0') : 'N/A'}
                          </div>
                          <p className="text-xs text-gray-500">
                            {result.total_bets || 0} bets • {result.total_winners || 0} winners
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'results':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-red-600 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Pending Results ({pendingResults.length})
                    </CardTitle>
                    <CardDescription>
                      Rounds ready for result publishing. Note: Forecast results are automatically calculated when both FR and SR results are published.
                    </CardDescription>
                  </div>
                  <button
                    onClick={handleUpdateRoundStatuses}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Update Status
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingResults.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending results. All rounds are up to date.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(pendingResults || []).map((round) => (
                      <Card key={round.id} className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {round.house_name} - {round.round_type}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Scheduled: {formatDateTime(round.scheduled_time)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Betting closed: {formatDateTime(round.betting_closes_at)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Input
                                type="number"
                                min="0"
                                max="99"
                                placeholder="Result (0-99)"
                                value={resultValues[round.id] || ''}
                                onChange={(e) => {
                                  setResultValues(prev => ({
                                    ...prev,
                                    [round.id]: e.target.value
                                  }));
                                }}
                                className="w-32"
                              />
                              <Button
                                onClick={() => publishResult(round.id)}
                                loading={publishingResult === round.id}
                                disabled={!resultValues[round.id] || (resultValues[round.id] < 0 || resultValues[round.id] > 99)}
                                variant="danger"
                              >
                                Publish
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest Results */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                <CardDescription>Latest published results grouped by house and date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(latestResults || []).map((result, index) => (
                    <Card key={`${result.house_id}-${result.date}-${index}`} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* House and Date Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="w-4 h-4 text-blue-600" />
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {result.house_name}
                              </h4>
                              {result.is_complete && (
                                <div className="flex items-center text-green-600 text-sm">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Complete
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              📅 {new Date(result.date).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>

                          {/* FR and SR Results */}
                          <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                            {/* FR Result */}
                            <div className="bg-blue-50 rounded-lg p-4 min-w-[140px]">
                              <div className="text-center">
                                <div className="text-xs font-medium text-blue-600 mb-2">FIRST ROUND</div>
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <span className="text-2xl font-bold text-blue-700">
                                    {result.fr_result !== null && result.fr_result !== undefined 
                                      ? result.fr_result.toString().padStart(2, '0') 
                                      : '--'}
                                  </span>
                                </div>
                                <div className="text-xs text-blue-600">
                                  {result.fr_status === 'COMPLETED' ? '✓ Published' : 'Pending'}
                                </div>
                              </div>
                            </div>

                            {/* SR Result */}
                            <div className="bg-green-50 rounded-lg p-4 min-w-[140px]">
                              <div className="text-center">
                                <div className="text-xs font-medium text-green-600 mb-2">SECOND ROUND</div>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <span className="text-2xl font-bold text-green-700">
                                    {result.sr_result !== null && result.sr_result !== undefined 
                                      ? result.sr_result.toString().padStart(2, '0') 
                                      : '--'}
                                  </span>
                                </div>
                                <div className="text-xs text-green-600">
                                  {result.sr_status === 'COMPLETED' ? '✓ Published' : 'Pending'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Forecast Status */}
                        {result.is_complete && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Forecast Betting</span>
                              <div className="flex items-center text-purple-600">
                                <Target className="w-4 h-4 mr-1" />
                                Available for processing
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {(!latestResults || latestResults.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No published results yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'houses':
        return <AdminHouseManagement />;
      case 'rounds':
        return <AdminRoundsManagement />;
      case 'wallet':
        return <AdminWalletManagement />;
      case 'referrals':
        return <AdminReferralManagement />;
      case 'banners':
        return <AdminBannerManagement />;
      case 'payments':
        return <AdminPaymentMethodManagement />;
      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setUsersLimit(usersLimit === 100 ? 50 : 100)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Show {usersLimit === 100 ? '50' : '100'}
                </button>
                <button 
                  onClick={fetchUsers}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {usersLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : usersError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Error: {usersError}</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {users.map(userStat => (
                  <div key={userStat.user.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* User Info */}
                      <div className="lg:col-span-1">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            userStat.user.is_admin ? 'bg-purple-600' : userStat.user.is_active ? 'bg-green-600' : 'bg-gray-400'
                          }`}>
                            {userStat.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{userStat.user.username}</h3>
                            <p className="text-sm text-gray-600">{userStat.user.phone}</p>
                          </div>
                          {userStat.user.is_admin && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              Admin
                            </span>
                          )}
                          {!userStat.user.is_active && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Wallet Balance:</span>
                            <span className={`font-medium ${userStat.user.wallet_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{userStat.user.wallet_balance.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Profit/Loss:</span>
                            <span className={`font-medium ${userStat.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {userStat.profit_loss >= 0 ? '+' : ''}₹{userStat.profit_loss.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Member Since:</span>
                            <span className="text-sm font-medium">
                              {new Date(userStat.user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Betting Stats */}
                      <div className="lg:col-span-1">
                        <h4 className="font-semibold text-gray-900 mb-3">Betting Statistics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium">Total Bets</p>
                            <p className="text-lg font-bold text-blue-800">{userStat.total_bets}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-green-600 font-medium">Won Bets</p>
                            <p className="text-lg font-bold text-green-800">{userStat.won_bets}</p>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <p className="text-xs text-yellow-600 font-medium">Total Bet Amount</p>
                            <p className="text-lg font-bold text-yellow-800">₹{userStat.bet_amount.toFixed(0)}</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-xs text-purple-600 font-medium">Total Payouts</p>
                            <p className="text-lg font-bold text-purple-800">₹{userStat.payouts.toFixed(0)}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Direct:</span>
                            <span className="font-medium">{userStat.direct_bets}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">House:</span>
                            <span className="font-medium">{userStat.house_bets}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Ending:</span>
                            <span className="font-medium">{userStat.ending_bets}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Forecast:</span>
                            <span className="font-medium">{userStat.forecast_bets}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Stats */}
                      <div className="lg:col-span-1">
                        <h4 className="font-semibold text-gray-900 mb-3">Financial Overview</h4>
                        <div className="space-y-3">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-green-600 font-medium">Total Deposits</p>
                            <p className="text-lg font-bold text-green-800">₹{userStat.total_deposits.toFixed(2)}</p>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <p className="text-xs text-red-600 font-medium">Total Withdrawals</p>
                            <p className="text-lg font-bold text-red-800">₹{userStat.total_withdrawals.toFixed(2)}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 font-medium">Win Rate</p>
                            <p className="text-lg font-bold text-gray-800">
                              {userStat.total_bets > 0 ? ((userStat.won_bets / userStat.total_bets) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </div>

                        {/* Recent Activity Indicator */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Recent Bets:</span>
                            <span className="font-medium">{userStat.recent_bets.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Recent Transactions:</span>
                            <span className="font-medium">{userStat.recent_transactions.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Recent Activity */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => toggleUserDetails(userStat.user.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedUsers.includes(userStat.user.id) ? 'Hide' : 'Show'} Recent Activity
                      </button>
                      
                      {expandedUsers.includes(userStat.user.id) && (
                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Recent Bets */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Recent Bets</h5>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {userStat.recent_bets.length > 0 ? userStat.recent_bets.map(bet => (
                                <div key={bet.id} className="bg-gray-50 p-2 rounded text-sm">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{bet.bet_type}</span>
                                    <span className={`font-medium ${
                                      bet.status === 'WON' ? 'text-green-600' : 
                                      bet.status === 'LOST' ? 'text-red-600' : 'text-yellow-600'
                                    }`}>
                                      {bet.status}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-gray-600">
                                    <span>₹{bet.total_bet_amount}</span>
                                    <span>{new Date(bet.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-gray-500 text-sm">No recent bets</p>
                              )}
                            </div>
                          </div>

                          {/* Recent Transactions */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Recent Transactions</h5>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {userStat.recent_transactions.length > 0 ? userStat.recent_transactions.map(trans => (
                                <div key={trans.id} className="bg-gray-50 p-2 rounded text-sm">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{trans.transaction_type}</span>
                                    <span className={`font-medium ${
                                      trans.transaction_type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {trans.transaction_type === 'DEPOSIT' ? '+' : '-'}₹{trans.amount}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-gray-600">
                                    <span>{trans.status}</span>
                                    <span>{new Date(trans.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-gray-500 text-sm">No recent transactions</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'admin-users':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Admin User Management</h2>
              <Button 
                onClick={() => setShowCreateAdminForm(true)}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Create Admin User</span>
                <span className="sm:hidden">Create Admin</span>
              </Button>
            </div>

            {/* Create Admin User Form */}
            {showCreateAdminForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Create New Admin User</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Create a new admin user with specific role and permissions. After creation, you can assign tasks to them in the Tasks section.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Username
                      </label>
                      <Input
                        type="text"
                        value={newAdminData.username}
                        onChange={(e) => setNewAdminData(prev => ({...prev, username: e.target.value}))}
                        placeholder="Enter username"
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        value={newAdminData.phone}
                        onChange={(e) => setNewAdminData(prev => ({...prev, phone: e.target.value}))}
                        placeholder="Enter phone number"
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Password
                      </label>
                      <Input
                        type="password"
                        value={newAdminData.password}
                        onChange={(e) => setNewAdminData(prev => ({...prev, password: e.target.value}))}
                        placeholder="Enter password"
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Role & Permissions
                      </label>
                      <select
                        value={newAdminData.role}
                        onChange={(e) => setNewAdminData(prev => ({...prev, role: e.target.value}))}
                        className="w-full p-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ADMIN">Admin - Full system access & user management</option>
                        <option value="SUPER_AGENT">Super Agent - Results, payments & user verification</option>
                        <option value="AGENT">Agent - Basic results verification & support</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateAdminForm(false)}
                      className="w-full sm:w-auto text-sm sm:text-base"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={createAdminUser}
                      disabled={!newAdminData.username || !newAdminData.phone || !newAdminData.password}
                      className="w-full sm:w-auto text-sm sm:text-base"
                    >
                      <span className="hidden sm:inline">Create Admin User</span>
                      <span className="sm:hidden">Create Admin</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Users List */}
            {adminUsersLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {adminUsers.map(userStat => (
                  <Card key={userStat.user.id} className="border-purple-200">
                    <CardContent className="p-3 sm:p-4 lg:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                            {userStat.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 sm:flex-none">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{userStat.user.username}</h3>
                            <p className="text-xs sm:text-sm text-gray-600">{userStat.user.phone}</p>
                            <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                Admin
                              </span>
                              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {userStat.user.role || 'ADMIN'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <p className="text-xs sm:text-sm text-gray-600">
                            <span className="sm:hidden">Since: </span>
                            <span className="hidden sm:inline">Member since: </span>
                            {new Date(userStat.user.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Status: <span className={userStat.user.is_active ? 'text-green-600' : 'text-red-600'}>
                              {userStat.user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {adminUsers.length === 0 && (
                  <div className="text-center py-6 sm:py-8 text-gray-500">
                    <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No admin users found</p>
                  </div>
                )}
              </div>
            )}

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Next Step: Assign Tasks</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      After creating admin users, you can assign specific tasks to them based on their roles.
                    </p>
                    <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                      <p><strong>📊 Admin:</strong> Can manage all tasks, create users, approve high-value payments</p>
                      <p><strong>🎯 Super Agent:</strong> Can verify results, approve payments, manage users</p>
                      <p><strong>👤 Agent:</strong> Can verify basic results and handle customer support</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Tip:</strong> Navigate to the <strong>"Tasks"</strong> tab to assign work to your admin team.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
              <Button 
                onClick={() => setShowTaskForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Assign New Task
              </Button>
            </div>

            {/* Task Assignment Form */}
            {showTaskForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign New Task</CardTitle>
                  <CardDescription>
                    Assign a task to an admin user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign To
                      </label>
                      <select
                        value={newTaskData.user_id}
                        onChange={(e) => setNewTaskData(prev => ({...prev, user_id: e.target.value}))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Admin User</option>
                        {adminUsers.map(userStat => (
                          <option key={userStat.user.id} value={userStat.user.id}>
                            {userStat.user.username} ({userStat.user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Task Type
                      </label>
                      <select
                        value={newTaskData.task_type}
                        onChange={(e) => setNewTaskData(prev => ({...prev, task_type: e.target.value}))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="RESULT_MANAGEMENT">Result Management</option>
                        <option value="PAYMENT_APPROVAL">Payment Approval</option>
                        <option value="USER_MANAGEMENT">User Management</option>
                        <option value="HOUSE_MANAGEMENT">House Management</option>
                        <option value="SYSTEM_MAINTENANCE">System Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={newTaskData.priority}
                        onChange={(e) => setNewTaskData(prev => ({...prev, priority: e.target.value}))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date (Optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={newTaskData.due_date}
                        onChange={(e) => setNewTaskData(prev => ({...prev, due_date: e.target.value}))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Description
                    </label>
                    <textarea
                      value={newTaskData.task_description}
                      onChange={(e) => setNewTaskData(prev => ({...prev, task_description: e.target.value}))}
                      placeholder="Describe the task in detail..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="4"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTaskForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={assignTask}
                      disabled={!newTaskData.user_id || !newTaskData.task_description}
                    >
                      Assign Task
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>Tasks assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {myTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks assigned to you</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myTasks.map(task => (
                      <Card key={task.id} className={`border-l-4 ${
                        task.priority === 'URGENT' ? 'border-l-red-500 bg-red-50' :
                        task.priority === 'HIGH' ? 'border-l-orange-500 bg-orange-50' :
                        task.priority === 'MEDIUM' ? 'border-l-yellow-500 bg-yellow-50' :
                        'border-l-green-500 bg-green-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {task.task_type.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-gray-900 mb-2">{task.description}</p>
                              <p className="text-sm text-gray-600">
                                Assigned by: {task.assigned_by} • Created: {formatDateTime(task.created_at)}
                              </p>
                              {task.due_date && (
                                <p className="text-sm text-gray-600">
                                  Due: {formatDateTime(task.due_date)}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              {task.status === 'PENDING' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Start
                                </Button>
                              )}
                              {task.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateTaskStatus(task.id, 'COMPLETED', 'Task completed successfully')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>Overview of all assigned tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map(task => (
                      <Card key={task.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {task.task_type.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-gray-900 mb-2">{task.description}</p>
                              <div className="text-sm text-gray-600">
                                <p>Assigned to: {task.assigned_to} • Assigned by: {task.assigned_by}</p>
                                <p>Created: {formatDateTime(task.created_at)}</p>
                                {task.due_date && <p>Due: {formatDateTime(task.due_date)}</p>}
                                {task.completed_at && <p>Completed: {formatDateTime(task.completed_at)}</p>}
                              </div>
                              {task.completion_notes && (
                                <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                                  <strong>Notes:</strong> {task.completion_notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'settings':
        return <AdminPayoutDeadlineControl />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-0 sm:h-16 space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Welcome, <span className="font-medium">{user?.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                leftIcon={<Eye className="w-4 h-4" />}
                className="text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">View Site</span>
                <span className="sm:hidden">Site</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="text-xs sm:text-sm px-2 sm:px-4"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto admin-tab-scroll pb-0 sm:pb-0">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-0 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.id === 'results' && pendingResults.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {pendingResults.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
