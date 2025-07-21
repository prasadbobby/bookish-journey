// src/app/host/availability/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CalendarDaysIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const AvailabilityPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [calendar, setCalendar] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!isHost) {
      toast.error('Access denied. Host account required.');
      router.push('/');
      return;
    }
    fetchListings();
  }, [isHost, router]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getHostListings(user.id);
      const hostListings = response.data.listings || [];
      setListings(hostListings);
      
      if (hostListings.length > 0) {
        setSelectedListing(hostListings[0]);
        setCalendar(hostListings[0].availability_calendar || {});
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const toggleDateAvailability = async (dateStr) => {
    if (!selectedListing) return;

    const newCalendar = {
      ...calendar,
      [dateStr]: !calendar[dateStr]
    };
    
    setCalendar(newCalendar);

    try {
      await listingsAPI.updateAvailability(selectedListing.id, {
        availability: { [dateStr]: newCalendar[dateStr] }
      });
      toast.success('Availability updated');
    } catch (error) {
      toast.error('Failed to update availability');
      // Revert change
      setCalendar(calendar);
    }
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatDateStr = (day) => {
    if (!day) return '';
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const isDateAvailable = (day) => {
    if (!day) return false;
    const dateStr = formatDateStr(day);
    return calendar[dateStr] !== false; // Available by default
  };

  const isPastDate = (day) => {
    if (!day) return false;
    const today = new Date();
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date < today;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isHost) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only hosts can manage availability.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Manage Availability 📅
          </h1>
          <p className="text-gray-600">
            Control when your property is available for booking
          </p>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600">Loading availability...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="card p-12 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-600 mb-6">Create a listing first to manage availability</p>
            <button
              onClick={() => router.push('/host/create-listing')}
              className="btn-primary"
            >
              Create Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Listing Selector */}
            <div className="lg:col-span-1">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Select Property</h3>
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => {
                        setSelectedListing(listing);
                        setCalendar(listing.availability_calendar || {});
                      }}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedListing?.id === listing.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900 truncate">{listing.title}</h4>
                      <p className="text-sm text-gray-600">{listing.location}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="lg:col-span-3">
              <div className="card p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="btn-secondary px-3 py-2"
                  >
                    ←
                  </button>
                  
                  <h2 className="text-xl font-semibold text-gray-900">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h2>
                  
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="btn-secondary px-3 py-2"
                  >
                    →
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {generateCalendarDays().map((day, index) => {
                    const dateStr = formatDateStr(day);
                    const available = isDateAvailable(day);
                    const past = isPastDate(day);
                    
                    return (
                      <div key={index} className="aspect-square">
                        {day && (
                          <button
                            onClick={() => !past && toggleDateAvailability(dateStr)}
                            disabled={past}
                            className={`w-full h-full rounded-lg text-sm font-medium transition-all duration-200 ${
                              past
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : available
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <span>{day}</span>
                              {!past && (
                                <span className="text-xs">
                                  {available ? (
                                    <CheckIcon className="w-3 h-3" />
                                  ) : (
                                    <XMarkIcon className="w-3 h-3" />
                                  )}
                                </span>
                              )}
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 rounded"></div>
                    <span className="text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-100 rounded"></div>
                    <span className="text-gray-600">Blocked</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-100 rounded"></div>
                    <span className="text-gray-600">Past Date</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityPage;