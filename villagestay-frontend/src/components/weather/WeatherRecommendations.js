'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudIcon,
  SunIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  FireIcon,
  EyeDropperIcon,
  CalendarDaysIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { aiAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const WeatherRecommendations = ({ location, onRecommendationsUpdate }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchWeatherRecommendations = async () => {
    if (!location.trim()) {
      toast.error('Please enter a location first');
      return;
    }

    setLoading(true);
    try {
      const response = await aiAPI.getWeatherRecommendations({ location: location.trim() });
      setWeatherData(response);
      
      if (onRecommendationsUpdate) {
        onRecommendationsUpdate(response);
      }
      
      toast.success('🌤️ Weather insights loaded!');
    } catch (error) {
      console.error('Weather recommendations error:', error);
      const errorMessage = error.response?.data?.error || 'Unable to get weather data for this location';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weatherMain, temp) => {
    const main = weatherMain?.toLowerCase();
    
    if (temp > 30) return '☀️';
    if (temp < 15) return '🌨️';
    
    switch (main) {
      case 'clear': return '☀️';
      case 'rain': return '🌧️';
      case 'drizzle': return '🌦️';
      case 'snow': return '❄️';
      case 'clouds': return '☁️';
      case 'thunderstorm': return '⛈️';
      case 'mist':
      case 'fog': return '🌫️';
      default: return '🌤️';
    }
  };

  const getTemperatureIcon = (temp) => {
    if (temp > 35) return '🔥';
    if (temp < 10) return '❄️';
    return '🌡️';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      medium: 'bg-amber-100 text-amber-800 border-amber-200',
      low: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return colors[priority] || colors.medium;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'outdoor': '🚶‍♂️',
      'cultural': '🎭',
      'farming': '🌾',
      'craft': '🎨',
      'wellness': '🧘‍♀️',
      'photography': '📸',
      'cooking': '👨‍🍳',
      'nature': '🌿',
      'adventure': '🏔️',
      'spiritual': '🕉️'
    };
    return icons[category] || '✨';
  };

  const getWeatherAdvice = (weather) => {
    if (!weather) return null;
    
    const temp = weather.temperature;
    const condition = weather.main?.toLowerCase();
    
    if (temp > 35) {
      return {
        type: 'warning',
        message: 'Very hot weather. Stay hydrated and avoid midday sun.',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800'
      };
    } else if (temp < 10) {
      return {
        type: 'info',
        message: 'Cold weather. Pack warm clothes and enjoy cozy indoor activities.',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800'
      };
    } else if (condition === 'rain') {
      return {
        type: 'info',
        message: 'Rainy weather. Perfect for indoor cultural activities.',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800'
      };
    } else {
      return {
        type: 'success',
        message: 'Great weather for exploring village life and local culture.',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-800'
      };
    }
  };

  return (
    <>
      {/* Professional Weather Button */}
      <motion.button
        type="button"
        onClick={fetchWeatherRecommendations}
        disabled={loading || !location.trim()}
        className={`group relative flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 overflow-hidden ${
          !location.trim()
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
        }`}
        whileHover={location.trim() ? { scale: 1.02 } : {}}
        whileTap={location.trim() ? { scale: 0.98 } : {}}
      >
        {/* Button background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative flex items-center space-x-2">
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <ArrowPathIcon className="w-5 h-5" />
            </motion.div>
          ) : (
            <span className="text-lg">🌤️</span>
          )}
          <span className="font-semibold">Weather Guide</span>
        </div>
      </motion.button>

      {/* Enhanced Weather Preview Card */}
      {weatherData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 relative"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">
                      {getWeatherIcon(weatherData.current_weather?.main, weatherData.current_weather?.temperature)}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                    <span className="text-sm">{getTemperatureIcon(weatherData.current_weather?.temperature)}</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-baseline space-x-2 mb-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {weatherData.current_weather?.temperature}°C
                    </span>
                    <span className="text-lg text-gray-500">
                      feels like {weatherData.current_weather?.feels_like}°C
                    </span>
                  </div>
                  <p className="text-gray-600 capitalize font-medium mb-1">
                    {weatherData.current_weather?.description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <EyeDropperIcon className="w-4 h-4" />
                      <span>{weatherData.current_weather?.humidity}% humidity</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>💨</span>
                      <span>{weatherData.current_weather?.wind_speed} m/s</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <motion.button
                onClick={() => setShowModal(true)}
                className="group flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all duration-200 font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>View {weatherData.recommendations?.length || 0} Activities</span>
                <ArrowPathIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              </motion.button>
            </div>
            
            {/* Weather Advice */}
            {getWeatherAdvice(weatherData.current_weather) && (
              <div className={`p-4 rounded-xl border ${getWeatherAdvice(weatherData.current_weather).bgColor} ${getWeatherAdvice(weatherData.current_weather).borderColor} mb-6`}>
                <p className={`${getWeatherAdvice(weatherData.current_weather).textColor} font-medium`}>
                  💡 {getWeatherAdvice(weatherData.current_weather).message}
                </p>
              </div>
            )}

            {/* Activity Preview */}
            {weatherData.recommendations?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Perfect for today</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {weatherData.recommendations.slice(0, 3).map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl"
                    >
                      <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                      <span className="text-sm font-medium text-gray-700">{rec.activity}</span>
                    </motion.div>
                  ))}
                  {weatherData.recommendations.length > 3 && (
                    <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                      <span className="text-sm text-gray-500 font-medium">
                        +{weatherData.recommendations.length - 3} more
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}


{/* Professional Modal with Proper Z-Index */}
<AnimatePresence>
  {showModal && weatherData && (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }} // Ensure it's above everything
      onClick={() => setShowModal(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 100000 }}
      >
        {/* Rest of your modal content remains the same */}
        {/* Professional Header */}
        <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 md:p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/30">
                <span className="text-2xl md:text-3xl">🌤️</span>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1">Weather Intelligence</h2>
                <div className="flex items-center space-x-2 text-blue-100">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="text-sm md:text-lg">{weatherData.location}</span>
                </div>
              </div>
            </div>
            
            <motion.button
              onClick={() => setShowModal(false)}
              className="p-2 md:p-3 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <XMarkIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Your existing modal content here */}
          {/* Current Weather Section */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50/50">
            {/* Weather content remains the same */}
          </div>
          
          {/* Activities Section */}
          <div className="p-6 md:p-8">
            {/* Activities content remains the same */}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 md:p-6 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 flex items-center space-x-2">
              <ClockIcon className="w-4 h-4" />
              <span>Last updated: {new Date(weatherData.current_weather.timestamp).toLocaleString()}</span>
            </div>
            
            <motion.button
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close Weather Guide
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
    </>
  );
};

export default WeatherRecommendations;