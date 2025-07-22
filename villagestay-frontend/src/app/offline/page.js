// villagestay-frontend/src/app/offline/page.js
'use client';

import { motion } from 'framer-motion';
import { 
  WifiIcon, 
  ArrowPathIcon,
  BookmarkIcon,
  MapPinIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const OfflinePage = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [cachedListings, setCachedListings] = useState([]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();

    // Load cached listings
    loadCachedData();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const loadCachedData = async () => {
    try {
      // Try to get cached listings from service worker
      const cache = await caches.open('villagestay-api-v1.0.0');
      const cachedResponse = await cache.match('/api/listings');
      
      if (cachedResponse) {
        const data = await cachedResponse.json();
        setCachedListings(data.listings?.slice(0, 6) || []);
      }
    } catch (error) {
      console.log('No cached data available');
    }
  };

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Offline Icon */}
          <motion.div
            animate={{ 
              scale: isOnline ? [1, 1.1, 1] : 1,
              rotate: isOnline ? [0, 10, 0] : 0
            }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${
              isOnline 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <WifiIcon className="w-16 h-16" />
            </div>
            
            {!isOnline && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-1 bg-red-500 transform rotate-45 rounded-full"></div>
              </div>
            )}
          </motion.div>

          {/* Status Message */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isOnline ? 'Back Online!' : 'You\'re Offline'}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {isOnline 
                ? 'Your connection has been restored. Refreshing...'
                : 'Don\'t worry, you can still browse some content while offline.'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              onClick={handleRetry}
              disabled={!isOnline}
              className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                isOnline
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              whileHover={isOnline ? { scale: 1.05 } : {}}
              whileTap={isOnline ? { scale: 0.95 } : {}}
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>{isOnline ? 'Refresh Page' : 'Waiting for Connection'}</span>
            </motion.button>
            
            <Link href="/">
              <motion.button
                className="flex items-center justify-center space-x-2 px-8 py-4 bg-white border-2 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-600 rounded-xl font-semibold transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MapPinIcon className="w-5 h-5" />
                <span>Browse Offline Content</span>
              </motion.button>
            </Link>
          </div>

          {/* Offline Features */}
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Offline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <BookmarkIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Saved Listings</h4>
                  <p className="text-sm text-gray-600">View previously browsed village stays</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <HeartIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Favorites</h4>
                  <p className="text-sm text-gray-600">Access your liked properties</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <MapPinIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Trip Plans</h4>
                  <p className="text-sm text-gray-600">Review your saved itineraries</p>
                </div>
              </div>

              {/* Cached Listings */}
              {cachedListings.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-semibold text-gray-900 mb-4">Recently Viewed</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cachedListings.map((listing, index) => (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                      >
                        <div className="h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                          <span className="text-3xl">🏘️</span>
                        </div>
                        <h5 className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
                          {listing.title}
                        </h5>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {listing.location}
                        </p>
                        <div className="text-sm font-semibold text-green-600 mt-2">
                          ₹{listing.price_per_night}/night
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OfflinePage;