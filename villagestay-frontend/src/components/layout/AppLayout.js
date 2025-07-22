// villagestay-frontend/src/components/layout/AppLayout.js
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import { usePWA } from '@/hooks/usePWA';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';

const AppLayout = ({ children }) => {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isOnline, isStandalone } = usePWA();
  
  // Check if current page is listings
  const isListingsPage = pathname === '/listings';

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
          🌐 You're offline. Some features may be limited.
        </div>
      )}
      
      {/* PWA Status Indicator */}
      {isStandalone && (
        <div className="bg-green-500 text-white px-4 py-1 text-center text-xs">
          📱 Running as installed app
        </div>
      )}
      
      {/* Existing Layout Structure */}
      <header className="relative">
        <Navbar scrolled={scrolled} />
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <Footer />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default AppLayout;