// src/app/admin/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  UsersIcon,
  HomeIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon, // Use this instead of TrendingUpIcon
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const AdminDashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    overview: {},
    revenue: {},
    growth: [],
    top_listings: [],
    pending_listings: [],
    recent_users: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState(30);

useEffect(() => {
  if (!isAdmin) {
    router.push('/');
    return;
  }
  fetchDashboardData();
}, [isAdmin, router, selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Mock data since we don't have the actual admin API implemented
      const mockData = {
        overview: {
          total_users: 1247,
          total_hosts: 156,
          total_tourists: 1091,
          total_listings: 89,
          active_listings: 67,
          pending_listings: 8,
          total_bookings: 234,
          confirmed_bookings: 189,
          cancelled_bookings: 12,
          recent_bookings: 23
        },
        revenue: {
          total_revenue: 2840000,
          platform_fees: 142000,
          host_earnings: 2414800,
          community_contributions: 56800
        },
        top_listings: [
          {
            id: '1',
            title: 'Himalayan Village Retreat',
            location: 'Uttarakhand',
            booking_count: 45,
            total_revenue: 324000
          },
          {
            id: '2',
            title: 'Rajasthani Heritage Haveli',
            location: 'Rajasthan',
            booking_count: 38,
            total_revenue: 285000
          },
          {
            id: '3',
            title: 'Kerala Backwater Homestay',
            location: 'Kerala',
            booking_count: 32,
            total_revenue: 192000
          }
        ]
      };
      setDashboardData(mockData);
    } catch (error) {
      console.error('Failed to fetch admin dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: dashboardData.overview?.total_users || 0,
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      change: '+12% this month',
      details: [
        { label: 'Hosts', value: dashboardData.overview?.total_hosts || 0 },
        { label: 'Tourists', value: dashboardData.overview?.total_tourists || 0 }
      ]
    },
    {
      label: 'Total Listings',
      value: dashboardData.overview?.total_listings || 0,
      icon: HomeIcon,
      color: 'from-green-500 to-green-600',
      change: '+8% this month',
      details: [
        { label: 'Active', value: dashboardData.overview?.active_listings || 0 },
        { label: 'Pending', value: dashboardData.overview?.pending_listings || 0 }
      ]
    },
    {
      label: 'Total Bookings',
      value: dashboardData.overview?.total_bookings || 0,
      icon: CalendarDaysIcon,
      color: 'from-purple-500 to-purple-600',
      change: '+15% this month',
      details: [
        { label: 'Confirmed', value: dashboardData.overview?.confirmed_bookings || 0 },
        { label: 'Cancelled', value: dashboardData.overview?.cancelled_bookings || 0 }
      ]
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(dashboardData.revenue?.total_revenue || 0),
      icon: CurrencyRupeeIcon,
      color: 'from-emerald-500 to-emerald-600',
      change: '+20% this month',
      details: [
        { label: 'Platform Fees', value: formatCurrency(dashboardData.revenue?.platform_fees || 0) },
        { label: 'Host Earnings', value: formatCurrency(dashboardData.revenue?.host_earnings || 0) }
      ]
    }
  ];

  const quickActions = [
    {
      title: 'Pending Listings',
      description: `${dashboardData.overview?.pending_listings || 0} listings awaiting approval`,
      icon: ExclamationTriangleIcon,
      href: '/admin/listings?status=pending',
      color: 'from-yellow-500 to-yellow-600',
      urgent: (dashboardData.overview?.pending_listings || 0) > 0
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: UsersIcon,
      href: '/admin/users',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Platform Analytics',
      description: 'View detailed performance metrics',
      icon: ChartBarIcon,
      href: '/admin/analytics',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Global Impact',
      description: 'Monitor community impact metrics',
      icon: GlobeAltIcon,
      href: '/admin/impact',
      color: 'from-green-500 to-green-600'
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
                  Admin Dashboard 👑
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage and monitor the VillageStay platform
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                  className="input-field w-auto"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
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
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-green-600 font-medium">{stat.change}</span>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-3">{stat.value}</p>
                  
                  {stat.details && (
                    <div className="space-y-1">
                      {stat.details.map((detail, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-500">{detail.label}:</span>
                          <span className="font-medium text-gray-700">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                  <div className={`card card-hover p-6 text-center h-full ${
                    action.urgent ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
                  }`}>
                    <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                    {action.urgent && (
                      <div className="mt-2">
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                          Urgent
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Performing Listings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Top Performing Listings</h2>
                <Link href="/admin/listings" className="text-green-600 hover:text-green-700 font-medium">
                  View All
                </Link>
              </div>

              {dashboardData.top_listings?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.top_listings.slice(0, 5).map((listing, index) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{listing.title}</h4>
                          <p className="text-sm text-gray-600">{listing.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {listing.booking_count} bookings
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(listing.total_revenue)} revenue
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ArrowTrendingUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
                  <p className="text-gray-600">Performance data will appear here</p>
                </div>
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <Link href="/admin/activity" className="text-green-600 hover:text-green-700 font-medium">
                  View All
                </Link>
              </div>

              <div className="space-y-4">
                {/* Mock recent activities */}
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New listing approved</p>
                    <p className="text-xs text-gray-600">Traditional Rajasthani Haveli in Jodhpur</p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New host registered</p>
                    <p className="text-xs text-gray-600">Priya Sharma from Himachal Pradesh</p>
                    <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Listing requires review</p>
                    <p className="text-xs text-gray-600">Eco Lodge in Kerala needs approval</p>
                    <p className="text-xs text-gray-500 mt-1">6 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                  <CurrencyRupeeIcon className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">High-value booking</p>
                    <p className="text-xs text-gray-600">₹15,000 booking for 5 nights</p>
                    <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="mt-8 card p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Platform Growth</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <UsersIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview?.recent_bookings || 0}
                </div>
                <div className="text-sm text-gray-600">New Bookings ({selectedPeriod} days)</div>
                <div className="text-xs text-green-600 mt-1">+18% vs previous period</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <HomeIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview?.active_listings || 0}
                </div>
                <div className="text-sm text-gray-600">Active Listings</div>
                <div className="text-xs text-green-600 mt-1">+12% vs previous period</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <GlobeAltIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData.revenue?.community_contributions || 0)}
                </div>
                <div className="text-sm text-gray-600">Community Fund</div>
                <div className="text-xs text-green-600 mt-1">+25% vs previous period</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
  );
};

export default AdminDashboardPage;