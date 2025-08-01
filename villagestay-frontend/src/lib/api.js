import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance for regular API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for file uploads (without Content-Type header)
const apiWithFiles = axios.create({
  baseURL: API_BASE_URL,
  // Don't set Content-Type for file uploads - let browser handle it
});

// Request interceptor to add auth token for regular API
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? 
      document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor for file uploads
apiWithFiles.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? 
      document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling (for both instances)
const responseInterceptor = (response) => response;
const errorInterceptor = (error) => {
  if (error.response?.status === 401) {
    // Clear token and redirect to login on unauthorized
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/auth/login';
    }
  }
  return Promise.reject(error);
};

api.interceptors.response.use(responseInterceptor, errorInterceptor);
apiWithFiles.interceptors.response.use(responseInterceptor, errorInterceptor);

// Streaming helper function
const createStreamingRequest = async (endpoint, data) => {
  const token = typeof window !== 'undefined' ? 
    document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};

// lib/utils.js
export const formatCurrency = (amount) => {
  return `₹${amount?.toLocaleString('en-IN') || '0'}`;
};

export const getImagePlaceholder = (width = 400, height = 240, title = 'Village Stay') => {
  // Return a simple placeholder image path
  return '/images/placeholder-village.jpg';
};
// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  verifyEmail: (email, otp) => api.post('/api/auth/verify-email', { email, otp }),
  getProfile: (token) => api.get('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  updateProfile: (data, token) => api.put('/api/auth/profile', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  changePassword: (data, token) => api.post('/api/auth/change-password', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
};

export const reviewsAPI = {
  create: (data) => api.post('/api/reviews/create', data),
  getListingReviews: (listingId, params) => api.get(`/api/reviews/listing/${listingId}`, { params }),
  getUserReviews: (userId, params) => api.get(`/api/reviews/user/${userId}`, { params }),
  respondToReview: (reviewId, data) => api.post(`/api/reviews/${reviewId}/respond`, data),
  markHelpful: (reviewId) => api.post(`/api/reviews/${reviewId}/helpful`),
  canReviewBooking: (bookingId) => api.get(`/api/reviews/booking/${bookingId}/can-review`),
};

