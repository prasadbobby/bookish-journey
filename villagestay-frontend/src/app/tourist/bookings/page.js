// src/app/tourist/bookings/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  CalendarDaysIcon,
  MapPinIcon,
  StarIcon,
  EyeIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { bookingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const TouristBookingsPage = () => {
  const { user, isTourist } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isTourist) {
      toast.error('Access denied. Tourist account required.');
      router.push('/');
      return;
    }
    fetchBookings();
  }, [isTourist, router, filter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await bookingsAPI.getAll(params);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load your trips');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await bookingsAPI.cancel(bookingId, { reason: 'Guest cancellation' });
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  if (!isTourist) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only tourists can access trip bookings.</p>
        </div>
      </div>
    );
  }

  const upcomingTrips = bookings.filter(b => new Date(b.check_in) > new Date());
  const pastTrips = bookings.filter(b => new Date(b.check_out) < new Date());

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            My Trips ✈️
          </h1>
          <p className="text-gray-600">
            Manage your bookings and explore your travel memories
          </p>
        </div>

        {/* Upcoming Trips */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Upcoming Trips</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : upcomingTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTrips.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="card p-0 overflow-hidden"
                >
                  <img
                    src={booking.listing?.images?.[0] || 'https://via.placeholder.com/400x200/22c55e/ffffff?text=Village+Stay'}
                    alt={booking.listing?.title}
                    className="w-full h-48 object-cover"
                  />
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="text-sm text-gray-500">{booking.nights} nights</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {booking.listing?.title}
                    </h3>
                    
                    <div className="flex items-center space-x-1 text-gray-600 mb-3">
                      <MapPinIcon className="w-4 h-4" />
                      <span className="text-sm">{booking.listing?.location}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Check-in:</span>
                        <span className="font-medium">{formatDate(booking.check_in)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check-out:</span>
                        <span className="font-medium">{formatDate(booking.check_out)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(booking.total_amount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="flex-1 btn-secondary text-center py-2 text-sm"
                      >
                        View Details
                      </Link>
                      
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming trips</h3>
              <p className="text-gray-600 mb-6">Plan your next village adventure</p>
              <Link href="/listings" className="btn-primary">
                Explore Villages
              </Link>
            </div>
          )}
        </div>

        {/* Past Trips */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Travel Memories</h2>
          
          {pastTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastTrips.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="card p-0 overflow-hidden"
                >
                  <img
                    src={booking.listing?.images?.[0] || 'https://via.placeholder.com/400x200/22c55e/ffffff?text=Village+Memory'}
                    alt={booking.listing?.title}
                    className="w-full h-48 object-cover"
                  />
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`w-4 h-4 ${i < 4 ? 'text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(booking.check_in)}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {booking.listing?.title}
                    </h3>
                    
                    <div className="flex items-center space-x-1 text-gray-600 mb-3">
                      <MapPinIcon className="w-4 h-4" />
                      <span className="text-sm">{booking.listing?.location}</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="flex-1 btn-outline text-center py-2 text-sm"
                      >
                        <EyeIcon className="w-4 h-4 inline mr-1" />
                        View Trip
                      </Link>
                      
                      <button className="px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200">
                        Write Review
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No travel memories yet</h3>
              <p className="text-gray-600">Your completed trips will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TouristBookingsPage;