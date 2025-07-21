'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { aiAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const AIContentGenerator = ({ 
  title, 
  location, 
  price_per_night, 
  property_type,
  onContentGenerated,
  onSuggestionsGenerated 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a property title first');
      return;
    }
    
    if (!location.trim()) {
      toast.error('Please enter a location first');
      return;
    }

    setIsGenerating(true);
    setShowModal(true);
    setProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const response = await aiAPI.generateListingContent({
        title: title.trim(),
        location: location.trim(),
        price_per_night: price_per_night || '2000',
        property_type: property_type || 'homestay'
      });

      clearInterval(progressInterval);
      setProgress(100);

      setGeneratedContent(response);
      
      // Small delay for better UX
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);

      toast.success('AI content generated successfully!');

    } catch (error) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setShowModal(false);
      
      const errorMessage = error.response?.data?.error || 'Failed to generate content';
      toast.error(errorMessage);
    }
  };

  const handleUseContent = () => {
    if (generatedContent) {
      onContentGenerated(generatedContent.generated_description);
      
      if (onSuggestionsGenerated && generatedContent.suggestions) {
        onSuggestionsGenerated(generatedContent.suggestions);
      }
      
      setShowModal(false);
      setGeneratedContent(null);
      toast.success('AI content applied to your listing!');
    }
  };

  const handleRegenerate = () => {
    setGeneratedContent(null);
    handleGenerate();
  };

  return (
    <>
      {/* Generate Button */}
      <motion.button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !title.trim() || !location.trim()}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          !title.trim() || !location.trim()
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl'
        }`}
        whileHover={title.trim() && location.trim() ? { scale: 1.02 } : {}}
        whileTap={title.trim() && location.trim() ? { scale: 0.98 } : {}}
      >
        <SparklesIcon className="w-5 h-5" />
        <span>Generate with AI</span>
      </motion.button>

      {/* AI Generation Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">AI Content Generator</h2>
                    <p className="text-sm text-gray-600">Creating compelling listing content...</p>
                  </div>
                </div>
                
                {!isGenerating && (
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {isGenerating ? (
                  /* Loading State */
                  <div className="text-center py-8">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <SparklesIcon className="w-10 h-10 text-purple-500" />
                        </motion.div>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Creating Your Content...
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Our AI is crafting compelling content for "{title}" in {location}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <motion.div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-sm text-gray-500">{progress}% complete</p>

                    {/* Generation Steps */}
                    <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
                      {[
                        { step: 'Analyzing location and property type', completed: progress > 20 },
                        { step: 'Researching local culture and attractions', completed: progress > 40 },
                        { step: 'Crafting compelling description', completed: progress > 60 },
                        { step: 'Adding unique selling points', completed: progress > 80 },
                        { step: 'Finalizing content', completed: progress >= 100 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          {item.completed ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : (
                            <ClockIcon className="w-5 h-5 text-gray-400" />
                          )}
                          <span className={`text-sm ${item.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                            {item.step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : generatedContent ? (
                  /* Generated Content */
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Content Generated!</h3>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {generatedContent.word_count} words
                      </span>
                    </div>

                    {/* Generated Description */}
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Generated Description:</h4>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {generatedContent.generated_description}
                        </p>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {generatedContent.suggestions && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Amenities */}
                        <div className="bg-blue-50 rounded-xl p-4">
                          <h5 className="font-semibold text-blue-900 mb-2 flex items-center">
                            <LightBulbIcon className="w-4 h-4 mr-2" />
                            Suggested Amenities
                          </h5>
                          <div className="space-y-1">
                            {generatedContent.suggestions.suggested_amenities?.map((amenity, index) => (
                              <div key={index} className="text-sm text-blue-800">• {amenity}</div>
                            ))}
                          </div>
                        </div>

                        {/* Unique Selling Points */}
                        <div className="bg-green-50 rounded-xl p-4">
                          <h5 className="font-semibold text-green-900 mb-2 flex items-center">
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            Unique Selling Points
                          </h5>
                          <div className="space-y-1">
                            {generatedContent.suggestions.unique_selling_points?.map((point, index) => (
                              <div key={index} className="text-sm text-green-800">• {point}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <button
                        onClick={handleUseContent}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                      >
                        Use This Content
                      </button>
                      
                      <button
                        onClick={handleRegenerate}
                        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span>Regenerate</span>
                      </button>
                    </div>

                    <p className="text-center text-xs text-gray-500 mt-4">
                      You can edit the generated content after applying it
                    </p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIContentGenerator;