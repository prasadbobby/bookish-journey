'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ListBulletIcon,
  FireIcon,
  SunIcon,
  PhotoIcon,
  GlobeAltIcon,
  BeakerIcon,
  WifiIcon,
  HomeIcon,
  TreePineIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import Providers from '@/components/providers/Providers';
import AppLayout from '@/components/layout/AppLayout';
import WeatherRecommendations from '@/components/weather/WeatherRecommendations';
import { listingsAPI, aiAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
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
  const [hoveredCard, setHoveredCard] = useState(null);
  
  // Use refs to prevent unnecessary re-renders
  const isInitialMount = useRef(true);
  const lastFetchParams = useRef('');
  
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

  // Memoized fetch function to prevent recreating on every render
  const fetchListings = useCallback(async () => {
    const params = {
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    };

    // Remove empty params
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null) {
        delete params[key];
      }
    });

    // Create a unique key for this request
    const paramKey = JSON.stringify(params);
    
    // Prevent duplicate requests
    if (paramKey === lastFetchParams.current && !isInitialMount.current) {
      return;
    }
    
    lastFetchParams.current = paramKey;
    setLoading(true);
    
    try {
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
      isInitialMount.current = false;
    }
  }, [filters, pagination.page, pagination.limit]);

  // Single useEffect for fetching - only runs when dependencies actually change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchListings();
    }, 300); // Debounce to prevent rapid calls

    return () => clearTimeout(timeoutId);
  }, [fetchListings]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // Reset pagination when filters change
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [pagination.page]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setShowWeatherSearch(false);
    // Force refetch by updating lastFetchParams
    lastFetchParams.current = '';
    fetchListings();
  }, [fetchListings]);

