// villagestay-frontend/src/components/map/MapView.js
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, NavigationControl, FullscreenControl } from 'react-map-gl';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { 
  XMarkIcon, 
  EyeIcon, 
  StarIcon,
  MapPinIcon,
  Squares2X2Icon,
  CubeIcon,
  GlobeAltIcon,
  HeartIcon,
  ShareIcon,
  ArrowTopRightOnSquareIcon,
  HomeIcon,
  SparklesIcon,
  CameraIcon,
  ClockIcon,
  UserGroupIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MapView = ({ listings, isOpen, onClose, filters, searchMetadata }) => {
  const mapRef = useRef(null);
  const deckRef = useRef(null);
  const containerRef = useRef(null);
  
  const [viewState, setViewState] = useState({
    longitude: 77.2090,
    latitude: 28.6139,
    zoom: 6,
    pitch: 45,
    bearing: 0
  });
  
  const [selectedListing, setSelectedListing] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v12');
  const [show3D, setShow3D] = useState(true);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [locationHoverInfo, setLocationHoverInfo] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [deckInitialized, setDeckInitialized] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  // Map styles with enhanced options
  const mapStyles = [
    { 
      id: 'satellite', 
      name: '3D Satellite', 
      style: 'mapbox://styles/mapbox/satellite-streets-v12', 
      icon: '🛰️',
      description: 'Satellite imagery with detailed roads'
    },
    { 
      id: 'terrain', 
      name: '3D Terrain', 
      style: 'mapbox://styles/mapbox/outdoors-v12', 
      icon: '🏔️',
      description: 'Topographic terrain visualization'
    },
    { 
      id: 'streets', 
      name: 'Street View', 
      style: 'mapbox://styles/mapbox/streets-v12', 
      icon: '🗺️',
      description: 'Detailed street and building view'
    },
    { 
      id: 'dark', 
      name: 'Dark Mode', 
      style: 'mapbox://styles/mapbox/dark-v11', 
      icon: '🌙',
      description: 'Elegant dark theme styling'
    }
  ];

  // Process listings data efficiently
  const processedListings = useMemo(() => {
    if (!listings || !Array.isArray(listings)) return [];
    
    return listings
      .filter(listing => {
        if (!listing?.coordinates) return false;
        const { lat, lng } = listing.coordinates;
        return lat && lng && 
               !isNaN(lat) && !isNaN(lng) &&
               lat !== 0 && lng !== 0 && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
      })
      .map((listing, index) => ({
        ...listing,
        position: [
          parseFloat(listing.coordinates.lng), 
          parseFloat(listing.coordinates.lat)
        ],
        price: parseFloat(listing.price_per_night) || 0,
        rating: parseFloat(listing.rating) || 4.5,
        index
      }));
  }, [listings]);

  // Enhanced location information with rich data
  const getLocationInfo = useCallback((position, radius = 0.015) => {
    const [lng, lat] = position;
    
    const nearbyListings = processedListings.filter(listing => {
      const [listingLng, listingLat] = listing.position;
      const distance = Math.sqrt(
        Math.pow(lng - listingLng, 2) + Math.pow(lat - listingLat, 2)
      );
      return distance <= radius;
    });

    if (nearbyListings.length === 0) return null;

    // Get most common location name
    const locationNames = nearbyListings.map(l => l.location);
    const locationName = locationNames.reduce((a, b, _, arr) =>
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );

    // Collect experiences
    const allExperiences = [];
    nearbyListings.forEach(listing => {
      if (listing.experiences && listing.experiences.length > 0) {
        allExperiences.push(...listing.experiences.map(exp => ({
          ...exp,
          listingTitle: listing.title,
          listingId: listing.id
        })));
      }
    });

    // Calculate comprehensive statistics
    const totalListings = nearbyListings.length;
    const averagePrice = nearbyListings.reduce((sum, l) => sum + l.price, 0) / totalListings;
    const averageRating = nearbyListings.reduce((sum, l) => sum + l.rating, 0) / totalListings;
    const priceRange = {
      min: Math.min(...nearbyListings.map(l => l.price)),
      max: Math.max(...nearbyListings.map(l => l.price))
    };

    // Property insights
    const propertyTypes = [...new Set(nearbyListings.map(l => l.property_type))];
    const totalGuests = nearbyListings.reduce((sum, l) => sum + (l.max_guests || 0), 0);

    // Top amenities analysis
    const allAmenities = nearbyListings.flatMap(l => l.amenities || []);
    const amenityCounts = {};
    allAmenities.forEach(amenity => {
      amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
    });
    const topAmenities = Object.entries(amenityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([amenity]) => amenity);

    // Experience categories
    const experienceCategories = [...new Set(allExperiences.map(exp => exp.category))];

    return {
      locationName,
      totalListings,
      totalExperiences: allExperiences.length,
      experiences: allExperiences.slice(0, 4),
      experienceCategories: experienceCategories.slice(0, 4),
      averagePrice: Math.round(averagePrice),
      averageRating: Math.round(averageRating * 10) / 10,
      priceRange,
      propertyTypes,
      topAmenities,
      totalGuests,
      listings: nearbyListings.slice(0, 4),
      bestRated: nearbyListings.sort((a, b) => b.rating - a.rating)[0]
    };
  }, [processedListings]);

  // Professional 3D visualization layers
  const deckLayers = useMemo(() => {
    if (!show3D || !processedListings.length || !mapLoaded || !deckInitialized) return [];

    return [
      new ScatterplotLayer({
        id: 'village-properties',
        data: processedListings,
        getPosition: d => d.position,
        getRadius: d => {
          const baseRadius = 400;
          const price = Math.max(d.price || 1000, 1000);
          const priceMultiplier = Math.log(price) / Math.log(15000);
          return baseRadius + (priceMultiplier * 600);
        },
        getFillColor: d => {
          const rating = d.rating || 4.5;
          if (rating >= 4.8) return [16, 185, 129, 240]; // Emerald
          if (rating >= 4.5) return [34, 197, 94, 240];  // Green
          if (rating >= 4.0) return [59, 130, 246, 240]; // Blue
          if (rating >= 3.5) return [251, 191, 36, 240]; // Amber
          return [239, 68, 68, 240]; // Red
        },
        getLineColor: [255, 255, 255, 255],
        radiusScale: 1,
        radiusMinPixels: 8,
        radiusMaxPixels: 35,
        pickable: true,
        stroked: true,
        filled: true,
        getLineWidth: 3,
        onHover: (info) => {
          if (info.object) {
            setHoverInfo(info);
            const locationInfo = getLocationInfo(info.object.position);
            if (locationInfo && locationInfo.totalListings > 1) {
              setLocationHoverInfo({
                ...locationInfo,
                x: info.x,
                y: info.y,
                hoveredListing: info.object
              });
            } else {
              setLocationHoverInfo(null);
            }
          } else {
            setHoverInfo(null);
            setLocationHoverInfo(null);
          }
        },
        onClick: (info) => {
          if (info.object) {
            setSelectedListing(info.object);
            setViewState(prev => ({
              ...prev,
              longitude: info.object.position[0],
              latitude: info.object.position[1],
              zoom: Math.max(prev.zoom, 15),
              pitch: 60,
              transitionDuration: 1500
            }));
          }
        },
        updateTriggers: {
          getFillColor: [processedListings.map(d => d.rating)],
          getRadius: [processedListings.map(d => d.price)]
        }
      })
    ];
  }, [processedListings, show3D, mapLoaded, deckInitialized, getLocationInfo]);

  // Intelligent bounds fitting
  const fitBounds = useCallback(() => {
    if (processedListings.length === 0) return;

    const lngs = processedListings.map(d => d.position[0]);
    const lats = processedListings.map(d => d.position[1]);
    
    const bounds = {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats)
    };

    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    // Enhanced zoom calculation for better visualization
    let zoom;
    if (maxDiff > 15) zoom = 4;
    else if (maxDiff > 10) zoom = 5;
    else if (maxDiff > 5) zoom = 6;
    else if (maxDiff > 2) zoom = 7;
    else if (maxDiff > 1) zoom = 8;
    else if (maxDiff > 0.5) zoom = 9;
    else if (maxDiff > 0.2) zoom = 10;
    else zoom = 11;

    setViewState(prev => ({
      ...prev,
      longitude: centerLng,
      latitude: centerLat,
      zoom,
      pitch: show3D ? 50 : 0,
      bearing: 0,
      transitionDuration: 2500
    }));
  }, [processedListings, show3D]);

  // Map initialization and bounds fitting
  useEffect(() => {
    if (isOpen && processedListings.length > 0) {
      const timer = setTimeout(fitBounds, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fitBounds]);

  // Enhanced map load handler
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    setMapError(null);
    setTimeout(() => setDeckInitialized(true), 800);
  }, []);

  // State reset on open/close
  useEffect(() => {
    if (isOpen) {
      setMapLoaded(false);
      setDeckInitialized(false);
      setMapError(null);
    } else {
      setHoverInfo(null);
      setLocationHoverInfo(null);
      setSelectedListing(null);
    }
  }, [isOpen]);

  // Error handling
  const handleMapError = useCallback((error) => {
    if (error.name === 'AbortError' || 
        error.message?.includes('aborted') ||
        error.message?.includes('WebGL')) return;
    
    setMapError('Failed to load map. Please try again.');
    toast.error('Map initialization failed. Please refresh the page.');
  }, []);

  // Enhanced favorite management
  const toggleFavorite = useCallback((listingId, e) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(listingId)) {
        newFavorites.delete(listingId);
        toast.success('💔 Removed from favorites', { duration: 2000 });
      } else {
        newFavorites.add(listingId);
        toast.success('❤️ Added to favorites', { duration: 2000 });
      }
      return newFavorites;
    });
  }, []);

  // Professional sharing functionality
  const handleShare = useCallback(async (listing, e) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} - VillageStay`,
          text: `Discover this amazing village experience: ${listing.description?.slice(0, 100)}...`,
          url: url,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Unable to copy link');
      }
    }
  }, []);

  const handleViewStateChange = useCallback((evt) => {
    setViewState(evt.viewState);
  }, []);

  if (!isOpen) return null;

  // Token validation
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your_token_here')) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md mx-4 border border-gray-200"
        >
          <div className="text-6xl mb-6">🗺️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Map Configuration Required</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Please configure your Mapbox access token to enable the interactive map experience.
          </p>
          <motion.button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (mapError) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md mx-4 border border-red-200"
        >
          <div className="text-6xl mb-6">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Map Error</h3>
          <p className="text-gray-600 mb-6">{mapError}</p>
          <div className="flex space-x-4">
            <motion.button
              onClick={() => {
                setMapError(null);
                setMapLoaded(false);
                setDeckInitialized(false);
              }}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Retry
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        ref={containerRef}
      >
        {/* Professional Header Interface */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-green-500 to-blue-600 rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-2xl"
              >
                <CubeIcon className="w-8 h-8 text-white" />
              </motion.div>
              
              <div>
                <motion.h2 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  Village Explorer
                </motion.h2>
                <motion.div 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center space-x-6 text-white/90"
                >
                  <span className="flex items-center space-x-2">
                    <HomeIcon className="w-4 h-4" />
                    <span className="font-medium">{processedListings.length} destinations</span>
                  </span>
                  {processedListings.length > 0 && (
                    <span className="flex items-center space-x-2">
                      <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium">
                        {(processedListings.reduce((sum, l) => sum + l.rating, 0) / processedListings.length).toFixed(1)} avg rating
                      </span>
                    </span>
                  )}
                  {searchMetadata && (
                    <span className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full text-purple-200 text-sm border border-purple-400/30">
                      {searchMetadata.type === 'semantic' && '🧠 AI-Powered Search'}
                      {searchMetadata.type === 'emotion' && '💝 Emotion-Based Discovery'}
                      {searchMetadata.type === 'image' && '📸 Visual Search Results'}
                      {searchMetadata.type === 'smart' && '🤖 Smart Recommendations'}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Enhanced Map Style Selector */}
              <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 border border-white/20 shadow-lg">
                {mapStyles.map((style, index) => (
                  <motion.button
                    key={style.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => setMapStyle(style.style)}
                    className={`p-3 rounded-xl transition-all duration-300 group ${
                      mapStyle === style.style 
                        ? 'bg-white/30 text-white shadow-lg transform scale-105' 
                        : 'text-white/70 hover:text-white hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title={style.description}
                  >
                    <span className="text-xl">{style.icon}</span>
                  </motion.button>
                ))}
              </div>

              {/* Enhanced 3D Toggle */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => {
                  setShow3D(!show3D);
                  setViewState(prev => ({ 
                    ...prev, 
                    pitch: !show3D ? 50 : 0,
                    transitionDuration: 1500
                  }));
                }}
                className={`p-4 rounded-2xl border-2 transition-all duration-500 backdrop-blur-xl ${
                  show3D 
                    ? 'bg-gradient-to-r from-emerald-500/30 to-green-500/30 border-emerald-400/50 text-emerald-300 shadow-lg shadow-emerald-500/20' 
                    : 'bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={show3D ? 'Switch to 2D View' : 'Switch to 3D View'}
              >
                <CubeIcon className="w-6 h-6" />
              </motion.button>

              {/* Enhanced Fit Bounds Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                onClick={fitBounds}
                className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Fit All Destinations"
              >
                <GlobeAltIcon className="w-6 h-6" />
              </motion.button>

              {/* Enhanced Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className="p-4 bg-red-500/20 backdrop-blur-xl rounded-2xl text-white hover:bg-red-500/40 transition-all duration-300 border border-red-400/30 shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Close Map"
              >
                <XMarkIcon className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Enhanced Map Container */}
        <div className="w-full h-full relative overflow-hidden">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={handleViewStateChange}
            onLoad={handleMapLoad}
            onError={handleMapError}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={mapStyle}
            terrain={show3D ? { source: 'mapbox-dem', exaggeration: 2 } : undefined}
            projection="globe"
            fog={show3D ? { 
              range: [0.5, 10], 
              color: '#ffffff', 
              'horizon-blend': 0.05,
              'high-color': '#245cdf',
              'space-color': '#000000',
              'star-intensity': 0.15
            } : undefined}
            style={{ width: '100%', height: '100%' }}
            reuseMaps={true}
            preserveDrawingBuffer={true}
          >
            {/* Professional 3D Visualization */}
            {mapLoaded && deckInitialized && show3D && (
              <DeckGL
                ref={deckRef}
                viewState={viewState}
                layers={deckLayers}
                controller={false}
                onWebGLInitialized={(gl) => {
                  gl.enable(gl.BLEND);
                  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                }}
              />
            )}

            {/* Professional 2D Markers */}
            {mapLoaded && processedListings.map((listing, index) => (
              <Marker
                key={`marker-${listing.id}-${index}`}
                longitude={listing.position[0]}
                latitude={listing.position[1]}
                anchor="bottom"
              >
                <motion.div
                  initial={{ scale: 0, y: -50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  whileHover={{ scale: 1.15, y: -5 }}
                  className="relative cursor-pointer group"
                  onClick={() => setSelectedListing(listing)}
                  onMouseEnter={() => {
                    const locationInfo = getLocationInfo(listing.position);
                    if (locationInfo && locationInfo.totalListings > 1) {
                      setLocationHoverInfo({
                        ...locationInfo,
                        hoveredListing: listing
                      });
                    } else {
                      setHoverInfo({ object: listing });
                    }
                  }}
                  onMouseLeave={() => {
                    setLocationHoverInfo(null);
                    setHoverInfo(null);
                  }}
                >
                  {/* Professional Marker Design */}
                  <div className={`w-12 h-12 rounded-2xl border-3 border-white shadow-2xl flex items-center justify-center text-white font-bold text-xs transition-all duration-300 group-hover:shadow-3xl ${
                    listing.rating >= 4.8 ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600' :
                    listing.rating >= 4.5 ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600' :
                    listing.rating >= 4.0 ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600' :
                    listing.rating >= 3.5 ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600' :
                    'bg-gradient-to-br from-red-400 via-red-500 to-red-600'
                  }`}>
                    ₹{Math.round(listing.price / 1000)}k
                  </div>
                  
                  {/* Rating Badge */}
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
                    {listing.rating}
                  </div>

                  {/* Popularity Indicator */}
                  {listing.rating >= 4.8 && (
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-pulse"></div>
                  )}

                  {/* 3D Shadow Effect */}
                  {show3D && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-black/30 rounded-full blur-sm group-hover:w-10 group-hover:h-4 transition-all duration-300"></div>
                  )}
                </motion.div>
              </Marker>
            ))}

            {/* Professional Navigation Controls */}
            {mapLoaded && (
              <>
                <NavigationControl 
                  position="bottom-right" 
                  style={{ 
                    marginBottom: 120,
                    marginRight: 20
                  }} 
                  showCompass={true}
                  showZoom={true}
                />
                <FullscreenControl 
                  position="bottom-right" 
                  style={{ 
                    marginBottom: 180,
                    marginRight: 20
                  }} 
                />
              </>
            )}
          </Map>
        </div>

        {/* Enhanced Location Area Tooltip */}
        <AnimatePresence>
          {locationHoverInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute pointer-events-none z-30 bg-black/95 backdrop-blur-2xl text-white rounded-3xl border border-white/20 shadow-2xl max-w-lg"
              style={{
                left: Math.min((locationHoverInfo.x || 0) + 20, window.innerWidth - 500),
                top: Math.max((locationHoverInfo.y || 0) - 20, 140),
                transform: 'translateY(-100%)'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-blue-600 p-6 rounded-t-3xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="w-6 h-6 text-white" />
                    <h3 className="text-xl font-bold text-white">{locationHoverInfo.locationName}</h3>
                  </div>
                  {locationHoverInfo.bestRated && (
                    <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
                      <FireIcon className="w-4 h-4 text-orange-300" />
                      <span className="text-sm font-medium text-white">Hot Spot</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <HomeIcon className="w-4 h-4 text-white/80" />
                    <span className="text-white/90">{locationHoverInfo.totalListings} properties</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="w-4 h-4 text-white/80" />
                    <span className="text-white/90">{locationHoverInfo.totalExperiences} experiences</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="w-4 h-4 text-white/80" />
                    <span className="text-white/90">{locationHoverInfo.totalGuests} guests</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Enhanced Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl p-4 text-center border border-emerald-400/30">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      {formatCurrency(locationHoverInfo.averagePrice)}
                    </div>
                    <div className="text-xs text-white/70">Avg. per night</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 text-center border border-yellow-400/30">
                    <div className="text-2xl font-bold text-yellow-400 mb-1 flex items-center justify-center space-x-1">
                      <span>{locationHoverInfo.averageRating}</span>
                      <StarSolidIcon className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-white/70">Avg. rating</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-4 text-center border border-blue-400/30">
                    <div className="text-lg font-bold text-blue-400 mb-1">
                      {formatCurrency(locationHoverInfo.priceRange.min)}-{formatCurrency(locationHoverInfo.priceRange.max)}
                    </div>
                    <div className="text-xs text-white/70">Price range</div>
                  </div>
                </div>

                {/* Property Types */}
                {locationHoverInfo.propertyTypes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center space-x-2">
                      <HomeIcon className="w-4 h-4" />
                      <span>Property Types</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {locationHoverInfo.propertyTypes.map((type, i) => (
                        <span key={i} className="text-xs bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-blue-200 px-3 py-1.5 rounded-full border border-blue-400/30">
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Experiences */}
                {locationHoverInfo.experiences?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center space-x-2">
                      <SparklesIcon className="w-4 h-4" />
                      <span>Featured Experiences</span>
                    </h4>
                    <div className="space-y-3">
                      {locationHoverInfo.experiences.slice(0, 3).map((exp, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/10 rounded-xl p-3 border border-white/20">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white mb-1">{exp.title}</div>
                            <div className="text-xs text-white/70 flex items-center space-x-2">
                              <span className="bg-purple-500/30 px-2 py-0.5 rounded-full">{exp.category}</span>
                              <span className="flex items-center space-x-1">
                                <ClockIcon className="w-3 h-3" />
                                <span>{exp.duration || 'Flexible'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-emerald-400 ml-3">
                            {formatCurrency(exp.price)}
                          </div>
                        </div>
                      ))}
                      {locationHoverInfo.totalExperiences > 3 && (
                        <div className="text-xs text-center text-white/70 bg-white/5 rounded-lg py-2">
                          +{locationHoverInfo.totalExperiences - 3} more experiences available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Amenities */}
                {locationHoverInfo.topAmenities?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center space-x-2">
                      <StarSolidIcon className="w-4 h-4" />
                      <span>Popular Amenities</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {locationHoverInfo.topAmenities.map((amenity, i) => (
                        <span key={i} className="text-xs bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-200 px-3 py-1.5 rounded-full border border-emerald-400/30">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call to Action */}
                <div className="text-center pt-4 border-t border-white/20">
                  <div className="text-sm text-white/80 mb-2">
                    Discover {locationHoverInfo.totalListings} unique stays in this area
                  </div>
                  <div className="text-xs text-white/60">
                    Click any marker to explore detailed information
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Single Listing Tooltip */}
        <AnimatePresence>
          {hoverInfo?.object && !locationHoverInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute pointer-events-none z-30 bg-black/95 backdrop-blur-2xl text-white rounded-2xl border border-white/20 shadow-2xl max-w-sm"
              style={{
                left: Math.min((hoverInfo.x || 0) + 20, window.innerWidth - 350),
                top: Math.max((hoverInfo.y || 0) - 10, 120),
                transform: 'translateY(-100%)'
              }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white line-clamp-2 flex-1">
                    {hoverInfo.object.title}
                  </h3>
                  <motion.button
                    onClick={(e) => toggleFavorite(hoverInfo.object.id, e)}
                    className="ml-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {favorites.has(hoverInfo.object.id) ? (
                      <HeartSolidIcon className="w-5 h-5 text-red-400" />
                    ) : (
                      <HeartIcon className="w-5 h-5 text-white/70" />
                    )}
                  </motion.button>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-white/80 mb-4">
                  <MapPinIcon className="w-4 h-4 text-emerald-400" />
                  <span>{hoverInfo.object.location}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(hoverInfo.object.price)}
                    </span>
                    <span className="text-white/70 text-sm">/night</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1.5 rounded-full border border-yellow-400/30">
                    <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-yellow-400">{hoverInfo.object.rating}</span>
                  </div>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <UserGroupIcon className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    <div className="text-white/90">{hoverInfo.object.max_guests || 'N/A'} guests</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <HomeIcon className="w-4 h-4 mx-auto mb-1 text-green-400" />
                    <div className="text-white/90">{hoverInfo.object.property_type?.replace('_', ' ') || 'Property'}</div>
                  </div>
                </div>
                
                {/* Experiences Preview */}
                {hoverInfo.object.experiences?.length > 0 && (
                  <div className="border-t border-white/20 pt-4">
                    <div className="text-sm text-white/90 mb-2 flex items-center space-x-2">
                      <SparklesIcon className="w-4 h-4 text-purple-400" />
                      <span>Available Experiences</span>
                    </div>
                    <div className="space-y-2">
                      {hoverInfo.object.experiences.slice(0, 2).map((exp, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-emerald-300 truncate flex-1">• {exp.title}</span>
                          <span className="text-white/70 ml-2">{formatCurrency(exp.price)}</span>
                        </div>
                      ))}
                      {hoverInfo.object.experiences.length > 2 && (
                        <div className="text-xs text-white/60 text-center">
                          +{hoverInfo.object.experiences.length - 2} more experiences
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4 pt-4 border-t border-white/20">
                  <motion.button
                    onClick={() => setSelectedListing(hoverInfo.object)}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-medium py-2 rounded-lg transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    View Details
                  </motion.button>
                  <motion.button
                    onClick={(e) => handleShare(hoverInfo.object, e)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Share this property"
                  >
                    <ShareIcon className="w-4 h-4 text-white/70" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Professional Legend Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-xl rounded-2xl p-5 border border-gray-200/50 shadow-2xl max-w-xs"
        >
          <h4 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Squares2X2Icon className="w-5 h-5 text-emerald-600" />
            <span>Map Legend</span>
          </h4>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg border border-white shadow-sm"></div>
              <span className="text-gray-700">Exceptional (4.8+ ⭐)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-lg border border-white shadow-sm"></div>
              <span className="text-gray-700">Excellent (4.5+ ⭐)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg border border-white shadow-sm"></div>
              <span className="text-gray-700">Very Good (4.0+ ⭐)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg border border-white shadow-sm"></div>
              <span className="text-gray-700">Good (3.5+ ⭐)</span>
            </div>
            
            <div className="pt-3 mt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Marker size reflects price range</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Hover for location insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Click markers for full details</span>
                </div>
                {show3D && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>3D terrain shows elevation</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Statistics Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-xl rounded-2xl p-5 border border-gray-200/50 shadow-2xl"
        >
          <div className="text-center">
            <motion.div 
              className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
            >
              {processedListings.length}
            </motion.div>
            <div className="text-sm text-gray-600 mb-3">Destinations Found</div>
            
            {processedListings.length > 0 && (
              <div className="space-y-3">
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xl font-bold text-emerald-600 mb-1">
                    ₹{Math.round(processedListings.reduce((sum, l) => sum + l.price, 0) / processedListings.length / 1000)}k
                  </div>
                  <div className="text-xs text-gray-500">Average price per night</div>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xl font-bold text-yellow-600 mb-1 flex items-center justify-center space-x-1">
                    <span>{(processedListings.reduce((sum, l) => sum + l.rating, 0) / processedListings.length).toFixed(1)}</span>
                    <StarSolidIcon className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-gray-500">Average rating</div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="text-lg font-bold text-blue-600 mb-1">
                    {processedListings.reduce((sum, l) => sum + (l.experiences?.length || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500">Total experiences</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Selected Listing Detail Modal */}
        <AnimatePresence>
          {selectedListing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4"
              onClick={() => setSelectedListing(null)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="relative h-64 bg-gradient-to-r from-emerald-500 to-green-600">
                  {selectedListing.images?.[0] && (
                    <img 
                      src={selectedListing.images[0]} 
                      alt={selectedListing.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <motion.button
                      onClick={(e) => toggleFavorite(selectedListing.id, e)}
                      className="p-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {favorites.has(selectedListing.id) ? (
                        <HeartSolidIcon className="w-6 h-6 text-red-400" />
                      ) : (
                        <HeartIcon className="w-6 h-6 text-white" />
                      )}
                    </motion.button>
                    
                    <motion.button
                      onClick={(e) => handleShare(selectedListing, e)}
                      className="p-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ShareIcon className="w-6 h-6 text-white" />
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setSelectedListing(null)}
                      className="p-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <XMarkIcon className="w-6 h-6 text-white" />
                    </motion.button>
                  </div>

                  <div className="absolute bottom-4 left-6 text-white">
                    <h2 className="text-2xl font-bold mb-2">{selectedListing.title}</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="w-5 h-5" />
                        <span>{selectedListing.location}</span>
                      </div>
                      <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                        <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold">{selectedListing.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[calc(90vh-16rem)] overflow-y-auto">
                  {/* Price and Basic Info */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {formatCurrency(selectedListing.price)}
                        <span className="text-lg text-gray-600 font-normal">/night</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedListing.property_type?.replace('_', ' ')} • Up to {selectedListing.max_guests || 'N/A'} guests
                      </div>
                    </div>
                    
                    <Link href={`/listings/${selectedListing.id}`}>
                      <motion.button
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        View Full Details
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-2 inline" />
                      </motion.button>
                    </Link>
                  </div>

                  {/* Description */}
                  {selectedListing.description && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">About this place</h4>
                      <p className="text-gray-700 leading-relaxed">
                        {selectedListing.description}
                      </p>
                    </div>
                  )}

                  {/* Experiences */}
                  {selectedListing.experiences?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <SparklesIcon className="w-5 h-5 text-purple-600" />
                        <span>Available Experiences</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedListing.experiences.slice(0, 4).map((exp, i) => (
                          <div key={i} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{exp.title}</h5>
                              <span className="text-lg font-bold text-purple-600">
                                {formatCurrency(exp.price)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{exp.description}</div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                                {exp.category}
                              </span>
                              {exp.duration && (
                                <span className="text-gray-500 flex items-center space-x-1">
                                  <ClockIcon className="w-3 h-3" />
                                  <span>{exp.duration}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedListing.experiences.length > 4 && (
                        <div className="text-center mt-4">
                          <Link href={`/listings/${selectedListing.id}`}>
                            <span className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer">
                              View all {selectedListing.experiences.length} experiences →
                            </span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amenities */}
                  {selectedListing.amenities?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">What this place offers</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedListing.amenities.slice(0, 12).map((amenity, i) => (
                         <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm border">
                           {amenity}
                         </span>
                       ))}
                     </div>
                     {selectedListing.amenities.length > 12 && (
                       <div className="mt-3">
                         <Link href={`/listings/${selectedListing.id}`}>
                           <span className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer text-sm">
                             +{selectedListing.amenities.length - 12} more amenities
                           </span>
                         </Link>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Professional Loading State */}
       {(!mapLoaded || !deckInitialized) && !mapError && (
         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
           <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl border border-white/20"
           >
             <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full mx-auto mb-6"
             />
             <h3 className="text-2xl font-bold text-gray-900 mb-3">
               {!mapLoaded ? 'Initializing Map...' : 'Preparing 3D Visualization...'}
             </h3>
             <p className="text-gray-600 mb-4">
               {!mapLoaded 
                 ? 'Loading geographical data and satellite imagery' 
                 : 'Setting up interactive 3D elements and markers'
               }
             </p>
             <div className="bg-gray-200 rounded-full h-2 mb-4">
               <motion.div 
                 className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
                 initial={{ width: "0%" }}
                 animate={{ width: mapLoaded ? "80%" : "40%" }}
                 transition={{ duration: 1.5 }}
               />
             </div>
             <div className="text-sm text-gray-500">
               Discovering {processedListings.length} unique village experiences...
             </div>
           </motion.div>
         </div>
       )}

       {/* Professional Empty State */}
       {mapLoaded && processedListings.length === 0 && (
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="absolute inset-0 flex items-center justify-center z-30"
         >
           <div className="text-center text-white max-w-md mx-4">
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.2, type: "spring" }}
               className="text-8xl mb-6"
             >
               🗺️
             </motion.div>
             <h3 className="text-3xl font-bold mb-4">No Destinations Found</h3>
             <p className="text-white/80 mb-6 leading-relaxed">
               We couldn't find any village experiences matching your current search criteria. 
               Try adjusting your filters or explore different areas to discover amazing rural getaways.
             </p>
             <motion.button
               onClick={onClose}
               className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
             >
               Adjust Search Filters
             </motion.button>
           </div>
         </motion.div>
       )}

       {/* Professional Keyboard Shortcuts Hint */}
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 2 }}
         className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs border border-white/20"
       >
         <span className="hidden md:inline">
           Press <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">ESC</kbd> to close • 
           <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs mx-1">Space</kbd> to toggle 3D • 
           <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">F</kbd> to fit bounds
         </span>
         <span className="md:hidden">Tap outside to close map</span>
       </motion.div>

       {/* Keyboard Shortcuts Handler */}
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="absolute inset-0 pointer-events-none"
         onKeyDown={(e) => {
           if (e.key === 'Escape') onClose();
           if (e.key === ' ') {
             e.preventDefault();
             setShow3D(!show3D);
             setViewState(prev => ({ 
               ...prev, 
               pitch: !show3D ? 50 : 0,
               transitionDuration: 1500
             }));
           }
           if (e.key === 'f' || e.key === 'F') {
             e.preventDefault();
             fitBounds();
           }
         }}
         tabIndex={0}
       />
     </motion.div>
   </AnimatePresence>
 );
};

export default MapView;