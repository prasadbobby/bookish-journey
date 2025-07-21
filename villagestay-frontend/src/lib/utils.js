// src/lib/utils.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount, currency = 'INR') => {
  // Handle null, undefined, or non-numeric values
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return currency === 'INR' ? '₹0' : '0';
  }
  
  // Convert to number if it's a string
  const numericAmount = Number(amount);
  
  if (currency === 'INR') {
    return `₹${numericAmount.toLocaleString('en-IN')}`;
  }
  return `${numericAmount.toLocaleString()} ${currency}`;
};

export const formatDate = (date) => {
  if (!date) return 'Date not available';
  
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDateShort = (date) => {
  if (!date) return 'N/A';
  
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'N/A';
  }
};

export const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  try {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

// ... rest of your utility functions remain the same
export const getPropertyTypeIcon = (type) => {
  const icons = {
    homestay: '🏠',
    farmstay: '🚜',
    heritage_home: '🏛️',
    eco_lodge: '🌿',
    village_house: '🏘️',
    cottage: '🏡',
  };
  return icons[type] || '🏠';
};

export const getAmenityIcon = (amenity) => {
  const icons = {
    'Wi-Fi': '📶',
    'Home-cooked meals': '🍽️',
    'Local guide': '👨‍🏫',
    'Traditional cuisine': '🍛',
    'Cultural performances': '🎭',
    'Yoga sessions': '🧘‍♀️',
    'Nature walks': '🚶‍♂️',
    'Organic farming': '🌾',
    'Handicraft workshop': '🎨',
    'Bicycle rental': '🚲',
    'Fireplace': '🔥',
    'Garden': '🌺',
    'Parking': '🚗',
    'Air conditioning': '❄️',
    'Hot water': '🚿',
  };
  return icons[amenity] || '✨';
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

export const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

export const getImagePlaceholder = (width = 400, height = 300, text = 'Village Stay') => {
  return `https://via.placeholder.com/${width}x${height}/22c55e/ffffff?text=${encodeURIComponent(text)}`;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

export const copyToClipboard = (text) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
};

export const shareContent = (title, text, url) => {
  if (navigator.share) {
    navigator.share({ title, text, url });
  } else {
    copyToClipboard(url);
  }
};

export const validateEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  const re = /^[+]?[\d\s-()]{10,}$/;
  return re.test(phone);
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getRatingStars = (rating) => {
  if (!rating || rating === 0) return '';
  
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push('⭐');
  }

  if (hasHalfStar) {
    stars.push('✨');
  }

  return stars.join('');
};

export const getRelativeTime = (date) => {
  if (!date) return 'Unknown time';
  
  try {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return formatDate(date);
    }
  } catch (error) {
    return 'Unknown time';
  }
};