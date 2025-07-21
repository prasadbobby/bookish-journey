'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SideNav from './SideNav';
import Footer from './Footer';
import { 
  ChevronDownIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Cog6ToothIcon,
  Bars3Icon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

const AppLayoutWithSideNav = ({ children }) => {
  const { isAuthenticated, loading, user, logout, isHost, isTourist, isAdmin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsLoggingOut(true);
      setShowProfileMenu(false);
      
      console.log('Logout clicked'); // Debug log
      
      // Call logout function
      logout();
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if logout fails
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileMenuClick = (e) => {
    e.stopPropagation();
    setShowProfileMenu(!showProfileMenu);
  };

  const handleMenuItemClick = (path) => {
    setShowProfileMenu(false);
    router.push(path);
  };

  // Get role-specific quick actions
  const getQuickActions = () => {
    if (isHost) {
      return [
        {
          label: '+ Add Listing',
          href: '/host/create-listing',
          className: 'px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors'
        },
        {
          label: '🎤 Voice Listing',
          href: '/ai-features/voice-listing',
          className: 'px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors'
        }
      ];
    }
    
    if (isTourist) {
      return [
        {
          label: '🗺️ Discover',
          href: '/listings',
          className: 'px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors'
        },
        {
          label: '💬 AI Guide',
          href: '/ai-features/cultural-concierge',
          className: 'px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors'
        }
      ];
    }
    
    if (isAdmin) {
      return [
        {
          label: '📊 Analytics',
          href: '/admin/analytics',
          className: 'px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors'
        }
      ];
    }
    
    return [];
  };

  // Get page title based on current route and user type
  const getPageTitle = () => {
    if (isHost) {
      return {
        title: 'Host Dashboard',
        subtitle: 'Manage your properties and bookings'
      };
    }
    
    if (isTourist) {
      return {
        title: 'Travel Dashboard',
        subtitle: 'Plan and track your village adventures'
      };
    }
    
    if (isAdmin) {
      return {
        title: 'Admin Dashboard',
        subtitle: 'Platform management and analytics'
      };
    }
    
    return {
      title: 'Dashboard',
      subtitle: 'Welcome back to your workspace'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen village-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col village-bg">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  const quickActions = getQuickActions();
  const pageInfo = getPageTitle();

  return (
    <div className="min-h-screen bg-gray-50">
      <SideNav />
      
      {/* Main Content Area */}
      <div className="lg:ml-72">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              {/* Page Title */}
              <div className="hidden lg:block">
                <h2 className="text-xl font-semibold text-gray-900">{pageInfo.title}</h2>
                <p className="text-sm text-gray-500">{pageInfo.subtitle}</p>
              </div>

              {/* Right Side - Quick Actions, Notifications & Profile */}
              <div className="flex items-center space-x-4">
                
                {/* Role-specific Quick Actions */}
                {quickActions.length > 0 && (
                  <div className="hidden md:flex items-center space-x-2">
                    {quickActions.map((action, index) => (
                      <Link 
                        key={index}
                        href={action.href}
                        className={action.className}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* AI Feature Highlight for Tourists */}
                {isTourist && (
                  <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <SparklesIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-700">AI Guide Available</span>
                  </div>
                )}

                {/* AI Feature Highlight for Hosts */}
                {isHost && (
                  <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <MicrophoneIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">AI Tools Ready</span>
                  </div>
                )}

                {/* Notifications */}
                <div className="relative">
                  <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <BellIcon className="w-6 h-6" />
                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-400"></span>
                  </button>
                </div>

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={handleProfileMenuClick}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    disabled={isLoggingOut}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isHost ? 'bg-gradient-to-br from-green-500 to-green-600' :
                      isTourist ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                      'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                      <span className="text-white font-semibold text-sm">
                        {user?.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-gray-900 truncate max-w-32">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize flex items-center space-x-1">
                        <span>{user?.user_type}</span>
                        <span className="text-gray-300">•</span>
                        <span>
                          {isHost && '🏠'}
                          {isTourist && '✈️'}
                          {isAdmin && '⚙️'}
                        </span>
                      </p>
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {/* Enhanced Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div 
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-3">
                        
                        {/* Enhanced Profile Header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              isHost ? 'bg-gradient-to-br from-green-500 to-green-600' :
                              isTourist ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                              'bg-gradient-to-br from-gray-500 to-gray-600'
                            }`}>
                              <span className="text-white font-semibold text-lg">
                                {user?.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                              <p className="text-xs text-gray-500">{user?.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  isHost ? 'bg-green-100 text-green-800' :
                                  isTourist ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isHost && '🏠 Host'}
                                  {isTourist && '✈️ Traveler'}
                                  {isAdmin && '⚙️ Admin'}
                                </span>
                                
                                {/* AI Access Badge */}
                                {(isTourist || isHost) && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-purple-800">
                                    <SparklesIcon className="w-3 h-3 mr-1" />
                                    AI Enabled
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Access for AI Features */}
                        {(isTourist || isHost) && (
                          <div className="px-4 py-3 border-b border-gray-100">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              AI Features
                            </h4>
                            <div className="space-y-1">
                              {isTourist && (
                                <button
                                  onClick={() => handleMenuItemClick('/ai-features/cultural-concierge')}
                                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                  <span>Cultural Concierge</span>
                                  <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full ml-auto">
                                    Exclusive
                                  </span>
                                </button>
                              )}
                              
                              {isHost && (
                                <button
                                  onClick={() => handleMenuItemClick('/ai-features/voice-listing')}
                                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                  <MicrophoneIcon className="w-4 h-4" />
                                  <span>Voice Listing Magic</span>
                                  <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full ml-auto">
                                    Host Only
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Menu Items */}
                        <div className="py-2">
                          <button
                            type="button"
                            onClick={() => handleMenuItemClick('/profile')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-200 text-left"
                          >
                            <UserCircleIcon className="w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">Profile Settings</div>
                              <div className="text-xs text-gray-500">Manage your account details</div>
                            </div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleMenuItemClick('/settings')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 text-left"
                          >
                            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">Account Settings</div>
                              <div className="text-xs text-gray-500">Privacy & preferences</div>
                            </div>
                          </button>
                        </div>
                        
                        {/* Logout Section */}
                        <div className="border-t border-gray-100 pt-2">
                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                          >
                            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">
                                {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                              </div>
                              <div className="text-xs text-red-500">
                                {isLoggingOut ? 'Please wait...' : 'End your session'}
                              </div>
                            </div>
                            {isLoggingOut && (
                              <div className="ml-auto">
                                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayoutWithSideNav;