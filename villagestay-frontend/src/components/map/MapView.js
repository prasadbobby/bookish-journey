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
  SparklesIcon
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

  // Map styles
  const mapStyles = [
    { 
      id: 'satellite', 
      name: '3D Satellite', 
      style: 'mapbox://styles/mapbox/satellite-streets-v12', 
      icon: '🛰️',
      description: 'Satellite imagery with roads'
    },
    { 
      id: 'terrain', 
      name: '3D Terrain', 
      style: 'mapbox://styles/mapbox/outdoors-v12', 
      icon: '🏔️',
      description: 'Topographic with terrain'
    },
    { 
      id: 'streets', 
      name: 'Streets', 
      style: 'mapbox://styles/mapbox/streets-v12', 
      icon: '🗺️',
      description: 'Detailed street view'
    },
    { 
      id: 'dark', 
      name: 'Dark Theme', 
      style: 'mapbox://styles/mapbox/dark-v11', 
      icon: '🌙',
      description: 'Dark mode styling'
    }
  ];

  // Process listings data
  const processedListings = useMemo(() => {
    try {
      if (!listings || !Array.isArray(listings)) {
        console.log('No listings provided');
        return [];
      }
      
      console.log('Processing listings:', listings.length);
      
      const processed = listings
        .filter(listing => {
          try {
            if (!listing?.coordinates) {
              console.log('No coordinates for listing:', listing.id);
              return false;
            }
            const { lat, lng } = listing.coordinates;
            const isValid = lat && lng && 
                   !isNaN(lat) && !isNaN(lng) &&
                   lat !== 0 && lng !== 0 && 
                   lat >= -90 && lat <= 90 && 
                   lng >= -180 && lng <= 180;
            
            if (!isValid) {
              console.log('Invalid coordinates for listing:', listing.id, { lat, lng });
            }
            return isValid;
          } catch (e) {
            console.warn('Invalid listing coordinates:', listing);
            return false;
          }
        })
        .map((listing, index) => {
          try {
            return {
              ...listing,
              position: [
                parseFloat(listing.coordinates.lng), 
                parseFloat(listing.coordinates.lat)
              ],
              price: parseFloat(listing.price_per_night) || 0,
              rating: parseFloat(listing.rating) || 4.5,
              index
            };
          } catch (e) {
            console.warn('Error processing listing:', listing, e);
            return null;
          }
        })
        .filter(Boolean);

      console.log('Successfully processed listings:', processed.length);
      console.log('Sample processed listing:', processed[0]);
      return processed;
    } catch (e) {
      console.error('Error processing listings:', e);
      return [];
    }
  }, [listings]);

  // Function to get nearby listings for location hover
  const getLocationInfo = useCallback((position, radius = 0.01) => {
    const [lng, lat] = position;
    
    // Find all listings within radius
    const nearbyListings = processedListings.filter(listing => {
      const [listingLng, listingLat] = listing.position;
      const distance = Math.sqrt(
        Math.pow(lng - listingLng, 2) + Math.pow(lat - listingLat, 2)
      );
      return distance <= radius;
    });

    if (nearbyListings.length === 0) return null;

    // Get location name
    const locationNames = nearbyListings.map(l => l.location);
    const locationName = locationNames.reduce((a, b, _, arr) =>
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );

    // Collect all experiences
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

    // Calculate stats
    const averagePrice = nearbyListings.reduce((sum, l) => sum + l.price, 0) / nearbyListings.length;
    const averageRating = nearbyListings.reduce((sum, l) => sum + l.rating, 0) / nearbyListings.length;
    
    // Get property types
    const propertyTypes = [...new Set(nearbyListings.map(l => l.property_type))];

    // Get top amenities
    const allAmenities = nearbyListings.flatMap(l => l.amenities || []);
    const amenityCounts = {};
    allAmenities.forEach(amenity => {
      amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
    });
    const topAmenities = Object.entries(amenityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([amenity]) => amenity);

    return {
      locationName,
      totalListings: nearbyListings.length,
      totalExperiences: allExperiences.length,
      experiences: allExperiences.slice(0, 3),
      averagePrice: Math.round(averagePrice),
      averageRating: Math.round(averageRating * 10) / 10,
      propertyTypes,
      topAmenities,
      listings: nearbyListings.slice(0, 3)
    };
  }, [processedListings]);

  // Simplified 3D layers - Remove TextLayer to avoid WebGL issues
  const deckLayers = useMemo(() => {
    try {
      if (!show3D || !processedListings.length || !mapLoaded || !deckInitialized) {
        console.log('Deck layers not ready:', { show3D, listingsLength: processedListings.length, mapLoaded, deckInitialized });
        return [];
      }

      console.log('Creating deck layers for', processedListings.length, 'listings');

      // Only create ScatterplotLayer to avoid TextLayer WebGL issues
      const scatterLayer = new ScatterplotLayer({
        id: 'property-markers-3d',
        data: processedListings,
        getPosition: d => {
          try {
            return d.position;
          } catch (e) {
            console.warn('Invalid position for listing:', d);
            return [0, 0];
          }
        },
        getRadius: d => {
          try {
            const baseRadius = 300;
            const price = Math.max(d.price || 1000, 1000);
            const priceMultiplier = Math.log(price) / Math.log(10000);
            return baseRadius + (priceMultiplier * 500);
          } catch (e) {
            return 300;
          }
        },
        getFillColor: d => {
          try {
            const rating = d.rating || 4.5;
            if (rating >= 4.8) return [16, 185, 129, 220];
            if (rating >= 4.5) return [34, 197, 94, 220];
            if (rating >= 4.0) return [59, 130, 246, 220];
            if (rating >= 3.5) return [251, 191, 36, 220];
            return [239, 68, 68, 220];
          } catch (e) {
            return [34, 197, 94, 220];
          }
        },
        getLineColor: [255, 255, 255, 255],
        radiusScale: 1,
        radiusMinPixels: 6,
        radiusMaxPixels: 25,
        pickable: true,
        stroked: true,
        filled: true,
        getLineWidth: 2,
        onHover: (info, event) => {
          try {
            if (info.object) {
              setHoverInfo(info);
              
              // Get location-based information when hovering
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
          } catch (e) {
            console.warn('Hover error:', e);
          }
        },
        onClick: (info, event) => {
          try {
            if (info.object) {
              console.log('Clicked on listing:', info.object.title);
              setSelectedListing(info.object);
              setViewState(prev => ({
                ...prev,
                longitude: info.object.position[0],
                latitude: info.object.position[1],
                zoom: Math.max(prev.zoom, 14),
                pitch: 60,
                transitionDuration: 1000
              }));
            }
          } catch (e) {
            console.warn('Click error:', e);
          }
        },
        updateTriggers: {
          getFillColor: [processedListings.map(d => d.rating)],
          getRadius: [processedListings.map(d => d.price)]
        }
      });

      console.log('Deck layer created successfully');
      return [scatterLayer];
    } catch (e) {
      console.error('Error creating deck layers:', e);
      return [];
    }
  }, [processedListings, show3D, mapLoaded, deckInitialized, getLocationInfo]);

  // Auto-fit bounds
  const fitBounds = useCallback(() => {
    try {
      if (processedListings.length === 0) {
        console.log('No listings to fit bounds');
        return;
      }

      const lngs = processedListings.map(d => d.position[0]).filter(lng => !isNaN(lng));
      const lats = processedListings.map(d => d.position[1]).filter(lat => !isNaN(lat));
      
      if (lngs.length === 0 || lats.length === 0) {
        console.log('No valid coordinates for bounds');
        return;
      }

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
      
      let zoom;
      if (maxDiff > 10) zoom = 5;
      else if (maxDiff > 5) zoom = 6;
      else if (maxDiff > 2) zoom = 7;
      else if (maxDiff > 1) zoom = 8;
      else if (maxDiff > 0.5) zoom = 9;
      else zoom = 10;

      setViewState(prev => ({
        ...prev,
        longitude: centerLng,
        latitude: centerLat,
        zoom,
        pitch: show3D ? 45 : 0,
        bearing: 0,
        transitionDuration: 2000
      }));

      console.log(`Fitted bounds: center [${centerLng}, ${centerLat}], zoom: ${zoom}`);
    } catch (e) {
      console.error('Error fitting bounds:', e);
    }
  }, [processedListings, show3D]);

  // Initialize map view
  useEffect(() => {
    if (isOpen && processedListings.length > 0) {
      const timer = setTimeout(() => {
        try {
          fitBounds();
        } catch (e) {
          console.error('Error in fitBounds timeout:', e);
        }
      }, 1500); // Increased delay for better initialization
      return () => clearTimeout(timer);
    }
  }, [isOpen, fitBounds]);

  // Map load handler
  const handleMapLoad = useCallback(() => {
    try {
      console.log('Map loaded successfully');
      setMapLoaded(true);
      setMapError(null);
      
      // Initialize deck after a short delay
      setTimeout(() => {
        setDeckInitialized(true);
        console.log('Deck initialized');
      }, 500);
    } catch (e) {
      console.error('Map load error:', e);
      setMapError('Failed to load map');
    }
  }, []);

  // Reset deck when reopening
  useEffect(() => {
    if (isOpen) {
      console.log('Map opened, resetting states');
      setMapLoaded(false);
      setDeckInitialized(false);
      setMapError(null);
    } else {
      // Clear states when closing
      setHoverInfo(null);
      setLocationHoverInfo(null);
      setSelectedListing(null);
    }
  }, [isOpen]);

  // Map error handler
  const handleMapError = useCallback((error) => {
    // Ignore AbortError and WebGL context errors
    if (error.name === 'AbortError' || 
        error.message?.includes('aborted') ||
        error.message?.includes('WebGL') ||
        error.message?.includes('GL_INVALID_OPERATION')) {
      return;
    }
    
    console.error('Map error:', error);
    setMapError('Map failed to load. Please try again.');
    toast.error('Map failed to load. Please check your internet connection.');
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((listingId, e) => {
    try {
      e.stopPropagation();
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(listingId)) {
          newFavorites.delete(listingId);
          toast.success('💔 Removed from favorites');
        } else {
          newFavorites.add(listingId);
          toast.success('❤️ Added to favorites');
        }
        return newFavorites;
      });
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  }, []);

  // Handle share
  const handleShare = useCallback((listing, e) => {
    try {
      e.stopPropagation();
      const url = `${window.location.origin}/listings/${listing.id}`;
      if (navigator.share) {
        navigator.share({
          title: listing.title,
          text: listing.description,
          url: url,
        }).catch(err => console.log('Share error:', err));
      } else {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    } catch (e) {
      console.error('Error sharing:', e);
      toast.error('Failed to share listing');
    }
  }, []);

  // Handle view state change
  const handleViewStateChange = useCallback((evt) => {
    try {
      setViewState(evt.viewState);
    } catch (e) {
      console.error('Error updating view state:', e);
    }
  }, []);

  if (!isOpen) return null;

  // Check if we have a valid Mapbox token
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your_token_here')) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md mx-4"
        >
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Missing Mapbox Token</h3>
          <p className="text-gray-600 mb-6">Please add a valid NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file</p>
          <motion.button
            onClick={onClose}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Show error state if map fails to load
  if (mapError) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md mx-4"
        >
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Map Error</h3>
          <p className="text-gray-600 mb-6">{mapError}</p>
          <div className="flex space-x-4">
            <motion.button
              onClick={() => {
                setMapError(null);
                setMapLoaded(false);
                setDeckInitialized(false);
              }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Retry
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-all duration-300"
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
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg"
              >
                <CubeIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </motion.div>
              
              <div>
                <motion.h2 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-xl md:text-3xl font-bold text-white mb-1"
                >
                  3D Village Explorer
                </motion.h2>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center space-x-4 text-white/80 text-sm md:text-base"
                >
                  <span>{processedListings.length} villages discovered</span>
                  {searchMetadata && (
                    <span className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-200 text-xs md:text-sm">
                      {searchMetadata.type === 'semantic' && '🧠 AI Search'}
                      {searchMetadata.type === 'emotion' && '💝 Emotion Search'}
                      {searchMetadata.type === 'image' && '📸 Visual Search'}
                      {searchMetadata.type === 'smart' && '🤖 Smart Search'}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Map Style Selector */}
              <div className="hidden md:flex items-center space-x-1 bg-white/10 backdrop-blur-lg rounded-xl p-1 border border-white/20">
                {mapStyles.map(style => (
                  <motion.button
                    key={style.id}
                    onClick={() => setMapStyle(style.style)}
                    className={`p-2 md:p-3 rounded-lg transition-all duration-300 ${
                      mapStyle === style.style 
                        ? 'bg-white/30 text-white shadow-lg' 
                        : 'text-white/60 hover:text-white hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={style.description}
                  >
                    <span className="text-lg md:text-xl">{style.icon}</span>
                  </motion.button>
                ))}
              </div>

              {/* 3D Toggle */}
              <motion.button
                onClick={() => {
                  setShow3D(!show3D);
                  setViewState(prev => ({ 
                    ...prev, 
                    pitch: !show3D ? 45 : 0,
                    transitionDuration: 1000
                  }));
                }}
                className={`p-2 md:p-3 rounded-xl border transition-all duration-300 ${
                  show3D 
                    ? 'bg-green-500/30 border-green-400/50 text-green-300 shadow-lg shadow-green-500/20' 
                    : 'bg-white/10 border-white/20 text-white/60 hover:text-white hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={show3D ? 'Switch to 2D View' : 'Switch to 3D View'}
              >
                <CubeIcon className="w-5 h-5 md:w-6 md:h-6" />
              </motion.button>

              {/* Fit Bounds Button */}
              <motion.button
                onClick={fitBounds}
                className="p-2 md:p-3 bg-white/10 backdrop-blur-lg rounded-xl text-white hover:bg-white/20 transition-all duration-300 border border-white/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Fit All Villages"
              >
                <GlobeAltIcon className="w-5 h-5 md:w-6 md:h-6" />
              </motion.button>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="p-2 md:p-3 bg-red-500/20 backdrop-blur-lg rounded-xl text-white hover:bg-red-500/40 transition-all duration-300 border border-red-400/30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Close Map"
              >
                <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="w-full h-full relative">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={handleViewStateChange}
            onLoad={handleMapLoad}
            onError={handleMapError}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={mapStyle}
            terrain={show3D ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
            projection="globe"
            fog={show3D ? { 
              range: [0.5, 10], 
              color: '#ffffff', 
              'horizon-blend': 0.1,
              'high-color': '#245cdf',
              'space-color': '#000000'
            } : undefined}
            style={{ width: '100%', height: '100%' }}
            reuseMaps={true}
            preserveDrawingBuffer={true}
          >
            {/* DeckGL 3D Layer - Only when properly initialized */}
            {mapLoaded && deckInitialized && show3D && (
              <DeckGL
                ref={deckRef}
                viewState={viewState}
                layers={deckLayers}
                controller={false}
                onWebGLInitialized={(gl) => {
                  console.log('WebGL initialized:', gl);
                }}
                onError={(error) => {
                  console.warn('Deck error (suppressed):', error);
                }}
              />
            )}

            {/* 2D Markers - Always show when not in 3D */}
            {mapLoaded && processedListings.map((listing) => (
              <Marker
                key={`marker-${listing.id}-${listing.index}`}
                longitude={listing.position[0]}
                latitude={listing.position[1]}
                anchor="bottom"
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="relative cursor-pointer"
                  onClick={() => {
                    console.log('Clicked on 2D marker:', listing.title);
                    setSelectedListing(listing);
                  }}
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
                  <div className={`w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs transition-all duration-300 ${
                    listing.rating >= 4.8 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                    listing.rating >= 4.5 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                    listing.rating >= 4.0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                    listing.rating >= 3.5 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    'bg-gradient-to-br from-red-400 to-red-600'
                  }`}>
                    ₹{Math.round(listing.price / 1000)}k
                  </div>
                  
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold border border-white">
                    {listing.rating}
                  </div>

                  {/* Show 3D effect when in 3D mode */}
                  {show3D && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-black/20 rounded-full blur-sm"></div>
                  )}
                </motion.div>
              </Marker>
            ))}

            {/* Navigation Controls */}
            {mapLoaded && (
              <>
                <NavigationControl position="bottom-right" style={{ marginBottom: 100 }} />
                <FullscreenControl position="bottom-right" style={{ marginBottom: 140 }} />
              </>
            )}
          </Map>
        </div>

        {/* Enhanced Location-Based Hover Tooltip */}
        <AnimatePresence>
          {locationHoverInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute pointer-events-none z-30 bg-black/95 backdrop-blur-lg text-white rounded-3xl border border-white/20 shadow-2xl max-w-sm"
              style={{
                left: Math.min((locationHoverInfo.x || 0) + 15, window.innerWidth - 400),
                top: Math.max((locationHoverInfo.y || 0) - 10, 120),
                transform: 'translateY(-100%)'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4 rounded-t-3xl">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPinIcon className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-bold text-white">{locationHoverInfo.locationName}</h3>
                </div>
                <div className="flex items-center space-x-4 text-sm text-white/90">
                  <span className="flex items-center space-x-1">
                    <HomeIcon className="w-4 h-4" />
                    <span>{locationHoverInfo.totalListings} properties</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <SparklesIcon className="w-4 h-4" />
                    <span>{locationHoverInfo.totalExperiences} experiences</span>
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(locationHoverInfo.averagePrice)}
                    </div>
                    <div className="text-xs text-white/70">avg. price/night</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-lg font-bold text-yellow-400">
                      {locationHoverInfo.averageRating}⭐
                    </div>
                    <div className="text-xs text-white/70">avg. rating</div>
                  </div>
                </div>

                {/* Property Types */}
                {locationHoverInfo.propertyTypes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-2">🏠 Property Types</h4>
                    <div className="flex flex-wrap gap-1">
                      {locationHoverInfo.propertyTypes.map((type, i) => (
                        <span key={i} className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full">
                          {type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Experiences */}
                {locationHoverInfo.experiences?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-2">✨ Local Experiences</h4>
                    <div className="space-y-2">
                      {locationHoverInfo.experiences.slice(0, 2).map((exp, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
                          <div>
                            <div className="text-sm font-medium text-white">{exp.title}</div>
                            <div className="text-xs text-white/70">{exp.category}</div>
                          </div>
                          <div className="text-sm font-bold text-green-400">
                            {formatCurrency(exp.price)}
                          </div>
                        </div>
                      ))}
                      {locationHoverInfo.totalExperiences > 2 && (
                        <div className="text-xs text-center text-white/70">
                          +{locationHoverInfo.totalExperiences - 2} more experiences
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Amenities */}
                {locationHoverInfo.topAmenities?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-2">🌟 Popular Amenities</h4>
                    <div className="flex flex-wrap gap-1">
                      {locationHoverInfo.topAmenities.map((amenity, i) => (
                        <span key={i} className="text-xs bg-green-500/30 text-green-200 px-2 py-1 rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Click to explore hint */}
                <div className="text-center pt-2 border-t border-white/20">
                  <div className="text-xs text-white/70">
                    Click any marker to explore details
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Regular Single Listing Hover Tooltip */}
        <AnimatePresence>
          {hoverInfo?.object && !locationHoverInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute pointer-events-none z-30 bg-black/95 backdrop-blur-lg text-white p-4 rounded-2xl border border-white/20 shadow-2xl max-w-xs"
              style={{
                left: Math.min((hoverInfo.x || 0) + 15, window.innerWidth - 300),
                top: Math.max((hoverInfo.y || 0) - 10, 100),
                transform: 'translateY(-100%)'
              }}
            >
              <div className="text-lg font-bold mb-2 line-clamp-2">{hoverInfo.object.title}</div>
              <div className="text-sm text-white/80 mb-3 flex items-center space-x-1">
                <MapPinIcon className="w-4 h-4 text-green-400" />
                <span>{hoverInfo.object.location}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <span className="text-green-400 font-bold">
                    {formatCurrency(hoverInfo.object.price)}/night
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold">{hoverInfo.object.rating}</span>
                </span>
              </div>
              
              {/* Show experiences if available */}
              {hoverInfo.object.experiences?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="text-xs text-white/70 mb-2">Experiences available:</div>
                  <div className="space-y-1">
                    {hoverInfo.object.experiences.slice(0, 2).map((exp, i) => (
                      <div key={i} className="text-xs text-green-300">
                        • {exp.title} ({formatCurrency(exp.price)})
                      </div>
                    ))}
                    {hoverInfo.object.experiences.length > 2 && (
                      <div className="text-xs text-white/70">
                        +{hoverInfo.object.experiences.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 left-4 md:left-6 bg-white/95 backdrop-blur-lg rounded-2xl p-4 border border-gray-200 shadow-xl max-w-xs"
        >
          <h4 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
            <Squares2X2Icon className="w-5 h-5 text-green-500" />
            <span>Map Legend</span>
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-emerald-500 rounded-full border border-white"></div>
              <span>Excellent (4.8+ ⭐)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full border border-white"></div>
              <span>Very Good (4.5+ ⭐)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full border border-white"></div>
              <span>Good (4.0+ ⭐)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full border border-white"></div>
              <span>Average (3.5+ ⭐)</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <div>• Each marker = One property</div>
                <div>• Always visible in both 2D/3D</div>
                <div>• Hover for location details</div>
                <div>• Click markers for property info</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="absolute bottom-6 right-4 md:right-6 bg-white/95 backdrop-blur-lg rounded-2xl p-4 border border-gray-200 shadow-xl"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">{processedListings.length}</div>
            <div className="text-sm text-gray-600">Villages Found</div>
            
            {processedListings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-lg font-bold text-green-600">
                  ₹{Math.round(processedListings.reduce((sum, l) => sum + l.price, 0) / processedListings.length / 1000)}k
                </div>
                <div className="text-xs text-gray-500">avg. price</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Loading State */}
        {(!mapLoaded || !deckInitialized) && !mapError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 text-center shadow-2xl"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Loading 3D Map</h3>
              <p className="text-gray-600">
                {!mapLoaded ? 'Initializing map...' : 'Preparing 3D visualization...'}
              </p>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MapView;