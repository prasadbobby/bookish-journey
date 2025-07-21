// src/app/host/create-listing/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  PhotoIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  UsersIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const CreateListingPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_night: '',
    property_type: 'homestay',
    max_guests: 2,
    amenities: [],
    house_rules: [],
    sustainability_features: [],
    coordinates: { lat: 0, lng: 0 }
  });

  if (!isHost) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only hosts can create listings.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.description || !formData.location || !formData.price_per_night) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setLoading(true);

    try {
      const listingData = {
        ...formData,
        images: images.map(img => img.url || img.preview), // Handle both URL and preview
        price_per_night: parseFloat(formData.price_per_night),
        max_guests: parseInt(formData.max_guests)
      };

      console.log('Submitting listing data:', listingData); // Debug log

      const response = await listingsAPI.create(listingData);
      toast.success('Listing created successfully!');
      router.push('/host/listings');
    } catch (error) {
      console.error('Create listing error:', error);
      toast.error(error.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    console.log('Files selected:', files.length); // Debug log
    
    files.forEach((file, index) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size is 5MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = {
          id: Date.now() + index, // Unique ID
          file,
          url: event.target.result,
          preview: event.target.result,
          name: file.name
        };
        
        setImages(prev => {
          const updated = [...prev, newImage];
          console.log('Images updated:', updated.length); // Debug log
          return updated;
        });
      };
      
      reader.onerror = () => {
        toast.error(`Error reading file ${file.name}`);
      };
      
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imageId) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      console.log('Image removed, remaining:', updated.length); // Debug log
      return updated;
    });
  };

  const addAmenity = (amenity) => {
    if (!formData.amenities.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
    }
  };

  const removeAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  const popularAmenities = [
    'Wi-Fi', 'Home-cooked meals', 'Local guide', 'Traditional cuisine',
    'Cultural performances', 'Yoga sessions', 'Nature walks', 'Organic farming',
    'Handicraft workshop', 'Bicycle rental', 'Fireplace', 'Garden',
    'Parking', 'Air conditioning', 'Hot water', 'Laundry service'
  ];

  const propertyTypes = [
    { value: 'homestay', label: 'Homestay', desc: 'Stay with a local family' },
    { value: 'farmstay', label: 'Farmstay', desc: 'Experience rural farm life' },
    { value: 'heritage_home', label: 'Heritage Home', desc: 'Traditional architecture' },
    { value: 'eco_lodge', label: 'Eco Lodge', desc: 'Sustainable accommodation' },
    { value: 'village_house', label: 'Village House', desc: 'Independent village home' },
    { value: 'cottage', label: 'Cottage', desc: 'Cozy countryside cottage' }
  ];

  // Check if form is valid for publishing
  const canPublish = () => {
    const requiredFields = formData.title && formData.description && formData.location && formData.price_per_night;
    const hasImages = images.length > 0;
    
    console.log('Can publish check:', { requiredFields, hasImages, imagesCount: images.length }); // Debug log
    
    return requiredFields && hasImages && !loading;
  };

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create New Listing 🏠
          </h1>
          <p className="text-gray-600">
            Share your authentic rural experience with travelers
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <CheckIcon className="w-6 h-6" /> : step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Basic Info</span>
            <span>Property Details</span>
            <span>Amenities</span>
            <span>Photos & Publish</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Basic Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Traditional Rajasthani Haveli Experience"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your property, what makes it special, and the experience guests can expect..."
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Village, District, State"
                        className="input-field pl-10"
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
                        required
                        min="500"
                        value={formData.price_per_night}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_per_night: e.target.value }))}
                        placeholder="2000"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn-primary"
                  disabled={!formData.title || !formData.description || !formData.location || !formData.price_per_night}
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Property Details */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Property Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Property Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {propertyTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, property_type: type.value }))}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          formData.property_type === type.value
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <h3 className="font-semibold text-gray-900">{type.label}</h3>
                        <p className="text-sm text-gray-600">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Guests *
                  </label>
                  <div className="relative">
                    <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.max_guests}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) }))}
                      className="input-field pl-10"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num} guest{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-primary"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Amenities */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Amenities & Features</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {popularAmenities.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => 
                          formData.amenities.includes(amenity) 
                            ? removeAmenity(amenity)
                            : addAmenity(amenity)
                        }
                        className={`p-3 rounded-lg border text-sm transition-all duration-200 ${
                          formData.amenities.includes(amenity)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.amenities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                        >
                          <span>{amenity}</span>
                          <button
                            type="button"
                            onClick={() => removeAmenity(amenity)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="btn-primary"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Photos & Publish */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Photos & Publish</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Property Photos (Upload at least 1 photo)
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors duration-200">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Photos</h3>
                      <p className="text-gray-600">Choose multiple photos that showcase your property</p>
                      <p className="text-sm text-gray-500 mt-2">Supported formats: JPG, PNG, GIF (Max 5MB each)</p>
                    </label>
                  </div>

                  {images.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-4">
                        Uploaded Photos ({images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.preview || image.url}
                              alt={`Upload ${image.name}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(image.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                              {image.name.slice(0, 10)}...
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add more photos button */}
                      <button
                        type="button"
                        onClick={() => document.getElementById('photo-upload').click()}
                        className="mt-4 flex items-center space-x-2 text-green-600 hover:text-green-700"
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add More Photos</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Summary */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Listing Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Title:</span>
                      <p className="font-medium">{formData.title || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <p className="font-medium">{formData.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <p className="font-medium">₹{formData.price_per_night || '0'}/night</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Property Type:</span>
                      <p className="font-medium capitalize">{formData.property_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Guests:</span>
                      <p className="font-medium">{formData.max_guests}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Photos:</span>
                      <p className="font-medium">{images.length} uploaded</p>
                    </div>
                  </div>
                  {formData.amenities.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-600">Amenities:</span>
                      <p className="font-medium">{formData.amenities.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-secondary"
                >
                  Previous
                </button>
                
                <div className="flex space-x-4">
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={!canPublish()}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    disabled={!canPublish()}
                    className={`btn-primary ${!canPublish() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="spinner mr-2"></div>
                        Publishing...
                      </div>
                    ) : (
                      'Publish Listing'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Help text */}
              {!canPublish() && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-red-600">
                    {!formData.title || !formData.description || !formData.location || !formData.price_per_night
                      ? 'Please complete all required fields in previous steps'
                      : images.length === 0
                      ? 'Please upload at least one photo'
                      : 'Please wait...'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </form>

      
      </div>
    </div>
  );
};

export default CreateListingPage;