const handleWeatherEnhancedSearch = useCallback(async () => {
  if (!filters.location.trim()) {
    toast.error('Please enter a location for smart search');
    return;
  }

  setLoading(true);
  try {
    console.log('🔍 Starting weather-enhanced search for:', filters.location);
    
    const response = await aiAPI.getWeatherEnhancedSearch({
      location: filters.location,
      check_in: filters.check_in,
      check_out: filters.check_out,
      preferences: ['outdoor', 'cultural', 'farming']
    });

    console.log('📊 Weather search response:', response);

    // Check if we have weather enhanced listings
    if (response && response.weather_enhanced_listings) {
      setWeatherEnhancedListings(response.weather_enhanced_listings);
      setWeatherRecommendations(response);
      setShowWeatherSearch(true);
      
      console.log('✅ Weather enhanced listings set:', response.weather_enhanced_listings.length);
      toast.success(`🌤️ Found ${response.weather_enhanced_listings.length} weather-optimized results!`);
    } else {
      console.log('⚠️ No weather enhanced listings in response');
      // Fallback to regular search if no weather results
      setShowWeatherSearch(false);
      toast.info('Weather data loaded, showing regular results');
    }
  } catch (error) {
    console.error('❌ Weather search error:', error);
    setShowWeatherSearch(false);
    toast.error('Failed to get weather-enhanced recommendations');
  } finally {
    setLoading(false);
  }
}, [filters.location, filters.check_in, filters.check_out]);

  const clearFilters = useCallback(() => {
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
    // Reset pagination
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const toggleFavorite = useCallback((listingId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(listingId)) {
        newFavorites.delete(listingId);
        toast.success('💔 Removed from favorites');
      } else {
        newFavorites.add(listingId);
        toast.success('❤️ Added to favorites');
      }
      return newFavorites;
    });
  }, []);

  const propertyTypes = [
    { value: '', label: 'All Property Types', icon: '🏘️' },
    { value: 'homestay', label: 'Homestay', icon: '🏠' },
    { value: 'farmstay', label: 'Farmstay', icon: '🌾' },
    { value: 'heritage_home', label: 'Heritage Home', icon: '🏛️' },
    { value: 'eco_lodge', label: 'Eco Lodge', icon: '🌿' },
    { value: 'village_house', label: 'Village House', icon: '🏘️' },
    { value: 'cottage', label: 'Cottage', icon: '🏡' }
  ];

  const sortOptions = [
    { value: 'rating-desc', label: 'Highest Rated ⭐' },
    { value: 'price_per_night-asc', label: 'Price: Low to High 💰' },
    { value: 'price_per_night-desc', label: 'Price: High to Low 💎' },
    { value: 'created_at-desc', label: 'Newest First 🆕' }
  ];

  const displayListings = showWeatherSearch ? weatherEnhancedListings : listings;

  // Enhanced Card Component with better image handling
  const PropertyCard = ({ listing, index }) => {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState(
      listing.images?.[0] || '/images/placeholder-village.jpg'
    );

    const handleImageError = useCallback(() => {
      if (!imageError) {
        setImageError(true);
        // Use a fallback placeholder
        setImageSrc('');
      }
    }, [imageError]);

    const isWeatherEnhanced = showWeatherSearch;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        onHoverStart={() => setHoveredCard(listing.id)}
        onHoverEnd={() => setHoveredCard(null)}
        className="group relative"
      >
        <div className="relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
          {/* Image Container */}
          <div className="relative h-64 overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200">
            {imageError || !imageSrc ? (
              // Fallback image component
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-500">
                <div className="text-center text-white">
                  <div className="text-4xl mb-2">🏘️</div>
                  <div className="font-semibold text-lg">{listing.title}</div>
                  <div className="text-sm opacity-80">{listing.property_type?.replace('_', ' ')}</div>
                </div>
              </div>
            ) : (
              <motion.img
                src={imageSrc}
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={handleImageError}
                loading="lazy"
              />
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex flex-col space-y-2">
              {isWeatherEnhanced && listing.weather_suitability_score && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg backdrop-blur-sm"
                >
                  🌤️ {listing.weather_suitability_score}% Match
                </motion.div>
              )}
              
              {listing.sustainability_features?.length > 0 && (
                <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
                  🌱 Eco-Friendly
                </div>
              )}
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
                ✨ {listing.property_type?.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            {/* Favorite Button */}
            <motion.button
              onClick={() => toggleFavorite(listing.id)}
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-lg rounded-full border border-white/30 hover:bg-white/30 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {favorites.has(listing.id) ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-white" />
              )}
            </motion.button>

            {/* Rating Badge */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <StarSolidIcon
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(listing.rating || 4.8) 
                        ? 'text-yellow-400' 
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-gray-900">{listing.rating || '4.8'}</span>
              <span className="text-xs text-gray-500">(24)</span>
            </div>

            {/* Quick Actions Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: hoveredCard === listing.id ? 1 : 0 
              }}
              className="absolute inset-0 flex items-center justify-center space-x-3"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-white/20 backdrop-blur-lg rounded-full text-white hover:bg-white/30 transition-all duration-300"
              >
                <EyeIcon className="w-6 h-6" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-white/20 backdrop-blur-lg rounded-full text-white hover:bg-white/30 transition-all duration-300"
              >
                <ShareIcon className="w-6 h-6" />
              </motion.button>
            </motion.div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1 mr-2">
                {listing.title}
              </h3>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(listing.price_per_night)}
                </div>
                <div className="text-sm text-gray-500">/night</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-600 mb-4">
              <MapPinIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm">{listing.location}</span>
            </div>

            {/* Amenities Preview */}
            {listing.amenities?.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.slice(0, 3).map((amenity, i) => (
                    <span 
                      key={i} 
                      className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                    >
                      <span className="mr-1">
                        {amenity.toLowerCase().includes('wifi') && '📶'}
                        {amenity.toLowerCase().includes('meal') && '🍽️'}
                        {amenity.toLowerCase().includes('guide') && '👨‍🏫'}
                        {amenity.toLowerCase().includes('cooking') && '👨‍🍳'}
                        {amenity.toLowerCase().includes('organic') && '🌱'}
                        {amenity.toLowerCase().includes('traditional') && '🎭'}
                        {!['wifi', 'meal', 'guide', 'cooking', 'organic', 'traditional'].some(keyword => 
                          amenity.toLowerCase().includes(keyword)) && '✨'}
                      </span>
                      {amenity}
                    </span>
                  ))}
                  {listing.amenities.length > 3 && (
                    <span className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-full">
                      +{listing.amenities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Weather Enhanced Activities */}
            {isWeatherEnhanced && listing.suitable_activities?.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-600 mb-2 font-medium">🌤️ Perfect for today's weather:</div>
                <div className="flex flex-wrap gap-1">
                  {listing.suitable_activities.slice(0, 2).map((activity, i) => (
                    <span 
                      key={i} 
                      className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-2 py-1 rounded-full border border-green-200"
                    >
                      {activity.activity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Host Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {listing.host?.full_name?.charAt(0) || 'H'}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {listing.host?.full_name || 'Local Host'}
                  </div>
                  <div className="text-xs text-gray-500">Superhost ⭐</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-500">Max guests</div>
                <div className="flex items-center space-x-1">
                  <UserGroupIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{listing.max_guests || 4}</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Link href={`/listings/${listing.id}`}>
              <motion.button 
                className="w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>Explore Experience</span>
                  <SparklesIcon className="w-5 h-5" />
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Providers>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
          {/* Enhanced Hero Header */}
          <div className="relative bg-gradient-to-br from-green-500 via-teal-500 to-blue-600 overflow-hidden">
            {/* Simpler Background Pattern */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full">
                  {/* Simple dot pattern using CSS */}
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                      backgroundSize: '60px 60px'
                    }}
                  />
                </div>
              </div>
              
              {/* Floating Elements */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-64 h-64 bg-white/5 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    x: [0, 10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 6 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 1.5,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-lg rounded-full text-white font-medium mb-6 border border-white/30"
                >
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  AI-Powered Village Discovery
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
                >
                  Discover Your
                  <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 bg-clip-text text-transparent">
                    Perfect Village
                  </span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed"
                >
                  Explore authentic rural experiences powered by intelligent search and real-time weather insights
                </motion.p>
              </div>

              {/* Enhanced Search Form */}
              <motion.form 
                onSubmit={handleSearch} 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-6xl mx-auto"
              >
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8 shadow-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {/* Search Input */}
                    <div className="md:col-span-2">
                      <label className="block text-white/90 font-semibold mb-3 text-sm">
                        🔍 What are you looking for?
                      </label>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          type="text"
                          placeholder="Villages, experiences, activities..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white/20 border border-white/30 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 text-white placeholder-white/60 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-white/90 font-semibold mb-3 text-sm">
                        📍 Location
                      </label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          type="text"
                          placeholder="State, District, Village"
                          value={filters.location}
                          onChange={(e) => handleFilterChange('location', e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white/20 border border-white/30 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 text-white placeholder-white/60 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    {/* Guests */}
                    <div>
                      <label className="block text-white/90 font-semibold mb-3 text-sm">
                        👥 Guests
                      </label>
                      <div className="relative">
                        <UserGroupIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                        <select
                          value={filters.guests}
                          onChange={(e) => handleFilterChange('guests', e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white/20 border border-white/30 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 text-white backdrop-blur-sm appearance-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <option key={num} value={num} className="text-gray-900">
                              {num} Guest{num > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <motion.button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center space-x-2 px-6 py-3 text-white hover:text-gray-200 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        <span>Advanced Filters</span>
                      </motion.button>

                      <WeatherRecommendations
                        location={filters.location}
                        onRecommendationsUpdate={(data) => {
                          setWeatherRecommendations(data);
                        }}
                      />
                    </div>

                    <div className="flex space-x-4">
                      <motion.button
                        type="button"
                        onClick={handleWeatherEnhancedSearch}
                        disabled={!filters.location.trim()}
                        className={`flex items-center space-x-2 px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                          !filters.location.trim()
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        }`}
                        whileHover={filters.location.trim() ? { scale: 1.05 } : {}}
                        whileTap={filters.location.trim() ? { scale: 0.95 } : {}}
                      >
                        <SparklesIcon className="w-5 h-5" />
                        <span>AI Smart Search</span>
                      </motion.button>
                      
                      <motion.button 
                        type="submit" 
                        className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        🔍 Discover Villages
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.form>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border-b border-gray-100 shadow-lg"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        🏠 Property Type
                      </label>
                      <select
                        value={filters.property_type}
                        onChange={(e) => handleFilterChange('property_type', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                      >
                        {propertyTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        💰 Min Price (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="500"
                        value={filters.min_price}
                        onChange={(e) => handleFilterChange('min_price', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        💎 Max Price (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={filters.max_price}
                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        📅 Check-in
                      </label>
                      <input
                        type="date"
                        value={filters.check_in}
                        onChange={(e) => handleFilterChange('check_in', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        📊 Sort By
                      </label>
                      <select
                        value={`${filters.sort_by}-${filters.order}`}
                        onChange={(e) => {
                          const [sort_by, order] = e.target.value.split('-');
                          handleFilterChange('sort_by', sort_by);
                          handleFilterChange('order', order);
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                      >
                        {sortOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <motion.button
                      onClick={clearFilters}
                      className="text-gray-600 hover:text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🔄 Clear All Filters
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setShowFilters(false)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ✅ Apply Filters
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Weather-Enhanced Results */}
            <AnimatePresence>
              {showWeatherSearch && weatherEnhancedListings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="mb-12"
                >
                  <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border border-gray-200 rounded-3xl p-8 shadow-lg">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <SparklesIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900">AI Weather Recommendations</h2>
                          <p className="text-gray-600 text-lg">Perfect matches for today's weather in {filters.location}</p>
                        </div>
                      </div>
                      
                      <motion.button
                        onClick={() => setShowWeatherSearch(false)}
                        className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-300"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </motion.button>
                    </div>

                    {/* Weather Insights */}
                    {weatherRecommendations?.current_weather && (
                      <div className="mb-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-gray-900 mb-2">
                              {weatherRecommendations.current_weather.temperature}°C
                            </div>
                            <div className="text-lg text-gray-600 capitalize font-medium">
                              {weatherRecommendations.current_weather.description}
                            </div>
                            <div className="text-6xl mt-2">
                              {weatherRecommendations.current_weather.main === 'Clear' && '☀️'}
                              {weatherRecommendations.current_weather.main === 'Clouds' && '☁️'}
                              {weatherRecommendations.current_weather.main === 'Rain' && '🌧️'}
                              {!['Clear', 'Clouds', 'Rain'].includes(weatherRecommendations.current_weather.main) && '🌤️'}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-gray-900 mb-3 text-lg">🎯 Best Activities</h4>
                            <div className="space-y-2">
                              {weatherRecommendations.search_insights?.best_activities?.slice(0, 3).map((activity, i) => (
                                <div key={i} className="flex items-center space-x-2 text-gray-700">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  <span className="font-medium">{activity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-gray-900 mb-3 text-lg">📈 Weather Trend</h4>
                            <p className="text-gray-700 leading-relaxed">
                              {weatherRecommendations.search_insights?.weather_trend}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Listings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {weatherEnhancedListings.slice(0, 6).map((listing, index) => (
                        <PropertyCard key={listing.id} listing={listing} index={index} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Regular Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-2">
                  {showWeatherSearch ? '🏘️ All Properties' : '✨ Available Properties'}
                </h2>
                <p className="text-xl text-gray-600">
                  {loading ? 'Loading amazing places...' : `Found ${pagination.total_count} authentic village experiences`}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex bg-gray-100 rounded-2xl p-2">
                  <motion.button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      viewMode === 'grid' 
                        ? 'bg-white shadow-md text-green-600' 
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      viewMode === 'list' 
                        ? 'bg-white shadow-md text-green-600' 
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ListBulletIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Listings Grid/List */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-3xl overflow-hidden animate-pulse">
                    <div className="w-full h-64 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
                    <div className="p-6">
                      <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg mb-3"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded mb-2 w-2/3"></div>
                      <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displayListings.length > 0 ? (
              <>
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8' 
                  : 'space-y-6'
                }>
                  {displayListings.map((listing, index) => (
                    <PropertyCard key={listing.id} listing={listing} index={index} />
                  ))}
                </div>

                {/* Enhanced Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="mt-16 flex justify-center">
                    <div className="flex items-center space-x-3">
                      <motion.button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-6 py-3 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ← Previous
                      </motion.button>
                      
                      {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                        const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i;
                        if (pageNum > pagination.total_pages) return null;
                        
                        return (
                          <motion.button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className={`px-4 py-3 text-sm rounded-xl font-medium transition-all duration-300 ${
                              pageNum === pagination.page
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {pageNum}
                          </motion.button>
                        );
                      })}
                      
                      <motion.button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.total_pages}
                        className="px-6 py-3 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Next →
                      </motion.button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-md mx-auto"
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-8">
                    <MagnifyingGlassIcon className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No villages found</h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    We couldn't find any properties matching your criteria. Try adjusting your search or filters.
                  </p>
                  <motion.button 
                    onClick={clearFilters} 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄 Clear All Filters
                  </motion.button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </Providers>
  );
};

export default ListingsPage;