'use client';

import Navbar from './Navbar';
import Footer from './Footer';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col village-bg">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
}