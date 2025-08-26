import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import HeaderBar from './components/common/HeaderBar';
import ReferralTracker from './components/common/ReferralTracker';

// Pages
import PublicLanding from './pages/PublicLanding';
import PlayDashboard from './pages/PlayDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Wallet from './pages/Wallet';
import MyPlays from './pages/MyPlays';
import Profile from './pages/Profile';
import PublicResults from './pages/PublicResults';
import UserResults from './pages/UserResults';
import ReferralDashboard from './pages/ReferralDashboard';
import HowToPlay from './pages/HowToPlay';

// New Hierarchical Game Pages
import HouseSelectionPage from './pages/HouseSelectionPage';
import PlayTypeSelectionPage from './pages/PlayTypeSelectionPage';
import ModeSelectionPage from './pages/ModeSelectionPage';

// FR Pages
import FRDirectPage from './pages/FRDirectPage';
import FRHousePage from './pages/FRHousePage';
import FREndingPage from './pages/FREndingPage';

// SR Pages
import SRDirectPage from './pages/SRDirectPage';
import SRHousePage from './pages/SRHousePage';
import SREndingPage from './pages/SREndingPage';

// Forecast Pages
import ForecastDirectPage from './pages/ForecastDirectPage';
import ForecastHousePage from './pages/ForecastHousePage';
import ForecastEndingPage from './pages/ForecastEndingPage';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';

// Support Components
import ForgotPassword from './components/ForgotPassword';
import ChangePassword from './components/ChangePassword';
import CustomerSupport from './components/CustomerSupport';

import './index.css';

// HomePage component that routes based on authentication
const HomePage = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }
  
  return <PublicLanding />;
};

// Layout component for routes that need navbar  
const ProtectedLayout = ({ children }) => (
  <ProtectedRoute>
    {children}
  </ProtectedRoute>
);
const AdminLayout = ({ children }) => (
  <AdminRoute>
    <HeaderBar />
    {children}
  </AdminRoute>
);
function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <Router>
          <ReferralTracker>
            <div className="App">
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: '#10B981',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#EF4444',
                  },
                },
              }}
            />
            <Routes>
              {/* Root Route - Smart redirect based on auth status */}
              <Route path="/" element={<HomePage />} />
              
              {/* Public Routes */}
              <Route path="/public" element={<PublicLanding />} />
              <Route path="/results" element={<PublicResults />} />
              <Route path="/how-to-play" element={<HowToPlay />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes - PlayDashboard as main entry */}
              <Route path="/home" element={
                <ProtectedLayout>
                  <PlayDashboard />
                </ProtectedLayout>
              } />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/play" element={<Navigate to="/home" replace />} />
              
              {/* Hierarchical Game Navigation - accessed from PlayDashboard */}
              {/* House Selection */}
              <Route path="/houses" element={
                <ProtectedLayout>
                  <HouseSelectionPage />
                </ProtectedLayout>
              } />
              
              {/* Play Type Selection for a House */}
              <Route path="/house/:houseId" element={
                <ProtectedLayout>
                  <PlayTypeSelectionPage />
                </ProtectedLayout>
              } />
              
              {/* Mode Selection for a Play Type */}
              <Route path="/house/:houseId/playtype/:playType" element={
                <ProtectedLayout>
                  <ModeSelectionPage />
                </ProtectedLayout>
              } />
              
              {/* Individual Game Mode Pages - FR */}
              <Route path="/house/:houseId/playtype/FR/mode/direct" element={
                <ProtectedLayout>
                  <FRDirectPage />
                </ProtectedLayout>
              } />
              <Route path="/house/:houseId/playtype/FR/mode/house" element={
                <ProtectedLayout>
                  <FRHousePage />
                </ProtectedLayout>
              } />
              <Route path="/house/:houseId/playtype/FR/mode/ending" element={
                <ProtectedLayout>
                  <FREndingPage />
                </ProtectedLayout>
              } />
              
              {/* Individual Game Mode Pages - SR */}
              <Route path="/house/:houseId/playtype/SR/mode/direct" element={
                <ProtectedLayout>
                  <SRDirectPage />
                </ProtectedLayout>
              } />
              <Route path="/house/:houseId/playtype/SR/mode/house" element={
                <ProtectedLayout>
                  <SRHousePage />
                </ProtectedLayout>
              } />
              <Route path="/house/:houseId/playtype/SR/mode/ending" element={
                <ProtectedLayout>
                  <SREndingPage />
                </ProtectedLayout>
              } />
              
              {/* Individual Game Mode Pages - Forecast */}
              <Route path="/house/:houseId/playtype/FORECAST/mode/direct" element={
                <ProtectedLayout>
                  <ForecastDirectPage />
                </ProtectedLayout>
              } />
              <Route path="/house/:houseId/playtype/FORECAST/mode/house" element={
                <ProtectedLayout>
                  <ForecastHousePage />
                </ProtectedLayout>
              } />
              <Route path="/house/:houseId/playtype/FORECAST/mode/ending" element={
                <ProtectedLayout>
                  <ForecastEndingPage />
                </ProtectedLayout>
              } />
              <Route path="/wallet" element={
                <ProtectedLayout>
                  <Wallet />
                </ProtectedLayout>
              } />
              <Route path="/my-plays" element={
                <ProtectedLayout>
                  <MyPlays />
                </ProtectedLayout>
              } />
              <Route path="/profile" element={
                <ProtectedLayout>
                  <Profile />
                </ProtectedLayout>
              } />
              <Route path="/user-results" element={
                <ProtectedLayout>
                  <UserResults />
                </ProtectedLayout>
              } />
              <Route path="/referral" element={
                <ProtectedLayout>
                  <ReferralDashboard />
                </ProtectedLayout>
              } />
              
              {/* Support Routes */}
              <Route path="/change-password" element={
                <ProtectedLayout>
                  <ChangePassword />
                </ProtectedLayout>
              } />
              <Route path="/support" element={
                <ProtectedLayout>
                  <CustomerSupport />
                </ProtectedLayout>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              } />
              {/* Temporarily commented out until admin pages are restored
              <Route path="/admin/users" element={
                <AdminLayout>
                  <ManageUsers />
                </AdminLayout>
              } />
              <Route path="/admin/houses" element={
                <AdminLayout>
                  <ManageHouses />
                </AdminLayout>
              } />
              <Route path="/admin/house-scheduling" element={
                <AdminLayout>
                  <ManageHouseScheduling />
                </AdminLayout>
              } />
              <Route path="/admin/rounds" element={
                <AdminLayout>
                  <ManageRounds />
                </AdminLayout>
              } />
              <Route path="/admin/results" element={
                <AdminLayout>
                  <ManageResults />
                </AdminLayout>
              } />
              <Route path="/admin/banners" element={
                <AdminLayout>
                  <ManageBanners />
                </AdminLayout>
              } />
              <Route path="/admin/transactions" element={
                <AdminLayout>
                  <ManageTransactions />
                </AdminLayout>
              } />
              <Route path="/admin/payment-methods" element={
                <AdminLayout>
                  <ManagePaymentMethods />
                </AdminLayout>
              } />
              */}
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </div>
          </ReferralTracker>
        </Router>
      </WalletProvider>
    </AuthProvider>
  );
}
export default App;
