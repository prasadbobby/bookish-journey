// src/app/tourist/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  MapPinIcon,
  CalendarDaysIcon,
  HeartIcon,
  StarIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  SparklesIcon,
  BeakerIcon ,
} from '@heroicons/react/24/outline';

import { bookingsAPI, impactAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const TouristDashboardPage = () => {
  const { user, isTourist } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    upcomingTrips: [],
    pastTrips: [],
    favoriteDestinations: [],
    stats: {
      totalTrips: 0,
      placesVisited: 0,
      totalSpent: 0,
      averageRating: 0
    },
    impact: null
  });

  useEffect(() => {
    if (!isTourist) {
      toast.error('Access denied. Tourist account required.');
      router.push('/');
      return;
    }
    fetchDashboardData();
  }, [isTourist, router, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user bookings
      const bookingsResponse = await bookingsAPI.getAll();
      const bookings = bookingsResponse.data.bookings || [];
      
      // Separate upcoming and past trips
      const now = new Date();
      const upcomingTrips = bookings.filter(b => new Date(b.check_in) > now);
      const pastTrips = bookings.filter(b => new Date(b.check_out) < now);
      
      // Fetch impact data
      let impact = null;
      try {
        const impactResponse = await impactAPI.getUserImpact(user.id);
        impact = impactResponse.data;
      } catch (error) {
        console.log('Impact data not available');
      }

      // Calculate stats
      const stats = calculateStats(bookings);
      
      setDashboardData({
        upcomingTrips,
        pastTrips,
        favoriteDestinations: generateFavoriteDestinations(pastTrips),
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

  const calculateStats = (bookings) => {
    const totalTrips = bookings.filter(b => b.status === 'completed').length;
    const placesVisited = new Set(bookings.map(b => b.listing?.location)).size;
    const totalSpent = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const averageRating = 4.7; // Mock data

    return {
      totalTrips,
      placesVisited,
      totalSpent,
      averageRating
    };
  };

  const generateFavoriteDestinations = (trips) => {
    // Mock favorite destinations based on trips
    const locations = trips.map(t => t.listing?.location).filter(Boolean);
    const locationCounts = locations.reduce((acc, loc) => {
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(locationCounts)
      .map(([location, count]) => ({ location, visits: count }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 4);
  };

  if (loading) {
    return (
      
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your travel dashboard...</p>
            </div>
          </div>
       
    );
  }

  const stats = [
    {
      label: 'Total Trips',
      value: dashboardData.stats.totalTrips,
      icon:  MapPinIcon,
      color: 'from-blue-500 to-blue-600',
      change: '+3 this year'
    },
    {
      label: 'Places Visited',
      value: dashboardData.stats.placesVisited,
      icon: MapPinIcon,
      color: 'from-green-500 to-green-600',
      change: 'across India'
    },
    {
      label: 'Total Spent',
      value: formatCurrency(dashboardData.stats.totalSpent),
      icon: CameraIcon,
      color: 'from-purple-500 to-purple-600',
      change: 'travel investment'
    },
    {
      label: 'Average Rating',
      value: `${dashboardData.stats.averageRating}/5`,
      icon: StarIcon,
      color: 'from-yellow-500 to-yellow-600',
      change: 'given to hosts'
    }
  ];

  const quickActions = [
    {
      title: 'Discover New Villages',
      description: 'Find your next authentic experience',
      icon: MapPinIcon,
      href: '/listings',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'AI Cultural Guide',
      description: 'Get personalized recommendations',
      icon: ChatBubbleLeftRightIcon,
      href: '/ai-features/cultural-concierge',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'My Bookings',
      description: 'Manage your reservations',
      icon: CalendarDaysIcon,
      href: '/tourist/bookings',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Saved Places',
      description: 'View your favorite destinations',
      icon: HeartIcon,
      href: '/tourist/favorites',
      color: 'from-red-500 to-red-600'
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
                    Welcome back, {user?.full_name}! ✈️
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Your journey through authentic rural India continues
                  </p>
                </div>
                <Link href="/listings" className="btn-primary">
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  Discover Places
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
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
              {/* Upcoming Trips */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming Trips</h2>
                  <Link href="/tourist/bookings" className="text-green-600 hover:text-green-700 font-medium">
                    View All
                  </Link>
                </div>

                {dashboardData.upcomingTrips.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.upcomingTrips.slice(0, 3).map((trip) => (
                      <div key={trip.id} className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <img
                          src={trip.listing?.images?.[0] || 'https://via.placeholder.com/80x80/22c55e/ffffff?text=Trip'}
                          alt={trip.listing?.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{trip.listing?.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{trip.listing?.location}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-600">
                              {formatDate(trip.check_in)} - {formatDate(trip.check_out)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                              {trip.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming trips</h3>
                    <p className="text-gray-600 mb-4">Plan your next village adventure</p>
                    <Link href="/listings" className="btn-primary">
                      Discover Villages
                    </Link>
                  </div>
                )}
              </motion.div>

              {/* Travel Memories */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Travel Memories</h2>
                  <Link href="/tourist/trips" className="text-green-600 hover:text-green-700 font-medium">
                    View All
                  </Link>
                </div>

                {dashboardData.pastTrips.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.pastTrips.slice(0, 3).map((trip) => (
                      <div key={trip.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                        <img
                          src={trip.listing?.images?.[0] || 'https://via.placeholder.com/60x60/22c55e/ffffff?text=Memory'}
                          alt={trip.listing?.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{trip.listing?.title}</h4>
                          <p className="text-sm text-gray-600">{trip.listing?.location}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < 4 ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(trip.check_in)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No travel memories yet</h3>
                    <p className="text-gray-600">Start exploring to create memories</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Impact & Favorite Destinations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Your Impact */}
              {dashboardData.impact && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="card p-6"
                >
                  <div className="flex items-center space-x-2 mb-6">
                    <SparklesIcon className="w-6 h-6 text-green-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Your Positive Impact</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <BeakerIcon  className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{dashboardData.impact.carbon_saved}</div>
                      <div className="text-xs text-gray-600">CO₂ Saved</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <GlobeAltIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{dashboardData.impact.communities_supported}</div>
                      <div className="text-xs text-gray-600">Communities Helped</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <HeartIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(dashboardData.impact.community_contribution)}</div>
                      <div className="text-xs text-gray-600">Community Fund</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                      <StarIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{dashboardData.impact.local_jobs_supported}</div>
                      <div className="text-xs text-gray-600">Jobs Supported</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Favorite Destinations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Favorite Destinations</h2>

                {dashboardData.favoriteDestinations.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.favoriteDestinations.map((dest, index) => (
                      <div key={dest.location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{dest.location}</h4>
                            <p className="text-sm text-gray-600">{dest.visits} visit{dest.visits > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <HeartIcon className="w-5 h-5 text-red-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
                    <p className="text-gray-600">Visit places to see your favorites here</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
    
  );
};

export default TouristDashboardPage;