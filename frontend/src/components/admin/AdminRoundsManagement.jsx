import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
const AdminRoundsManagement = () => {
  const [rounds, setRounds] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    house_id: '',
    round_type: 'FR',
    scheduled_time: '',
    betting_closes_at: ''
  });
  const [filter, setFilter] = useState({
    house_id: '',
    round_type: '',
    status: ''
  });
  useEffect(() => {
    fetchRounds();
    fetchHouses();
  }, []);
  const fetchRounds = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/rounds', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRounds(data);
      } else {
        toast.error('Failed to fetch rounds');
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
      toast.error('Error fetching rounds');
    }
    setLoading(false);
  };
  const fetchHouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/houses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHouses(data);
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.house_id || !formData.scheduled_time) {
      toast.error('Please fill in all required fields');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/v1/admin/rounds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await fetchRounds();
        resetForm();
        toast.success('Round created successfully!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create round');
      }
    } catch (error) {
      console.error('Error creating round:', error);
      toast.error('Error creating round');
    }
  };
  const resetForm = () => {
    setFormData({
      house_id: '',
      round_type: 'FR',
      scheduled_time: '',
      betting_closes_at: ''
    });
    setShowCreateForm(false);
  };
  const deleteRound = async (roundId) => {
    if (!window.confirm('Are you sure you want to delete this round?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/rounds/${roundId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        await fetchRounds();
        toast.success('Round deleted successfully!');
      } else {
        toast.error('Failed to delete round');
      }
    } catch (error) {
      console.error('Error deleting round:', error);
      toast.error('Error deleting round');
    }
  };
  const autoScheduleRounds = async (houseId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/scheduling/houses/${houseId}/auto-schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days_ahead: 30 })
      });
      if (response.ok) {
        const data = await response.json();
        await fetchRounds();
        toast.success(`Auto-scheduled ${data.rounds_created} rounds for the next 30 days!`);
      } else {
        toast.error('Failed to auto-schedule rounds');
      }
    } catch (error) {
      console.error('Error auto-scheduling rounds:', error);
      toast.error('Error auto-scheduling rounds');
    }
  };
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN');
  };
  const getStatusBadge = (status) => {
    const statusColors = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      BETTING_OPEN: 'bg-green-100 text-green-800',
      BETTING_CLOSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };
  const filteredRounds = rounds.filter(round => {
    if (filter.house_id && round.house_id.toString() !== filter.house_id) return false;
    if (filter.round_type && round.round_type !== filter.round_type) return false;
    if (filter.status && round.status !== filter.status) return false;
    return true;
  });
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Rounds Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Round
        </button>
      </div>
      {/* Auto-schedule section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Auto-Schedule Rounds</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {houses.map((house) => (
            <div key={house.id} className="border rounded-lg p-4">
              <h4 className="font-medium">{house.name}</h4>
              <p className="text-sm text-gray-600 mb-1">{house.location}</p>
              <p className="text-sm text-blue-600 mb-2">🌍 {house.timezone || 'Asia/Kolkata'}</p>
              <p className="text-xs text-gray-500 mb-2">Times: FR {house.fr_time} | SR {house.sr_time}</p>
              <button
                onClick={() => autoScheduleRounds(house.id)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
              >
                Auto-Schedule 30 Days
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Create Round Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Round</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  House *
                </label>
                <select
                  name="house_id"
                  value={formData.house_id}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  <option value="">Select House</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name} - {house.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Round Type *
                </label>
                <select
                  name="round_type"
                  value={formData.round_type}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="FR">First Round (FR)</option>
                  <option value="SR">Second Round (SR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Time *
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betting Closes At
                </label>
                <input
                  type="datetime-local"
                  name="betting_closes_at"
                  value={formData.betting_closes_at}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create Round
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">House</label>
            <select
              value={filter.house_id}
              onChange={(e) => setFilter(prev => ({ ...prev, house_id: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Houses</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Round Type</label>
            <select
              value={filter.round_type}
              onChange={(e) => setFilter(prev => ({ ...prev, round_type: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="FR">First Round (FR)</option>
              <option value="SR">Second Round (SR)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="BETTING_OPEN">Betting Open</option>
              <option value="BETTING_CLOSED">Betting Closed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ house_id: '', round_type: '', status: '' })}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      {/* Rounds Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Current Rounds</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center">Loading rounds...</div>
        ) : filteredRounds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No rounds found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">House</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRounds.map((round) => (
                  <tr key={round.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">#{round.id}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{round.house_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        round.round_type === 'FR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {round.round_type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{formatDateTime(round.scheduled_time)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(round.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {round.result !== null ? String(round.result).padStart(2, '0') : '--'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      {round.status === 'SCHEDULED' && (
                        <button
                          onClick={() => deleteRound(round.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminRoundsManagement;
