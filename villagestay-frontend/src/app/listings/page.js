"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  StarIcon,
  FunnelIcon,
  XMarkIcon,
  SparklesIcon,
  CloudIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
  HeartIcon,
  ShareIcon,
  EyeIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FireIcon,
  SunIcon,
  PhotoIcon,
  GlobeAltIcon,
  BeakerIcon,
  WifiIcon,
  HomeIcon,
  TreePineIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ClockIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  EyeDropperIcon,
  FaceSmileIcon,
  BoltIcon,
  UsersIcon,
  TrophyIcon,
  ShieldCheckIcon,
  PlayCircleIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  CommandLineIcon,
  CubeTransparentIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon,
} from "@heroicons/react/24/solid";
import Providers from "@/components/providers/Providers";
import AppLayout from "@/components/layout/AppLayout";
import { listingsAPI, aiAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="text-white text-lg">🗺️ Loading 3D Map...</div>
    </div>
  ),
});

// Enhanced Advanced Search Component
const AdvancedSearch = ({ onResults, loading, setLoading }) => {
  const [searchType, setSearchType] = useState("semantic");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploadMode, setImageUploadMode] = useState("upload");

  const emotions = [
    {
      value: "stress-relief",
      label: "Stress Relief",
      icon: "🧘‍♀️",
      description: "Find peaceful, calm places",
    },
    {
      value: "adventure",
      label: "Adventure",
      icon: "🏔️",
      description: "Exciting outdoor experiences",
    },
    {
      value: "cultural-immersion",
      label: "Cultural",
      icon: "🎭",
      description: "Traditional experiences",
    },
    {
      value: "relaxation",
      label: "Relaxation",
      icon: "😌",
      description: "Comfortable, cozy stays",
    },
    {
      value: "family-bonding",
      label: "Family Time",
      icon: "👨‍👩‍👧‍👦",
      description: "Family-friendly places",
    },
    {
      value: "romantic",
      label: "Romantic",
      icon: "💕",
      description: "Intimate, romantic settings",
    },
  ];

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setUploadedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUploadSearch = useCallback(async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setLoading(true);
    try {
      console.log("🖼️ Performing image upload search");

      const response = await listingsAPI.imageUploadSearch({
        image_data: uploadedImage,
        filters: {},
      });

      console.log("✅ Image upload search results:", response);

      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: "visual_upload",
          message: response.message,
          visual_analysis: response.visual_analysis,
        });
        toast.success(`📸 ${response.message}`);
      } else {
        toast.info("No listings found matching your uploaded image");
        onResults([], { type: "visual_upload" });
      }
    } catch (error) {
      console.error("Image upload search error:", error);
      toast.error("Visual search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [uploadedImage, onResults, setLoading]);

  const clearImage = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    setImageDescription("");
  }, []);

  const handleSemanticSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Performing semantic search:", searchQuery);

      const response = await listingsAPI.semanticSearch({
        query: searchQuery,
        filters: {},
      });

      console.log("✅ Semantic search results:", response);

      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: "semantic",
          query: searchQuery,
          message: response.message,
        });
        toast.success(`🎯 ${response.message}`);
      } else {
        toast.info("No matching listings found for your search");
        onResults([], { type: "semantic", query: searchQuery });
      }
    } catch (error) {
      console.error("Semantic search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, onResults, setLoading]);

  const handleEmotionSearch = useCallback(async () => {
    if (!selectedEmotion) {
      toast.error("Please select an emotion");
      return;
    }

    setLoading(true);
    try {
      console.log("😊 Performing emotion search:", selectedEmotion);

      const response = await listingsAPI.emotionSearch({
        emotion: selectedEmotion,
        filters: {},
      });

      console.log("✅ Emotion search results:", response);

      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: "emotion",
          emotion: selectedEmotion,
          message: response.message,
        });
        toast.success(`💝 ${response.message}`);
      } else {
        toast.info("No listings found matching this emotion");
        onResults([], { type: "emotion", emotion: selectedEmotion });
      }
    } catch (error) {
      console.error("Emotion search error:", error);
      toast.error("Emotion search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedEmotion, onResults, setLoading]);

  const handleImageSearch = useCallback(async () => {
    if (!imageDescription.trim()) {
      toast.error("Please describe the image or place you have in mind");
      return;
    }

    setLoading(true);
    try {
      console.log("🖼️ Performing image search:", imageDescription);

      const response = await listingsAPI.imageSearch({
        image_description: imageDescription,
        filters: {},
      });

      console.log("✅ Image search results:", response);

      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: "image",
          description: imageDescription,
          message: response.message,
        });
        toast.success(`📸 ${response.message}`);
      } else {
        toast.info("No listings found matching your visual description");
        onResults([], { type: "image", description: imageDescription });
      }
    } catch (error) {
      console.error("Image search error:", error);
      toast.error("Visual search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [imageDescription, onResults, setLoading]);

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter your search");
      return;
    }

    setLoading(true);
    try {
      console.log("🤖 Performing smart search:", searchQuery);

      const response = await listingsAPI.smartSearch({
        query: searchQuery,
        search_type: "auto",
        filters: {},
      });

      console.log("✅ Smart search results:", response);

      if (response.results && response.results.length > 0) {
        onResults(response.results, {
          type: "smart",
          detectedType: response.search_type,
          query: searchQuery,
          message: response.message,
        });
        toast.success(`🚀 ${response.message}`);
      } else {
        toast.info("No matching results found");
        onResults([], { type: "smart", query: searchQuery });
      }
    } catch (error) {
      console.error("Smart search error:", error);
      toast.error("Smart search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, onResults, setLoading]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Type Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800 rounded-2xl p-2 shadow-lg border border-gray-600 inline-flex">
          {[
            {
              value: "semantic",
              label: "Semantic",
              icon: SparklesIcon,
              color: "blue",
            },
            {
              value: "emotion",
              label: "Emotion",
              icon: HeartIcon,
              color: "pink",
            },
            {
              value: "image",
              label: "Visual",
              icon: PhotoIcon,
              color: "purple",
            },
            {
              value: "smart",
              label: "AI Smart",
              icon: FaceSmileIcon,
              color: "green",
            },
          ].map((type) => (
            <motion.button
              key={type.value}
              onClick={() => setSearchType(type.value)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                searchType === type.value
                  ? "bg-white text-gray-900 shadow-lg"
                  : "text-white hover:bg-gray-700"
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
        {searchType === "semantic" && (
          <motion.div
            key="semantic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Semantic Search
              </h3>
              <p className="text-gray-600">
                Search naturally - tell us what you're looking for
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="E.g., 'Find peaceful places near water for meditation' or 'Rustic farmhouse with organic food'"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none text-gray-900 placeholder-gray-500"
                rows={3}
              />

              <motion.button
                onClick={handleSemanticSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Searching..." : "Search with AI Understanding 🔍"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {searchType === "emotion" && (
          <motion.div
            key="emotion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <HeartIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Emotion-Based Search
              </h3>
              <p className="text-gray-600">
                Find places that match your mood and feelings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {emotions.map((emotion) => (
                <motion.button
                  key={emotion.value}
                  onClick={() => setSelectedEmotion(emotion.value)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                    selectedEmotion === emotion.value
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-3xl mb-2">{emotion.icon}</div>
                  <div className="font-bold text-gray-900 mb-1">
                    {emotion.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {emotion.description}
                  </div>
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
              {loading
                ? "Finding perfect matches..."
                : "Find Places for This Mood 💝"}
            </motion.button>
          </motion.div>
        )}

        {searchType === "image" && (
          <motion.div
            key="image"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <PhotoIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Visual Search
              </h3>
              <p className="text-gray-600">
                Upload an image or describe what you're looking for
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-xl p-1 inline-flex">
                <motion.button
                  onClick={() => setImageUploadMode("upload")}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                    imageUploadMode === "upload"
                      ? "bg-white text-gray-900 shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  📤 Upload Image
                </motion.button>
                <motion.button
                  onClick={() => setImageUploadMode("describe")}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                    imageUploadMode === "describe"
                      ? "bg-white text-gray-900 shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ✍️ Describe Image
                </motion.button>
              </div>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {imageUploadMode === "upload" ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {/* Image Upload Area */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />

                      {!imagePreview ? (
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300"
                        >
                          <PhotoIcon className="w-16 h-16 text-gray-400 mb-4" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">
                            Click to upload an image
                          </p>
                          <p className="text-sm text-gray-500">
                            PNG, JPG, JPEG up to 5MB
                          </p>
                        </label>
                      ) : (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Upload preview"
                            className="w-full h-64 object-cover rounded-2xl"
                          />
                          <motion.button
                            onClick={clearImage}
                            className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </motion.button>

                          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                            Ready to search! 📸
                          </div>
                        </div>
                      )}
                    </div>

                    <motion.button
                      onClick={handleImageUploadSearch}
                      disabled={loading || !uploadedImage}
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center space-x-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>Analyzing image...</span>
                        </span>
                      ) : (
                        "Find Similar Places 📸"
                      )}
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="describe"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <textarea
                      value={imageDescription}
                      onChange={(e) => setImageDescription(e.target.value)}
                      placeholder="E.g., 'A traditional wooden house surrounded by green fields with mountains in the background' or 'Cozy cottage with a garden and stone walls'"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-none text-gray-900 placeholder-gray-500"
                      rows={4}
                    />

                    <motion.button
                      onClick={handleImageSearch}
                      disabled={loading || !imageDescription.trim()}
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading
                        ? "Analyzing description..."
                        : "Find Similar Places ✍️"}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {searchType === "smart" && (
          <motion.div
            key="smart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaceSmileIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                AI Smart Search
              </h3>
              <p className="text-gray-600">
                Let AI automatically choose the best search method
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Just tell us what you want - AI will figure out the rest!"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 text-lg text-gray-900 placeholder-gray-500"
              />

              <motion.button
                onClick={handleSmartSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading
                  ? "AI is thinking..."
                  : "Let AI Find Perfect Matches 🤖"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Enhanced Property Card Component for AI search results
const EnhancedPropertyCard = ({ listing, index, searchType }) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(
    listing.images?.[0] || "/images/placeholder-village.jpg"
  );

  const handleImageError = useCallback(() => {
    if (!imageError) {
      setImageError(true);
      setImageSrc("");
    }
  }, [imageError]);

  const getSearchBadge = (searchType, listing) => {
    const badges = {
      semantic: "🧠 AI Match",
      emotion: `💝 ${listing.emotion_match || "Perfect Mood"}`,
      image: "📸 Visual Match",
      visual_upload: "🖼️ Image Match",
      smart: "🤖 AI Selected",
    };
    return badges[searchType] || "✨ Special";
  };

  const getListingTypeIcon = () => {
    return listing.listing_category === 'experience' ? (
      <AcademicCapIcon className="w-4 h-4 text-purple-500" />
    ) : (
      <HomeIcon className="w-4 h-4 text-blue-500" />
    );
  };

  const getListingTypeBadge = () => {
    return listing.listing_category === 'experience' ? (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
        <AcademicCapIcon className="w-3 h-3" />
        <span>Experience</span>
      </span>
    ) : (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        <HomeIcon className="w-3 h-3" />
        <span>Homestay</span>
      </span>
    );
  };

  const getListingPrice = () => {
    if (listing.listing_category === 'experience') {
      return {
        amount: listing.price_per_person,
        unit: '/person'
      };
    } else {
      return {
        amount: listing.price_per_night,
        unit: '/night'
      };
    }
  };

  const getListingDetailsUrl = () => {
    if (listing.listing_category === 'experience') {
      return `/experiences/${listing.id}`;
    } else {
      return `/listings/${listing.id}`;
    }
  };

  const price = getListingPrice();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      <div className="relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
        {/* Image Container */}
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200">
          {imageError || !imageSrc ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-500">
              <div className="text-center text-white">
                <div className="text-4xl mb-2">🏘️</div>
                <div className="font-semibold text-lg">{listing.title}</div>
                <div className="text-sm opacity-80">
                  {listing.listing_category === 'experience' ? listing.category : listing.property_type?.replace("_", " ")}
                </div>
              </div>
            </div>
          ) : (
            <motion.img
              src={imageSrc}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={handleImageError}
              loading="lazy"
            />
          )}

          {/* Enhanced badges */}
          <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
           {searchType && (
             <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
               {getSearchBadge(searchType, listing)}
             </div>
           )}

           {getListingTypeBadge()}

           {listing.visual_similarity_score && (
             <div className="bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
               🎯 {Math.round(listing.visual_similarity_score)}% Visual Match
             </div>
           )}

           {listing.semantic_score && (
             <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
               🎯 {Math.round(listing.semantic_score)}% Match
             </div>
           )}

           {listing.emotion_score && (
             <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
               💝 {Math.round(listing.emotion_score)}% Emotional Match
             </div>
           )}

           {listing.sustainability_features?.length > 0 && (
             <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
               🌱 Eco-Friendly
             </div>
           )}
         </div>

         {/* Rating Badge */}
         <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg">
           <div className="flex">
             {[...Array(5)].map((_, i) => (
               <StarSolidIcon
                 key={i}
                 className={`w-4 h-4 ${
                   i < Math.floor(listing.rating || 4.8)
                     ? "text-yellow-400"
                     : "text-gray-200"
                 }`}
               />
             ))}
           </div>
           <span className="text-sm font-bold text-gray-900">
             {listing.rating || "4.8"}
           </span>
           <span className="text-xs text-gray-500">(24)</span>
         </div>
       </div>

       {/* Content */}
       <div className="p-6">
         <div className="flex items-start justify-between mb-3">
           <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1 mr-2">
             {listing.title}
           </h3>
           <div className="flex-shrink-0 text-right">
             <div className="text-2xl font-bold text-gray-900">
               {formatCurrency(price.amount)}
             </div>
             <div className="text-sm text-gray-500">{price.unit}</div>
           </div>
         </div>

         <div className="flex items-center space-x-2 text-gray-600 mb-4">
           <MapPinIcon className="w-4 h-4 text-green-500" />
           <span className="text-sm">{listing.location}</span>
         </div>

         {/* Type-specific details */}
         {listing.listing_category === 'experience' ? (
           <div className="mb-4 space-y-2">
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Duration:</span>
               <span className="font-medium">{listing.duration} hours</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Group size:</span>
               <span className="font-medium">Up to {listing.max_participants} people</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Category:</span>
               <span className="font-medium capitalize">{listing.category}</span>
             </div>
           </div>
         ) : (
           <div className="mb-4 space-y-2">
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Property type:</span>
               <span className="font-medium capitalize">{listing.property_type?.replace('_', ' ')}</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Max guests:</span>
               <span className="font-medium">{listing.max_guests} people</span>
             </div>
           </div>
         )}

         {/* Match reasons section */}
         {(listing.match_reasons ||
           listing.emotion_reasons ||
           listing.visual_match_reasons) && (
           <div className="mb-4">
             <div className="text-xs text-gray-600 mb-2 font-medium">
               Why this matches:
             </div>
             <div className="flex flex-wrap gap-1">
               {(
                 listing.match_reasons ||
                 listing.emotion_reasons ||
                 listing.visual_match_reasons ||
                 []
               )
                 .slice(0, 2)
                 .map((reason, i) => (
                   <span
                     key={i}
                     className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-2 py-1 rounded-full border border-green-200"
                   >
                     {reason}
                   </span>
                 ))}
             </div>
           </div>
         )}

         {/* Host Info */}
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
               <span className="text-white text-xs font-bold">
                 {listing.host?.full_name?.charAt(0) || "H"}
               </span>
             </div>
             <div>
               <div className="text-sm font-medium text-gray-900">
                 {listing.host?.full_name || "Local Host"}
               </div>
               <div className="text-xs text-gray-500">Superhost ⭐</div>
             </div>
           </div>
         </div>

         {/* Action Button */}
         <Link href={getListingDetailsUrl()}>
           <motion.button
             className="w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
           >
             <span className="flex items-center justify-center space-x-2">
               <span>Explore {listing.listing_category === 'experience' ? 'Experience' : 'Stay'}</span>
               <SparklesIcon className="w-5 h-5" />
             </span>
           </motion.button>
         </Link>
       </div>
     </div>
   </motion.div>
 );
};

// Regular Property Card Component (for both homestays and experiences)
const PropertyCard = ({ listing, index }) => {
 const [imageError, setImageError] = useState(false);
 const [imageSrc, setImageSrc] = useState(
   listing.images?.[0] || "/images/placeholder-village.jpg"
 );
 const [favorites, setFavorites] = useState(new Set());
 const [hoveredCard, setHoveredCard] = useState(null);

 const handleImageError = useCallback(() => {
   if (!imageError) {
     setImageError(true);
     setImageSrc("");
   }
 }, [imageError]);

 const toggleFavorite = useCallback((listingId) => {
   setFavorites((prev) => {
     const newFavorites = new Set(prev);
     if (newFavorites.has(listingId)) {
       newFavorites.delete(listingId);
       toast.success("💔 Removed from favorites");
     } else {
       newFavorites.add(listingId);
       toast.success("❤️ Added to favorites");
     }
     return newFavorites;
   });
 }, []);

 const getListingTypeIcon = () => {
   return listing.listing_category === 'experience' ? (
     <AcademicCapIcon className="w-4 h-4 text-purple-500" />
   ) : (
     <HomeIcon className="w-4 h-4 text-blue-500" />
   );
 };

 const getListingTypeBadge = () => {
   return listing.listing_category === 'experience' ? (
     <span className="inline-flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
       <AcademicCapIcon className="w-3 h-3" />
       <span>Experience</span>
     </span>
   ) : (
     <span className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
       <HomeIcon className="w-3 h-3" />
       <span>Homestay</span>
     </span>
   );
 };

 const getListingPrice = () => {
   if (listing.listing_category === 'experience') {
     return {
       amount: listing.price_per_person,
       unit: '/person'
     };
   } else {
     return {
       amount: listing.price_per_night,
       unit: '/night'
     };
   }
 };

 const getListingDetailsUrl = () => {
   if (listing.listing_category === 'experience') {
     return `/experiences/${listing.id}`;
   } else {
     return `/listings/${listing.id}`;
   }
 };

 const price = getListingPrice();

 return (
   <motion.div
     initial={{ opacity: 0, y: 30 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.5, delay: index * 0.1 }}
     onHoverStart={() => setHoveredCard(listing.id)}
     onHoverEnd={() => setHoveredCard(null)}
     className="group relative"
   >
     <div className="relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
       {/* Image Container */}
       <div className="relative h-64 overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200">
         {imageError || !imageSrc ? (
           <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-500">
             <div className="text-center text-white">
               <div className="text-4xl mb-2">
                 {listing.listing_category === 'experience' ? '🎯' : '🏘️'}
               </div>
               <div className="font-semibold text-lg">{listing.title}</div>
               <div className="text-sm opacity-80">
                 {listing.listing_category === 'experience' ? listing.category : listing.property_type?.replace("_", " ")}
               </div>
             </div>
           </div>
         ) : (
           <motion.img
             src={imageSrc}
             alt={listing.title}
             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
             onError={handleImageError}
             loading="lazy"
           />
         )}

         {/* Top Badges */}
         <div className="absolute top-4 left-4 flex flex-col space-y-2">
           {getListingTypeBadge()}

           {listing.sustainability_features?.length > 0 && (
             <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg">
               🌱 Eco-Friendly
             </div>
           )}

           {listing.listing_category === 'experience' && listing.difficulty_level && (
             <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
               listing.difficulty_level === 'easy' ? 'bg-green-500 text-white' :
               listing.difficulty_level === 'moderate' ? 'bg-yellow-500 text-white' :
               'bg-red-500 text-white'
             }`}>
               {listing.difficulty_level}
             </div>
           )}
         </div>

         {/* Favorite Button */}
         <motion.button
           onClick={() => toggleFavorite(listing.id)}
           className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-lg rounded-full border border-white/30 hover:bg-white/30 transition-all duration-300"
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.9 }}
         >
           {favorites.has(listing.id) ? (
             <HeartSolidIcon className="w-5 h-5 text-red-500" />
           ) : (
             <HeartIcon className="w-5 h-5 text-white" />
           )}
         </motion.button>

         {/* Rating Badge */}
         <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg">
           <div className="flex">
             {[...Array(5)].map((_, i) => (
               <StarSolidIcon
                 key={i}
                 className={`w-4 h-4 ${
                   i < Math.floor(listing.rating || 4.8)
                     ? "text-yellow-400"
                     : "text-gray-200"
                 }`}
               />
             ))}
           </div>
           <span className="text-sm font-bold text-gray-900">
             {listing.rating || "4.8"}
           </span>
           <span className="text-xs text-gray-500">(24)</span>
         </div>

         {/* Quick Actions Overlay */}
         <motion.div
           initial={{ opacity: 0 }}
           animate={{
             opacity: hoveredCard === listing.id ? 1 : 0,
           }}
           className="absolute inset-0 flex items-center justify-center space-x-3"
         >
           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             className="p-3 bg-white/20 backdrop-blur-lg rounded-full text-white hover:bg-white/30 transition-all duration-300"
           >
             <EyeIcon className="w-6 h-6" />
           </motion.button>

           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             className="p-3 bg-white/20 backdrop-blur-lg rounded-full text-white hover:bg-white/30 transition-all duration-300"
           >
             <ShareIcon className="w-6 h-6" />
           </motion.button>
         </motion.div>
       </div>

       {/* Content */}
       <div className="p-6">
         <div className="flex items-start justify-between mb-3">
           <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1 mr-2">
             {listing.title}
           </h3>
           <div className="flex-shrink-0 text-right">
             <div className="text-2xl font-bold text-gray-900">
               {formatCurrency(price.amount)}
             </div>
             <div className="text-sm text-gray-500">{price.unit}</div>
           </div>
         </div>

         <div className="flex items-center space-x-2 text-gray-600 mb-4">
           <MapPinIcon className="w-4 h-4 text-green-500" />
           <span className="text-sm">{listing.location}</span>
         </div>

         {/* Type-specific details */}
         {listing.listing_category === 'experience' ? (
           <div className="mb-4 space-y-2">
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Duration:</span>
               <span className="font-medium">{listing.duration} hours</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Group size:</span>
               <span className="font-medium">Up to {listing.max_participants} people</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-gray-600">Category:</span>
               <span className="font-medium capitalize">{listing.category}</span>
             </div>
           </div>
         ) : (
           <>
             {/* Amenities Preview for homestays */}
             {listing.amenities?.length > 0 && (
               <div className="mb-4">
                 <div className="flex flex-wrap gap-2">
                   {listing.amenities.slice(0, 3).map((amenity, i) => (
                     <span
                       key={i}
                       className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                     >
                       <span className="mr-1">
                         {amenity.toLowerCase().includes("wifi") && "📶"}
                         {amenity.toLowerCase().includes("meal") && "🍽️"}
                         {amenity.toLowerCase().includes("guide") && "👨‍🏫"}
                         {amenity.toLowerCase().includes("cooking") && "👨‍🍳"}
                         {amenity.toLowerCase().includes("organic") && "🌱"}
                         {amenity.toLowerCase().includes("traditional") && "🎭"}
                         {![
                           "wifi",
                           "meal",
                           "guide",
                           "cooking",
                           "organic",
                           "traditional",
                         ].some((keyword) =>
                           amenity.toLowerCase().includes(keyword)
                         ) && "✨"}
                       </span>
                       {amenity}
                     </span>
                   ))}
                   {listing.amenities.length > 3 && (
                     <span className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-full">
                       +{listing.amenities.length - 3} more
                     </span>
                   )}
                 </div>
               </div>
             )}
           </>
         )}

         {/* Host Info */}
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
               <span className="text-white text-xs font-bold">
                 {listing.host?.full_name?.charAt(0) || "H"}
               </span>
             </div>
             <div>
               <div className="text-sm font-medium text-gray-900">
                 {listing.host?.full_name || "Local Host"}
               </div>
               <div className="text-xs text-gray-500">Superhost ⭐</div>
             </div>
           </div>

           <div className="text-right">
             <div className="text-xs text-gray-500">
               {listing.listing_category === 'experience' ? 'Max participants' : 'Max guests'}
             </div>
             <div className="flex items-center space-x-1">
               <UserGroupIcon className="w-4 h-4 text-gray-400" />
               <span className="text-sm font-medium text-gray-700">
                 {listing.listing_category === 'experience' ? listing.max_participants || 8 : listing.max_guests || 4}
               </span>
             </div>
           </div>
         </div>

         {/* Action Button */}
         <Link href={getListingDetailsUrl()}>
           <motion.button
             className="w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
           >
             <span className="flex items-center justify-center space-x-2">
               <span>Explore {listing.listing_category === 'experience' ? 'Experience' : 'Stay'}</span>
               <SparklesIcon className="w-5 h-5" />
             </span>
           </motion.button>
         </Link>
       </div>
     </div>
   </motion.div>
 );
};

const ListingsPage = () => {
 const searchParams = useSearchParams();
 const [listings, setListings] = useState([]);
 const [loading, setLoading] = useState(true);
 const [weatherData, setWeatherData] = useState(null);
 const [weatherLoading, setWeatherLoading] = useState(false);
 const [showWeatherModal, setShowWeatherModal] = useState(false);
 const [weatherEnhancedListings, setWeatherEnhancedListings] = useState([]);
 const [showWeatherSearch, setShowWeatherSearch] = useState(false);
 const [favorites, setFavorites] = useState(new Set());
 const [viewMode, setViewMode] = useState("grid");
 const [hoveredCard, setHoveredCard] = useState(null);
 const [showMapView, setShowMapView] = useState(false);

 // Weather prediction state
 const [weeklyWeatherData, setWeeklyWeatherData] = useState(null);
 const [weeklyWeatherLoading, setWeeklyWeatherLoading] = useState(false);
 const [showWeeklyWeather, setShowWeeklyWeather] = useState(false);

 // Advanced Search State
 const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
 const [advancedResults, setAdvancedResults] = useState([]);
 const [searchMetadata, setSearchMetadata] = useState(null);

 // Filter state to include both homestays and experiences
 const [filters, setFilters] = useState({
   search: searchParams.get("q") || "",
   location: searchParams.get("location") || "",
   listing_type: searchParams.get("listing_type") || "all", // 'all', 'homestay', 'experience'
   property_type: searchParams.get("property_type") || "",
   min_price: searchParams.get("min_price") || "",
   max_price: searchParams.get("max_price") || "",
   guests: searchParams.get("guests") || "1",
   check_in: "",
   check_out: "",
   sort_by: "rating",
   order: "desc",
 });

 const [showFilters, setShowFilters] = useState(false);
 const [pagination, setPagination] = useState({
   page: 1,
   limit: 12,
   total_count: 0,
   total_pages: 0,
 });

 // Use refs to prevent unnecessary re-renders
 const isInitialMount = useRef(true);
 const lastFetchParams = useRef("");

 // Weather helper functions
 const getWeatherIcon = (weatherMain, temp) => {
   const main = weatherMain?.toLowerCase();

   if (temp > 30) return "☀️";
   if (temp < 15) return "🌨️";

   switch (main) {
     case "clear":
       return "☀️";
     case "rain":
       return "🌧️";
     case "drizzle":
       return "🌦️";
     case "snow":
       return "❄️";
     case "clouds":
       return "☁️";
     case "thunderstorm":
       return "⛈️";
     case "mist":
     case "fog":
       return "🌫️";
     default:
       return "🌤️";
   }
 };

 const getCategoryIcon = (category) => {
   const icons = {
     outdoor: "🚶‍♂️",
     cultural: "🎭",
     farming: "🌾",
     craft: "🎨",
     wellness: "🧘‍♀️",
     photography: "📸",
     cooking: "👨‍🍳",
     nature: "🌿",
     adventure: "🏔️",
     spiritual: "🕉️",
   };
   return icons[category] || "✨";
 };

 const getPriorityBadge = (priority) => {
   const colors = {
     high: "bg-emerald-100 text-emerald-800 border-emerald-200",
     medium: "bg-amber-100 text-amber-800 border-amber-200",
     low: "bg-slate-100 text-slate-600 border-slate-200",
   };
   return colors[priority] || colors.medium;
 };

 const getWeatherAdvice = (weather) => {
   if (!weather) return null;

   const temp = weather.temperature;
   const condition = weather.main?.toLowerCase();

   if (temp > 35) {
     return {
       type: "warning",
       message: "Very hot weather. Stay hydrated and avoid midday sun.",
       bgColor: "bg-red-50",
       borderColor: "border-red-200",
       textColor: "text-red-800",
     };
   } else if (temp < 10) {
     return {
       type: "info",
       message:
         "Cold weather. Pack warm clothes and enjoy cozy indoor activities.",
       bgColor: "bg-blue-50",
       borderColor: "border-blue-200",
       textColor: "text-blue-800",
     };
   } else if (condition === "rain") {
     return {
       type: "info",
       message: "Rainy weather. Perfect for indoor cultural activities.",
       bgColor: "bg-blue-50",
       borderColor: "border-blue-200",
       textColor: "text-blue-800",
     };
   } else {
     return {
       type: "success",
       message: "Great weather for exploring village life and local culture.",
       bgColor: "bg-emerald-50",
       borderColor: "border-emerald-200",
       textColor: "text-emerald-800",
     };
   }
 };

 // Weather API functions
 const fetchWeatherRecommendations = async () => {
   if (!filters.location.trim()) {
     toast.error("Please enter a location first");
     return;
   }

   setWeatherLoading(true);
   try {
     const response = await aiAPI.getWeatherRecommendations({
       location: filters.location.trim(),
     });
     setWeatherData(response);
     toast.success("🌤️ Weather insights loaded!");
   } catch (error) {
     console.error("Weather recommendations error:", error);
     const errorMessage =
       error.response?.data?.error ||
       "Unable to get weather data for this location";
     toast.error(errorMessage);
   } finally {
     setWeatherLoading(false);
   }
 };

 // Weekly weather prediction function
 const fetchWeeklyWeatherPrediction = async () => {
   if (!filters.location.trim()) {
     toast.error("Please enter a location first");
     return;
   }

   setWeeklyWeatherLoading(true);
   try {
     const response = await aiAPI.getWeeklyWeatherPrediction({
       location: filters.location.trim(),
     });
     setWeeklyWeatherData(response);
     setShowWeeklyWeather(true);
     toast.success("📅 7-day weather prediction loaded!");
   } catch (error) {
     console.error("Weekly weather prediction error:", error);
     const errorMessage =
       error.response?.data?.error ||
       "Unable to get weather prediction for this location";
     toast.error(errorMessage);
   } finally {
     setWeeklyWeatherLoading(false);
   }
 };

 const handleWeatherEnhancedSearch = async () => {
   if (!filters.location.trim()) {
     toast.error("Please enter a location for smart search");
     return;
   }

   setLoading(true);
   try {
     console.log("🔍 Starting weather-enhanced search for:", filters.location);

     const response = await aiAPI.getWeatherEnhancedSearch({
       location: filters.location,
       check_in: filters.check_in,
       check_out: filters.check_out,
       preferences: ["outdoor", "cultural", "farming"],
     });

     console.log("📊 Weather search response:", response);

     if (response && response.weather_enhanced_listings) {
       setWeatherEnhancedListings(response.weather_enhanced_listings);
       setWeatherData(response);
       setShowWeatherSearch(true);

       console.log(
         "✅ Weather enhanced listings set:",
         response.weather_enhanced_listings.length
       );
       toast.success(
         `🌤️ Found ${response.weather_enhanced_listings.length} weather-optimized results!`
       );
     } else {
       console.log("⚠️ No weather enhanced listings in response");
       setShowWeatherSearch(false);
       toast.info("Weather data loaded, showing regular results");
     }
   } catch (error) {
     console.error("❌ Weather search error:", error);
     setShowWeatherSearch(false);
     toast.error("Failed to get weather-enhanced recommendations");
   } finally {
     setLoading(false);
   }
 };

 // Advanced Search Handler
 const handleAdvancedResults = useCallback((results, metadata) => {
   setAdvancedResults(results);
   setSearchMetadata(metadata);
   setShowAdvancedSearch(false);
   // Clear other search results to show advanced results prominently
   setShowWeatherSearch(false);
 }, []);

 const getSearchTypeTitle = (type) => {
   const titles = {
     semantic: "🧠 AI Semantic",
     emotion: "💝 Emotion-Based",
     image: "📸 Visual",
     smart: "🤖 AI Smart",
   };
   return titles[type] || "Advanced";
 };

 // Unified fetch function for both homestays and experiences
 const fetchListings = useCallback(async () => {
   const params = {
     ...filters,
     page: pagination.page,
     limit: pagination.limit,
   };

   // Remove empty params
   Object.keys(params).forEach((key) => {
     if (params[key] === "" || params[key] === null) {
       delete params[key];
     }
   });

   // Create a unique key for this request
   const paramKey = JSON.stringify(params);

   // Prevent duplicate requests
   if (paramKey === lastFetchParams.current && !isInitialMount.current) {
     return;
   }

   lastFetchParams.current = paramKey;
   setLoading(true);

   try {
     // Use the unified search API that handles both homestays and experiences
     const response = await listingsAPI.searchAll(params);
     
     // The API returns combined results
     setListings(response.listings || []);
     setPagination((prev) => ({
       ...prev,
       total_count: response.total_count || 0,
       total_pages: Math.ceil((response.total_count || 0) / pagination.limit),
     }));
   } catch (error) {
     console.error("Failed to fetch listings:", error);
     toast.error("Failed to load listings");
   } finally {
     setLoading(false);
     isInitialMount.current = false;
   }
 }, [filters, pagination.page, pagination.limit]);

 // Single useEffect for fetching - only runs when dependencies actually change
 useEffect(() => {
   const timeoutId = setTimeout(() => {
     fetchListings();
   }, 300); // Debounce to prevent rapid calls

   return () => clearTimeout(timeoutId);
 }, [fetchListings]);

 const handleFilterChange = useCallback(
   (key, value) => {
     setFilters((prev) => ({
       ...prev,
       [key]: value,
     }));
     // Reset pagination when filters change
     if (pagination.page !== 1) {
       setPagination((prev) => ({ ...prev, page: 1 }));
     }
   },
   [pagination.page]
 );

 const handleSearch = useCallback(
   (e) => {
     e.preventDefault();
     setShowWeatherSearch(false);
     // Clear advanced results
     setAdvancedResults([]);
     // Force refetch by updating lastFetchParams
     lastFetchParams.current = "";
     fetchListings();
   },
   [fetchListings]
 );

 const clearFilters = useCallback(() => {
   setFilters({
     search: "",
     location: "",
     listing_type: "all",
     property_type: "",
     min_price: "",
     max_price: "",
     guests: "1",
     check_in: "",
     check_out: "",
     sort_by: "rating",
     order: "desc",
   });
   setShowWeatherSearch(false);
   setWeatherData(null);
   setAdvancedResults([]);
   setSearchMetadata(null);
   setWeeklyWeatherData(null);
   setShowWeeklyWeather(false);
   // Reset pagination
   setPagination((prev) => ({ ...prev, page: 1 }));
 }, []);

 const toggleFavorite = useCallback((listingId) => {
   setFavorites((prev) => {
     const newFavorites = new Set(prev);
     if (newFavorites.has(listingId)) {
       newFavorites.delete(listingId);
       toast.success("💔 Removed from favorites");
     } else {
       newFavorites.add(listingId);
       toast.success("❤️ Added to favorites");
     }
     return newFavorites;
   });
 }, []);

 // Updated listing types to include experiences
 const listingTypes = [
   { value: "all", label: "All Types", icon: "🌟" },
   { value: "homestay", label: "Homestays", icon: "🏠" },
   { value: "experience", label: "Experiences", icon: "🎯" },
 ];

 const propertyTypes = [
   { value: "", label: "All Property Types", icon: "🏘️" },
   { value: "homestay", label: "Homestay", icon: "🏠" },
   { value: "farmstay", label: "Farmstay", icon: "🌾" },
   { value: "heritage_home", label: "Heritage Home", icon: "🏛️" },
   { value: "eco_lodge", label: "Eco Lodge", icon: "🌿" },
   { value: "village_house", label: "Village House", icon: "🏘️" },
   { value: "cottage", label: "Cottage", icon: "🏡" },
 ];

 const sortOptions = [
   { value: "rating-desc", label: "Highest Rated ⭐" },
   { value: "price_per_night-asc", label: "Price: Low to High 💰" },
   { value: "price_per_night-desc", label: "Price: High to Low 💎" },
   { value: "created_at-desc", label: "Newest First 🆕" },
 ];

 const displayListings =
   advancedResults.length > 0
     ? advancedResults
     : showWeatherSearch
     ? weatherEnhancedListings
     : listings;

 console.log('📊 All listings for map:', displayListings.length);
 console.log('📋 Sample listings:', displayListings.slice(0, 3));

 return (
   <Providers>
     <AppLayout>
       <div className="min-h-screen overflow-hidden">
         
         {/* Home Page Style Background */}
         <div className="fixed inset-0 z-0">
           <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50" />
           <motion.div
             className="absolute inset-0 pointer-events-none"
             style={{
               background: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`,
             }}
           />
         </div>

         {/* Search-Focused Header Section */}
         <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden">
           
           {/* Enhanced Background with Home Page Style Floating Elements */}
           <div className="absolute inset-0">
             <div className="absolute inset-0 opacity-20">
               <div className="absolute top-0 left-0 w-full h-full">
                 <div
                   className="w-full h-full"
                   style={{
                     backgroundImage:
                       "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
                     backgroundSize: "60px 60px",
                   }}
                 />
               </div>
             </div>

             {/* Home Page Style Floating Elements */}
             {[...Array(8)].map((_, i) => (
               <motion.div
                 key={i}
                 className="absolute w-64 h-64 bg-gradient-to-br from-green-300/20 via-blue-300/20 to-purple-300/20 rounded-full"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 100}%`,
                 }}
                 animate={{
                   y: [0, -20, 0],
                   x: [0, 10, 0],
                   scale: [1, 1.1, 1],
                   rotate: [0, 180, 360],
                 }}
                 transition={{
                   duration: 6 + i,
                   repeat: Infinity,
                   ease: "easeInOut",
                   delay: i * 1.5,
                 }}
               />
             ))}

             {/* Additional Search-Themed Floating Icons */}
             {[...Array(6)].map((_, i) => (
               <motion.div
                 key={`search-${i}`}
                 className="absolute"
                 style={{
                   left: `${15 + (i * 15)}%`,
                   top: `${20 + (i * 12)}%`,
                 }}
                 animate={{
                   y: [0, -25, 0],
                   x: [0, 12, 0],
                   rotate: [0, 360],
                   scale: [1, 1.15, 1],
                 }}
                 transition={{
                   duration: 7 + i,
                   repeat: Infinity,
                   ease: "easeInOut",
                   delay: i * 1.2,
                 }}
               >
                 <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                   {i % 6 === 0 && <MagnifyingGlassIcon className="w-10 h-10 text-green-400/60" />}
                   {i % 6 === 1 && <MapPinIcon className="w-10 h-10 text-blue-400/60" />}
                   {i % 6 === 2 && <SparklesIcon className="w-10 h-10 text-purple-400/60" />}
                   {i % 6 === 3 && <PhotoIcon className="w-10 h-10 text-pink-400/60" />}
                   {i % 6 === 4 && <HeartIcon className="w-10 h-10 text-rose-400/60" />}
                   {i % 6 === 5 && <CloudIcon className="w-10 h-10 text-indigo-400/60" />}
                 </div>
               </motion.div>
             ))}
           </div>

           {/* Main Search Content */}
           <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
             
             {/* Header Content */}
             <motion.div
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               className="text-center mb-12"
             >
               {/* Search Badge */}
               <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.2 }}
                 className="inline-flex items-center px-6 py-3 bg-white/30 backdrop-blur-lg rounded-full text-gray-700 font-medium mb-8 border border-white/50 shadow-lg"
               >
                 <RocketLaunchIcon className="w-5 h-5 mr-2 text-blue-500" />
                 Advanced AI Search Portal
               </motion.div>

               {/* Main Title - Home Page Style */}
               <motion.h1
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
                 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight"
               >
                 Find Your
                 <motion.span
                   className="block bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent"
                   animate={{
                     backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                   }}
                   transition={{
                     duration: 3,
                     repeat: Infinity,
                     ease: "linear",
                   }}
                 >
                   Perfect Village
                 </motion.span>
               </motion.h1>

               <motion.p
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4 }}
                 className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8"
               >
                 Discover authentic homestays and immersive cultural experiences. 
                 Search by emotion, upload images, or let AI understand your natural language.
               </motion.p>

               {/* AI Features Preview Pills - Home Page Style */}
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5 }}
                 className="flex flex-wrap gap-4 justify-center mb-12"
               >
                 {[
                   { icon: HomeIcon, label: "Homestays", color: "from-blue-400 to-indigo-500" },
                   { icon: AcademicCapIcon, label: "Experiences", color: "from-purple-400 to-violet-500" },
                   { icon: HeartIcon, label: "Emotion Detection", color: "from-pink-400 to-rose-500" },
                   { icon: LightBulbIcon, label: "Smart AI", color: "from-green-400 to-emerald-500" },
                 ].map((feature, index) => (
                   <motion.div
                     key={feature.label}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.6 + index * 0.1 }}
                     whileHover={{ scale: 1.05, y: -2 }}
                     className="flex items-center space-x-2 bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/30 shadow-lg"
                   >
                     <div className={`w-8 h-8 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center`}>
                       <feature.icon className="w-4 h-4 text-white" />
                     </div>
                     <span className="text-gray-700 font-medium">{feature.label}</span>
                   </motion.div>
                 ))}
               </motion.div>
             </motion.div>

             {/* Advanced Search Form Container - Glassmorphism Style */}
             <motion.div
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.7 }}
               className="max-w-6xl mx-auto"
             >
               <form onSubmit={handleSearch}>
                 <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                   
                   {/* Quick Search Bar */}
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                     
                     {/* Main Search */}
                     <div className="md:col-span-4">
                       <label className="block text-gray-700 font-semibold mb-3 text-sm flex items-center space-x-2">
                         <MagnifyingGlassIcon className="w-4 h-4" />
                         <span>Search Destinations</span>
                       </label>
                       <div className="relative group">
                         <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
                         <input
                           type="text"
                           placeholder="Villages, experiences, activities..."
                           value={filters.search}
                           onChange={(e) => handleFilterChange("search", e.target.value)}
                           className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/30 transition-all duration-300 text-gray-800 placeholder-gray-600 text-base"
                         />
                       </div>
                     </div>

                     {/* Location */}
                     <div className="md:col-span-3">
                       <label className="block text-gray-700 font-semibold mb-3 text-sm flex items-center space-x-2">
                         <MapPinIcon className="w-4 h-4" />
                         <span>Location</span>
                       </label>
                       <div className="relative group">
                         <MapPinIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-gray-700 transition-colors" />
                         <input
                           type="text"
                           placeholder="State, District, Village"
                           value={filters.location}
                           onChange={(e) => handleFilterChange("location", e.target.value)}
                           className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/30 transition-all duration-300 text-gray-800 placeholder-gray-600 text-base"
                         />
                       </div>
                     </div>

                     {/* Listing Type */}
                     <div className="md:col-span-3">
                       <label className="block text-gray-700 font-semibold mb-3 text-sm flex items-center space-x-2">
                         <SparklesIcon className="w-4 h-4" />
                         <span>Type</span>
                       </label>
                       <div className="relative">
                         <select
                           value={filters.listing_type}
                           onChange={(e) => handleFilterChange("listing_type", e.target.value)}
                           className="w-full px-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/30 transition-all duration-300 text-gray-800 appearance-none text-base"
                         >
                           {listingTypes.map((type) => (
                             <option key={type.value} value={type.value} className="text-gray-900">
                               {type.icon} {type.label}
                             </option>
                           ))}
                         </select>
                         <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                       </div>
                     </div>

                     {/* Guests */}
                     <div className="md:col-span-2">
                       <label className="block text-gray-700 font-semibold mb-3 text-sm flex items-center space-x-2">
                         <UserGroupIcon className="w-4 h-4" />
                         <span>Guests</span>
                       </label>
                       <div className="relative">
                         <UserGroupIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                         <select
                           value={filters.guests}
                           onChange={(e) => handleFilterChange("guests", e.target.value)}
                           className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/30 transition-all duration-300 text-gray-800 appearance-none text-base"
                         >
                           {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                             <option key={num} value={num} className="text-gray-900">
                               {num} Guest{num > 1 ? "s" : ""}
                             </option>
                           ))}
                         </select>
                         <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                       </div>
                     </div>
                   </div>

                   {/* Weather Integration Section */}
                   {filters.location && (
                     <motion.div
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: "auto" }}
                       className="mb-8"
                     >
                       <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                         <div className="flex items-center justify-between mb-4">
                           <h3 className="text-gray-800 font-semibold text-lg flex items-center space-x-2">
                             <CloudIcon className="w-5 h-5" />
                             <span>Weather Intelligence for {filters.location}</span>
                           </h3>

                           <div className="flex items-center space-x-3">
                             <motion.button
                               type="button"
                               onClick={fetchWeatherRecommendations}
                               disabled={weatherLoading}
                               className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-300/30 text-gray-700 rounded-xl transition-all duration-300 backdrop-blur-sm"
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                             >
                               {weatherLoading ? (
                                 <motion.div
                                   animate={{ rotate: 360 }}
                                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                 >
                                   <ArrowPathIcon className="w-5 h-5" />
                                 </motion.div>
                               ) : (
                                 <CloudIcon className="w-5 h-5" />
                               )}
                               <span className="font-medium">Get Weather</span>
                             </motion.button>

                             <motion.button
                               type="button"
                               onClick={fetchWeeklyWeatherPrediction}
                               disabled={weeklyWeatherLoading}
                               className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-300/30 text-gray-700 rounded-xl transition-all duration-300 backdrop-blur-sm"
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                             >
                               {weeklyWeatherLoading ? (
                                 <motion.div
                                   animate={{ rotate: 360 }}
                                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                 >
                                   <ArrowPathIcon className="w-5 h-5" />
                                 </motion.div>
                               ) : (
                                 <CalendarDaysIcon className="w-5 h-5" />
                               )}
                               <span className="font-medium">Predict for Next Week</span>
                             </motion.button>
                           </div>
                         </div>

                         {/* Weather display sections remain the same as in original code... */}
                         {/* Current Weather Display */}
                         {weatherData && (
                           <motion.div
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 p-6 mb-6"
                           >
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                               {/* Current Weather */}
                               <div className="text-center">
                                 <div className="text-6xl mb-2">
                                   {getWeatherIcon(
                                     weatherData.current_weather?.main,
                                     weatherData.current_weather?.temperature
                                   )}
                                 </div>
                                 <div className="text-3xl font-bold text-gray-800 mb-1">
                                   {weatherData.current_weather?.temperature}°C
                                 </div>
                                 <div className="text-gray-700 capitalize font-medium">
                                   {weatherData.current_weather?.description}
                                 </div>
                                 <div className="text-sm text-gray-600 mt-2">
                                   Feels like {weatherData.current_weather?.feels_like}°C
                                 </div>
                               </div>

                               {/* Weather Details */}
                               <div>
                                 <h4 className="font-bold text-gray-800 mb-3 text-lg">Details</h4>
                                 <div className="space-y-2 text-gray-700">
                                   <div className="flex items-center justify-between">
                                     <span>Humidity:</span>
                                     <span className="font-medium text-gray-800">
                                       {weatherData.current_weather?.humidity}%
                                     </span>
                                   </div>
                                   <div className="flex items-center justify-between">
                                     <span>Wind:</span>
                                     <span className="font-medium text-gray-800">
                                       {weatherData.current_weather?.wind_speed} m/s
                                     </span>
                                   </div>
                                   <div className="flex items-center justify-between">
                                     <span>Visibility:</span>
                                     <span className="font-medium text-gray-800">
                                       {weatherData.current_weather?.visibility} km
                                     </span>
                                   </div>
                                 </div>
                               </div>

                               {/* Recommended Activities */}
                               <div>
                                 <h4 className="font-bold text-gray-800 mb-3 text-lg flex items-center space-x-1">
                                   <span>🎯</span>
                                   <span>Perfect Today</span>
                                 </h4>
                                 <div className="space-y-2">
                                   {weatherData.recommendations?.slice(0, 3).map((rec, i) => (
                                     <div key={i} className="flex items-center space-x-2 text-sm text-gray-700">
                                       <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                                       <span className="font-medium text-gray-800">{rec.activity}</span>
                                     </div>
                                   ))}
                                   {weatherData.recommendations?.length > 3 && (
                                     <motion.button
                                       onClick={() => setShowWeatherModal(true)}
                                       className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors underline"
                                       whileHover={{ scale: 1.05 }}
                                     >
                                       +{weatherData.recommendations.length - 3} more activities →
                                     </motion.button>
                                   )}
                                 </div>
                               </div>
                             </div>

                             {/* Weather Advice */}
                             {getWeatherAdvice(weatherData.current_weather) && (
                               <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
                                 <p className="text-gray-800 font-medium text-center">
                                   💡 {getWeatherAdvice(weatherData.current_weather).message}
                                 </p>
                               </div>
                             )}
                           </motion.div>
                         )}

                         {/* Weekly Weather Prediction Display */}
                         {showWeeklyWeather && weeklyWeatherData && (
                           <motion.div
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 p-6"
                           >
                             <div className="flex items-center justify-between mb-6">
                               <h4 className="font-bold text-gray-800 text-xl flex items-center space-x-2">
                                 <CalendarDaysIcon className="w-6 h-6" />
                                 <span>7-Day Weather Prediction</span>
                               </h4>
                               <motion.button
                                 onClick={() => setShowWeeklyWeather(false)}
                                 className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-300"
                                 whileHover={{ scale: 1.1 }}
                                 whileTap={{ scale: 0.9 }}
                               >
                                 <XMarkIcon className="w-5 h-5" />
                               </motion.button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                               {weeklyWeatherData.weekly_predictions?.map((day, index) => (
                                 <motion.div
                                   key={day.date}
                                   initial={{ opacity: 0, y: 20 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   transition={{ delay: index * 0.1 }}
                                   className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/40"
                                 >
                                   <div className="text-center mb-4">
                                     <div className="text-sm font-medium text-gray-700 mb-1">
                                       {day.day_name}
                                     </div>
                                     <div className="text-xs text-gray-600 mb-2">
                                       {new Date(day.date).toLocaleDateString()}
                                     </div>
                                     <div className="text-4xl mb-2">
                                       {getWeatherIcon(day.main, day.avg_temp)}
                                     </div>
                                     <div className="text-lg font-bold text-gray-800">
                                       {day.temp_max}°/{day.temp_min}°C
                                     </div>
                                     <div className="text-xs text-gray-600 capitalize">
                                       {day.description}
                                     </div>
                                   </div>

                                   {/* Best Activities for the Day */}
                                   <div className="space-y-2">
                                     <div className="text-xs font-semibold text-gray-700 mb-2">
                                       🎯 Best Activities:
                                     </div>
                                     {day.recommendations?.slice(0, 2).map((rec, i) => (
                                       <div key={i} className="text-xs text-gray-600 flex items-center space-x-1">
                                         <span className="text-sm">{getCategoryIcon(rec.category)}</span>
                                         <span>{rec.activity}</span>
                                       </div>
                                     ))}
                                   </div>

                                   {/* Weather Advice */}
                                   {day.weather_advice && (
                                     <div className="mt-3 p-2 bg-white/20 rounded-lg">
                                       <div className="text-xs text-gray-700 text-center">
                                         💡 {day.weather_advice.message}
                                       </div>
                                     </div>
                                   )}
                                 </motion.div>
                               ))}
                             </div>

                             {/* Best Days Summary */}
                             {weeklyWeatherData.best_days && (
                               <div className="mt-6 p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                                 <h5 className="font-bold text-gray-800 mb-3 text-center">
                                   🌟 Best Days for Specific Activities
                                 </h5>
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                   {Object.entries(weeklyWeatherData.best_days).map(([activity, day]) => (
                                     day && (
                                       <div key={activity} className="text-center">
                                         <div className="font-semibold text-gray-800 capitalize mb-1">
                                           {getCategoryIcon(activity)} {activity}
                                         </div>
                                         <div className="text-gray-600">
                                           {day.day_name}
                                         </div>
                                         <div className="text-xs text-gray-500">
                                           {day.temp_max}°/{day.temp_min}°C
                                         </div>
                                       </div>
                                     )
                                   ))}
                                 </div>
                               </div>
                             )}
                           </motion.div>
                         )}
                       </div>
                     </motion.div>
                   )}

                   {/* Action Buttons Row */}
                   <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                     
                     {/* Left Side - Feature Buttons */}
                     <div className="flex flex-wrap items-center gap-3">
                       <motion.button
                         type="button"
                         onClick={() => setShowFilters(!showFilters)}
                         className="flex items-center space-x-2 px-5 py-3 text-gray-700 hover:text-gray-900 bg-white/15 hover:bg-white/25 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 font-medium"
                         whileHover={{ scale: 1.02, y: -1 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         <AdjustmentsHorizontalIcon className="w-5 h-5" />
                         <span>Advanced Filters</span>
                       </motion.button>

                       <motion.button
                         type="button"
                         onClick={() => setShowAdvancedSearch(true)}
                         className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-gray-800 rounded-xl transition-all duration-300 backdrop-blur-sm border border-purple-300/30 font-medium"
                         whileHover={{ scale: 1.02, y: -1 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         <SparklesIcon className="w-5 h-5" />
                         <span>AI Search</span>
                       </motion.button>
                     </div>

                     {/* Right Side - Main Search Buttons */}
                     <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                       <motion.button
                         type="button"
                         onClick={handleWeatherEnhancedSearch}
                         disabled={!filters.location.trim()}
                         className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl font-bold transition-all duration-300 min-w-[200px] ${
                           !filters.location.trim()
                             ? "bg-gray-400/30 text-gray-500 cursor-not-allowed"
                             : "bg-gradient-to-r from-purple-500/80 to-pink-500/80 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                         }`}
                         whileHover={filters.location.trim() ? { scale: 1.02 } : {}}
                         whileTap={filters.location.trim() ? { scale: 0.98 } : {}}
                       >
                         <SparklesIcon className="w-6 h-6" />
                         <span>Weather Smart</span>
                       </motion.button>

                       <motion.button
                         type="submit"
                         className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500/80 to-emerald-500/80 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 min-w-[200px]"
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         <MagnifyingGlassIcon className="w-6 h-6" />
                         <span>Discover Places</span>
                       </motion.button>
                     </div>
                   </div>
                 </div>
               </form>
             </motion.div>

             {/* Stats/Trust Indicators */}
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 1 }}
               className="mt-16 text-center"
             >
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                 {[
                   { number: "50+", label: "Rural Communities", icon: "🏘️" },
                   { number: "1000+", label: "Happy Travelers", icon: "✈️" },
                   { number: "4.9", label: "Average Rating", icon: "⭐" },
                   { number: "AI", label: "Powered Search", icon: "🤖" },
                 ].map((stat, index) => (
                   <motion.div
                     key={stat.label}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 1.2 + index * 0.1 }}
                     className="text-center bg-white/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-lg"
                   >
                     <div className="text-4xl mb-2">{stat.icon}</div>
                     <div className="text-3xl font-bold text-gray-800 mb-1">{stat.number}</div>
                     <div className="text-gray-600 font-medium">{stat.label}</div>
                   </motion.div>
                 ))}
               </div>
             </motion.div>
           </div>

           {/* Scroll Indicator */}
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 1.5 }}
             className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
           >
             <motion.div
               animate={{ y: [0, 10, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="flex flex-col items-center space-y-2 text-gray-600"
             >
               <span className="text-sm font-medium">Explore Results</span>
               <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
                 <motion.div
                   animate={{ y: [0, 16, 0] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="w-1 h-3 bg-gray-600 rounded-full mt-2"
                 />
               </div>
             </motion.div>
           </motion.div>
         </section>

         {/* Weather Modal */}
         <AnimatePresence>
           {showWeatherModal && weatherData && (
             <div
               className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
               onClick={() => setShowWeatherModal(false)}
             >
               <motion.div
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="bg-white rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
                 onClick={(e) => e.stopPropagation()}
               >
                 {/* Modal Header */}
                 <div className="bg-gradient-to-br from-blue-500 to-green-600 p-6 text-white">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                         <span className="text-2xl">🌤️</span>
                       </div>
                       <div>
                         <h2 className="text-2xl font-bold">Weather Activities</h2>
                         <p className="text-blue-100">{weatherData.location}</p>
                       </div>
                     </div>

                     <motion.button
                       onClick={() => setShowWeatherModal(false)}
                       className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                     >
                       <XMarkIcon className="w-6 h-6" />
                     </motion.button>
                   </div>
                 </div>

                 {/* Modal Content */}
                 <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {weatherData.recommendations?.map((rec, index) => (
                       <motion.div
                         key={index}
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: index * 0.1 }}
                         className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                       >
                         <div className="flex items-start space-x-4">
                           <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                             <span className="text-2xl">{getCategoryIcon(rec.category)}</span>
                           </div>

                           <div className="flex-1">
                             <div className="flex items-center space-x-3 mb-2">
                               <h4 className="text-lg font-bold text-gray-900">{rec.activity}</h4>
                               <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getPriorityBadge(rec.priority)}`}>
                                 {rec.priority}
                               </span>
                             </div>

                             <p className="text-gray-600 mb-3 leading-relaxed">{rec.reason}</p>

                             <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
                               <ClockIcon className="w-4 h-4" />
                               <span className="font-medium">{rec.best_time}</span>
                             </div>
                           </div>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 </div>
               </motion.div>
             </div>
           )}
         </AnimatePresence>

         {/* Advanced Search Modal */}
         <AnimatePresence>
           {showAdvancedSearch && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <motion.div
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                 onClick={(e) => e.stopPropagation()}
               >
                 <div className="p-8 h-full overflow-y-auto">
                   <div className="flex items-center justify-between mb-8">
                     <h2 className="text-3xl font-bold text-gray-900">Advanced AI Search</h2>
                     <motion.button
                       onClick={() => setShowAdvancedSearch(false)}
                       className="p-2 hover:bg-gray-200 rounded-xl transition-all duration-300"
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                     >
                       <XMarkIcon className="w-6 h-6" />
                     </motion.button>
                   </div>

                   <AdvancedSearch
                     onResults={handleAdvancedResults}
                     loading={loading}
                     setLoading={setLoading}
                   />
                 </div>
               </motion.div>
             </div>
           )}
         </AnimatePresence>

         {/* Advanced Filters Panel */}
         <AnimatePresence>
           {showFilters && (
             <motion.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: "auto" }}
               exit={{ opacity: 0, height: 0 }}
               className="bg-white border-b border-gray-100 shadow-lg relative z-20"
             >
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                   
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-3">🌟 Listing Type</label>
                     <select
                       value={filters.listing_type}
                       onChange={(e) => handleFilterChange("listing_type", e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                     >
                       {listingTypes.map((type) => (
                         <option key={type.value} value={type.value}>
                           {type.icon} {type.label}
                         </option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-3">🏠 Property Type</label>
                     <select
                       value={filters.property_type}
                       onChange={(e) => handleFilterChange("property_type", e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                     >
                       {propertyTypes.map((type) => (
                         <option key={type.value} value={type.value}>
                           {type.icon} {type.label}
                         </option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-3">💰 Min Price (₹)</label>
                     <input
                       type="number"
                       placeholder="500"
                       value={filters.min_price}
                       onChange={(e) => handleFilterChange("min_price", e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-3">💎 Max Price (₹)</label>
                     <input
                       type="number"
                       placeholder="10000"
                       value={filters.max_price}
                       onChange={(e) => handleFilterChange("max_price", e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-3">📅 Check-in</label>
                     <input
                       type="date"
                       value={filters.check_in}
                       onChange={(e) => handleFilterChange("check_in", e.target.value)}
                       min={new Date().toISOString().split("T")[0]}
                       className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-3">📊 Sort By</label>
                     <select
                       value={`${filters.sort_by}-${filters.order}`}
                       onChange={(e) => {
                         const [sort_by, order] = e.target.value.split("-");
                         handleFilterChange("sort_by", sort_by);
                         handleFilterChange("order", order);
                       }}
                       className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                     >
                       {sortOptions.map((option) => (
                         <option key={option.value} value={option.value}>
                           {option.label}
                         </option>
                       ))}
                     </select>
                   </div>
                 </div>

                 <div className="mt-8 flex justify-between">
                   <motion.button
                     onClick={clearFilters}
                     className="text-gray-600 hover:text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                   >
                     🔄 Clear All Filters
                   </motion.button>

                   <motion.button
                     onClick={() => setShowFilters(false)}
                     className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                   >
                     ✅ Apply Filters
                   </motion.button>
                 </div>
               </div>
             </motion.div>
           )}
         </AnimatePresence>

         {/* Results Section */}
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
           {/* Advanced Search Results */}
           <AnimatePresence>
             {advancedResults.length > 0 && (
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -30 }}
                 className="mb-12"
               >
                 <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 border border-gray-200 rounded-3xl p-8 shadow-lg">
                   <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center space-x-4">
                       <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <SparklesIcon className="w-8 h-8 text-white" />
                       </div>
                       <div>
                         <h2 className="text-3xl font-bold text-gray-900">
                           {getSearchTypeTitle(searchMetadata?.type)} Results
                         </h2>
                         <p className="text-gray-600 text-lg">
                           {searchMetadata?.message || `Found ${advancedResults.length} perfect matches`}
                         </p>
                       </div>
                     </div>

                     <motion.button
                       onClick={() => {
                         setAdvancedResults([]);
                         setSearchMetadata(null);
                       }}
                       className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-300"
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                     >
                       <XMarkIcon className="w-6 h-6" />
                     </motion.button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {advancedResults.map((listing, index) => (
                       <EnhancedPropertyCard
                         key={listing.id}
                         listing={listing}
                         index={index}
                         searchType={searchMetadata?.type}
                       />
                     ))}
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Weather-Enhanced Results */}
           <AnimatePresence>
             {showWeatherSearch && weatherEnhancedListings.length > 0 && (
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -30 }}
                 className="mb-12"
               >
                 <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border border-gray-200 rounded-3xl p-8 shadow-lg">
                   <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center space-x-4">
                       <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <SparklesIcon className="w-8 h-8 text-white" />
                       </div>
                       <div>
                         <h2 className="text-3xl font-bold text-gray-900">AI Weather Recommendations</h2>
                         <p className="text-gray-600 text-lg">
                           Perfect matches for today's weather in {filters.location}
                         </p>
                       </div>
                     </div>

                     <motion.button
                       onClick={() => setShowWeatherSearch(false)}
                       className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-300"
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                     >
                       <XMarkIcon className="w-6 h-6" />
                     </motion.button>
                   </div>

                   {/* Weather Insights */}
                   {weatherData?.current_weather && (
                     <div className="mb-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="text-center">
                           <div className="text-4xl font-bold text-gray-900 mb-2">
                             {weatherData.current_weather.temperature}°C
                           </div>
                           <div className="text-lg text-gray-600 capitalize font-medium">
                             {weatherData.current_weather.description}
                           </div>
                           <div className="text-6xl mt-2">
                             {getWeatherIcon(
                               weatherData.current_weather.main,
                               weatherData.current_weather.temperature
                             )}
                           </div>
                         </div>

                         <div>
                           <h4 className="font-bold text-gray-900 mb-3 text-lg">🎯 Best Activities</h4>
                           <div className="space-y-2">
                             {weatherData.search_insights?.best_activities?.slice(0, 3).map((activity, i) => (
                               <div key={i} className="flex items-center space-x-2 text-gray-700">
                                 <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                 <span className="font-medium">{activity}</span>
                               </div>
                             ))}
                           </div>
                         </div>

                         <div>
                           <h4 className="font-bold text-gray-900 mb-3 text-lg">📈 Weather Trend</h4>
                           <p className="text-gray-700 leading-relaxed">
                             {weatherData.search_insights?.weather_trend}
                           </p>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Enhanced Listings Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {weatherEnhancedListings.slice(0, 6).map((listing, index) => (
                       <PropertyCard key={listing.id} listing={listing} index={index} />
                     ))}
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Regular Results Header */}
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-4xl font-bold text-gray-900 mb-2">
                 {showWeatherSearch ? '🏘️ All Properties' : 
                  advancedResults.length > 0 ? '🏘️ Other Properties' : 
                  '✨ Available Properties'}
               </h2>
               <p className="text-xl text-gray-600">
                 {loading ? 'Loading amazing places...' : `Found ${pagination.total_count} authentic village experiences`}
               </p>
             </div>
             
             <div className="flex items-center space-x-4">
               <div className="flex bg-gray-100 rounded-2xl p-2">
                 <motion.button
                   onClick={() => setViewMode('grid')}
                   className={`p-3 rounded-xl transition-all duration-300 ${
                     viewMode === 'grid' 
                       ? 'bg-white shadow-md text-blue-600' 
                       : 'hover:bg-gray-200 text-gray-600'
                   }`}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   title="Grid View"
                 >
                   <Squares2X2Icon className="w-5 h-5" />
                 </motion.button>
                 
                 <motion.button
                   onClick={() => setViewMode('list')}
                   className={`p-3 rounded-xl transition-all duration-300 ${
                     viewMode === 'list' 
                       ? 'bg-white shadow-md text-blue-600' 
                       : 'hover:bg-gray-200 text-gray-600'
                   }`}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   title="List View"
                 >
                   <ListBulletIcon className="w-5 h-5" />
                 </motion.button>
                 
                 <motion.button
                   onClick={() => setShowMapView(true)}
                   className="p-3 rounded-xl transition-all duration-300 hover:bg-gray-200 text-gray-600 hover:text-blue-600 relative group"
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   title="3D Map View"
                 >
                   <GlobeAltIcon className="w-5 h-5" />
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                 </motion.button>
               </div>
             </div>
           </div>

           {/* Listings Grid/List */}
           {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
               {[...Array(8)].map((_, i) => (
                 <div
                   key={i}
                   className="bg-white border border-gray-200 rounded-3xl overflow-hidden animate-pulse"
                 >
                   <div className="w-full h-64 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
                   <div className="p-6">
                     <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg mb-3"></div>
                     <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded mb-2 w-2/3"></div>
                     <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2"></div>
                   </div>
                 </div>
               ))}
             </div>
           ) : displayListings.length > 0 ? (
             <>
               <div
                 className={
                   viewMode === "grid"
                     ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                     : "space-y-6"
                 }
               >
                 {displayListings.map((listing, index) =>
                   advancedResults.length > 0 ? (
                     <EnhancedPropertyCard
                       key={listing.id}
                       listing={listing}
                       index={index}
                       searchType={searchMetadata?.type}
                     />
                   ) : (
                     <PropertyCard
                       key={listing.id}
                       listing={listing}
                       index={index}
                     />
                   )
                 )}
               </div>

               {/* Enhanced Pagination */}
               {pagination.total_pages > 1 &&
                 !advancedResults.length &&
                 !showWeatherSearch && (
                   <div className="mt-16 flex justify-center">
                     <div className="flex items-center space-x-3">
                       <motion.button
                         onClick={() =>
                           setPagination((prev) => ({
                             ...prev,
                             page: prev.page - 1,
                           }))
                         }
                         disabled={pagination.page === 1}
                         className="px-6 py-3 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-all duration-300"
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                       >
                         ← Previous
                       </motion.button>

                       {[...Array(Math.min(pagination.total_pages, 5))].map(
                         (_, i) => {
                           const pageNum =
                             pagination.page <= 3
                               ? i + 1
                               : pagination.page - 2 + i;
                           if (pageNum > pagination.total_pages) return null;

                           return (
                             <motion.button
                               key={pageNum}
                               onClick={() =>
                                 setPagination((prev) => ({
                                   ...prev,
                                   page: pageNum,
                                 }))
                               }
                               className={`px-4 py-3 text-sm rounded-xl font-medium transition-all duration-300 ${
                                 pageNum === pagination.page
                                   ? "bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg"
                                   : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                               }`}
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                             >
                               {pageNum}
                             </motion.button>
                           );
                         }
                       )}

                       <motion.button
                         onClick={() =>
                           setPagination((prev) => ({
                             ...prev,
                             page: prev.page + 1,
                           }))
                         }
                         disabled={pagination.page === pagination.total_pages}
                         className="px-6 py-3 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-all duration-300"
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                       >
                         Next →
                       </motion.button>
                     </div>
                   </div>
                 )}
             </>
           ) : (
             <div className="text-center py-20">
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="max-w-md mx-auto"
               >
                 <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-8">
                   <MagnifyingGlassIcon className="w-16 h-16 text-gray-400" />
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 mb-4">
                   No places found
                 </h3>
                 <p className="text-gray-600 mb-8 leading-relaxed">
                   We couldn't find any properties matching your criteria. Try
                   adjusting your search or filters.
                 </p>
                 <motion.button
                   onClick={clearFilters}
                   className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                 >
                   🔄 Clear All Filters
                 </motion.button>
               </motion.div>
             </div>
           )}
         </div>
       </div>
       
       <MapView 
         listings={displayListings}
         isOpen={showMapView}
         onClose={() => setShowMapView(false)}
         filters={filters}
         searchMetadata={searchMetadata}
       />
     </AppLayout>
   </Providers>
 );
};

export default ListingsPage;