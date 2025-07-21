'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  StarIcon, 
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Providers from '@/components/providers/Providers';
import AppLayout from '@/components/layout/AppLayout';
import { listingsAPI } from '@/lib/api';
import { formatCurrency, getImagePlaceholder } from '@/lib/utils';
import toast from 'react-hot-toast';

const ListingsPage = () => {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
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

      // Remove empty filters
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
    fetchListings();
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

  return (
    <Providers>
      <AppLayout>
        <div className="min-h-screen village-bg pt-20">
          {/* Header */}
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Discover Authentic Village Stays
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Find unique rural experiences that connect you with local communities and culture.
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Search Input */}
                  <div className="md:col-span-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search villages, experiences..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Location"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  {/* Guests */}
                  <div>
                    <select
                      value={filters.guests}
                      onChange={(e) => handleFilterChange('guests', e.target.value)}
                      className="input-field"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={num}>
                          {num} Guest{num > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <FunnelIcon className="w-5 h-5" />
                    <span>More Filters</span>
                  </button>

                  <button type="submit" className="btn-primary">
                    Search Villages
                  </button>
                </div>
              </form>

              {/* Advanced Filters */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-6 bg-gray-50 rounded-xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <select
                        value={filters.property_type}
                        onChange={(e) => handleFilterChange('property_type', e.target.value)}
                        className="input-field"
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
                        Min Price
                      </label>
                      <input
                        type="number"
                        placeholder="₹ Min"
                        value={filters.min_price}
                        onChange={(e) => handleFilterChange('min_price', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price
                      </label>
                      <input
                        type="number"
                        placeholder="₹ Max"
                        value={filters.max_price}
                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                        className="input-field"
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
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={filters.check_out}
                        onChange={(e) => handleFilterChange('check_out', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Clear All Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="btn-secondary"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Sort and Results Count */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-gray-600">
                  {loading ? 'Loading...' : `${pagination.total_count} villages found`}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={`${filters.sort_by}-${filters.order}`}
                  onChange={(e) => {
                    const [sort_by, order] = e.target.value.split('-');
                    handleFilterChange('sort_by', sort_by);
                    handleFilterChange('order', order);
                  }}
                  className="input-field w-auto"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card p-0 overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {listings.map((listing, index) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="group"
                    >
                      <Link href={`/listings/${listing.id}`}>
                        <div className="card card-hover p-0 overflow-hidden">
                          <div className="relative">
                            <img
                              src={listing.images?.[0] || getImagePlaceholder(400, 240, listing.title)}
                              alt={listing.title}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.src = getImagePlaceholder(400, 240, listing.title);
                              }}
                            />
                            <div className="absolute top-3 right-3 bg-white rounded-lg px-2 py-1 shadow-md">
                              <div className="flex items-center space-x-1">
                                <StarIcon className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium">{listing.rating || '4.8'}</span>
                              </div>
                            </div>
                            {listing.sustainability_features?.length > 0 && (
                              <div className="absolute top-3 left-3 bg-green-500 text-white rounded-lg px-2 py-1 text-xs font-medium">
                                Eco-Friendly
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-200 line-clamp-2">
                              {listing.title}
                            </h3>
                            
                            <div className="flex items-center space-x-1 text-gray-500 mb-3">
                              <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm truncate">{listing.location}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-lg font-bold text-gray-900">
                                  {formatCurrency(listing.price_per_night)}
                                  <span className="text-sm font-normal text-gray-500">/night</span>
                                </div>
                              </div>
                              
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full capitalize">
                                {listing.property_type?.replace('_', ' ')}
                              </div>
                            </div>

                            {/* Amenities Preview */}
                            {listing.amenities?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {listing.amenities.slice(0, 3).map((amenity, i) => (
                                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {amenity}
                                  </span>
                                ))}
                                {listing.amenities.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{listing.amenities.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="mt-12 flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex space-x-1">
                      {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                        const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i;
                        if (pageNum > pagination.total_pages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className={`px-3 py-2 rounded-lg font-medium ${
                              pageNum === pagination.page
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.total_pages}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No villages found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or browse all villages.
                </p>
                <button onClick={clearFilters} className="btn-primary">
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