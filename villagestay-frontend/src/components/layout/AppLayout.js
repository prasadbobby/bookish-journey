'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

const AppLayout = ({ children }) => {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  
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
    <div className="min-h-screen flex flex-col">
      <Navbar 
        scrolled={scrolled} 
        forceWhiteBackground={isListingsPage} 
      />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;