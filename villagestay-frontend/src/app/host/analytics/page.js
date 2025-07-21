// src/app/host/analytics/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  CurrencyRupeeIcon,
  CalendarDaysIcon,
  EyeIcon,
  UsersIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

const HostAnalyticsPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalEarnings: 45600,
    totalBookings: 23,
    totalViews: 1245,
    occupancyRate: 78,
    averageRating: 4.8,
    monthlyData: [
      { month: 'Jan', earnings: 5200, bookings: 3 },
      { month: 'Feb', earnings: 6800, bookings: 4 },
      { month: 'Mar', earnings: 8100, bookings: 5 },
      { month: 'Apr', earnings: 7200, bookings: 4 },
      { month: 'May', earnings: 9300, bookings: 6 },
      { month: 'Jun', earnings: 8800, bookings: 5 },
    ]
  });

  useEffect(() => {
    if (!isHost) {
      toast.error('Access denied. Host account required.');
      router.push('/');
      return;
    }
    
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, [isHost, router]);

  if (!isHost) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only hosts can access analytics.</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Earnings',
      value: formatCurrency(analytics.totalEarnings),
      icon: CurrencyRupeeIcon,
      color: 'from-green-500 to-green-600',
      change: '+12% this month'
    },
    {
      label: 'Total Bookings',
      value: analytics.totalBookings,
      icon: CalendarDaysIcon,
      color: 'from-blue-500 to-blue-600',
      change: '+5 this month'
    },
    {
      label: 'Profile Views',
      value: analytics.totalViews,
      icon: EyeIcon,
      color: 'from-purple-500 to-purple-600',
      change: '+23% this month'
    },
    {
      label: 'Occupancy Rate',
      value: `${analytics.occupancyRate}%`,
      icon: ArrowTrendingUpIcon,
      color: 'from-orange-500 to-orange-600',
      change: '+8% this month'
    }
  ];

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Analytics & Insights 📊
          </h1>
          <p className="text-gray-600">
            Track your property performance and earnings
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Earnings Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Earnings</h2>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analytics.monthlyData.map((data, index) => (
                    <div key={data.month} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all duration-500"
                        style={{ 
                          height: `${(data.earnings / Math.max(...analytics.monthlyData.map(d => d.earnings))) * 200}px` 
                        }}
                      ></div>
                      <p className="text-xs text-gray-600 mt-2">{data.month}</p>
                      <p className="text-xs font-medium text-gray-900">{formatCurrency(data.earnings)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Bookings Chart */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Bookings</h2>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analytics.monthlyData.map((data, index) => (
                    <div key={data.month} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500"
                        style={{ 
                          height: `${(data.bookings / Math.max(...analytics.monthlyData.map(d => d.bookings))) * 200}px` 
                        }}
                      ></div>
                      <p className="text-xs text-gray-600 mt-2">{data.month}</p>
                      <p className="text-xs font-medium text-gray-900">{data.bookings}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Performance Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-8 card p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600 mb-2">Great!</div>
                  <div className="text-sm text-gray-600">Your occupancy rate is above average</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600 mb-2">Trending Up</div>
                  <div className="text-sm text-gray-600">Bookings increased by 25% this quarter</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600 mb-2">Excellent</div>
                  <div className="text-sm text-gray-600">Guest satisfaction rating is 4.8/5</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default HostAnalyticsPage;