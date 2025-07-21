// src/app/dashboard/page.js
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const DashboardPage = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Dashboard page - Auth state:', { isAuthenticated, user, loading }); // Debug log
    
    if (!loading) {
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login'); // Debug log
        router.push('/auth/login');
      } else if (user) {
        console.log('Authenticated user, redirecting based on type:', user.user_type); // Debug log
        // Redirect based on user type with proper verification
        switch (user.user_type) {
          case 'host':
            router.push('/host/dashboard');
            break;
          case 'tourist':
            router.push('/tourist/dashboard');
            break;
          case 'admin':
            router.push('/admin/dashboard');
            break;
          default:
            console.error('Unknown user type:', user.user_type);
            router.push('/');
        }
      }
    }
  }, [isAuthenticated, loading, router, user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen village-bg flex items-center justify-center">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return null; // Will redirect before rendering
};

export default DashboardPage;