// Listings API
export const listingsAPI = {
  // Smart create method that routes to the correct endpoint
  create: (data) => {
    console.log('🔥 API: create called with data:', data);
    console.log('🔥 API: listing_category:', data.listing_category);
    
    if (data.listing_category === 'experience') {
      // Use dedicated experiences endpoint
      console.log('🎭 Routing to experiences endpoint');
      return api.post('/api/experiences/', data);
    } else {
      // Use listings endpoint for homestays
      console.log('🏠 Routing to listings endpoint');
      return api.post('/api/listings/create', data);
    }
  },

  // Get all listings (homestays only - for backward compatibility)
  getAll: (params) => api.get('/api/listings/', { params }),
  
  // Get all experiences
  getAllExperiences: (params) => api.get('/api/experiences/', { params }),
  
  // Get individual listing/experience by ID - smart routing
  getById: async (id) => {
    console.log('🔍 Getting listing/experience by ID:', id);
    
    // Try to get as homestay first
    try {
      const response = await api.get(`/api/listings/${id}`);
      console.log('✅ Found as homestay');
      return response;
    } catch (homestayError) {
      console.log('❌ Not found as homestay, trying experience...');
      
      // If not found as homestay, try as experience
      try {
        const response = await api.get(`/api/experiences/${id}`);
        console.log('✅ Found as experience');
        return response;
      } catch (experienceError) {
        console.log('❌ Not found as experience either');
        // If neither works, throw the original error
        throw homestayError;
      }
    }
  },

  // Get experience by ID specifically
  getExperienceById: (id) => api.get(`/api/experiences/${id}`),
  
  // Update method - smart routing based on type
  update: async (id, data) => {
    console.log('🔄 Updating listing/experience:', id, data.listing_category || data.type);
    
    if (data.listing_category === 'experience' || data.type === 'experience') {
      console.log('🎭 Updating as experience');
      return api.put(`/api/experiences/${id}`, data);
    } else {
      console.log('🏠 Updating as homestay');
      return api.put(`/api/listings/${id}`, data);
    }
  },

  // Delete method - smart routing
  delete: async (id) => {
    console.log('🗑️ Deleting listing/experience:', id);
    
    // Try to delete as homestay first
    try {
      const response = await api.delete(`/api/listings/${id}`);
      console.log('✅ Deleted as homestay');
      return response;
    } catch (homestayError) {
      console.log('❌ Failed to delete as homestay, trying experience...');
      
      // If not found as homestay, try as experience
      try {
        const response = await api.delete(`/api/experiences/${id}`);
        console.log('✅ Deleted as experience');
        return response;
      } catch (experienceError) {
        console.log('❌ Failed to delete as experience');
        // If neither works, throw the original error
        throw homestayError;
      }
    }
  },

  // Host management methods
  getHostListings: (hostId, params) => api.get(`/api/listings/host/${hostId}`, { params }),
  getHostAllListings: (hostId, params) => api.get(`/api/listings/host/${hostId}/all`, { params }),
  getHostStats: (hostId) => api.get(`/api/listings/host/${hostId}/stats`),

  // Search methods
  search: (params) => api.get('/api/listings/search', { params }),
  
  // Availability methods (homestays only)
  checkAvailability: (id, params) => api.get(`/api/listings/${id}/availability`, { params }),
  updateAvailability: (id, data) => api.post(`/api/listings/${id}/availability`, data),

  // Location services
  getLocationSuggestions: async (params) => {
    try {
      const response = await api.get('/api/listings/location-suggestions', { params });
      return response;
    } catch (error) {
      console.error('Location suggestions failed:', error);
      throw error;
    }
  },

  getPlaceDetails: async (data) => {
    try {
      const response = await api.post('/api/listings/place-details', data);
      return response;
    } catch (error) {
      console.error('Place details failed:', error);
      throw error;
    }
  },

  geocodeLocation: async (locationData) => {
    try {
      const response = await api.post('/api/listings/geocode', locationData);
      return response;
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw error;
    }
  },

  // Advanced Search Methods
  semanticSearch: async (searchData) => {
    try {
      const response = await api.post('/api/listings/semantic-search', searchData);
      return response.data;
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  },

  emotionSearch: async (emotionData) => {
    try {
      const response = await api.post('/api/listings/emotion-search', emotionData);
      return response.data;
    } catch (error) {
      console.error('Emotion search failed:', error);
      throw error;
    }
  },

  imageSearch: async (imageData) => {
    try {
      const response = await api.post('/api/listings/image-search', imageData);
      return response.data;
    } catch (error) {
      console.error('Image search failed:', error);
      throw error;
    }
  },

  smartSearch: async (searchData) => {
    try {
      const response = await api.post('/api/listings/smart-search', searchData);
      return response.data;
    } catch (error) {
      console.error('Smart search failed:', error);
      throw error;
    }
  },

  imageUploadSearch: async (imageData) => {
    try {
      const response = await api.post('/api/listings/image-visual-search', imageData);
      return response.data;
    } catch (error) {
      console.error('Image upload search failed:', error);
      throw error;
    }
  },

  // Experience-specific methods
  createExperience: (data) => api.post('/api/experiences/', data),
  
  // Unified search across both homestays and experiences
  searchAll: async (params) => {
    try {
      // Get both homestays and experiences in parallel
      const [homestaysResponse, experiencesResponse] = await Promise.allSettled([
        api.get('/api/listings/search', { params }),
        api.get('/api/experiences/', { params })
      ]);

      const homestays = homestaysResponse.status === 'fulfilled' 
        ? homestaysResponse.value.data.listings || []
        : [];
        
      const experiences = experiencesResponse.status === 'fulfilled'
        ? experiencesResponse.value.data.experiences || []
        : [];

      // Add type indicator to each item
      const formattedHomestays = homestays.map(item => ({
        ...item,
        listing_category: 'homestay',
        type: 'homestay'
      }));

      const formattedExperiences = experiences.map(item => ({
        ...item,
        listing_category: 'experience',
        type: 'experience'
      }));

      return {
        listings: [...formattedHomestays, ...formattedExperiences],
        homestays: formattedHomestays,
        experiences: formattedExperiences,
        total_count: formattedHomestays.length + formattedExperiences.length
      };
    } catch (error) {
      console.error('Unified search failed:', error);
      throw error;
    }
  },

  // Get trending/featured items
  getFeatured: async () => {
    try {
      const [homestaysResponse, experiencesResponse] = await Promise.allSettled([
        api.get('/api/listings/', { params: { limit: 6, featured: true } }),
        api.get('/api/experiences/', { params: { limit: 6, featured: true } })
      ]);

      const homestays = homestaysResponse.status === 'fulfilled'
        ? homestaysResponse.value.data.listings || []
        : [];
        
      const experiences = experiencesResponse.status === 'fulfilled'
        ? experiencesResponse.value.data.experiences || []
        : [];

      return {
        homestays: homestays.map(item => ({ ...item, listing_category: 'homestay' })),
        experiences: experiences.map(item => ({ ...item, listing_category: 'experience' }))
      };
    } catch (error) {
      console.error('Failed to get featured items:', error);
      throw error;
    }
  },

  // Get categories for experiences
  getExperienceCategories: async () => {
    try {
      // This could be a dedicated endpoint or computed from existing data
      return [
        { value: 'cultural', label: 'Cultural', icon: '🎭', count: 0 },
        { value: 'culinary', label: 'Culinary', icon: '🍛', count: 0 },
        { value: 'farming', label: 'Farming', icon: '🌾', count: 0 },
        { value: 'craft', label: 'Handicrafts', icon: '🎨', count: 0 },
        { value: 'spiritual', label: 'Spiritual', icon: '🙏', count: 0 },
        { value: 'adventure', label: 'Adventure', icon: '🏔️', count: 0 },
        { value: 'wellness', label: 'Wellness', icon: '🧘', count: 0 },
        { value: 'nature', label: 'Nature', icon: '🌳', count: 0 }
      ];
    } catch (error) {
      console.error('Failed to get experience categories:', error);
      throw error;
    }
  },

  // Analytics methods
  getAnalytics: async (hostId, type = 'all') => {
    try {
      const params = { type }; // 'all', 'homestays', 'experiences'
      const response = await api.get(`/api/listings/host/${hostId}/analytics`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }
};


// Add these to your API object as well

export const experiencesAPI = {
  // Direct experience operations
  getAll: (params) => api.get('/api/experiences/', { params }),
  getById: (id) => api.get(`/api/experiences/${id}`),
  create: (data) => api.post('/api/experiences/', data),
  update: (id, data) => api.put(`/api/experiences/${id}`, data),
  delete: (id) => api.delete(`/api/experiences/${id}`),
  
  // Experience-specific searches
  searchByCategory: (category, params) => api.get('/api/experiences/', { 
    params: { ...params, category } 
  }),
  searchByDifficulty: (difficulty, params) => api.get('/api/experiences/', { 
    params: { ...params, difficulty } 
  }),
  searchByDuration: (minHours, maxHours, params) => api.get('/api/experiences/', { 
    params: { ...params, min_duration: minHours, max_duration: maxHours } 
  }),
};

// Universal helper for handling both types
export const universalAPI = {
  // Get any listing by ID (homestay or experience)
  getAnyById: (id) => listingsAPI.getById(id),
  
  // Search across both types with unified results
  searchEverything: (query, filters = {}) => {
    return listingsAPI.searchAll({ q: query, ...filters });
  },
  
  // Get popular items of both types
  getPopular: () => listingsAPI.getFeatured(),
  
  // Get recommendations based on user preferences
  getRecommendations: async (userId, preferences = {}) => {
    try {
      const response = await api.post('/api/recommendations/', {
        user_id: userId,
        preferences,
        include_homestays: true,
        include_experiences: true
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }
};

// Bookings API
export const bookingsAPI = {
  create: (data) => api.post('/api/bookings/', data),
  getAll: (params) => api.get('/api/bookings/', { params }),
  getById: (id) => api.get(`/api/bookings/${id}`),
  completePayment: async (bookingId, paymentData) => {
  const response = await api.post(`/api/bookings/${bookingId}/payment`, paymentData);
  return response.data;
},
  cancel: (id, data) => api.post(`/api/bookings/${id}/cancel`, data),
  complete: (id) => api.post(`/api/bookings/${id}/complete`),
};

// AI Features API
export const aiAPI = {

 generateVillageStory: (data) => api.post('/api/ai-features/generate-village-story', data),
  getStoryStatus: (id) => api.get(`/api/ai-features/village-story-status/${id}`),
  getListingVideos: (listingId) => api.get(`/api/ai-features/listing-videos/${listingId}`),
  

  getWeatherRecommendations: async (locationData) => {
    try {
      const response = await api.post('/api/ai-features/weather-recommendations', locationData);
      return response.data;
    } catch (error) {
      console.error('Weather recommendations failed:', error);
      throw error;
    }
  },

  getWeeklyWeatherPrediction: async (locationData) => {
    try {
      const response = await api.post('/api/ai-features/weekly-weather-prediction', locationData);
      return response.data;
    } catch (error) {
      console.error('Weekly weather prediction failed:', error);
      throw error;
    }
  },

  getWeatherEnhancedSearch: async (searchData) => {
    try {
      const response = await api.post('/api/ai-features/weather-enhanced-search', searchData);
      return response.data;
    } catch (error) {
      console.error('Weather-enhanced search failed:', error);
      throw error;
    }
  },
  // Voice to Listing - use the file upload instance
  voiceToListing: (data) => apiWithFiles.post('/api/ai-features/voice-to-listing', data),
  createListingFromVoice: (data) => api.post('/api/ai-features/create-listing-from-voice', data),
  demoVoiceTranscription: (data) => api.post('/api/ai-features/demo/voice-transcription', data),

  generateListingContent: async (contentData) => {
    try {
      const response = await api.post('/api/ai-features/generate-listing-content', contentData);
      return response.data;
    } catch (error) {
      console.error('AI content generation failed:', error);
      throw error;
    }
  },
  
  // Village Story Generator
  generateVillageStory: (data) => api.post('/api/ai-features/generate-village-story', data),
  getStoryStatus: (id) => api.get(`/api/ai-features/village-story-status/${id}`),
  
  // Cultural Concierge - Updated with Streaming Support
  culturalConcierge: (data) => api.post('/api/ai-features/cultural-concierge', data),
  
  // NEW: Streaming Cultural Concierge
  culturalConciergeStream: (data) => createStreamingRequest('/api/ai-features/cultural-concierge/stream', data),
  
  // Cultural Concierge Helper Methods
  demoCulturalChat: (data) => api.post('/api/ai-features/demo/cultural-chat', data),
  getConciergeHistory: (params) => api.get('/api/ai-features/cultural-concierge/history', { params }),
  getCulturalInsights: (location) => api.get(`/api/ai-features/cultural-insights/${location}`),
  
  // Streaming Helper - Custom implementation for real-time chat
  startCulturalConciergeStream: async (data, onMessage, onError, onComplete) => {
    try {
      const response = await createStreamingRequest('/api/ai-features/cultural-concierge/stream', data);
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              onComplete?.();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  onMessage?.(eventData);
                } catch (e) {
                  console.error('Failed to parse streaming data:', e);
                }
              }
            }
          }
        } catch (error) {
          onError?.(error);
        }
      };

      processStream();
      
      return {
        close: () => reader.cancel()
      };
      
    } catch (error) {
      onError?.(error);
      throw error;
    }
  },
  
  // Image Analysis
  analyzePropertyImages: (data) => api.post('/api/ai-features/analyze-property-images', data),
  generateListingPhotos: (data) => api.post('/api/ai-features/generate-listing-photos', data),
  
  // General AI
  travelAssistant: (data) => api.post('/api/ai/travel-assistant', data),
  translate: (data) => api.post('/api/ai/translate', data),
  generateDescription: (data) => api.post('/api/ai/generate-description', data),
  sustainabilitySuggestions: (data) => api.post('/api/ai/sustainability-suggestions', data),
};

