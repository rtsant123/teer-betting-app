import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const AdminHouseManagement = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    timezone: 'Asia/Kolkata',
    fr_time: '15:30:00',
    sr_time: '17:00:00',
    betting_window_minutes: 30,
    runs_monday: true,
    runs_tuesday: true,
    runs_wednesday: true,
    runs_thursday: true,
    runs_friday: true,
    runs_saturday: true,
    runs_sunday: false,
    fr_direct_payout_rate: 70.0,
    fr_house_payout_rate: 7.0,
    fr_ending_payout_rate: 7.0,
    sr_direct_payout_rate: 60.0,
    sr_house_payout_rate: 6.0,
    sr_ending_payout_rate: 6.0,
    forecast_payout_rate: 400.0,
    forecast_direct_payout_rate: 400.0,
    forecast_house_payout_rate: 40.0,
    forecast_ending_payout_rate: 40.0
  });

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      const response = await apiGet('/admin/houses');
      setHouses(response.data);
    } catch (error) {
      console.error('Error fetching houses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHouse) {
        await apiPut(`/admin/houses/${editingHouse.id}`, formData);
      } else {
        await apiPost('/admin/houses', formData);
      }
      await fetchHouses();
      resetForm();
      alert(editingHouse ? 'House updated successfully!' : 'House created successfully!');
    } catch (error) {
      console.error('Error saving house:', error);
      alert(`Error: ${error.response?.data?.detail || 'Error saving house'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      timezone: 'Asia/Kolkata',
      fr_time: '15:30:00',
      sr_time: '17:00:00',
      betting_window_minutes: 30,
      runs_monday: true,
      runs_tuesday: true,
      runs_wednesday: true,
      runs_thursday: true,
      runs_friday: true,
      runs_saturday: true,
      runs_sunday: false,
      fr_direct_payout_rate: 70.0,
      fr_house_payout_rate: 7.0,
      fr_ending_payout_rate: 7.0,
      sr_direct_payout_rate: 60.0,
      sr_house_payout_rate: 6.0,
      sr_ending_payout_rate: 6.0,
      forecast_payout_rate: 400.0,
      forecast_direct_payout_rate: 400.0,
      forecast_house_payout_rate: 40.0,
      forecast_ending_payout_rate: 40.0
    });
    setShowCreateForm(false);
    setEditingHouse(null);
  };

  const handleEdit = (house) => {
    setFormData({
      name: house.name,
      location: house.location || '',
      timezone: house.timezone || 'Asia/Kolkata',
      fr_time: house.fr_time,
      sr_time: house.sr_time,
      betting_window_minutes: house.betting_window_minutes,
      runs_monday: house.runs_monday,
      runs_tuesday: house.runs_tuesday,
      runs_wednesday: house.runs_wednesday,
      runs_thursday: house.runs_thursday,
      runs_friday: house.runs_friday,
      runs_saturday: house.runs_saturday,
      runs_sunday: house.runs_sunday,
      fr_direct_payout_rate: house.fr_direct_payout_rate,
      fr_house_payout_rate: house.fr_house_payout_rate,
      fr_ending_payout_rate: house.fr_ending_payout_rate,
      sr_direct_payout_rate: house.sr_direct_payout_rate,
      sr_house_payout_rate: house.sr_house_payout_rate,
      sr_ending_payout_rate: house.sr_ending_payout_rate,
      forecast_payout_rate: house.forecast_payout_rate,
      forecast_direct_payout_rate: house.forecast_direct_payout_rate || 400.0,
      forecast_house_payout_rate: house.forecast_house_payout_rate || 40.0,
      forecast_ending_payout_rate: house.forecast_ending_payout_rate || 40.0
    });
    setEditingHouse(house);
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this house?')) {
      try {
        await apiDelete(`/admin/houses/${id}`);
        await fetchHouses();
        alert('House deleted successfully!');
      } catch (error) {
        console.error('Error deleting house:', error);
        alert(`Error: ${error.response?.data?.detail || 'Error deleting house'}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading houses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* Modern Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🏠 House Management
            </h1>
            <p className="text-slate-600 mt-2">Manage teer houses and their configurations</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="absolute inset-0 bg-white opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <span className="relative flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add New House
            </span>
          </button>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  {editingHouse ? '✏️ Edit House' : '➕ Create New House'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingHouse(null);
                    resetForm();
                  }}
                  className="text-white hover:text-red-200 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {/* Basic Information */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  📋 Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      House Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter house name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Timezone <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  ⏰ Round Timing
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      First Round Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.fr_time}
                      onChange={(e) => setFormData({...formData, fr_time: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Second Round Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.sr_time}
                      onChange={(e) => setFormData({...formData, sr_time: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Betting Window (Minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={formData.betting_window_minutes}
                      onChange={(e) => setFormData({...formData, betting_window_minutes: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  📅 Weekly Schedule
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { key: 'runs_monday', label: 'Mon' },
                    { key: 'runs_tuesday', label: 'Tue' },
                    { key: 'runs_wednesday', label: 'Wed' },
                    { key: 'runs_thursday', label: 'Thu' },
                    { key: 'runs_friday', label: 'Fri' },
                    { key: 'runs_saturday', label: 'Sat' },
                    { key: 'runs_sunday', label: 'Sun' }
                  ].map(day => (
                    <label key={day.key} className="flex items-center space-x-2 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData[day.key]}
                        onChange={(e) => setFormData({...formData, [day.key]: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payout Rates */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  💰 Payout Rates (%)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Round */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-3">First Round</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Direct</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.fr_direct_payout_rate}
                          onChange={(e) => setFormData({...formData, fr_direct_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">House</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.fr_house_payout_rate}
                          onChange={(e) => setFormData({...formData, fr_house_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ending</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.fr_ending_payout_rate}
                          onChange={(e) => setFormData({...formData, fr_ending_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Second Round */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-3">Second Round</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Direct</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.sr_direct_payout_rate}
                          onChange={(e) => setFormData({...formData, sr_direct_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">House</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.sr_house_payout_rate}
                          onChange={(e) => setFormData({...formData, sr_house_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ending</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.sr_ending_payout_rate}
                          onChange={(e) => setFormData({...formData, sr_ending_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Forecast Rates */}
                <div className="mt-4">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h5 className="font-semibold text-purple-800 mb-3">Forecast Payout Rates</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-1">Direct (1:400)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.forecast_direct_payout_rate}
                          onChange={(e) => setFormData({...formData, forecast_direct_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-purple-600 mt-1">₹10 bet = ₹{(10 * formData.forecast_direct_payout_rate).toFixed(0)} winning</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-1">House (1:40)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.forecast_house_payout_rate}
                          onChange={(e) => setFormData({...formData, forecast_house_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-purple-600 mt-1">₹10 bet = ₹{(10 * formData.forecast_house_payout_rate).toFixed(0)} winning</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-1">Ending (1:40)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.forecast_ending_payout_rate}
                          onChange={(e) => setFormData({...formData, forecast_ending_payout_rate: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-purple-600 mt-1">₹10 bet = ₹{(10 * formData.forecast_ending_payout_rate).toFixed(0)} winning</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-purple-600">
                      <p><strong>Note:</strong> Forecast betting requires both FR and SR to be correct</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingHouse(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {editingHouse ? 'Update House' : 'Create House'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Houses List */}
      <div className="space-y-6">
        {houses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-2xl font-bold text-slate-700 mb-2">No Houses Yet</h3>
            <p className="text-slate-500 mb-6">Get started by creating your first teer house</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Create First House
            </button>
          </div>
        ) : (
          houses.map((house) => (
            <div 
              key={house.id} 
              className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 overflow-hidden"
            >
              <div className="p-6">
                {/* House Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-slate-800">{house.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        house.is_active 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {house.is_active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>📍</span>
                        <span className="text-sm">{house.location || 'No location'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>🌍</span>
                        <span className="text-sm">{house.timezone || 'Asia/Kolkata'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>🕐</span>
                        <span className="text-sm">FR: {house.fr_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>🕕</span>
                        <span className="text-sm">SR: {house.sr_time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>⏰</span>
                        <span>Window: {house.betting_window_minutes}min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>
                          Runs: {[
                            house.runs_monday && 'Mon',
                            house.runs_tuesday && 'Tue', 
                            house.runs_wednesday && 'Wed',
                            house.runs_thursday && 'Thu',
                            house.runs_friday && 'Fri',
                            house.runs_saturday && 'Sat',
                            house.runs_sunday && 'Sun'
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(house)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow hover:shadow-lg transition-all duration-200"
                      title="Edit House"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(house.id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow hover:shadow-lg transition-all duration-200"
                      title="Delete House"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Payout Rates Display */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">🎯 First Round</h4>
                    <div className="space-y-1 text-xs text-blue-700">
                      <div>Direct: {house.fr_direct_payout_rate}%</div>
                      <div>House: {house.fr_house_payout_rate}%</div>
                      <div>Ending: {house.fr_ending_payout_rate}%</div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">🎯 Second Round</h4>
                    <div className="space-y-1 text-xs text-green-700">
                      <div>Direct: {house.sr_direct_payout_rate}%</div>
                      <div>House: {house.sr_house_payout_rate}%</div>
                      <div>Ending: {house.sr_ending_payout_rate}%</div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">🔮 Forecast</h4>
                    <div className="text-xs text-purple-700">
                      Rate: {house.forecast_payout_rate}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminHouseManagement;
