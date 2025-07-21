'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, PlayIcon } from '@heroicons/react/24/outline';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, images.length, isAutoPlaying]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10s
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10s
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10s
  };

  return (
    <div className="relative w-full">
      {/* Main Carousel Container */}
      <div className="relative h-[500px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${images[currentIndex].src})` }}
            >
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-end">
                <div className="p-8 lg:p-12 text-white max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex items-center space-x-2 mb-4"
                  >
                    <MapPinIcon className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium text-sm lg:text-base">
                      {images[currentIndex].location}
                    </span>
                  </motion.div>
                  
                  <motion.h3
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-3xl lg:text-5xl font-bold mb-4 leading-tight"
                  >
                    {images[currentIndex].title}
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-lg lg:text-xl text-gray-200 mb-6 leading-relaxed"
                  >
                    {images[currentIndex].description}
                  </motion.p>
                  
                  <motion.button
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-md text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300"
                  >
                    <PlayIcon className="w-5 h-5 mr-2" />
                    Explore Destination
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 z-10"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 z-10"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>

        {/* Auto-play Indicator */}
        {isAutoPlaying && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-3 py-2 text-white text-sm z-10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Auto-playing</span>
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      <div className="flex justify-center mt-8 space-x-4 px-4">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative group transition-all duration-300 ${
              index === currentIndex ? 'scale-110' : 'scale-100 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="w-20 h-12 lg:w-24 lg:h-16 rounded-lg overflow-hidden shadow-lg">
              <img
                src={image.src}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            
            {/* Active Indicator */}
            {index === currentIndex && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative h-1 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-8 bg-green-500' : 'w-3 bg-gray-300 hover:bg-gray-400'
            }`}
          >
            {index === currentIndex && isAutoPlaying && (
              <motion.div
                className="absolute top-0 left-0 h-full bg-green-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 5, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;