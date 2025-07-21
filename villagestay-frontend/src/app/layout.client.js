'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AppLayoutWithSideNav from '@/components/layout/AppLayoutWithSideNav';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  
  // Only these routes should use regular navbar (public pages)
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/about',
    '/contact',
    '/privacy',
    '/terms'
  ];

  // Check if current route is a public route or a public listing page
  const isPublicRoute = publicRoutes.includes(pathname) || 
    (pathname.startsWith('/listings') && !pathname.includes('/host/') && !pathname.includes('/admin/'));

  return (
    <AuthProvider>
      {isPublicRoute ? (
        // Regular layout for public pages only
        <div className="min-h-screen flex flex-col village-bg">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      ) : (
        // Sidebar layout for all authenticated areas (dashboard, AI features, etc.)
        <AppLayoutWithSideNav>
          {children}
        </AppLayoutWithSideNav>
      )}
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}