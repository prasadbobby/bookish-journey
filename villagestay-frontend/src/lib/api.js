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

// Listings API
export const listingsAPI = {
  getAll: (params) => api.get('/api/listings/', { params }),
  getById: (id) => api.get(`/api/listings/${id}`),
  create: (data) => api.post('/api/listings/', data),
  update: (id, data) => api.put(`/api/listings/${id}`, data),
  delete: (id) => api.delete(`/api/listings/${id}`),
  search: (params) => api.get('/api/listings/search', { params }),
  checkAvailability: (id, params) => api.get(`/api/listings/${id}/availability`, { params }),
  updateAvailability: (id, data) => api.post(`/api/listings/${id}/availability`, data),
  getHostListings: (hostId, params) => api.get(`/api/listings/host/${hostId}`, { params }),

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

  getWeatherRecommendations: async (locationData) => {
    try {
      const response = await api.post('/api/ai-features/weather-recommendations', locationData);
      return response.data;
    } catch (error) {
      console.error('Weather recommendations failed:', error);
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
  getUsers: (params) => api.get('/api/admin/users', { params }),
  getListings: (params) => api.get('/api/admin/listings', { params }),
  approveListing: (id, data) => api.post(`/api/admin/listings/${id}/approve`, data),
  rejectListing: (id, data) => api.post(`/api/admin/listings/${id}/reject`, data),
  getBookings: (params) => api.get('/api/admin/bookings', { params }),
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

export default api;