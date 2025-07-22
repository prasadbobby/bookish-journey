// src/components/pwa/PWAInstallPrompt.js - Updated component
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { usePWA } from '@/hooks/usePWA';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  const {
    isOnline,
    isStandalone,
    getInstallInstructions
  } = usePWA();

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay if not dismissed
      if (typeof window !== 'undefined' && !localStorage.getItem('pwa-prompt-dismissed')) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
      }
    };

    const handleAppInstalled = () => {
      console.log('PWA: App installed');
      setShowPrompt(false);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pwa-installed', 'true');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowInstructions(true);
      return;
    }

    setInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted installation');
        setShowPrompt(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pwa-installed', 'true');
        }
      } else {
        console.log('PWA: User dismissed installation');
        setShowInstructions(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('PWA: Installation failed:', error);
      setShowInstructions(true);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    }
  };

  // Don't show if already installed or running standalone
  if (isStandalone || (typeof window !== 'undefined' && localStorage.getItem('pwa-installed'))) {
    return null;
  }

  const instructions = getInstallInstructions();

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:max-w-md md:left-auto md:right-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <DevicePhoneMobileIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Install VillageStay</h3>
                    <p className="text-sm text-green-100">Get the full app experience</p>
                  </div>
                </div>
                
                <motion.button
                  onClick={handleDismiss}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!showInstructions ? (
                <>
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Why install the app?</h4>
                    <div className="space-y-2">
                      {[
                        '🚀 Faster loading and better performance',
                        '📱 Works offline for viewing saved listings',
                        '🔔 Get instant booking confirmations',
                        '🌤️ Real-time weather alerts for your trips',
                        '📍 Better location-based recommendations'
                      ].map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center text-sm text-gray-600"
                        >
                          <span className="mr-2">{benefit.split(' ')[0]}</span>
                          <span>{benefit.split(' ').slice(1).join(' ')}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      onClick={handleInstall}
                      disabled={installing}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {installing ? (
                        <span className="flex items-center justify-center space-x-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>Installing...</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center space-x-2">
                          <ArrowDownTrayIcon className="w-5 h-5" />
                          <span>Install App</span>
                        </span>
                      )}
                    </motion.button>
                    
                    <motion.button
                      onClick={handleDismiss}
                      className="px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Maybe Later
                    </motion.button>
                  </div>
                </>
              ) : (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <ComputerDesktopIcon className="w-5 h-5 mr-2" />
                    Install Instructions - {instructions.platform}
                  </h4>
                  
                  <div className="space-y-3 mb-6">
                    {instructions.steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="flex items-start space-x-3"
                      >
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-600 flex-1">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  <motion.button
                    onClick={() => setShowInstructions(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Got it!
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;