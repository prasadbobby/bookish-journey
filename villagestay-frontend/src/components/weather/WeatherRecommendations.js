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
  SnowflakeIcon,
  EyeDropperIcon
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
      
      toast.success('Weather recommendations loaded!');
    } catch (error) {
      console.error('Weather recommendations error:', error);
      const errorMessage = error.response?.data?.error || 'Unable to get weather data for this location';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weatherMain, iconCode) => {
    const main = weatherMain?.toLowerCase();
    const iconClass = "w-8 h-8";
    
    switch (main) {
      case 'clear':
        return <SunIcon className={`${iconClass} text-yellow-500`} />;
      case 'rain':
        return <EyeDropperIcon className={`${iconClass} text-blue-500`} />;
      case 'drizzle':
        return <EyeDropperIcon className={`${iconClass} text-blue-400`} />;
      case 'snow':
        return <SnowflakeIcon className={`${iconClass} text-blue-200`} />;
      case 'clouds':
        return <CloudIcon className={`${iconClass} text-gray-500`} />;
      case 'thunderstorm':
        return <ExclamationTriangleIcon className={`${iconClass} text-purple-600`} />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <EyeIcon className={`${iconClass} text-gray-400`} />;
      default:
        return <CloudIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const getTemperatureIcon = (temp) => {
    if (temp > 35) return <FireIcon className="w-5 h-5 text-red-500" />;
    if (temp < 10) return <SnowflakeIcon className="w-5 h-5 text-blue-500" />;
    return <SunIcon className="w-5 h-5 text-yellow-500" />;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
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
    return iconMap[category] || '✨';
  };

  const getWeatherAdvice = (weather) => {
    if (!weather) return null;
    
    const temp = weather.temperature;
    const condition = weather.main?.toLowerCase();
    
    if (temp > 35) {
      return {
        type: 'warning',
        message: 'Very hot weather. Stay hydrated and avoid midday sun.',
        icon: <FireIcon className="w-5 h-5 text-red-500" />
      };
    } else if (temp < 10) {
      return {
        type: 'info',
        message: 'Cold weather. Pack warm clothes and enjoy cozy indoor activities.',
        icon: <SnowflakeIcon className="w-5 h-5 text-blue-500" />
      };
    } else if (condition === 'rain') {
      return {
        type: 'info',
        message: 'Rainy weather. Perfect for indoor cultural activities and cooking classes.',
        icon: <EyeDropperIcon className="w-5 h-5 text-blue-500" />
      };
    } else if (condition === 'clear') {
      return {
        type: 'success',
        message: 'Perfect weather for outdoor activities and sightseeing!',
        icon: <SunIcon className="w-5 h-5 text-yellow-500" />
      };
    }
    
    return {
      type: 'info',
      message: 'Great weather for exploring village life and local culture.',
      icon: <CloudIcon className="w-5 h-5 text-gray-500" />
    };
  };

  return (
    <>
      {/* Weather Button */}
      <motion.button
        type="button"
        onClick={fetchWeatherRecommendations}
        disabled={loading || !location.trim()}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          !location.trim()
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
        }`}
        whileHover={location.trim() ? { scale: 1.02 } : {}}
        whileTap={location.trim() ? { scale: 0.98 } : {}}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <ArrowPathIcon className="w-5 h-5" />
          </motion.div>
        ) : (
          <CloudIcon className="w-5 h-5" />
        )}
        <span>Weather Guide</span>
      </motion.button>

      {/* Weather Preview */}
      {weatherData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getWeatherIcon(weatherData.current_weather?.main)}
              <div>
                <div className="flex items-center space-x-2">
                  {getTemperatureIcon(weatherData.current_weather?.temperature)}
                  <span className="text-lg font-bold text-gray-900">
                    {weatherData.current_weather?.temperature}°C
                  </span>
                </div>
                <p className="text-sm text-gray-600 capitalize">
                  {weatherData.current_weather?.description}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <button
                onClick={() => setShowModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                View {weatherData.recommendations?.length || 0} Activities
              </button>
              <div className="text-xs text-gray-500 mt-1">
                Humidity: {weatherData.current_weather?.humidity}%
              </div>
            </div>
          </div>
          
          {/* Weather Advice */}
          {getWeatherAdvice(weatherData.current_weather) && (
            <div className={`mt-3 p-3 rounded-lg flex items-center space-x-2 ${
              getWeatherAdvice(weatherData.current_weather).type === 'warning' 
                ? 'bg-red-50 border border-red-200' 
                : getWeatherAdvice(weatherData.current_weather).type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              {getWeatherAdvice(weatherData.current_weather).icon}
              <span className="text-sm text-gray-700">
                {getWeatherAdvice(weatherData.current_weather).message}
              </span>
            </div>
          )}

          {/* Quick Activity Preview */}
          {weatherData.recommendations?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {weatherData.recommendations.slice(0, 3).map((rec, index) => (
                <span
                  key={index}
                  className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700"
                >
                  <span>{getCategoryIcon(rec.category)}</span>
                  <span>{rec.activity}</span>
                </span>
              ))}
              {weatherData.recommendations.length > 3 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{weatherData.recommendations.length - 3} more
                </span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Detailed Weather Modal */}
      <AnimatePresence>
        {showModal && weatherData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CloudIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Weather Recommendations</h2>
                    <p className="text-sm text-gray-600">{weatherData.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Current Weather Details */}
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Current Weather Conditions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-3">
                    {getTemperatureIcon(weatherData.current_weather.temperature)}
                    <div>
                      <p className="text-sm text-gray-600">Temperature</p>
                      <p className="font-bold text-gray-900">{weatherData.current_weather.temperature}°C</p>
                      <p className="text-xs text-gray-500">Feels like {weatherData.current_weather.feels_like}°C</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <EyeDropperIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Humidity</p>
                      <p className="font-bold text-gray-900">{weatherData.current_weather.humidity}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <ArrowPathIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Wind Speed</p>
                      <p className="font-bold text-gray-900">{weatherData.current_weather.wind_speed} m/s</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getWeatherIcon(weatherData.current_weather.main)}
                    <div>
                      <p className="text-sm text-gray-600">Condition</p>
                      <p className="font-bold text-gray-900 capitalize">{weatherData.current_weather.description}</p>
                    </div>
                  </div>
                </div>

                {/* Visibility and Pressure */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <EyeIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Visibility</p>
                      <p className="font-bold text-gray-900">{weatherData.current_weather.visibility} km</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <InformationCircleIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Pressure</p>
                      <p className="font-bold text-gray-900">{weatherData.current_weather.pressure} hPa</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Recommendations */}
              <div className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Recommended Activities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weatherData.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl flex-shrink-0">{getCategoryIcon(rec.category)}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{rec.activity}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(rec.priority)}`}>
                              {rec.priority}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <ClockIcon className="w-4 h-4" />
                            <span>{rec.best_time}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 3-Day Forecast */}
              {weatherData.forecast && weatherData.forecast.length > 0 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <h3 className="font-bold text-gray-900 mb-4">3-Day Forecast</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {weatherData.forecast.slice(0, 24).filter((_, index) => index % 8 === 0).map((forecast, index) => (
                      <div key={index} className="text-center p-4 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          {new Date(forecast.datetime).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <div className="mb-3 flex justify-center">
                          {getWeatherIcon(forecast.main)}
                        </div>
                        <p className="text-lg font-bold text-gray-900 mb-1">
                          {Math.round(forecast.temperature)}°C
                        </p>
                        <p className="text-xs text-gray-600 capitalize">
                          {forecast.description}
                        </p>
                        {forecast.rain > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            Rain: {forecast.rain}mm
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(weatherData.current_weather.timestamp).toLocaleString()}
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
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