// src/app/host/bookings/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CalendarDaysIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { bookingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const HostBookingsPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_count: 0,
    total_pages: 0
  });

  useEffect(() => {
    if (!isHost) {
      toast.error('Access denied. Host account required.');
      router.push('/');
      return;
    }
    fetchBookings();
  }, [isHost, router, filter, pagination.page]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await bookingsAPI.getAll(params);
      setBookings(response.data.bookings || []);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    try {
      if (action === 'complete') {
        await bookingsAPI.complete(bookingId);
        toast.success('Booking marked as completed');
      }
      fetchBookings();
    } catch (error) {
      toast.error(`Failed to ${action} booking`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (!isHost) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only hosts can access booking management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Booking Management 📅
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your property reservations and guest communications
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  filter === option.value
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : bookings.length > 0 ? (
          <>
            <div className="space-y-6">
              {bookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="card p-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Booking Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {booking.listing?.title || 'Listing Title'}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center space-x-1">
                              <MapPinIcon className="w-4 h-4" />
                              <span>{booking.listing?.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CalendarDaysIcon className="w-4 h-4" />
                              <span>Ref: {booking.booking_reference}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(booking.status)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>

                      {/* Guest Information */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Guest Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3">
                            <UserIcon className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">{booking.tourist?.full_name}</p>
                              <p className="text-sm text-gray-600">{booking.guests} guest{booking.guests > 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-gray-900">{booking.tourist?.email}</p>
                              {booking.tourist?.phone && (
                                <p className="text-sm text-gray-600">{booking.tourist.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {booking.special_requests && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700">Special Requests:</p>
                            <p className="text-sm text-gray-600">{booking.special_requests}</p>
                          </div>
                        )}
                      </div>

                      {/* Stay Details */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Check-in</p>
                          <p className="font-medium text-gray-900">{formatDate(booking.check_in)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Check-out</p>
                          <p className="font-medium text-gray-900">{formatDate(booking.check_out)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="font-medium text-gray-900">{booking.nights} night{booking.nights > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment & Actions */}
                    <div className="lg:col-span-1">
                      <div className="bg-green-50 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(booking.total_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Your Earnings:</span>
                            <span className="font-medium text-green-600">{formatCurrency(booking.host_earnings || booking.total_amount * 0.93)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Status:</span>
                            <span className={`font-medium ${
                              booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {booking.payment_status || 'pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <button
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                          className="w-full btn-secondary flex items-center justify-center space-x-2"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                        
                        <button className="w-full btn-outline flex items-center justify-center space-x-2">
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          <span>Message Guest</span>
                        </button>

                        {booking.status === 'confirmed' && new Date(booking.check_out) < new Date() && (
                          <button
                            onClick={() => handleBookingAction(booking.id, 'complete')}
                            className="w-full btn-primary"
                          >
                            Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2">
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
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'You haven\'t received any bookings yet.' 
                : `No ${filter} bookings at the moment.`
              }
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/host/create-listing')}
                className="btn-primary"
              >
                Create Your First Listing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HostBookingsPage;