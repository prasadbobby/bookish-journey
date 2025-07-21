'use client';

import Link from 'next/link';
import { 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  HeartIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Footer = () => {
  const footerLinks = {
    'Explore': [
      { name: 'Browse Listings', href: '/listings' },
      { name: 'Search by Location', href: '/listings?search=location' },
      { name: 'Featured Destinations', href: '/destinations' },
      { name: 'Experiences', href: '/experiences' },
    ],
    'AI Features': [
      { name: 'Cultural Concierge', href: '/ai-features/cultural-concierge' },
      { name: 'Voice Listing', href: '/ai-features/voice-listing' },
      { name: 'Village Stories', href: '/ai-features/village-stories' },
      { name: 'Smart Recommendations', href: '/ai-features/recommendations' },
    ],
    'Host': [
      { name: 'List Your Property', href: '/host/create-listing' },
      { name: 'Host Dashboard', href: '/dashboard' },
      { name: 'Hosting Tips', href: '/host/tips' },
      { name: 'Host Resources', href: '/host/resources' },
    ],
    'Support': [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Safety Guidelines', href: '/safety' },
      { name: 'Community Guidelines', href: '/community' },
    ],
  };

  const socialLinks = [
    { name: 'Instagram', href: '#', icon: '📷' },
    { name: 'Facebook', href: '#', icon: '📘' },
    { name: 'Twitter', href: '#', icon: '🐦' },
    { name: 'YouTube', href: '#', icon: '📺' },
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">VillageStay</h2>
                <p className="text-sm text-green-400">Authentic Rural Tourism</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              Discover authentic rural India through AI-powered recommendations. 
              Connect with local communities and create meaningful travel experiences.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPinIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">Rural India, Everywhere</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <PhoneIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <EnvelopeIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">hello@villagestay.com</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4 text-white">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-green-400 transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">Stay Connected</h3>
              <p className="text-gray-300">
                Get updates on new destinations, AI features, and community impact stories.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Social Links & Features */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* AI Features Highlight */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-300">AI Cultural Guide</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                <SparklesIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-300">Smart Recommendations</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                <GlobeAltIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-300">Impact Tracking</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex justify-center lg:justify-end space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                  title={social.name}
                >
                  <span className="text-lg">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-1 text-gray-300 text-sm">
              <span>Made with</span>
              <HeartIcon className="w-4 h-4 text-red-500" />
              <span>for rural communities in India</span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end space-x-6 text-sm text-gray-300">
              <Link href="/privacy" className="hover:text-green-400 transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-green-400 transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-green-400 transition-colors duration-200">
                Cookie Policy
              </Link>
              <span>© 2024 VillageStay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Border */}
      <div className="h-1 bg-gradient-to-r from-green-500 via-green-400 to-green-600"></div>
    </footer>
  );
};

export default Footer;