import React, { useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../contexts/AuthContext';

const AdminBannerManagement = () => {
  const { token, isAuthenticated } = useContext(AuthContext);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    description: '',
    is_active: true,
    order_position: 1,
    target_page: 'all',
    button_text: 'Learn More'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // File size limit (5MB to match backend)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const fetchBanners = useCallback(async () => {
    try {
      if (!token) {
        toast.error('Please log in to access admin features');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/v1/admin/banners', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      } else {
        toast.error('Failed to load banners');
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Error loading banners');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchBanners();
    } else {
      setLoading(false);
    }
  }, [fetchBanners, isAuthenticated]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    // Clear the image_url when a file is selected
    setFormData(prev => ({...prev, image_url: ''}));
    toast.success(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      // Handle file upload first if a file is selected
      let finalFormData = { ...formData };
      if (selectedFile) {
        setIsUploading(true);
        setUploadProgress(0);
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        
        const uploadResponse = await fetch('/api/v1/uploads/banner', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          finalFormData.image_url = uploadResult.url;
          setUploadProgress(100);
        } else {
          let errorMessage = 'Upload failed';
          try {
            const uploadError = await uploadResponse.json();
            errorMessage = uploadError.detail || uploadError.message || errorMessage;
          } catch (e) {
            // If we can't parse the error as JSON, it might be HTML (like 413 error)
            if (uploadResponse.status === 413) {
              errorMessage = 'File size too large. Please choose a smaller image (max 5MB).';
            } else {
              errorMessage = `Upload failed with status ${uploadResponse.status}`;
            }
          }
          toast.error(errorMessage);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }
      
      const url = editingBanner 
        ? `/api/v1/admin/banners/${editingBanner.id}`
        : '/api/v1/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalFormData)
      });
      
      if (response.ok) {
        await fetchBanners();
        resetForm();
        toast.success(editingBanner ? 'Banner updated successfully!' : 'Banner created successfully!');
      } else {
        const error = await response.json();
        console.error('❌ Banner creation failed:', error);
        toast.error(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('💥 Error saving banner:', error);
      toast.error('Error saving banner');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  const handleDelete = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        await fetchBanners();
        toast.success('Banner deleted successfully!');
      } else {
        toast.error('Failed to delete banner');
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Error deleting banner');
    }
  };
  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      description: banner.description || '',
      is_active: banner.is_active || true,
      order_position: banner.order_position || 1,
      target_page: banner.target_page || 'all',
      button_text: banner.button_text || 'Learn More'
    });
    setShowCreateForm(true);
  };
  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      image_url: '',
      link_url: '',
      description: '',
      is_active: true,
      order_position: 1,
      target_page: 'all',
      button_text: 'Learn More'
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setShowCreateForm(false);
  };
  const toggleBannerStatus = async (bannerId, currentStatus) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/v1/admin/banners/${bannerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (response.ok) {
        await fetchBanners();
        toast.success(`Banner ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      } else {
        toast.error('Failed to update banner status');
      }
    } catch (error) {
      console.error('Error updating banner status:', error);
      toast.error('Error updating banner status');
    }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🎨 Banner Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <span className="mr-2">+</span>
          Add New Banner
        </button>
      </div>
      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingBanner ? 'Edit Banner' : 'Create New Banner'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter banner title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
              {/* File Upload Option */}
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">Upload Image File</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedFile && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {isUploading && (
                  <div className="mt-2">
                    <div className="text-xs text-blue-600 mb-1">Uploading... {uploadProgress}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              {/* OR separator */}
              <div className="flex items-center my-3">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              {/* URL Input Option */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({...formData, image_url: e.target.value});
                    if (e.target.value) {
                      setSelectedFile(null);
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/banner-image.jpg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link URL (Optional)</label>
              <input
                type="url"
                value={formData.link_url}
                onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/target-page"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
              <input
                type="text"
                value={formData.button_text}
                onChange={(e) => setFormData({...formData, button_text: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Learn More"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Position</label>
              <input
                type="number"
                min="1"
                value={formData.order_position}
                onChange={(e) => setFormData({...formData, order_position: parseInt(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Page</label>
              <select
                value={formData.target_page}
                onChange={(e) => setFormData({...formData, target_page: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Pages</option>
                <option value="home">Home Page</option>
                <option value="dashboard">Dashboard</option>
                <option value="play">Play Pages</option>
                <option value="results">Results Pages</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Banner description..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active (visible to users)</span>
              </label>
            </div>
            {/* Preview */}
            {(formData.image_url || selectedFile) && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image_url} 
                    alt="Banner preview" 
                    className="w-full h-32 object-cover rounded"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <h4 className="font-semibold mt-2">{formData.title}</h4>
                  <p className="text-sm text-gray-600">{formData.description}</p>
                  {selectedFile && (
                    <p className="text-xs text-blue-600 mt-2">
                      File will be uploaded when banner is saved
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="md:col-span-2 flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Banners List */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Current Banners ({banners.length})</h3>
        </div>
        {banners.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No banners found</h3>
            <p className="text-gray-600 mb-4">Create your first banner to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create First Banner
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {banners.map((banner) => (
              <div key={banner.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {banner.image_url && (
                      <img 
                        src={banner.image_url} 
                        alt={banner.title}
                        className="w-20 h-20 object-cover rounded-lg"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{banner.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{banner.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Order: {banner.order_position}</span>
                        <span>Target: {banner.target_page}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          banner.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleBannerStatus(banner.id, banner.is_active)}
                      className={`text-sm font-medium ${
                        banner.is_active 
                          ? 'text-red-600 hover:text-red-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {banner.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminBannerManagement;
