import React, { useState, useEffect, useCallback } from 'react';
const AdminPayoutDeadlineControl = () => {
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payoutRates, setPayoutRates] = useState({
    fr_direct_payout_rate: 80.0,
    fr_house_payout_rate: 9.0,
    fr_ending_payout_rate: 9.0,
    sr_direct_payout_rate: 80.0,
    sr_house_payout_rate: 9.0,
    sr_ending_payout_rate: 9.0,
    forecast_direct_payout_rate: 400.0,
    forecast_house_payout_rate: 40.0,
    forecast_ending_payout_rate: 40.0,
    forecast_payout_rate: 800.0 // Keep for backward compatibility
  });
  const [timeSettings, setTimeSettings] = useState({
    fr_time: '15:30:00',
    sr_time: '16:30:00',
    betting_window_minutes: 15
  });
  const fetchHouses = useCallback(async () => {
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
        if (data.length > 0 && !selectedHouse) {
          setSelectedHouse(data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedHouse]);
  const fetchHouseSettings = useCallback(async (houseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/houses/${houseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const house = await response.json();
        setPayoutRates({
          fr_direct_payout_rate: house.fr_direct_payout_rate || 80.0,
          fr_house_payout_rate: house.fr_house_payout_rate || 9.0,
          fr_ending_payout_rate: house.fr_ending_payout_rate || 9.0,
          sr_direct_payout_rate: house.sr_direct_payout_rate || 80.0,
          sr_house_payout_rate: house.sr_house_payout_rate || 9.0,
          sr_ending_payout_rate: house.sr_ending_payout_rate || 9.0,
          forecast_direct_payout_rate: house.forecast_direct_payout_rate || 400.0,
          forecast_house_payout_rate: house.forecast_house_payout_rate || 40.0,
          forecast_ending_payout_rate: house.forecast_ending_payout_rate || 40.0,
          forecast_payout_rate: house.forecast_payout_rate || 800.0
        });
        setTimeSettings({
          fr_time: house.fr_time || '15:30:00',
          sr_time: house.sr_time || '16:30:00',
          betting_window_minutes: house.betting_window_minutes || 15
        });
      }
    } catch (error) {
      console.error('Error fetching house settings:', error);
    }
  }, []);
  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);
  useEffect(() => {
    if (selectedHouse) {
      fetchHouseSettings(selectedHouse);
    }
  }, [selectedHouse, fetchHouseSettings]);
  const updateHouseSettings = async () => {
    if (!selectedHouse) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/houses/${selectedHouse}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payoutRates,
          ...timeSettings
        })
      });
      if (response.ok) {
        alert('Settings updated successfully!');
        await fetchHouses(); // Refresh the houses list
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Error updating settings');
    } finally {
      setSaving(false);
    }
  };
  const calculateWinningExample = (betAmount, rate) => {
    return (betAmount * rate).toFixed(2);
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💰 Payout Rates & ⏰ Deadline Control
        </h3>
        {/* House Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select House
          </label>
          <select
            value={selectedHouse}
            onChange={(e) => setSelectedHouse(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a house...</option>
            {houses.map(house => (
              <option key={house.id} value={house.id}>
                {house.name} {house.location ? `(${house.location})` : ''}
              </option>
            ))}
          </select>
        </div>
        {selectedHouse && (
          <>
            {/* Timing & Deadline Settings */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-800 mb-4">⏰ Round Times & Betting Deadlines</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    FR Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={timeSettings.fr_time}
                    onChange={(e) => setTimeSettings({...timeSettings, fr_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">First Round start time</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SR Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={timeSettings.sr_time}
                    onChange={(e) => setTimeSettings({...timeSettings, sr_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Second Round start time</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Betting Deadline (minutes before)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={timeSettings.betting_window_minutes}
                    onChange={(e) => setTimeSettings({...timeSettings, betting_window_minutes: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Betting closes X minutes before round</p>
                </div>
              </div>
              {/* Deadline Preview */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">📅 Today's Betting Schedule</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">FR Round:</span>
                    <br />
                    <span className="text-blue-700">Betting closes: {
                      (() => {
                        const frTime = new Date(`2000-01-01T${timeSettings.fr_time}`);
                        frTime.setMinutes(frTime.getMinutes() - timeSettings.betting_window_minutes);
                        return frTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      })()
                    }</span>
                    <br />
                    <span className="text-green-700">Round starts: {
                      new Date(`2000-01-01T${timeSettings.fr_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    }</span>
                  </div>
                  <div>
                    <span className="font-medium">SR Round:</span>
                    <br />
                    <span className="text-blue-700">Betting closes: {
                      (() => {
                        const srTime = new Date(`2000-01-01T${timeSettings.sr_time}`);
                        srTime.setMinutes(srTime.getMinutes() - timeSettings.betting_window_minutes);
                        return srTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      })()
                    }</span>
                    <br />
                    <span className="text-green-700">Round starts: {
                      new Date(`2000-01-01T${timeSettings.sr_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    }</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Payout Rates */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-800 mb-4">💰 Payout Rates Configuration</h4>
              {/* FR Rates */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">🎯 First Round (FR) Rates</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Direct (1:{payoutRates.fr_direct_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.fr_direct_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, fr_direct_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.fr_direct_payout_rate)} winning
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House (1:{payoutRates.fr_house_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.fr_house_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, fr_house_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.fr_house_payout_rate)} winning
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ending (1:{payoutRates.fr_ending_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.fr_ending_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, fr_ending_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.fr_ending_payout_rate)} winning
                    </p>
                  </div>
                </div>
              </div>
              {/* SR Rates */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">🎯 Second Round (SR) Rates</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Direct (1:{payoutRates.sr_direct_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.sr_direct_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, sr_direct_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.sr_direct_payout_rate)} winning
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House (1:{payoutRates.sr_house_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.sr_house_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, sr_house_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.sr_house_payout_rate)} winning
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ending (1:{payoutRates.sr_ending_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.sr_ending_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, sr_ending_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.sr_ending_payout_rate)} winning
                    </p>
                  </div>
                </div>
              </div>
              {/* Forecast Rates */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">🔮 Forecast Rates</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Direct (1:{payoutRates.forecast_direct_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.forecast_direct_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, forecast_direct_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.forecast_direct_payout_rate)} winning
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House (1:{payoutRates.forecast_house_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.forecast_house_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, forecast_house_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.forecast_house_payout_rate)} winning
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ending (1:{payoutRates.forecast_ending_payout_rate})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={payoutRates.forecast_ending_payout_rate}
                      onChange={(e) => setPayoutRates({...payoutRates, forecast_ending_payout_rate: parseFloat(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ₹10 bet → ₹{calculateWinningExample(10, payoutRates.forecast_ending_payout_rate)} winning
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Forecast requires both FR and SR to be correct
                </p>
              </div>
            </div>
            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={updateHouseSettings}
                disabled={saving}
                className={`px-6 py-3 rounded-md text-white font-medium ${
                  saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                } focus:ring-2 focus:ring-offset-2 transition-colors`}
              >
                {saving ? '⏳ Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </>
        )}
      </div>
      {/* Quick Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">📚 Quick Reference</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">⏰ Betting Deadlines</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Betting closes X minutes before each round</li>
              <li>• Users cannot place bets after deadline</li>
              <li>• Admin can adjust deadline per house</li>
              <li>• Typical range: 5-30 minutes before</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">💰 Payout Structure</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Direct:</strong> Exact 2-digit match (highest odds)</li>
              <li>• <strong>House:</strong> First digit match</li>
              <li>• <strong>Ending:</strong> Last digit match</li>
              <li>• <strong>Forecast:</strong> Both FR & SR correct (massive odds)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminPayoutDeadlineControl;
