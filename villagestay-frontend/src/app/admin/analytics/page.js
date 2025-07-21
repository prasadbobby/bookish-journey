'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  UsersIcon,
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon, // Use this instead of TrendingUpIcon
  MapPinIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

// src/app/admin/analytics/page.js (continued)
const AdminAnalyticsPage = () => {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    user_growth: [],
    booking_trends: [],
    revenue_trends: [],
    top_locations: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('users');

useEffect(() => {
  if (!isAdmin) {
    router.push('/');
    return;
  }
  fetchAnalyticsData();
}, [isAdmin, router, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAnalytics({ days: selectedPeriod });
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
    
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
       
    );
  }

  const metrics = [
    { key: 'users', label: 'User Growth', icon: UsersIcon, color: 'blue' },
    { key: 'bookings', label: 'Booking Trends', icon: CalendarDaysIcon, color: 'green' },
    { key: 'revenue', label: 'Revenue Analytics', icon: CurrencyRupeeIcon, color: 'purple' },
    { key: 'locations', label: 'Top Locations', icon: MapPinIcon, color: 'orange' }
  ];

  return (
  
        <div className="min-h-screen village-bg pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Platform Analytics 📊
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Detailed insights and performance metrics
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

            {/* Metric Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {metrics.map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedMetric === metric.key
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <metric.icon className={`w-6 h-6 ${
                      selectedMetric === metric.key ? 'text-green-600' : 'text-gray-500'
                    }`} />
                    <span className={`font-medium ${
                      selectedMetric === metric.key ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {metric.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Analytics Content */}
            <div className="space-y-8">
              {/* User Growth Analytics */}
              {selectedMetric === 'users' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">User Growth Analysis</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <UsersIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">1,247</div>
                      <div className="text-sm text-gray-600">Total Users</div>
                      <div className="text-xs text-green-600 mt-1">+23% growth</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <UsersIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">156</div>
                      <div className="text-sm text-gray-600">New This Month</div>
                      <div className="text-xs text-green-600 mt-1">+18% vs last month</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <ArrowTrendingUpIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">78%</div>
                      <div className="text-sm text-gray-600">Retention Rate</div>
                      <div className="text-xs text-green-600 mt-1">+5% improvement</div>
                    </div>
                  </div>

                  {/* Mock Chart Area */}
                  <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">User Growth Chart</p>
                      <p className="text-sm text-gray-500">Interactive chart would be displayed here</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Booking Trends */}
              {selectedMetric === 'bookings' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Trends Analysis</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <CalendarDaysIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">892</div>
                      <div className="text-sm text-gray-600">Total Bookings</div>
                    </div>
                    
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <CalendarDaysIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">743</div>
                      <div className="text-sm text-gray-600">Confirmed</div>
                    </div>
                    
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                      <CalendarDaysIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">89</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                      <CalendarDaysIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">60</div>
                      <div className="text-sm text-gray-600">Cancelled</div>
                    </div>
                  </div>

                  <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Booking Trends Chart</p>
                      <p className="text-sm text-gray-500">Time series booking data visualization</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Revenue Analytics */}
              {selectedMetric === 'revenue' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Revenue Analytics</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <CurrencyRupeeIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(2840000)}</div>
                      <div className="text-sm text-gray-600">Total Revenue</div>
                      <div className="text-xs text-green-600 mt-1">+32% growth</div>
                    </div>
                    
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <CurrencyRupeeIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(142000)}</div>
                      <div className="text-sm text-gray-600">Platform Fees</div>
                      <div className="text-xs text-green-600 mt-1">5% of total</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <CurrencyRupeeIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(56800)}</div>
                      <div className="text-sm text-gray-600">Community Fund</div>
                      <div className="text-xs text-green-600 mt-1">2% contribution</div>
                    </div>
                  </div>

                  <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Revenue Trends Chart</p>
                      <p className="text-sm text-gray-500">Revenue breakdown and growth visualization</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Top Locations */}
              {selectedMetric === 'locations' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performing Locations</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">By Revenue</h3>
                      <div className="space-y-4">
                        {[
                          { location: 'Rajasthan', revenue: 856000, bookings: 245 },
                          { location: 'Kerala', revenue: 634000, bookings: 198 },
                          { location: 'Himachal Pradesh', revenue: 523000, bookings: 167 },
                          { location: 'Uttarakhand', revenue: 445000, bookings: 143 },
                          { location: 'Gujarat', revenue: 378000, bookings: 124 }
                        ].map((item, index) => (
                          <div key={item.location} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xs">{index + 1}</span>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{item.location}</h4>
                                <p className="text-sm text-gray-600">{item.bookings} bookings</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{formatCurrency(item.revenue)}</p>
                              <p className="text-xs text-green-600">+{15 + index * 2}% growth</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Growth Rate</h3>
                      <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Location Performance Map</p>
                          <p className="text-sm text-gray-500">Interactive map visualization</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
     
  );
};

export default AdminAnalyticsPage;