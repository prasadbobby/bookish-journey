'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GlobeAltIcon,
  SparklesIcon,
  UsersIcon,
  CurrencyRupeeIcon,
  TrophyIcon,
  BeakerIcon,
  HeartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

import { impactAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const ImpactPage = () => {
  const [loading, setLoading] = useState(true);
  const [impactData, setImpactData] = useState({
    overall: {
      total_bookings: 2847,
      total_guests: 8932,
      total_economic_impact: 5400000,
      community_fund_raised: 108000,
      communities_benefited: 156,
      carbon_footprint_reduced: '22,450kg CO₂',
      jobs_supported: 216
    },
    leaderboards: {
      hosts: [],
      tourists: [],
      locations: []
    }
  });
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchImpactData();
  }, []);

  const fetchImpactData = async () => {
    try {
      setLoading(true);
      
      // Fetch overall impact
      const overallResponse = await impactAPI.getOverallImpact({ days: 365 });
      
      // Fetch leaderboards
      const [hostsResponse, touristsResponse, locationsResponse] = await Promise.all([
        impactAPI.getLeaderboard({ category: 'hosts', limit: 10 }),
        impactAPI.getLeaderboard({ category: 'tourists', limit: 10 }),
        impactAPI.getLeaderboard({ category: 'locations', limit: 10 })
      ]);

      setImpactData({
        overall: overallResponse.data,
        leaderboards: {
          hosts: hostsResponse.data.leaderboard || [],
          tourists: touristsResponse.data.leaderboard || [],
          locations: locationsResponse.data.leaderboard || []
        }
      });
    } catch (error) {
      console.error('Failed to fetch impact data:', error);
      toast.error('Failed to load impact data');
      
      // Use mock data on error
      setImpactData({
        overall: {
          total_bookings: 2847,
          total_guests: 8932,
          total_economic_impact: 5400000,
          community_fund_raised: 108000,
          communities_benefited: 156,
          carbon_footprint_reduced: '22,450kg CO₂',
          jobs_supported: 216
        },
        leaderboards: {
          hosts: [
            { host_name: 'Priya Sharma', total_guests: 245, total_earnings: 450000, impact_score: 92 },
            { host_name: 'Raj Patel', total_guests: 198, total_earnings: 380000, impact_score: 87 },
            { host_name: 'Meera Singh', total_guests: 167, total_earnings: 320000, impact_score: 83 }
          ],
          tourists: [
            { tourist_name: 'Alex Johnson', total_trips: 12, community_contribution: 15000, impact_score: 95 },
            { tourist_name: 'Sarah Davis', total_trips: 8, community_contribution: 12000, impact_score: 88 },
            { tourist_name: 'Mike Chen', total_trips: 6, community_contribution: 9000, impact_score: 82 }
          ],
          locations: [
            { location: 'Rajasthan', total_revenue: 856000, total_visitors: 1245, impact_score: 94 },
            { location: 'Kerala', total_revenue: 634000, total_visitors: 987, impact_score: 91 },
            { location: 'Himachal Pradesh', total_revenue: 523000, total_visitors: 743, impact_score: 88 }
          ]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const impactMetrics = [
    {
      label: 'Total Guests',
      value: impactData.overall.total_guests?.toLocaleString() || '8,932',
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      description: 'Travelers connected with rural communities'
    },
    {
      label: 'Economic Impact',
      value: formatCurrency(impactData.overall.total_economic_impact || 5400000),
      icon: CurrencyRupeeIcon,
      color: 'from-green-500 to-green-600',
      description: 'Direct economic benefit to rural areas'
    },
    {
      label: 'Communities Helped',
      value: impactData.overall.communities_benefited || '156',
      icon: GlobeAltIcon,
      color: 'from-purple-500 to-purple-600',
      description: 'Villages and rural communities supported'
    },
    {
      label: 'Jobs Created',
      value: impactData.overall.jobs_supported || '216',
      icon: HeartIcon,
      color: 'from-pink-500 to-pink-600',
      description: 'Employment opportunities generated'
    },
    {
      label: 'Community Fund',
      value: formatCurrency(impactData.overall.community_fund_raised || 108000),
      icon: SparklesIcon,
      color: 'from-yellow-500 to-yellow-600',
      description: 'Funds raised for community development'
    },
    {
      label: 'Carbon Saved',
      value: impactData.overall.carbon_footprint_reduced || '22,450kg CO₂',
      icon: BeakerIcon,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Environmental impact through sustainable tourism'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: GlobeAltIcon },
    { id: 'hosts', label: 'Top Hosts', icon: TrophyIcon },
    { id: 'travelers', label: 'Top Travelers', icon: UsersIcon },
    { id: 'destinations', label: 'Top Destinations', icon: ChartBarIcon }
  ];

  return (

        <div className="min-h-screen village-bg pt-20">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Our Collective Impact 🌍
                </h1>
                <p className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto">
                  Together, we're transforming rural communities through sustainable tourism and creating lasting positive change.
                </p>
              </motion.div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Impact Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {impactMetrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="card p-6 text-center"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${metric.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <metric.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</h3>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">{metric.label}</h4>
                  <p className="text-gray-600 text-sm">{metric.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedTab === tab.id
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-8">
              {selectedTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                >
                  {/* Impact Story */}
                  <div className="card p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Impact Story</h2>
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <UsersIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Community Connection</h3>
                          <p className="text-gray-600 text-sm">
                            We've connected thousands of travelers with authentic rural experiences, 
                            fostering cultural exchange and understanding.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <CurrencyRupeeIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Economic Empowerment</h3>
                          <p className="text-gray-600 text-sm">
                            Our platform has generated significant income for rural families, 
                            creating sustainable livelihoods and economic opportunities.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <BeakerIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Environmental Stewardship</h3>
                          <p className="text-gray-600 text-sm">
                            Through sustainable tourism practices, we're helping preserve natural 
                            environments and promoting eco-friendly travel.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Goals & Achievements */}
                  <div className="card p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Goals & Achievements</h2>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Communities Reached</span>
                          <span className="text-sm font-bold text-gray-900">156/200</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Jobs Created</span>
                          <span className="text-sm font-bold text-gray-900">216/300</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Carbon Reduction Goal</span>
                          <span className="text-sm font-bold text-gray-900">22.4T/50T CO₂</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 'hosts' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Impact Hosts 🏆</h2>
                  <div className="space-y-4">
                    {impactData.leaderboards.hosts.map((host, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-yellow-600' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{host.host_name}</h3>
                            <p className="text-sm text-gray-600">
                              {host.total_guests} guests hosted • {formatCurrency(host.total_earnings)} earned
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{host.impact_score}</div>
                          <div className="text-xs text-gray-500">Impact Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {selectedTab === 'travelers' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Impact Travelers ✈️</h2>
                  <div className="space-y-4">
                    {impactData.leaderboards.tourists.map((tourist, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-yellow-600' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{tourist.tourist_name}</h3>
                            <p className="text-sm text-gray-600">
                              {tourist.total_trips} trips • {formatCurrency(tourist.community_contribution)} contributed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">{tourist.impact_score}</div>
                          <div className="text-xs text-gray-500">Impact Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {selectedTab === 'destinations' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Impact Destinations 🗺️</h2>
                  <div className="space-y-4">
                    {impactData.leaderboards.locations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-yellow-600' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{location.location}</h3>
                            <p className="text-sm text-gray-600">
                              {location.total_visitors} visitors • {formatCurrency(location.total_revenue)} revenue
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{location.impact_score}</div>
                          <div className="text-xs text-gray-500">Impact Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
  
  );
};

export default ImpactPage;