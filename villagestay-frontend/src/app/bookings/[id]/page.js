'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  CalendarDaysIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  StarIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { bookingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const BookingDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    if (params.id) {
      fetchBooking();
    }
  }, [params.id, isAuthenticated, router]);

  const fetchBooking = async () => {
    try {
      const response = await bookingsAPI.getById(params.id);
      setBooking(response.data);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      toast.error('Failed to load booking details');
      router.push('/tourist/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      await bookingsAPI.cancel(params.id, { reason: cancelReason });
      toast.success('Booking cancelled successfully');
      setShowCancelModal(false);
      fetchBooking(); // Refresh booking data
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to cancel booking';
      toast.error(message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-blue-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
    
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading booking details...</p>
            </div>
          </div>
        
    );
  }

  if (!booking) {
    return (
      
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking not found</h2>
              <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or you don't have permission to view it.</p>
              <Link href="/tourist/bookings" className="btn-primary">
                Back to My Bookings
              </Link>
            </div>
          </div>
     
    );
  }

  const canCancel = booking.status === 'confirmed' && new Date(booking.check_in) > new Date();
  const isUpcoming = new Date(booking.check_in) > new Date();
  const isCompleted = booking.status === 'completed';

  return (
   
        <div className="min-h-screen village-bg pt-20">
          {/* Header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-6"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span>Back to bookings</span>
            </button>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Booking Details
                </h1>
                <p className="text-gray-600">Reference: {booking.booking_reference}</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(booking.status)}
                <span className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Property Info */}
                <div className="card p-6">
                  <div className="flex items-start space-x-4">
                    <img
                      src={booking.listing?.images?.[0] || 'https://via.placeholder.com/150x100/22c55e/ffffff?text=Village'}
                      alt={booking.listing?.title}
                      className="w-24 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {booking.listing?.title}
                      </h2>
                      <div className="flex items-center space-x-1 text-gray-600 mb-2">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{booking.listing?.location}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <StarIcon className="w-4 h-4 text-yellow-400" />
                        <span>{booking.listing?.rating || '4.8'} rating</span>
                      </div>
                    </div>
                    <Link
                      href={`/listings/${booking.listing?.id}`}
                      className="btn-outline py-2 px-4 text-sm"
                    >
                      View Property
                    </Link>
                  </div>
                </div>

                {/* Stay Details */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Stay Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Check-in</p>
                          <p className="font-semibold text-gray-900">{formatDate(booking.check_in)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Check-out</p>
                          <p className="font-semibold text-gray-900">{formatDate(booking.check_out)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Guests</p>
                          <p className="font-semibold text-gray-900">{booking.guests}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <ClockIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="font-semibold text-gray-900">{booking.nights} nights</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Special Requests</h4>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{booking.special_requests}</p>
                    </div>
                  )}
                </div>

                {/* Host Information */}
                {booking.host && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Host Information</h3>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {booking.host.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{booking.host.full_name}</h4>
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span className="text-sm">{booking.host.email}</span>
                          </div>
                          {booking.host.phone && (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <PhoneIcon className="w-4 h-4" />
                              <span className="text-sm">{booking.host.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="btn-secondary flex items-center space-x-2">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        <span>Message Host</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  {canCancel && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="btn-outline border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Cancel Booking
                    </button>
                  )}
                  
                  {isCompleted && (
                    <button className="btn-primary">
                      <StarIcon className="w-4 h-4 mr-2" />
                      Write Review
                    </button>
                  )}
                  
                  <button className="btn-secondary flex items-center space-x-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Download Receipt</span>
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Payment Summary */}
                <div className="card p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base amount ({booking.nights} nights)</span>
                      <span className="text-gray-900">{formatCurrency(booking.base_amount || booking.total_amount * 0.95)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform fee</span>
                      <span className="text-gray-900">{formatCurrency(booking.platform_fee || booking.total_amount * 0.05)}</span>
                    </div>
                    
                    {booking.community_contribution && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Community fund</span>
                        <span className="text-gray-900">{formatCurrency(booking.community_contribution)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between font-semibold text-lg">
                        <span className="text-gray-900">Total paid</span>
                        <span className="text-gray-900">{formatCurrency(booking.total_amount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-4">
                      <div className={`w-3 h-3 rounded-full ${
                        booking.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        Payment {booking.payment_status || 'completed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Information */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Information</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Check-in time</h4>
                      <p className="text-gray-600">2:00 PM onwards</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Check-out time</h4>
                      <p className="text-gray-600">11:00 AM</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Cancellation policy</h4>
                      <p className="text-gray-600">
                        {canCancel 
                          ? 'Free cancellation until 24 hours before check-in'
                          : 'Cancellation not available'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">House rules</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• Respect local customs</li>
                        <li>• No smoking indoors</li>
                        <li>• Keep the space clean</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cancel Booking Modal */}
          {showCancelModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Cancel Booking
                </h3>
                
                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for cancellation
                  </label>
                  <textarea
                    rows={4}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please provide a reason for cancellation..."
                    className="input-field resize-none"
                    required
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={!cancelReason.trim()}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel Booking
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
    
  );
};

export default BookingDetailPage;