// Impact API
export const impactAPI = {
  getUserImpact: (userId) => api.get(`/api/impact/user/${userId}`),
  getCommunityImpact: (location) => api.get(`/api/impact/community/${location}`),
  getOverallImpact: (params) => api.get('/api/impact/overall', { params }),
  calculateCarbonFootprint: (data) => api.post('/api/impact/carbon-footprint', data),
  getLeaderboard: (params) => api.get('/api/impact/leaderboard', { params }),
  getSustainabilityScore: (listingId) => api.get(`/api/impact/sustainability-score/${listingId}`),
};

// Admin API
export const adminAPI = {

    getDashboard: (params) => api.get('/api/admin/dashboard', { params }),
  
  // Users management
  getUsers: (params) => api.get('/api/admin/users', { params }),
  
  // Listings management (handles both homestays and experiences)
  getListings: (params) => api.get('/api/admin/listings', { params }),
  
  // Listing approval/rejection (smart routing)
  approveListing: async (listingId, data) => {
    // Include listing type in the request data
    return api.post(`/api/admin/listings/${listingId}/approve`, data);
  },
  
  rejectListing: async (listingId, data) => {
    // Include listing type in the request data
    return api.post(`/api/admin/listings/${listingId}/reject`, data);
  },
  
  // Bookings management
  getBookings: (params) => api.get('/api/admin/bookings', { params }),
  
  // Analytics
  getAnalytics: (params) => api.get('/api/admin/analytics', { params }),
  // User management
  suspendUser: (userId) => api.post(`/api/admin/users/${userId}/suspend`),
  activateUser: (userId) => api.post(`/api/admin/users/${userId}/activate`),
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
  
  // Listing management  
  getListingDetails: (listingId) => api.get(`/api/admin/listings/${listingId}`),
  
  // System health
  getSystemHealth: () => api.get('/api/admin/system/health'),
  getSystemLogs: (params) => api.get('/api/admin/system/logs', { params }),
};

