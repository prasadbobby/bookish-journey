'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  HomeIcon,
  AcademicCapIcon,
  UsersIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getImagePlaceholder } from '@/lib/utils';
import toast from 'react-hot-toast';

const AdminListingsPage = () => {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({
    total_listings: 0,
    total_homestays: 0,
    total_experiences: 0
  });
  const [filter, setFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchListings();
  }, [isAdmin, router, filter, typeFilter]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = { 
        status: filter,
        type: typeFilter
      };
      const response = await adminAPI.getListings(params);
      setListings(response.data.listings || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (listing, approved, notes = '') => {
    try {
      const data = {
        listing_type: listing.listing_category || listing.type,
        notes,
        reason: notes
      };

      if (approved) {
        await adminAPI.approveListing(listing.id, data);
        toast.success(`${listing.listing_category === 'experience' ? 'Experience' : 'Homestay'} approved successfully`);
      } else {
        if (!notes.trim()) {
          toast.error('Rejection reason is required');
          return;
        }
        await adminAPI.rejectListing(listing.id, data);
        toast.success(`${listing.listing_category === 'experience' ? 'Experience' : 'Homestay'} rejected`);
      }
      
      setShowApprovalModal(false);
      setSelectedListing(null);
      setApprovalNotes('');
      fetchListings();
    } catch (error) {
      console.error('Approval/rejection error:', error);
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} listing`);
    }
  };

  const openApprovalModal = (listing, approved) => {
    setSelectedListing({ ...listing, approved });
    setShowApprovalModal(true);
  };

  const getListingTypeIcon = (listing) => {
    return listing.listing_category === 'experience' ? (
      <AcademicCapIcon className="w-4 h-4" />
    ) : (
      <HomeIcon className="w-4 h-4" />
    );
  };

  const getListingTypeBadge = (listing) => {
    return listing.listing_category === 'experience' ? (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
        <AcademicCapIcon className="w-3 h-3" />
        <span>Experience</span>
      </span>
    ) : (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        <HomeIcon className="w-3 h-3" />
        <span>Homestay</span>
      </span>
    );
  };

  const getPriceDisplay = (listing) => {
    if (listing.listing_category === 'experience') {
      return `${formatCurrency(listing.price_per_person)}/person`;
    } else {
      return `${formatCurrency(listing.price_per_night)}/night`;
    }
  };

  const getCapacityDisplay = (listing) => {
    if (listing.listing_category === 'experience') {
      return `${listing.max_participants} people`;
    } else {
      return `${listing.max_guests} guests`;
    }
  };

  const getAdditionalInfo = (listing) => {
    if (listing.listing_category === 'experience') {
      return (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{listing.category} • {listing.duration}h</span>
          <span className="capitalize">{listing.difficulty_level}</span>
        </div>
      );
    } else {
      return (
        <div className="text-xs text-gray-500">
          <span className="capitalize">{listing.property_type?.replace('_', ' ')}</span>
        </div>
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Listing Management 🏠
          </h1>
          <p className="text-gray-600">Review and approve homestays and experiences</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_listings}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Homestays</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_homestays}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Experiences</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_experiences}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Status Filter */}
          <div className="flex space-x-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            {['pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex space-x-4">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            {[
              { value: 'all', label: 'All', icon: ClockIcon },
              { value: 'homestays', label: 'Homestays', icon: HomeIcon },
              { value: 'experiences', label: 'Experiences', icon: AcademicCapIcon }
            ].map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setTypeFilter(type.value)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    typeFilter === type.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-0 overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="card p-0 overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={
                      listing.images?.[0] || 
                      getImagePlaceholder(400, 200, listing.title)
                    }
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = getImagePlaceholder(400, 200, listing.title);
                    }}
                  />
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    {getListingTypeBadge(listing)}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {listing.is_approved === false && listing.is_active ? (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        Pending
                      </span>
                    ) : listing.is_approved ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        Approved
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {listing.title}
                  </h3>
                  
                  <div className="flex items-center space-x-1 text-gray-500 mb-3">
                    <MapPinIcon className="w-4 h-4" />
                    <span className="text-sm">{listing.location}</span>
                  </div>

                  {/* Capacity and Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <UsersIcon className="w-4 h-4" />
                      <span className="text-sm">{getCapacityDisplay(listing)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-lg font-bold text-gray-900">
                      <CurrencyRupeeIcon className="w-4 h-4" />
                      <span>{getPriceDisplay(listing)}</span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mb-4">
                    {getAdditionalInfo(listing)}
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Created: {formatDate(listing.created_at)}
                  </div>

                  {/* Host Info */}
                  {listing.host && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-gray-900">{listing.host.full_name}</p>
                      <p className="text-xs text-gray-600">{listing.host.email}</p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {listing.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                      <p className="text-xs text-red-700">{listing.rejection_reason}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/${listing.listing_category === 'experience' ? 'experiences' : 'listings'}/${listing.id}`)}
                      className="flex-1 btn-secondary flex items-center justify-center py-2 text-sm"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View
                    </button>
                    
                    {filter === 'pending' && (
                      <>
                        <button
                          onClick={() => openApprovalModal(listing, true)}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openApprovalModal(listing, false)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Reject"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            {typeFilter === 'experiences' ? (
              <AcademicCapIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            ) : (
              <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-600">
              No {filter} {typeFilter === 'all' ? 'listings' : typeFilter} at the moment.
            </p>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedListing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedListing.approved ? 'Approve' : 'Reject'} {selectedListing.listing_category === 'experience' ? 'Experience' : 'Homestay'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to {selectedListing.approved ? 'approve' : 'reject'} 
                "{selectedListing.title}"?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedListing.approved ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={selectedListing.approved ? 'Add any notes...' : 'Reason for rejection...'}
                  className="input-field resize-none"
                  required={!selectedListing.approved}
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedListing(null);
                    setApprovalNotes('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproval(selectedListing, selectedListing.approved, approvalNotes)}
                  disabled={!selectedListing.approved && !approvalNotes.trim()}
                  className={`flex-1 ${
                    selectedListing.approved 
                      ? 'btn-primary' 
                      : 'bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {selectedListing.approved ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminListingsPage;