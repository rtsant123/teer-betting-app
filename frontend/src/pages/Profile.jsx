import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/common/Modal';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Camera, 
  Key, 
  Shield, 
  Trophy, 
  DollarSign,
  Settings,
  Save,
  X,
  Eye,
  EyeOff,
  Star,
  TrendingUp,
  Target,
  Award,
  MessageCircle,
  HelpCircle,
  Bell,
  Globe,
  Download,
  UserX
} from 'lucide-react';

const Profile = () => {
  // Simple stub to replace translation function
  const t = (key) => {
    const translations = {
      'profile.title': 'Profile',
      'navigation.results': 'Results',
      'settings.title': 'Settings',
      'common.cancel': 'Cancel',
      'profile.editProfile': 'Edit Profile',
      'profile.firstName': 'First Name',
      'profile.lastName': 'Last Name',
      'settings.notifications.title': 'Notifications',
      'settings.notifications.email.title': 'Email Notifications',
      'settings.notifications.email.description': 'Receive updates via email',
      'settings.notifications.push.title': 'Push Notifications',
      'settings.notifications.push.description': 'Get notified on your device',
      'settings.notifications.sms.title': 'SMS Notifications',
      'settings.notifications.sms.description': 'Important updates via SMS',
      'settings.preferences.title': 'Preferences',
      'settings.preferences.timezone': 'Timezone',
      'settings.preferences.currency': 'Currency',
      'settings.accountActions.title': 'Account Actions'
    };
    return translations[key] || key;
  };
  
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [stats] = useState({
    totalPlays: 247,
    totalWins: 89,
    winRate: 36.0,
    totalEarnings: 15420.50,
    currentStreak: 3,
    bestStreak: 8,
    level: 'Gold',
    rank: 156
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    try {
      // Add password change logic here
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
    }
  };

  const tabs = [
    { id: 'profile', label: t('profile.title'), icon: User },
    { id: 'stats', label: t('navigation.results'), icon: Trophy },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: t('settings.title'), icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBar />
      
      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* Profile Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32 relative">
            <div className="absolute -bottom-16 left-6">
              <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Camera size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="pt-20 pb-6 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {user?.firstName} {user?.lastName}
                </h1>
                <p className="text-gray-600 mt-1">{user?.email}</p>
                <div className="flex items-center mt-2">
                  <div className="flex items-center px-3 py-1 bg-yellow-100 rounded-full">
                    <Star className="w-4 h-4 text-yellow-600 mr-1" />
                    <span className="text-sm font-medium text-yellow-700">{stats.level} Member</span>
                  </div>
                  <div className="ml-3 text-sm text-gray-600">
                    Rank #{stats.rank}
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "secondary" : "primary"}
                  className="w-full sm:w-auto"
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      {t('common.cancel')}
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      {t('profile.editProfile')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalPlays}</div>
            <div className="text-sm text-gray-600">Total Plays</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalWins}</div>
            <div className="text-sm text-gray-600">Total Wins</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{stats.winRate}%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">₹{stats.totalEarnings.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Earnings</div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.firstName')}
                    </label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      icon={User}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.lastName')}
                    </label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      icon={User}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      icon={Mail}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      icon={Phone}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      icon={MapPin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <Input
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      icon={Calendar}
                    />
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSaveProfile} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsEditing(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-800">Performance</h3>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Win Rate</span>
                        <span className="font-medium">{stats.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current Streak</span>
                        <span className="font-medium">{stats.currentStreak}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Best Streak</span>
                        <span className="font-medium">{stats.bestStreak}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-800">Earnings</h3>
                      <DollarSign className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Earnings</span>
                        <span className="font-medium">₹{stats.totalEarnings.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">This Month</span>
                        <span className="font-medium">₹3,240</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Month</span>
                        <span className="font-medium">₹2,850</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-800">Activity</h3>
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Plays</span>
                        <span className="font-medium">{stats.totalPlays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">This Week</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg per Day</span>
                        <span className="font-medium">1.7</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h3 className="font-medium text-gray-800 mb-4">Password</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Keep your account secure by using a strong password.
                    </p>
                    <Button onClick={() => navigate('/change-password')} className="w-full">
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium text-gray-800 mb-4">Customer Support</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Get help with your account or contact our support team.
                    </p>
                    <Button onClick={() => navigate('/support')} variant="secondary" className="w-full">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium text-gray-800 mb-4">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security to your account.
                    </p>
                    <Button variant="secondary" className="w-full" disabled>
                      <Shield className="w-4 h-4 mr-2" />
                      Enable 2FA (Coming Soon)
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium text-gray-800 mb-4">Login Activity</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-gray-600">Chrome on Windows</p>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Mobile App</p>
                          <p className="text-xs text-gray-600">Android • 2 hours ago</p>
                        </div>
                        <span className="text-xs text-gray-600">Inactive</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-medium text-gray-800 mb-4">Privacy Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Profile Visibility</span>
                        <select className="text-sm border rounded px-2 py-1">
                          <option>Public</option>
                          <option>Friends Only</option>
                          <option>Private</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Show Online Status</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center mb-4">
                      <Bell className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-gray-800">{t('settings.notifications.title')}</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {t('settings.notifications.email.title')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('settings.notifications.email.description')}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {t('settings.notifications.push.title')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('settings.notifications.push.description')}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {t('settings.notifications.sms.title')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('settings.notifications.sms.description')}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center mb-4">
                      <Globe className="w-5 h-5 text-purple-600 mr-2" />
                      <h3 className="font-semibold text-gray-800">{t('settings.preferences.title')}</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">Language</span>
                        <span className="text-sm text-gray-600">English</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{t('settings.preferences.timezone')}</span>
                        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
                          <option>IST (UTC+5:30)</option>
                          <option>UTC</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{t('settings.preferences.currency')}</span>
                        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
                          <option>INR (₹)</option>
                          <option>USD ($)</option>
                        </select>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center mb-4">
                      <Download className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-gray-800">{t('settings.accountActions.title')}</h3>
                    </div>
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none hover:from-purple-600 hover:to-purple-700"
                      >
                        <Download className="w-4 h-4" />
                        {t('settings.accountActions.exportData')}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none hover:from-purple-600 hover:to-purple-700"
                      >
                        <Download className="w-4 h-4" />
                        {t('settings.accountActions.downloadStatement')}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                      >
                        <UserX className="w-4 h-4" />
                        {t('settings.accountActions.deactivateAccount')}
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center mb-4">
                      <HelpCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-gray-800">{t('settings.support.title')}</h3>
                    </div>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => navigate('/support')} 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none hover:from-purple-600 hover:to-purple-700"
                      >
                        <HelpCircle className="w-4 h-4" />
                        {t('settings.support.helpCenter')}
                      </Button>
                      <Button 
                        onClick={() => navigate('/support')} 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none hover:from-purple-600 hover:to-purple-700"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t('settings.support.contactSupport')}
                      </Button>
                      <Button 
                        onClick={() => navigate('/support')} 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none hover:from-purple-600 hover:to-purple-700"
                      >
                        {t('settings.support.reportIssue')}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
      >
        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="currentPassword"
              placeholder="Current Password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              icon={Key}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <Input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            icon={Key}
          />
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            icon={Key}
          />
          <div className="flex gap-3 pt-4">
            <Button onClick={handleChangePassword} className="flex-1">
              Change Password
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowPasswordModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Profile;
