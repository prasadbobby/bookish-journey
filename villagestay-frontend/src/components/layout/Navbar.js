'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  PlusIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MicrophoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout, isAuthenticated, isHost, isTourist, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push('/');
  };

  const navLinks = [
    { 
      href: '/listings', 
      label: 'Explore Villages', 
      icon: MagnifyingGlassIcon,
      description: 'Browse authentic rural stays' 
    },
    { 
      href: '/ai-features/cultural-concierge', 
      label: 'AI Cultural Guide', 
      icon: ChatBubbleLeftRightIcon,
      description: 'Get personalized recommendations' 
    },
    { 
      href: '/impact', 
      label: 'Impact Tracker', 
      icon: SparklesIcon,
      description: 'See your positive impact' 
    },
  ];

  const hostLinks = isHost ? [
    { href: '/host/dashboard', label: 'Host Dashboard', icon: HomeIcon },
    { href: '/host/listings', label: 'My Listings', icon: MagnifyingGlassIcon },
    { href: '/host/bookings', label: 'Bookings', icon: CalendarDaysIcon },
    { href: '/host/create-listing', label: 'Add Listing', icon: PlusIcon },
    { href: '/ai-features/voice-listing', label: 'Voice Listing', icon: MicrophoneIcon },
    { href: '/ai-features/village-stories', label: 'AI Videos', icon: VideoCameraIcon },
  ] : [];

  const touristLinks = isTourist ? [
    { href: '/tourist/dashboard', label: 'My Dashboard', icon: HomeIcon },
    { href: '/tourist/bookings', label: 'My Trips', icon: CalendarDaysIcon },
    { href: '/tourist/favorites', label: 'Saved Places', icon: SparklesIcon },
    { href: '/tourist/impact', label: 'My Impact', icon: ChartBarIcon },
  ] : [];

  const adminLinks = isAdmin ? [
    { href: '/admin/dashboard', label: 'Admin Dashboard', icon: Cog6ToothIcon },
    { href: '/admin/listings', label: 'Manage Listings', icon: MagnifyingGlassIcon },
    { href: '/admin/users', label: 'Manage Users', icon: UserCircleIcon },
    { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
  ] : [];

  const userLinks = [...hostLinks, ...touristLinks, ...adminLinks];

  const isActivePath = (path) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold village-gradient">VillageStay</h1>
              <p className="text-xs text-gray-500">AI-Powered Rural Tourism</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActivePath(link.href) 
                    ? 'text-green-600 bg-green-50 font-semibold' 
                    : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden lg:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-3 bg-green-50 hover:bg-green-100 rounded-xl px-4 py-2 transition-colors duration-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700 truncate max-w-24">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.user_type}</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </button>
                
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-2">
                  <div className="py-2">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-green-600 capitalize font-medium">{user?.user_type} Account</p>
                    </div>
                    
                    {/* User-specific Links */}
                    {userLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-200"
                      >
                        <link.icon className="w-4 h-4" />
                        <span>{link.label}</span>
                      </Link>
                    ))}
                    
                    {/* Profile & Settings */}
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-200"
                      >
                        <UserCircleIcon className="w-4 h-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-green-600 font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-green-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-primary"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
          >
            {isOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Main Navigation */}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                    isActivePath(link.href) 
                      ? 'text-green-600 bg-green-50 font-semibold' 
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium">{link.label}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  
                  {/* User Info */}
                  <div className="px-3 py-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user?.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.user_type} Account</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* User-specific Links */}
                  {userLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                    >
                      <link.icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  ))}
                  
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    <span className="font-medium">Profile Settings</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsOpen(false)}
                    className="block mx-3 mt-2 btn-primary text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;