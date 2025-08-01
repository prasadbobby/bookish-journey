"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  StarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  HomeIcon,
  AcademicCapIcon,
  UsersIcon,
  CurrencyRupeeIcon
} from "@heroicons/react/24/outline";

import { listingsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, getImagePlaceholder } from "@/lib/utils";
import toast from "react-hot-toast";

const HostListingsPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'homestays', 'experiences'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [stats, setStats] = useState({
    overall: {
      total_listings: 0,
      active_listings: 0,
      pending_listings: 0,
      inactive_listings: 0,
      avg_rating: 0.0
    },
    homestays: {
      total: 0,
      active: 0,
      pending: 0,
      inactive: 0,
      avg_rating: 0.0
    },
    experiences: {
      total: 0,
      active: 0,
      pending: 0,
      inactive: 0,
      avg_rating: 0.0
    }
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total_count: 0,
    total_pages: 0,
  });

  useEffect(() => {
    if (!isHost) {
      toast.error("Access denied. Host account required.");
      router.push("/");
      return;
    }
    fetchListings();
    fetchStats();
  }, [isHost, router, pagination.page, activeTab]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getHostAllListings(user.id, {
        type: activeTab,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setListings(response.data.listings || []);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }));
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      toast.error("Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await listingsAPI.getHostStats(user.id);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDeleteListing = async (listing) => {
    try {
      await listingsAPI.delete(listing.id);
      toast.success(`${listing.listing_category === 'homestay' ? 'Homestay' : 'Experience'} deleted successfully`);
      setShowDeleteModal(false);
      setListingToDelete(null);
      fetchListings();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete listing:", error);
      toast.error("Failed to delete listing");
    }
  };

  const getStatusIcon = (listing) => {
    if (!listing.is_approved && listing.is_active) {
      return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    } else if (listing.is_approved && listing.is_active) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (listing) => {
    if (!listing.is_approved && listing.is_active) {
      return "Pending Approval";
    } else if (listing.is_approved && listing.is_active) {
      return "Active";
    } else {
      return "Inactive";
    }
  };

  const getStatusColor = (listing) => {
    if (!listing.is_approved && listing.is_active) {
      return "bg-yellow-100 text-yellow-800";
    } else if (listing.is_approved && listing.is_active) {
      return "bg-green-100 text-green-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const openDeleteModal = (listing) => {
    setListingToDelete(listing);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (listingToDelete) {
      handleDeleteListing(listingToDelete);
    }
  };

  // Tab configuration
  const tabs = [
    {
      id: 'all',
      label: 'All Listings',
      icon: CalendarDaysIcon,
      count: stats.overall.total_listings
    },
    {
      id: 'homestays',
      label: 'Homestays',
      icon: HomeIcon,
      count: stats.homestays.total
    },
    {
      id: 'experiences',
      label: 'Experiences',
      icon: AcademicCapIcon,
      count: stats.experiences.total
    }
  ];

  // Get current stats based on active tab
  const getCurrentStats = () => {
    switch (activeTab) {
      case 'homestays':
        return stats.homestays;
      case 'experiences':
        return stats.experiences;
      default:
        return stats.overall;
    }
  };

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Listings 🏠
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your homestays and experiences
              </p>
            </div>

            <div className="flex space-x-3">
              <Link href="/host/create-listing" className="btn-primary">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Listing
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mr-2 h-5 w-5 ${
                      activeTab === tab.id ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {tab.label}
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total {activeTab === 'all' ? 'Listings' : activeTab === 'homestays' ? 'Homestays' : 'Experiences'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {getCurrentStats().total || getCurrentStats().total_listings}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getCurrentStats().active || getCurrentStats().active_listings}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getCurrentStats().pending || getCurrentStats().pending_listings}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getCurrentStats().avg_rating || '0.0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
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
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="card p-0 overflow-hidden group"
                >
                  <div className="relative">
                    <img
                      src={
                        listing.images?.[0] ||
                        getImagePlaceholder(400, 200, listing.title)
                      }
                      alt={listing.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = getImagePlaceholder(400, 200, listing.title);
                      }}
                    />
                    
                    {/* Listing Type Badge */}
                    <div className="absolute top-3 left-3 flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        listing.listing_category === 'homestay' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {listing.listing_category === 'homestay' ? (
                          <span className="flex items-center space-x-1">
                            <HomeIcon className="w-3 h-3" />
                            <span>Homestay</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1">
                            <AcademicCapIcon className="w-3 h-3" />
                            <span>Experience</span>
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 flex items-center space-x-2">
                      {getStatusIcon(listing)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing)}`}>
                        {getStatusText(listing)}
                      </span>
                    </div>

                    {/* Rating */}
                    {listing.rating > 0 && (
                      <div className="absolute bottom-3 left-3 bg-white rounded-lg px-2 py-1 shadow-md">
                        <div className="flex items-center space-x-1">
                          <StarIcon className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-medium">{listing.rating}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {listing.title}
                    </h3>

                    <div className="flex items-center space-x-1 text-gray-500 mb-3">
                      <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{listing.location}</span>
                    </div>

                    {/* Capacity and Price */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1 text-gray-500">
                        <UsersIcon className="w-4 h-4" />
                        <span className="text-sm">
                          {listing.listing_category === 'homestay' 
                            ? `${listing.max_guests || listing.capacity} guests`
                            : `${listing.max_participants || listing.capacity} people`
                          }
                        </span>
                      </div>

                      <div className="text-lg font-bold text-gray-900">
                        <div className="flex items-center space-x-1">
                          <CurrencyRupeeIcon className="w-4 h-4" />
                          <span>{listing.price_display || listing.price_per_night || listing.price_per_person}</span>
                        </div>
                        <span className="text-sm font-normal text-gray-500">
                          /{listing.price_unit || (listing.listing_category === 'homestay' ? 'night' : 'person')}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full capitalize">
                        {listing.listing_category === 'homestay' 
                          ? listing.property_type?.replace("_", " ")
                          : `${listing.category} • ${listing.duration}h`
                        }
                      </div>
                      
                      {listing.listing_category === 'experience' && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full capitalize">
                          {listing.difficulty_level}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      Created: {formatDate(listing.created_at)}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between space-x-2">
                      <Link
                        href={`/${listing.listing_category === 'homestay' ? 'listings' : 'experiences'}/${listing.id}`}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium text-sm"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>View</span>
                      </Link>

                      <Link
                        href={`/host/listings/${listing.id}/edit`}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit</span>
                      </Link>

                      <button
                        onClick={() => openDeleteModal(listing)}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
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
                            ? "bg-green-500 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50"
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
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <PlusIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {activeTab === 'all' ? 'listings' : activeTab} yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first {activeTab === 'experiences' ? 'experience' : activeTab === 'homestays' ? 'homestay' : 'listing'}.
            </p>
            <Link href="/host/create-listing" className="btn-primary">
              Create Your First {activeTab === 'experiences' ? 'Experience' : 'Homestay'}
            </Link>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && listingToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Delete {listingToDelete.listing_category === 'homestay' ? 'Homestay' : 'Experience'}
              </h3>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{listingToDelete.title}"? This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setListingToDelete(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostListingsPage;