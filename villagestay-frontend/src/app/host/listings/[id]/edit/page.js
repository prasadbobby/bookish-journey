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
  SparklesIcon,
  AcademicCapIcon,
  ClockIcon
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
  const [listingType, setListingType] = useState('homestay'); // 'homestay' or 'experience'
  
  // Base form data structure that works for both types
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    images: [],
    is_active: true,
    // Homestay specific
    price_per_night: '',
    property_type: 'homestay',
    max_guests: 4,
    amenities: [],
    house_rules: [],
    sustainability_features: [],
    // Experience specific
    price_per_person: '',
    category: 'cultural',
    duration: 2,
    max_participants: 8,
    inclusions: [],
    difficulty_level: 'easy'
  });

  const [newItem, setNewItem] = useState('');
  const [addingItemType, setAddingItemType] = useState('');
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
      setListingType(listing.listing_category || 'homestay');
      
      // Populate form with existing data
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        location: listing.location || '',
        images: listing.images || [],
        is_active: listing.is_active !== false,
        // Homestay fields
        price_per_night: listing.price_per_night || '',
        property_type: listing.property_type || 'homestay',
        max_guests: listing.max_guests || 4,
        amenities: listing.amenities || [],
        house_rules: listing.house_rules || [],
        sustainability_features: listing.sustainability_features || [],
        // Experience fields
        price_per_person: listing.price_per_person || '',
        category: listing.category || 'cultural',
        duration: listing.duration || 2,
        max_participants: listing.max_participants || 8,
        inclusions: listing.inclusions || [],
        difficulty_level: listing.difficulty_level || 'easy'
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

  const addItem = (type) => {
    if (newItem.trim()) {
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], newItem.trim()]
      }));
      setNewItem('');
      setAddingItemType('');
    }
  };

  const removeItem = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.location.trim()) {
      toast.error('Location is required');
      return;
    }
    
    // Type-specific validation
    if (listingType === 'homestay') {
      if (!formData.price_per_night || formData.price_per_night <= 0) {
        toast.error('Valid price per night is required');
        return;
      }
    } else {
      if (!formData.price_per_person || formData.price_per_person <= 0) {
        toast.error('Valid price per person is required');
        return;
      }
    }
    
    if (formData.images.length === 0) {
      toast.error('At least one image is required');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare data based on listing type
      const updateData = {
        ...formData,
        listing_category: listingType,
        type: listingType
      };

      // Remove irrelevant fields based on type
      if (listingType === 'homestay') {
        delete updateData.price_per_person;
        delete updateData.category;
        delete updateData.duration;
        delete updateData.max_participants;
        delete updateData.inclusions;
        delete updateData.difficulty_level;
      } else {
        delete updateData.price_per_night;
        delete updateData.property_type;
        delete updateData.max_guests;
        delete updateData.amenities;
        delete updateData.house_rules;
        delete updateData.sustainability_features;
      }

      await listingsAPI.update(params.id, updateData);
      toast.success(`${listingType === 'homestay' ? 'Homestay' : 'Experience'} updated successfully!`);
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

  const experienceCategories = [
    { value: 'cultural', label: 'Cultural', icon: '🎭' },
    { value: 'culinary', label: 'Culinary', icon: '🍛' },
    { value: 'farming', label: 'Farming', icon: '🌾' },
    { value: 'craft', label: 'Handicrafts', icon: '🎨' },
    { value: 'spiritual', label: 'Spiritual', icon: '🙏' },
    { value: 'adventure', label: 'Adventure', icon: '🏔️' },
    { value: 'wellness', label: 'Wellness', icon: '🧘' },
    { value: 'nature', label: 'Nature', icon: '🌳' }
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
              <h1 className="text-3xl font-bold text-gray-900">
                Edit {listingType === 'homestay' ? 'Homestay' : 'Experience'}
              </h1>
              <p className="text-gray-600 mt-2">
                Update your {listingType === 'homestay' ? 'property' : 'experience'} details
              </p>
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
              {listingType === 'homestay' ? (
                <HomeIcon className="w-6 h-6 text-green-500" />
              ) : (
                <AcademicCapIcon className="w-6 h-6 text-purple-500" />
              )}
              <span>Basic Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {listingType === 'homestay' ? 'Property' : 'Experience'} Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder={listingType === 'homestay' 
                    ? "Beautiful village homestay with organic farm"
                    : "Learn Traditional Pottery Making"
                  }
                  className="input-field"
                  required
                />
              </div>

              {listingType === 'homestay' ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    >
                      {experienceCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (hours) *
                    </label>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].map(hours => (
                        <option key={hours} value={hours}>
                          {hours} hour{hours > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Participants *
                    </label>
                    <select
                      name="max_participants"
                      value={formData.max_participants}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      {[1,2,4,6,8,10,12,15,20].map(num => (
                        <option key={num} value={num}>{num} Participant{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level *
                    </label>
                    <select
                      name="difficulty_level"
                      value={formData.difficulty_level}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value="easy">Easy</option>
                      <option value="moderate">Moderate</option>
                      <option value="challenging">Challenging</option>
                    </select>
                  </div>
                </>
              )}

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
                  Price {listingType === 'homestay' ? 'per Night' : 'per Person'} (₹) *
                </label>
                <div className="relative">
                  <CurrencyRupeeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name={listingType === 'homestay' ? 'price_per_night' : 'price_per_person'}
                    value={listingType === 'homestay' ? formData.price_per_night : formData.price_per_person}
                    onChange={handleInputChange}
                    placeholder={listingType === 'homestay' ? "2000" : "500"}
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
                  placeholder={listingType === 'homestay' 
                    ? "Describe your property, what makes it special, and what guests can expect..."
                    : "Describe your experience, what participants will learn, and what makes it unique..."
                  }
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
              <span>{listingType === 'homestay' ? 'Property' : 'Experience'} Images</span>
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

          {/* Dynamic Features Section */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <SparklesIcon className="w-6 h-6 text-green-500" />
              <span>
                {listingType === 'homestay' ? 'Amenities & Features' : 'What\'s Included'}
              </span>
            </h2>

            {listingType === 'homestay' ? (
              <div className="space-y-6">
                {/* Amenities */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Amenities</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={addingItemType === 'amenities' ? newItem : ''}
                        onChange={(e) => setNewItem(e.target.value)}
                        onFocus={() => setAddingItemType('amenities')}
                        placeholder="Add amenity (e.g., Wi-Fi, Traditional meals)"
                        className="input-field flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('amenities'))}
                      />
                      <button
                        type="button"
                        onClick={() => addItem('amenities')}
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
                            onClick={() => removeItem('amenities', index)}
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
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">House Rules</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={addingItemType === 'house_rules' ? newItem : ''}
                        onChange={(e) => setNewItem(e.target.value)}
                        onFocus={() => setAddingItemType('house_rules')}
                        placeholder="Add house rule"
                        className="input-field flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('house_rules'))}
                      />
                      <button
                        type="button"
                        onClick={() => addItem('house_rules')}
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
                            onClick={() => removeItem('house_rules', index)}
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
               <div>
                 <h3 className="font-medium text-gray-900 mb-3">Sustainability Features</h3>
                 <div className="space-y-4">
                   <div className="flex space-x-2">
                     <input
                       type="text"
                       value={addingItemType === 'sustainability_features' ? newItem : ''}
                       onChange={(e) => setNewItem(e.target.value)}
                       onFocus={() => setAddingItemType('sustainability_features')}
                       placeholder="Add sustainability feature"
                       className="input-field flex-1"
                       onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('sustainability_features'))}
                     />
                     <button
                       type="button"
                       onClick={() => addItem('sustainability_features')}
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
                           onClick={() => removeItem('sustainability_features', index)}
                           className="ml-2 text-blue-600 hover:text-blue-800"
                         >
                           <XMarkIcon className="w-4 h-4" />
                         </button>
                       </span>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
           ) : (
             /* Experience Inclusions */
             <div>
               <h3 className="font-medium text-gray-900 mb-3">What's Included</h3>
               <div className="space-y-4">
                 <div className="flex space-x-2">
                   <input
                     type="text"
                     value={addingItemType === 'inclusions' ? newItem : ''}
                     onChange={(e) => setNewItem(e.target.value)}
                     onFocus={() => setAddingItemType('inclusions')}
                     placeholder="Add inclusion (e.g., All materials, Light refreshments)"
                     className="input-field flex-1"
                     onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('inclusions'))}
                   />
                   <button
                     type="button"
                     onClick={() => addItem('inclusions')}
                     className="btn-secondary"
                   >
                     <PlusIcon className="w-5 h-5" />
                   </button>
                 </div>

                 <div className="flex flex-wrap gap-2">
                   {formData.inclusions.map((inclusion, index) => (
                     <span
                       key={index}
                       className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                     >
                       {inclusion}
                       <button
                         type="button"
                         onClick={() => removeItem('inclusions', index)}
                         className="ml-2 text-purple-600 hover:text-purple-800"
                       >
                         <XMarkIcon className="w-4 h-4" />
                       </button>
                     </span>
                   ))}
                 </div>
               </div>
             </div>
           )}
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
               Keep listing active (guests can find and book this {listingType === 'homestay' ? 'property' : 'experience'})
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
               `Update ${listingType === 'homestay' ? 'Homestay' : 'Experience'}`
             )}
           </button>
         </div>
       </form>
     </div>
   </div>
 );
};

export default EditListingPage;