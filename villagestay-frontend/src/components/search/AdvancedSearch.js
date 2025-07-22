// villagestay-frontend/src/components/search/AdvancedSearch.js
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  PhotoIcon, 
  HeartIcon, 
  SparklesIcon,
  FaceSmileIcon,
  EyeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { listingsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const AdvancedSearch = ({ onResults, loading, setLoading }) => {
  const [searchType, setSearchType] = useState('semantic');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const emotions = [
    { value: 'stress-relief', label: 'Stress Relief', icon: '🧘‍♀️', description: 'Find peaceful, calm places' },
    { value: 'adventure', label: 'Adventure', icon: '🏔️', description: 'Exciting outdoor experiences' },
    { value: 'cultural-immersion', label: 'Cultural', icon: '🎭', description: 'Traditional experiences' },
    { value: 'relaxation', label: 'Relaxation', icon: '😌', description: 'Comfortable, cozy stays' },
    { value: 'family-bonding', label: 'Family Time', icon: '👨‍👩‍👧‍👦', description: 'Family-friendly places' },
    { value: 'romantic', label: 'Romantic', icon: '💕', description: 'Intimate, romantic settings' }
  ];

  const handleSemanticSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Performing semantic search:', searchQuery);
      
      const response = await listingsAPI.semanticSearch({
        query: searchQuery,
        filters: {}
      });

      console.log('✅ Semantic search results:', response);
      
      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: 'semantic',
          query: searchQuery,
          message: response.message
        });
        toast.success(`🎯 ${response.message}`);
      } else {
        toast.info('No matching listings found for your search');
        onResults([], { type: 'semantic', query: searchQuery });
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, onResults, setLoading]);

  const handleEmotionSearch = useCallback(async () => {
    if (!selectedEmotion) {
      toast.error('Please select an emotion');
      return;
    }

    setLoading(true);
    try {
      console.log('😊 Performing emotion search:', selectedEmotion);
      
      const response = await listingsAPI.emotionSearch({
        emotion: selectedEmotion,
        filters: {}
      });

      console.log('✅ Emotion search results:', response);
      
      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: 'emotion',
          emotion: selectedEmotion,
          message: response.message
        });
        toast.success(`💝 ${response.message}`);
      } else {
        toast.info('No listings found matching this emotion');
        onResults([], { type: 'emotion', emotion: selectedEmotion });
      }
    } catch (error) {
      console.error('Emotion search error:', error);
      toast.error('Emotion search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEmotion, onResults, setLoading]);

  const handleImageSearch = useCallback(async () => {
    if (!imageDescription.trim()) {
      toast.error('Please describe the image or place you have in mind');
      return;
    }

    setLoading(true);
    try {
      console.log('🖼️ Performing image search:', imageDescription);
      
      const response = await listingsAPI.imageSearch({
        image_description: imageDescription,
        filters: {}
      });

      console.log('✅ Image search results:', response);
      
      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: 'image',
          description: imageDescription,
          message: response.message
        });
        toast.success(`📸 ${response.message}`);
      } else {
        toast.info('No listings found matching your visual description');
        onResults([], { type: 'image', description: imageDescription });
      }
    } catch (error) {
      console.error('Image search error:', error);
      toast.error('Visual search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [imageDescription, onResults, setLoading]);

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter your search');
      return;
    }

    setLoading(true);
    try {
      console.log('🤖 Performing smart search:', searchQuery);
      
      const response = await listingsAPI.smartSearch({
        query: searchQuery,
        search_type: 'auto',
        filters: {}
      });

      console.log('✅ Smart search results:', response);
      
      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: 'smart',
          detectedType: response.search_type,
          query: searchQuery,
          message: response.message
        });
        toast.success(`🚀 ${response.message}`);
      } else {
        toast.info('No matching results found');
        onResults([], { type: 'smart', query: searchQuery });
      }
    } catch (error) {
      console.error('Smart search error:', error);
      toast.error('Smart search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, onResults, setLoading]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Type Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-200 inline-flex">
          {[
            { value: 'semantic', label: 'Semantic', icon: SparklesIcon, color: 'blue' },
            { value: 'emotion', label: 'Emotion', icon: HeartIcon, color: 'pink' },
            { value: 'image', label: 'Visual', icon: PhotoIcon, color: 'purple' },
            { value: 'smart', label: 'AI Smart', icon: FaceSmileIcon, color: 'green' }
          ].map((type) => (
            <motion.button
              key={type.value}
              onClick={() => setSearchType(type.value)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                searchType === type.value
                  ? `bg-${type.color}-500 text-white shadow-lg`
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <type.icon className="w-5 h-5" />
              <span>{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Search Interface */}
      <AnimatePresence mode="wait">
        {searchType === 'semantic' && (
          <motion.div
            key="semantic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          >
            <div className="text-center mb-6">
              <SparklesIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Semantic Search</h3>
              <p className="text-gray-600">Search naturally - tell us what you're looking for</p>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="E.g., 'Find peaceful places near water for meditation' or 'Rustic farmhouse with organic food'"
                className="w-full px-6 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
                rows={3}
              />
              
              <motion.button
                onClick={handleSemanticSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Searching...' : 'Search with AI Understanding 🔍'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {searchType === 'emotion' && (
          <motion.div
            key="emotion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          >
            <div className="text-center mb-6">
              <HeartIcon className="w-12 h-12 text-pink-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Emotion-Based Search</h3>
              <p className="text-gray-600">Find places that match your mood and feelings</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {emotions.map((emotion) => (
                <motion.button
                  key={emotion.value}
                  onClick={() => setSelectedEmotion(emotion.value)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                    selectedEmotion === emotion.value
                      ? 'border-pink-500 bg-pink-50 shadow-lg'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-pink-25'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-3xl mb-2">{emotion.icon}</div>
                  <div className="font-bold text-gray-900 mb-1">{emotion.label}</div>
                  <div className="text-sm text-gray-600">{emotion.description}</div>
                </motion.button>
              ))}
            </div>
            
            <motion.button
              onClick={handleEmotionSearch}
              disabled={loading || !selectedEmotion}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Finding perfect matches...' : 'Find Places for This Mood 💝'}
            </motion.button>
          </motion.div>
        )}

        {searchType === 'image' && (
          <motion.div
            key="image"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          >
            <div className="text-center mb-6">
              <PhotoIcon className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Visual Search</h3>
              <p className="text-gray-600">Describe the image or place you have in mind</p>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="E.g., 'A traditional wooden house surrounded by green fields with mountains in the background' or 'Cozy cottage with a garden and stone walls'"
                className="w-full px-6 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-none"
                rows={4}
              />
              
              <motion.button
                onClick={handleImageSearch}
                disabled={loading || !imageDescription.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Analyzing visual preferences...' : 'Find Similar Places 📸'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {searchType === 'smart' && (
          <motion.div
            key="smart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          >
            <div className="text-center mb-6">
              <FaceSmileIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Smart Search</h3>
              <p className="text-gray-600">Let AI automatically choose the best search method</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Just tell us what you want - AI will figure out the rest!"
                className="w-full px-6 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 text-lg"
              />
              
              <motion.button
                onClick={handleSmartSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'AI is thinking...' : 'Let AI Find Perfect Matches 🤖'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSearch;