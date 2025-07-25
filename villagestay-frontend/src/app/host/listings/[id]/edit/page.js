'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  MapPinIcon,
  HomeIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import { listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';


const EditListingPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isHost } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalListing, setOriginalListing] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_night: '',
    property_type: 'homestay',
    max_guests: 4,
    amenities: [],
    images: [],
    house_rules: [],
    sustainability_features: [],
    is_active: true
  });

  const [newAmenity, setNewAmenity] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [imagePreview, setImagePreview] = useState([]);

  useEffect(() => {
    if (!isHost) {
      toast.error('Access denied. Host account required.');
      router.push('/');
      return;
    }
    fetchListing();
  }, [isHost, router, params.id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getById(params.id);
      const listing = response.data;
      
      // Check if user owns this listing
      if (listing.host.id !== user.id) {
        toast.error('You can only edit your own listings');
        router.push('/host/listings');
        return;
      }

      setOriginalListing(listing);
      
      // Populate form with existing data
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        location: listing.location || '',
        price_per_night: listing.price_per_night || '',
        property_type: listing.property_type || 'homestay',
        max_guests: listing.max_guests || 4,
        amenities: listing.amenities || [],
        images: listing.images || [],
        house_rules: listing.house_rules || [],
        sustainability_features: listing.sustainability_features || [],
        is_active: listing.is_active !== false
      });
      
      setImagePreview(listing.images || []);
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      toast.error('Failed to load listing details');
      router.push('/host/listings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64]
        }));
        setImagePreview(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const addRule = () => {
    if (newRule.trim()) {
      setFormData(prev => ({
        ...prev,
        house_rules: [...prev.house_rules, newRule.trim()]
      }));
      setNewRule('');
    }
  };

  const removeRule = (index) => {
    setFormData(prev => ({
      ...prev,
      house_rules: prev.house_rules.filter((_, i) => i !== index)
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        sustainability_features: [...prev.sustainability_features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      sustainability_features: prev.sustainability_features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.location.trim()) {
      toast.error('Location is required');
      return;
    }
    
    if (!formData.price_per_night || formData.price_per_night <= 0) {
      toast.error('Valid price is required');
      return;
    }
    
    if (formData.images.length === 0) {
      toast.error('At least one image is required');
      return;
    }

    setSubmitting(true);
    try {
      await listingsAPI.update(params.id, formData);
      toast.success('Listing updated successfully!');
      router.push('/host/listings');
    } catch (error) {
      console.error('Failed to update listing:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update listing';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const propertyTypes = [
    { value: 'homestay', label: 'Homestay', icon: '🏠' },
    { value: 'farmstay', label: 'Farmstay', icon: '🌾' },
    { value: 'heritage_home', label: 'Heritage Home', icon: '🏛️' },
    { value: 'eco_lodge', label: 'Eco Lodge', icon: '🌿' },
    { value: 'village_house', label: 'Village House', icon: '🏘️' },
    { value: 'cottage', label: 'Cottage', icon: '🏡' }
  ];

  if (loading) {
    return (
      
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading listing details...</p>
            </div>
          </div>
        
    );
  }

  return (
  
        <div className="min-h-screen village-bg pt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-4"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to listings</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
                  <p className="text-gray-600 mt-2">Update your property details</p>
                </div>

                {originalListing && (
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      originalListing.is_approved && originalListing.is_active
                        ? 'bg-green-100 text-green-800'
                        : !originalListing.is_approved && originalListing.is_active
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {originalListing.is_approved && originalListing.is_active
                        ? '✅ Active'
                        : !originalListing.is_approved && originalListing.is_active
                        ? '⏳ Pending Approval'
                        : '❌ Inactive'
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Information */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                  <HomeIcon className="w-6 h-6 text-green-500" />
                  <span>Basic Information</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Beautiful village homestay with organic farm"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type *
                    </label>
                    <select
                      name="property_type"
                      value={formData.property_type}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    >
                      {propertyTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Guests *
                    </label>
                    <select
                      name="max_guests"
                      value={formData.max_guests}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Village, District, State"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price per Night (₹) *
                    </label>
                    <div className="relative">
                      <CurrencyRupeeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        name="price_per_night"
                        value={formData.price_per_night}
                        onChange={handleInputChange}
                        placeholder="2000"
                        min="100"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={5}
                      placeholder="Describe your property, what makes it special, and what guests can expect..."
                      className="input-field resize-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                  <PhotoIcon className="w-6 h-6 text-green-500" />
                  <span>Property Images</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="images"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <PhotoIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Click to upload images</span>
                      <span className="text-xs text-gray-500">PNG, JPG up to 5MB each</span>
                    </label>
                  </div>

                  {/* Image Preview Grid */}
                  {imagePreview.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreview.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                  <SparklesIcon className="w-6 h-6 text-green-500" />
                  <span>Amenities</span>
                </h2>

                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      placeholder="Add amenity (e.g., Wi-Fi, Traditional meals)"
                      className="input-field flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                    />
                    <button
                      type="button"
                      onClick={addAmenity}
                      className="btn-secondary"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(index)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* House Rules */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">House Rules</h2>
                
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      placeholder="Add house rule (e.g., No smoking, Respect local customs)"
                      className="input-field flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                    />
                    <button
                      type="button"
                      onClick={addRule}
                      className="btn-secondary"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.house_rules.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-700">{rule}</span>
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sustainability Features */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Sustainability Features</h2>
                
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add sustainability feature (e.g., Solar power, Organic farming)"
                      className="input-field flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="btn-secondary"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.sustainability_features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Listing Status</h2>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="is_active" className="text-gray-700">
                    Keep listing active (guests can find and book this property)
                  </label>
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  Note: Even if active, your listing needs admin approval to be visible to guests.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/host/listings')}
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="spinner"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    'Update Listing'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
    
  );
};

export default EditListingPage;