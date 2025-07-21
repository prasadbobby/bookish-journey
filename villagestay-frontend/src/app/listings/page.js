'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  StarIcon, 
  FunnelIcon,
  XMarkIcon,
  SparklesIcon,
  CloudIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
  HeartIcon,
  ShareIcon,
  EyeIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Providers from '@/components/providers/Providers';
import AppLayout from '@/components/layout/AppLayout';
import WeatherRecommendations from '@/components/weather/WeatherRecommendations';
import { listingsAPI, aiAPI } from '@/lib/api';
import { formatCurrency, getImagePlaceholder } from '@/lib/utils';
import toast from 'react-hot-toast';

const ListingsPage = () => {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weatherRecommendations, setWeatherRecommendations] = useState(null);
  const [showWeatherSearch, setShowWeatherSearch] = useState(false);
  const [weatherEnhancedListings, setWeatherEnhancedListings] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid');
  
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    property_type: searchParams.get('property_type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    guests: searchParams.get('guests') || '1',
    check_in: '',
    check_out: '',
    sort_by: 'rating',
    order: 'desc'
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total_count: 0,
    total_pages: 0
  });

  useEffect(() => {
    fetchListings();
  }, [filters, pagination.page]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await listingsAPI.getAll(params);
      setListings(response.data.listings || []);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setShowWeatherSearch(false);
    fetchListings();
  };

  const handleWeatherEnhancedSearch = async () => {
    if (!filters.location.trim()) {
      toast.error('Please enter a location for weather-enhanced search');
      return;
    }

    setLoading(true);
    try {
      const response = await aiAPI.getWeatherEnhancedSearch({
        location: filters.location,
        check_in: filters.check_in,
        check_out: filters.check_out,
        preferences: ['outdoor', 'cultural', 'farming']
      });

      setWeatherEnhancedListings(response.weather_enhanced_listings);
      setWeatherRecommendations(response);
      setShowWeatherSearch(true);
      toast.success('Smart search results loaded!');
    } catch (error) {
      toast.error('Failed to get weather-enhanced recommendations');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      location: '',
      property_type: '',
      min_price: '',
      max_price: '',
      guests: '1',
      check_in: '',
      check_out: '',
      sort_by: 'rating',
      order: 'desc'
    });
    setShowWeatherSearch(false);
  };

  const toggleFavorite = (listingId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(listingId)) {
      newFavorites.delete(listingId);
      toast.success('Removed from favorites');
    } else {
      newFavorites.add(listingId);
      toast.success('Added to favorites');
    }
    setFavorites(newFavorites);
  };

  const propertyTypes = [
    { value: '', label: 'All Property Types' },
    { value: 'homestay', label: 'Homestay' },
    { value: 'farmstay', label: 'Farmstay' },
    { value: 'heritage_home', label: 'Heritage Home' },
    { value: 'eco_lodge', label: 'Eco Lodge' },
    { value: 'village_house', label: 'Village House' },
    { value: 'cottage', label: 'Cottage' }
  ];

  const sortOptions = [
    { value: 'rating-desc', label: 'Highest Rated' },
    { value: 'price_per_night-asc', label: 'Price: Low to High' },
    { value: 'price_per_night-desc', label: 'Price: High to Low' },
    { value: 'created_at-desc', label: 'Newest First' }
  ];

  const displayListings = showWeatherSearch ? weatherEnhancedListings : listings;

  return (
    <Providers>
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          {/* Clean Hero Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center mb-8">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                >
                  Discover Authentic
                  <span className="block text-blue-600 mt-1">Village Experiences</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-gray-600 max-w-3xl mx-auto"
                >
                  Connect with local communities and immerse yourself in authentic rural culture across India
                </motion.p>
              </div>

              {/* Search Form */}
              <motion.form 
                onSubmit={handleSearch} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-5xl mx-auto"
              >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Search Input */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search
                      </label>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Villages, experiences, activities..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="State, District, Village"
                          value={filters.location}
                          onChange={(e) => handleFilterChange('location', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Guests */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guests
                      </label>
                      <div className="relative">
                        <UserGroupIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={filters.guests}
                          onChange={(e) => handleFilterChange('guests', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <option key={num} value={num}>
                              {num} Guest{num > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                      >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        <span>Filters</span>
                      </button>

                      <WeatherRecommendations
                        location={filters.location}
                        onRecommendationsUpdate={(data) => {
                          setWeatherRecommendations(data);
                        }}
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleWeatherEnhancedSearch}
                        disabled={!filters.location.trim()}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                          !filters.location.trim()
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        <SparklesIcon className="w-5 h-5" />
                        <span>Smart Search</span>
                      </button>
                      
                      <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        Search Villages
                      </button>
                    </div>
                  </div>
                </div>
              </motion.form>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border-b border-gray-200"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <select
                        value={filters.property_type}
                        onChange={(e) => handleFilterChange('property_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {propertyTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Price (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="500"
                        value={filters.min_price}
                        onChange={(e) => handleFilterChange('min_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={filters.max_price}
                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={filters.check_in}
                        onChange={(e) => handleFilterChange('check_in', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <select
                        value={`${filters.sort_by}-${filters.order}`}
                        onChange={(e) => {
                          const [sort_by, order] = e.target.value.split('-');
                          handleFilterChange('sort_by', sort_by);
                          handleFilterChange('order', order);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {sortOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={clearFilters}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Weather-Enhanced Results */}
            <AnimatePresence>
              {showWeatherSearch && weatherEnhancedListings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-8"
                >
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <SparklesIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Smart Weather Recommendations</h2>
                          <p className="text-gray-600">Best matches for current weather in {filters.location}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowWeatherSearch(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Weather Insights */}
                    {weatherRecommendations?.current_weather && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {weatherRecommendations.current_weather.temperature}°C
                            </div>
                            <div className="text-sm text-gray-600 capitalize">
                              {weatherRecommendations.current_weather.description}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Best Activities</h4>
                            <div className="space-y-1">
                              {weatherRecommendations.search_insights?.best_activities?.slice(0, 3).map((activity, i) => (
                                <div key={i} className="text-sm text-gray-600">• {activity}</div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Weather Trend</h4>
                            <p className="text-sm text-gray-600">
                              {weatherRecommendations.search_insights?.weather_trend}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Listings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {weatherEnhancedListings.slice(0, 6).map((listing, index) => (
                        <motion.div
                          key={listing.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200"
                        >
                          <div className="relative">
                            <img
                              src={listing.images?.[0] || getImagePlaceholder(400, 240, listing.title)}
                              alt={listing.title}
                              className="w-full h-48 object-cover"
                            />
                            <div className="absolute top-3 right-3 bg-green-600 text-white rounded-lg px-2 py-1 text-xs font-medium">
                              {listing.weather_suitability_score}% Match
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-1">
                                <StarIcon className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium">{listing.rating || '4.8'}</span>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                {listing.property_type?.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                              {listing.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 mb-3">{listing.location}</p>
                            
                            <div className="text-lg font-bold text-gray-900 mb-3">
                              {formatCurrency(listing.price_per_night)}<span className="text-sm font-normal">/night</span>
                            </div>

                            {listing.suitable_activities?.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs text-gray-600 mb-1">Perfect for:</div>
                                <div className="flex flex-wrap gap-1">
                                  {listing.suitable_activities.slice(0, 2).map((activity, i) => (
                                    <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                      {activity.activity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Link href={`/listings/${listing.id}`}>
                              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
                                View Details
                              </button>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Regular Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {showWeatherSearch ? 'All Properties' : 'Available Properties'}
                </h2>
                <p className="text-gray-600">
                  {loading ? 'Loading...' : `${pagination.total_count} properties found`}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Listings Grid/List */}
            {loading ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                : 'space-y-4'
              }>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2 w-2/3"></div>
                      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displayListings.length > 0 ? (
              <>
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                  : 'space-y-4'
                }>
                  {displayListings.map((listing, index) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {viewMode === 'grid' ? (
                        // Grid View
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200">
                          <div className="relative">
                            <img
                              src={listing.images?.[0] || getImagePlaceholder(400, 240, listing.title)}
                              alt={listing.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.src = getImagePlaceholder(400, 240, listing.title);
                              }}
                            />
                            
                            <button
                              onClick={() => toggleFavorite(listing.id)}
                              className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
                            >
                              {favorites.has(listing.id) ? (
                                <HeartSolidIcon className="w-4 h-4 text-red-500" />
                              ) : (
                                <HeartIcon className="w-4 h-4 text-gray-600" />
                              )}
                            </button>

                            {listing.sustainability_features?.length > 0 && (
                              <div className="absolute top-3 left-3 bg-green-600 text-white rounded-lg px-2 py-1 text-xs font-medium">
                                Eco-Friendly
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-1">
                                <StarIcon className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium">{listing.rating || '4.8'}</span>
                                <span className="text-xs text-gray-500">(24)</span>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                {listing.property_type?.replace('_', ' ')}
                              </span>
                            </div>

                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                              {listing.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 mb-3">{listing.location}</p>
                            
                            <div className="text-lg font-bold text-gray-900 mb-3">
                              {formatCurrency(listing.price_per_night)}
                              <span className="text-sm font-normal text-gray-500">/night</span>
                            </div>

                            {listing.amenities?.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {listing.amenities.slice(0, 3).map((amenity, i) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                      {amenity}
                                    </span>
                                  ))}
                                  {listing.amenities.length > 3 && (
                                    <span className="text-xs text-gray-500 px-2 py-1">
                                      +{listing.amenities.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <Link href={`/listings/${listing.id}`}>
                              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
                                View Details
                              </button>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        // List View
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="flex">
                            <div className="w-64 h-40 flex-shrink-0">
                              <img
                                src={listing.images?.[0] || getImagePlaceholder(300, 160, listing.title)}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="flex-1 p-4">
                              <div className="flex justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                      {listing.property_type?.replace('_', ' ')}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 mb-2">
                                    <div className="flex items-center space-x-1">
                                      <StarIcon className="w-4 h-4 text-yellow-400" />
                                      <span className="text-sm font-medium">{listing.rating || '4.8'}</span>
                                    </div>
                                    <span className="text-sm text-gray-600">{listing.location}</span>
                                  </div>
                                  
                                  {listing.amenities?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {listing.amenities.slice(0, 5).map((amenity, i) => (
                                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                          {amenity}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-right ml-4">
                                  <div className="text-xl font-bold text-gray-900">
                                    {formatCurrency(listing.price_per_night)}
                                    <div className="text-sm font-normal text-gray-500">/night</div>
                                  </div>
                                  
                                  <div className="mt-2 space-y-2">
                                    <button
                                      onClick={() => toggleFavorite(listing.id)}
                                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                    >
                                      {favorites.has(listing.id) ? (
                                        <HeartSolidIcon className="w-4 h-4 text-red-500" />
                                      ) : (
                                        <HeartIcon className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                    
                                    <Link href={`/listings/${listing.id}`} className="block">
                                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">
                                        View
                                      </button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      
                      {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                        const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i;
                        if (pageNum > pagination.total_pages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className={`px-4 py-2 text-sm rounded-lg ${
                              pageNum === pagination.page
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.total_pages}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search criteria</p>
                <button onClick={clearFilters} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </Providers>
  );
};

export default ListingsPage;