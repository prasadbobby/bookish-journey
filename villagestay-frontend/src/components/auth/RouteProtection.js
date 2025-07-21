// src/components/auth/RouteProtection.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const RouteProtection = ({ children, requiredUserType = null, requiredPermission = null }) => {
  const { user, isAuthenticated, loading, canAccessRoute } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!isAuthenticated) {
      toast.error('Please login to access this page');
      router.push('/auth/login');
      return;
    }

    // Check user type requirement
    if (requiredUserType && user.user_type !== requiredUserType) {
      toast.error(`Access denied. ${requiredUserType} account required.`);
      router.push('/');
      return;
    }

    // Check specific permission
    if (requiredPermission && !canAccessRoute(window.location.pathname)) {
      toast.error('Access denied. Insufficient privileges.');
      router.push('/');
      return;
    }
  }, [isAuthenticated, loading, user, requiredUserType, requiredPermission, router, canAccessRoute]);

  if (loading) {
    return (
      <div className="min-h-screen village-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (requiredUserType && user?.user_type !== requiredUserType)) {
    return null; // Will redirect, so don't render anything
  }

  return children;
};

export default RouteProtection;