// Utility functions for streaming
export const streamingUtils = {
  // Parse Server-Sent Events
  parseSSEData: (line) => {
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.slice(6));
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
        return null;
      }
    }
    return null;
  },

  // Create streaming connection with proper error handling
  createStreamConnection: async (endpoint, data, callbacks = {}) => {
    const { onMessage, onError, onComplete, onStart } = callbacks;
    
    try {
      onStart?.();
      
      const response = await createStreamingRequest(endpoint, data);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      let isActive = true;

      const processChunk = async () => {
        try {
          while (isActive) {
            const { done, value } = await reader.read();
            
            if (done) {
              onComplete?.();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                const eventData = streamingUtils.parseSSEData(line);
                if (eventData) {
                  onMessage?.(eventData);
                }
              }
            }
          }
        } catch (error) {
          if (isActive) {
            onError?.(error);
          }
        }
      };

      processChunk();

      // Return controller to close the stream
      return {
        close: () => {
          isActive = false;
          reader.cancel();
        }
      };

    } catch (error) {
      onError?.(error);
      throw error;
    }
  }
};


// Add to src/lib/api.js

export const callsAPI = {
  initiateBookingCall: () => api.post('/api/bookings/initiate-call'),
};

// Then in the dashboard, replace the triggerBookingCall function with:
const triggerBookingCall = async () => {
  if (!user?.phone) {
    toast.error('Phone number not found. Please update your profile.');
    return;
  }

  setCallingInProgress(true);
  
  try {
    // Optional: Log call in backend
    await callsAPI.initiateBookingCall();
    
    // Show initial success message
    toast.success(`🔄 Initiating call to ${user.phone}... Maya will call you in 10-15 seconds!`, {
      duration: 5000
    });

    // Rest of the ElevenLabs API call remains the same...
  } catch (error) {
    toast.error(`❌ Failed to initiate call: ${error.message}`);
  } finally {
    setCallingInProgress(false);
  }
};
export default api;