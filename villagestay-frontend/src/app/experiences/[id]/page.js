'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  StarIcon,
  CurrencyRupeeIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

import { listingsAPI } from '@/lib/api';
import { formatCurrency, formatDate, getImagePlaceholder } from '@/lib/utils';
import toast from 'react-hot-toast';

const ExperienceDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchExperience();
  }, [params.id]);

  const fetchExperience = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getById(params.id);
      setExperience(response.data);
    } catch (error) {
      console.error('Failed to fetch experience:', error);
      toast.error('Experience not found');
      router.push('/experiences');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      cultural: '🎭',
      culinary: '🍛',
      farming: '🌾',
      craft: '🎨',
      spiritual: '🙏',
      adventure: '🏔️',
      wellness: '🧘',
      nature: '🌳'
    };
    return icons[category] || '✨';
  };

  if (loading) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading experience details...</p>
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Experience Not Found</h2>
          <button
            onClick={() => router.push('/experiences')}
            className="btn-primary"
          >
            Back to Experiences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to experiences</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Image Gallery */}
            <div className="card p-0 overflow-hidden">
              <div className="relative">
                <div className="aspect-video bg-gray-200">
                  <img
                    src={experience.images?.[currentImageIndex] || getImagePlaceholder(800, 400, experience.title)}
                    alt={experience.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = getImagePlaceholder(800, 400, experience.title);
                    }}
                  />
                </div>
                
                {/* Image Navigation */}
                {experience.images && experience.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {experience.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Image Thumbnails */}
              {experience.images && experience.images.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {experience.images.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          index === currentImageIndex ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${experience.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Experience Details */}
            <div className="card p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{getCategoryIcon(experience.category)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(experience.difficulty_level)}`}>
                      {experience.difficulty_level}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium capitalize">
                      {experience.category}
                    </span>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {experience.title}
                  </h1>
                  
                  <div className="flex items-center space-x-6 text-gray-600 mb-6">
                    <div className="flex items-center space-x-2">
                      <MapPinIcon className="w-5 h-5" />
                      <span>{experience.location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-5 h-5" />
                      <span>{experience.duration} hour{experience.duration > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <UsersIcon className="w-5 h-5" />
                      <span>Up to {experience.max_participants} people</span>
                    </div>
                    
                    {experience.rating > 0 && (
                      <div className="flex items-center space-x-2">
                        <StarIcon className="w-5 h-5 text-yellow-400" />
                        <span>{experience.rating} ({experience.review_count} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">About this experience</h3>
                <p className="text-gray-700 leading-relaxed">
                  {experience.description}
                </p>
              </div>

              {/* What's Included */}
              {experience.inclusions && experience.inclusions.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">What's included</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {experience.inclusions.map((inclusion, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{inclusion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Host Information */}
              {experience.host && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Your host</h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      {experience.host.profile_image ? (
                        <img
                          src={experience.host.profile_image}
                          alt={experience.host.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {experience.host.full_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {experience.host.full_name}
                      </h4>
                      <p className="text-gray-600">
                        Host since {formatDate(experience.host.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reviews */}
            {experience.reviews && experience.reviews.length > 0 && (
              <div className="card p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Reviews ({experience.review_count})
                </h3>
                <div className="space-y-6">
                  {experience.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {review.reviewer.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {review.reviewer.full_name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <CurrencyRupeeIcon className="w-6 h-6 text-green-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(experience.price_per_person)}
                  </span>
                </div>
                <p className="text-gray-600">per person</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{experience.duration} hours</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Group size:</span>
                  <span className="font-medium">Up to {experience.max_participants} people</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(experience.difficulty_level)}`}>
                    {experience.difficulty_level}
                  </span>
                </div>
              </div>

              <button className="w-full btn-primary mb-4">
                <CalendarDaysIcon className="w-5 h-5 mr-2" />
                Book Experience
              </button>

              <p className="text-xs text-gray-500 text-center">
                You won't be charged yet
              </p>

              {/* Quick Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Good to know</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    <span>Authentic local experience</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    <span>Small group setting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    <span>All skill levels welcome</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceDetailPage;