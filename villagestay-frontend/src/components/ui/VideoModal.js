'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ShareIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const VideoModal = ({ isOpen, onClose, videos }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const modalRef = useRef(null);

  // Reset video when index changes
  useEffect(() => {
    if (videoRef.current && isOpen) {
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      
      // Reset video element
      videoRef.current.currentTime = 0;
      videoRef.current.load(); // This forces the video to reload with new src
    }
  }, [currentVideoIndex, isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Video event handlers
  const handlePlayPause = () => {
    if (videoRef.current && !isLoading) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Error playing video:', error);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    // Auto-advance to next video
    if (currentVideoIndex < videos.length - 1) {
      setTimeout(() => {
        goToNext();
      }, 1000);
    }
  };

  const handleProgressChange = (e) => {
    if (videoRef.current && !isLoading) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (modalRef.current?.requestFullscreen) {
        modalRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const goToPrevious = () => {
    const newIndex = currentVideoIndex === 0 ? videos.length - 1 : currentVideoIndex - 1;
    setCurrentVideoIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentVideoIndex === videos.length - 1 ? 0 : currentVideoIndex + 1;
    setCurrentVideoIndex(newIndex);
  };

  const goToVideo = (index) => {
    if (index !== currentVideoIndex) {
      setCurrentVideoIndex(index);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentVideo = videos[currentVideoIndex];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-6xl mx-4 bg-black rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {currentVideo.title}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <span className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>AI Generated</span>
                  </span>
                  <span>{currentVideo.duration}</span>
                  <span>{currentVideo.location}</span>
                  <span className="text-blue-400">{currentVideoIndex + 1} of {videos.length}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300"
                >
                  <HeartIcon className="w-5 h-5" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300"
                >
                  <ShareIcon className="w-5 h-5" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-red-500/50 transition-all duration-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              src={currentVideo.src}
              className="w-full h-full object-cover"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={handleCanPlay}
              onEnded={handleVideoEnded}
              onLoadStart={() => setIsLoading(true)}
              onWaiting={() => setIsLoading(true)}
              onCanPlayThrough={() => setIsLoading(false)}
              muted={isMuted}
              playsInline
              preload="metadata"
            />

            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
                />
              </div>
            )}

            {/* Navigation Arrows */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300 z-10"
              disabled={isLoading}
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300 z-10"
              disabled={isLoading}
            >
              <ChevronRightIcon className="w-6 h-6" />
            </motion.button>

            {/* Play/Pause Overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={handlePlayPause}
            >
              <AnimatePresence>
                {!isPlaying && !isLoading && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    className="p-6 bg-white/20 backdrop-blur-md rounded-full"
                  >
                    <PlayIcon className="w-16 h-16 text-white ml-2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video Info Overlay (shows on hover) */}
            <div className="absolute bottom-24 left-6 right-6 bg-black/70 backdrop-blur-md rounded-2xl p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-sm leading-relaxed">
                {currentVideo.description}
              </p>
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-300">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>{currentVideo.views} views</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{currentVideo.type}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            {/* Progress Bar */}
            <div 
              className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4 group"
              onClick={handleProgressChange}
            >
              <div 
                className="h-full bg-green-500 rounded-full relative transition-all duration-150"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlayPause}
                  disabled={isLoading}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : isPlaying ? (
                    <PauseIcon className="w-6 h-6" />
                  ) : (
                    <PlayIcon className="w-6 h-6" />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300"
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="w-6 h-6" />
                  ) : (
                    <SpeakerWaveIcon className="w-6 h-6" />
                  )}
                </motion.button>

                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300"
                >
                  <ArrowsPointingOutIcon className="w-6 h-6" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Thumbnail Navigation */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-3 bg-black/50 backdrop-blur-md rounded-2xl p-4">
            {videos.map((video, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => goToVideo(index)}
                className={`relative w-20 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                  index === currentVideoIndex 
                    ? 'border-green-500 shadow-lg shadow-green-500/30' 
                    : 'border-white/20 hover:border-white/50'
                }`}
              >
                <video
                  src={video.src}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <PlayIcon className="w-4 h-4 text-white" />
                </div>
                {index === currentVideoIndex && (
                  <motion.div
                    layoutId="activeVideoIndicator"
                    className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </motion.div>
                )}
                
                {/* Video number indicator */}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoModal;