// src/app/admin/listings/page.js
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
  HomeIcon
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const AdminListingsPage = () => {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchListings();
  }, [isAdmin, router, filter]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = { status: filter };
      const response = await adminAPI.getListings(params);
      setListings(response.data.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (listingId, approved, notes = '') => {
    try {
      if (approved) {
        await adminAPI.approveListing(listingId, { notes });
        toast.success('Listing approved successfully');
      } else {
        await adminAPI.rejectListing(listingId, { reason: notes || 'Does not meet requirements' });
        toast.success('Listing rejected');
      }
      
      setShowApprovalModal(false);
      setSelectedListing(null);
      setApprovalNotes('');
      fetchListings();
    } catch (error) {
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} listing`);
    }
  };

  const openApprovalModal = (listing, approved) => {
    setSelectedListing({ ...listing, approved });
    setShowApprovalModal(true);
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
          <p className="text-gray-600">Review and approve property listings</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-4">
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
                    src={listing.images?.[0] || 'https://via.placeholder.com/400x200/22c55e/ffffff?text=No+Image'}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
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
                  <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
                  
                  <div className="flex items-center space-x-1 text-gray-500 mb-3">
                    <MapPinIcon className="w-4 h-4" />
                    <span className="text-sm">{listing.location}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(listing.price_per_night)}/night
                    </span>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {listing.property_type?.replace('_', ' ')}
                    </span>
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
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/listings/${listing.id}`)}
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
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openApprovalModal(listing, false)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
            <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-600">No {filter} listings at the moment.</p>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedListing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedListing.approved ? 'Approve Listing' : 'Reject Listing'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to {selectedListing.approved ? 'approve' : 'reject'} 
                "{selectedListing.title}"?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedListing.approved ? 'Approval Notes (Optional)' : 'Rejection Reason'}
                </label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={selectedListing.approved ? 'Add any notes...' : 'Reason for rejection...'}
                  className="input-field resize-none"
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
                  onClick={() => handleApproval(selectedListing.id, selectedListing.approved, approvalNotes)}
                  className={`flex-1 ${selectedListing.approved ? 'btn-primary' : 'bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl'}`}
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