// src/components/layout/OfflineDetector.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

const OfflineDetector = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return (
    <AnimatePresence>
      {showNotification && !isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2"
        >
          <SignalSlashIcon className="w-5 h-5" />
          <span className="text-sm font-medium">
            You're offline - AI assistant still works!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineDetector;