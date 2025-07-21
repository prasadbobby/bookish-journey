// src/contexts/AuthContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = Cookies.get('token');
    console.log('Stored token on load:', storedToken); // Debug log
    
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken) => {
    try {
      console.log('Fetching user profile with token:', authToken); // Debug log
      const response = await authAPI.getProfile(authToken);
      const userData = response.data;
      
      console.log('User data received:', userData); // Debug log
      
      // Validate user data
      if (!userData.user_type || !['tourist', 'host', 'admin'].includes(userData.user_type)) {
        throw new Error('Invalid user type');
      }
      
      setUser(userData);
      console.log('User set successfully:', userData); // Debug log
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Clear invalid tokens
      Cookies.remove('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email); // Debug log
      const response = await authAPI.login(email, password);
      const { access_token, user: userData } = response.data;
      
      console.log('Login response:', { access_token, userData }); // Debug log
      
      // Validate user data
      if (!userData.user_type || !['tourist', 'host', 'admin'].includes(userData.user_type)) {
        throw new Error('Invalid user account');
      }
      
      setToken(access_token);
      setUser(userData);
      
      // Store token in cookie (expires in 30 days)
      Cookies.set('token', access_token, { 
        expires: 30, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      console.log('Token stored, user set:', userData); // Debug log
      
      toast.success(`Welcome back, ${userData.full_name}!`);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error); // Debug log
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      // Validate user type during registration
      if (!userData.user_type || !['tourist', 'host'].includes(userData.user_type)) {
        throw new Error('Please select a valid account type');
      }
      
      const response = await authAPI.register(userData);
      toast.success('Registration successful! Please verify your email.');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

const logout = () => {
  try {
    console.log('Logging out user'); // Debug log
    
    // Set a flag to prevent access denied messages during logout
    if (typeof window !== 'undefined') {
      window.isLoggingOut = true;
    }
    
    // Clear all authentication state FIRST
    setUser(null);
    setToken(null);
    
    // Remove token from cookies
    Cookies.remove('token', { path: '/' });
    
    // Clear any other stored auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.clear();
    }
    
    // Show success message
    toast.success('Logged out successfully');
    
    // Redirect to home page immediately
    if (typeof window !== 'undefined') {
      // Clear the flag after a short delay
      setTimeout(() => {
        window.isLoggingOut = false;
      }, 100);
      
      window.location.href = '/';
    }
    
    console.log('Logout completed'); // Debug log
    
  } catch (error) {
    console.error('Logout error:', error);
  }
};

  const updateProfile = async (profileData) => {
    try {
      await authAPI.updateProfile(profileData, token);
      await fetchUserProfile(token);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Permission checking functions
  const hasPermission = (permission) => {
    if (!user) return false;
    
    const userRights = ACCESS_RIGHTS[user.user_type];
    return userRights && userRights[permission] === true;
  };

  const canAccessRoute = (route) => {
    if (!user) return false;
    
    // Public routes accessible to all authenticated users
    const publicRoutes = ['/listings', '/profile', '/'];
    if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
      return true;
    }
    
    // Check specific route access
    if (route.startsWith('/admin/')) {
      return user.user_type === 'admin';
    }
    
    if (route.startsWith('/host/')) {
      return user.user_type === 'host';
    }
    
    if (route.startsWith('/tourist/')) {
      return user.user_type === 'tourist';
    }
    
    // AI features access
    if (route.startsWith('/ai-features/')) {
      if (route.includes('voice-listing') || route.includes('village-stories')) {
        return user.user_type === 'host';
      }
      // Cultural concierge is available to all users
      return true;
    }
    
    return true; // Default allow for other routes
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    hasPermission,
    canAccessRoute,
    
    // User type checks
    isAuthenticated: !!user && !!token,
    isHost: user?.user_type === 'host',
    isTourist: user?.user_type === 'tourist',
    isAdmin: user?.user_type === 'admin',
    
    // Permission checks
    canCreateListings: user?.user_type === 'host',
    canMakeBookings: user?.user_type === 'tourist',
    canManageUsers: user?.user_type === 'admin',
    canUseVoiceListing: user?.user_type === 'host',
    canGenerateStories: user?.user_type === 'host',
    canViewAnalytics: user?.user_type === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ACCESS_RIGHTS constant
const ACCESS_RIGHTS = {
  tourist: {
    can_browse_listings: true,
    can_make_bookings: true,
    can_write_reviews: true,
    can_use_ai_concierge: true,
    can_view_own_bookings: true,
    can_view_own_impact: true,
  },
  host: {
    can_create_listings: true,
    can_manage_own_listings: true,
    can_view_own_bookings: true,
    can_use_voice_listing: true,
    can_generate_village_stories: true,
    can_use_ai_features: true,
    can_view_analytics: true,
  },
  admin: {
    can_manage_all_users: true,
    can_approve_listings: true,
    can_view_platform_analytics: true,
    can_manage_system: true,
    can_view_all_bookings: true,
  }
};