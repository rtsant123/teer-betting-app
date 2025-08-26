import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Configure axios defaults for this component
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});
const AdminPaymentMethodManagement = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQRFile, setSelectedQRFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    instructions: '',
    supports_deposit: true,
    supports_withdrawal: true,
    min_amount: 0,
    max_amount: 0,
    admin_contact: '',
    display_order: 1,
    status: 'ACTIVE'
  });
  const [editingId, setEditingId] = useState(null);
  const fetchPaymentMethods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.get('/admin/payment-methods', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentMethods(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError('Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPaymentMethods();
    fetchQRCodes();
  }, []);
  const fetchQRCodes = async () => {
    // QR codes are now managed directly in payment method details
    // No separate endpoint needed
  };
  const handleQRUpload = async (file, paymentMethodId = null) => {
    // QR codes are now managed directly in payment method details
    // This function is kept for compatibility but does nothing
    return null;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Auto-generate details based on payment type
      let parsedDetails;
      switch (formData.type) {
        case 'UPI':
          parsedDetails = { 
            upi_id: formData.admin_contact || '',
            qr_supported: true 
          };
          break;
        case 'BANK':
          parsedDetails = { 
            account_number: '',
            ifsc_code: '',
            bank_name: '' 
          };
          break;
        case 'WALLET':
          parsedDetails = { 
            wallet_id: '',
            provider: '' 
          };
          break;
        case 'CRYPTO':
          parsedDetails = { 
            wallet_address: '',
            currency: 'USDT' 
          };
          break;
        default:
          parsedDetails = {};
      }
      // Prepare data with parsed details
      const submitData = {
        ...formData,
        details: parsedDetails
      };
      const url = editingId 
        ? `/admin/payment-methods/${editingId}`
        : '/admin/payment-methods';
      const method = editingId ? 'PUT' : 'POST';
      const response = await apiClient({
        method,
        url,
        data: submitData,
        headers: { Authorization: `Bearer ${token}` }
      });
      // If QR file is selected, upload it
      if (selectedQRFile && response.data) {
        const paymentMethodId = response.data.id || editingId;
        await handleQRUpload(selectedQRFile, paymentMethodId);
      }
      setFormData({
        name: '',
        type: '',
        instructions: '',
        supports_deposit: true,
        supports_withdrawal: true,
        min_amount: 0,
        max_amount: 0,
        admin_contact: '',
        display_order: 1,
        status: 'ACTIVE'
      });
      setSelectedQRFile(null);
      setEditingId(null);
      fetchPaymentMethods();
      setError('');
    } catch (err) {
      console.error('Error saving payment method:', err);
      if (err.response?.data?.detail) {
        setError(`Failed to save payment method: ${err.response.data.detail}`);
      } else {
        setError('Failed to save payment method');
      }
    }
  };
  const handleEdit = (method) => {
    setFormData({
      name: method.name,
      type: method.type,
      instructions: method.instructions,
      supports_deposit: method.supports_deposit,
      supports_withdrawal: method.supports_withdrawal,
      min_amount: method.min_amount,
      max_amount: method.max_amount,
      admin_contact: method.admin_contact,
      display_order: method.display_order,
      status: method.status
    });
    setEditingId(method.id);
  };
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      try {
        const token = localStorage.getItem('token');
        await apiClient.delete(`/admin/payment-methods/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPaymentMethods();
        setError('');
      } catch (err) {
        console.error('Error deleting payment method:', err);
        setError('Failed to delete payment method');
      }
    }
  };
  if (loading) return <div>Loading...</div>;
  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Payment Methods Management</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">Select Type</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
              <option value="WALLET">Wallet</option>
              <option value="CRYPTO">Cryptocurrency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload QR Code</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
              onChange={(e) => setSelectedQRFile(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedQRFile && (
              <div className="mt-2 text-sm text-gray-600">Selected: {selectedQRFile.name}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Amount</label>
            <input
              type="number"
              value={formData.min_amount}
              onChange={(e) => setFormData({...formData, min_amount: parseFloat(e.target.value)})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Amount</label>
            <input
              type="number"
              value={formData.max_amount}
              onChange={(e) => setFormData({...formData, max_amount: parseFloat(e.target.value)})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Contact</label>
            <input
              type="text"
              value={formData.admin_contact}
              onChange={(e) => setFormData({...formData, admin_contact: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-4 mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.supports_deposit}
              onChange={(e) => setFormData({...formData, supports_deposit: e.target.checked})}
              className="mr-2"
            />
            Supports Deposit
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.supports_withdrawal}
              onChange={(e) => setFormData({...formData, supports_withdrawal: e.target.checked})}
              className="mr-2"
            />
            Supports Withdrawal
          </label>
        </div>
        <div className="mt-6">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            {editingId ? 'Update' : 'Create'} Payment Method
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  type: '',
                  instructions: '',
                  supports_deposit: true,
                  supports_withdrawal: true,
                  min_amount: 0,
                  max_amount: 0,
                  admin_contact: '',
                  display_order: 1,
                  status: 'ACTIVE'
                });
              }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(paymentMethods || []).map((method) => (
              <tr key={method.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {method.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {method.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    method.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {method.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{method.min_amount} - ₹{method.max_amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(method)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Info Section */}
      <div className="bg-white rounded-lg shadow-md mt-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">� Information</h3>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              🔗 QR codes are now managed directly within each payment method's details. 
              When creating or editing a payment method, you can set the QR code URL directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminPaymentMethodManagement;
