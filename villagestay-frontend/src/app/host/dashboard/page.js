// src/app/host/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  PlusIcon,
  HomeIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
  StarIcon,
  ChartBarIcon,
  EyeIcon,
  UsersIcon,
  MapPinIcon,
  SparklesIcon,
  MicrophoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
// import Providers from '@/components/providers/Providers';
// import AppLayout from '@/components/layout/AppLayout';
import { listingsAPI, bookingsAPI, impactAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const HostDashboardPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    listings: [],
    recentBookings: [],
    stats: {
      totalListings: 0,
      activeListings: 0,
      totalBookings: 0,
      totalEarnings: 0,
      averageRating: 0,
      occupancyRate: 0
    },
    impact: null
  });

  useEffect(() => {
    if (!isHost) {
      toast.error('Access denied. Host account required.');
      router.push('/');
      return;
    }
    fetchDashboardData();
  }, [isHost, router, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch host listings
      const listingsResponse = await listingsAPI.getHostListings(user.id);
      const listings = listingsResponse.data.listings || [];
      
      // Fetch recent bookings
      const bookingsResponse = await bookingsAPI.getAll({ limit: 10 });
      const recentBookings = bookingsResponse.data.bookings || [];
      
      // Fetch impact data
      let impact = null;
      try {
        const impactResponse = await impactAPI.getUserImpact(user.id);
        impact = impactResponse.data;
      } catch (error) {
        console.log('Impact data not available');
      }

      // Calculate stats
      const stats = calculateStats(listings, recentBookings);
      
      setDashboardData({
        listings,
        recentBookings,
        stats,
        impact
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (listings, bookings) => {
    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.is_active && l.is_approved).length;
    const totalBookings = bookings.length;
    const totalEarnings = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.host_earnings || 0), 0);
    
    const averageRating = listings.length > 0 
      ? listings.reduce((sum, l) => sum + (l.rating || 0), 0) / listings.length 
      : 0;
    
    const occupancyRate = totalBookings > 0 ? (bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length / totalBookings) * 100 : 0;

    return {
      totalListings,
      activeListings,
      totalBookings,
      totalEarnings,
      averageRating: Math.round(averageRating * 10) / 10,
      occupancyRate: Math.round(occupancyRate)
    };
  };

  if (loading) {
    return (
     
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
      
    );
  }

  const stats = [
    {
      label: 'Total Listings',
      value: dashboardData.stats.totalListings,
      icon: HomeIcon,
      color: 'from-blue-500 to-blue-600',
      change: '+2 this month'
    },
    {
      label: 'Active Listings',
      value: dashboardData.stats.activeListings,
      icon: EyeIcon,
      color: 'from-green-500 to-green-600',
      change: `${dashboardData.stats.activeListings}/${dashboardData.stats.totalListings} live`
    },
    {
      label: 'Total Bookings',
      value: dashboardData.stats.totalBookings,
      icon: CalendarDaysIcon,
      color: 'from-purple-500 to-purple-600',
      change: '+5 this month'
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(dashboardData.stats.totalEarnings),
      icon: CurrencyRupeeIcon,
      color: 'from-green-500 to-green-600',
      change: '+12% this month'
    },
    {
      label: 'Average Rating',
      value: dashboardData.stats.averageRating,
      icon: StarIcon,
      color: 'from-yellow-500 to-yellow-600',
      change: '4.8/5.0 rating'
    },
    {
      label: 'Occupancy Rate',
      value: `${dashboardData.stats.occupancyRate}%`,
      icon: ChartBarIcon,
      color: 'from-indigo-500 to-indigo-600',
      change: '+8% this month'
    }
  ];

  const quickActions = [
    {
      title: 'Add New Listing',
      description: 'Create a new property listing',
      icon: PlusIcon,
      href: '/host/create-listing',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Voice Listing Magic',
      description: 'Create listing using AI voice',
      icon: MicrophoneIcon,
      href: '/ai-features/voice-listing',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Generate Village Story',
      description: 'Create AI video for your property',
      icon: VideoCameraIcon,
      href: '/ai-features/village-stories',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Manage Bookings',
      description: 'View and manage reservations',
      icon: CalendarDaysIcon,
      href: '/host/bookings',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (

        <div className="min-h-screen village-bg pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {user?.full_name}! 🏠
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Manage your properties and track your hosting success
                  </p>
                </div>
                <Link href="/host/create-listing" className="btn-primary">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Listing
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                >
                  <Link href={action.href} className="group">
                    <div className="card card-hover p-6 text-center h-full">
                      <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Listings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Your Listings</h2>
                  <Link href="/host/listings" className="text-green-600 hover:text-green-700 font-medium">
                    View All
                  </Link>
                </div>

                {dashboardData.listings.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.listings.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                        <img
                          src={listing.images?.[0] || 'https://via.placeholder.com/80x80/22c55e/ffffff?text=No+Image'}
                          alt={listing.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{listing.location}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(listing.price_per_night)}/night
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              listing.is_approved 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {listing.is_approved ? 'Active' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <HomeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
                    <p className="text-gray-600 mb-4">Start by creating your first property listing</p>
                    <Link href="/host/create-listing" className="btn-primary">
                      Create First Listing
                    </Link>
                  </div>
                )}
              </motion.div>

              {/* Recent Bookings */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
                  <Link href="/host/bookings" className="text-green-600 hover:text-green-700 font-medium">
                    View All
                  </Link>
                </div>

                {dashboardData.recentBookings.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentBookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {booking.tourist?.full_name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{booking.tourist?.full_name}</h4>
                            <p className="text-sm text-gray-600">
                              {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {formatCurrency(booking.total_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
                    <p className="text-gray-600">Bookings will appear here once guests make reservations</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Impact Section */}
            {dashboardData.impact && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="mt-8 card p-6"
              >
                <div className="flex items-center space-x-2 mb-6">
                  <SparklesIcon className="w-6 h-6 text-green-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Your Impact</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <UsersIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{dashboardData.impact.total_guests_hosted}</div>
                    <div className="text-sm text-gray-600">Guests Hosted</div>
                  </div>
                  <div className="text-center">
                    <CurrencyRupeeIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardData.impact.total_earnings)}</div>
                    <div className="text-sm text-gray-600">Total Earnings</div>
                  </div>
                  <div className="text-center">
                    <StarIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{dashboardData.impact.sustainability_score}</div>
                    <div className="text-sm text-gray-600">Sustainability Score</div>
                  </div>
                  <div className="text-center">
                    <ChartBarIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{dashboardData.impact.community_impact}</div>
                    <div className="text-sm text-gray-600">Community Impact</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
 
  );
};

export default HostDashboardPage;