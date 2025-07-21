'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  StarIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ShareIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Providers from '@/components/providers/Providers';
import AppLayout from '@/components/layout/AppLayout';
import { listingsAPI, bookingsAPI, impactAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getImagePlaceholder, calculateNights, getAmenityIcon } from '@/lib/utils';
import toast from 'react-hot-toast';

const ListingDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isTourist } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [sustainabilityScore, setSustainabilityScore] = useState(null);
  const [bookingData, setBookingData] = useState({
    check_in: '',
    check_out: '',
    guests: 1,
    special_requests: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchListing();
      fetchSustainabilityScore();
    }
  }, [params.id]);

  const fetchListing = async () => {
    try {
      const response = await listingsAPI.getById(params.id);
      setListing(response.data);
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      toast.error('Failed to load listing details');
      router.push('/listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSustainabilityScore = async () => {
    try {
      const response = await impactAPI.getSustainabilityScore(params.id);
      setSustainabilityScore(response.data);
    } catch (error) {
      console.error('Failed to fetch sustainability score:', error);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to make a booking');
      router.push('/auth/login');
      return;
    }

    if (!isTourist) {
      toast.error('Only tourists can make bookings');
      return;
    }

    setBookingLoading(true);
    try {
      const response = await bookingsAPI.create({
        listing_id: params.id,
        ...bookingData
      });

      toast.success('Booking created successfully!');
      router.push(`/tourist/bookings/${response.data.booking_id}`);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create booking';
      toast.error(message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: listing.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const calculateTotal = () => {
    if (!bookingData.check_in || !bookingData.check_out) return 0;
    const nights = calculateNights(bookingData.check_in, bookingData.check_out);
    const baseAmount = listing.price_per_night * nights;
    const platformFee = baseAmount * 0.05;
    return baseAmount + platformFee;
  };

  if (loading) {
    return (
      <Providers>
        <AppLayout>
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading village details...</p>
            </div>
          </div>
        </AppLayout>
      </Providers>
    );
  }

  if (!listing) {
    return (
      <Providers>
        <AppLayout>
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Village not found</h2>
              <Link href="/listings" className="btn-primary">
                Browse Other Villages
              </Link>
            </div>
          </div>
        </AppLayout>
      </Providers>
    );
  }

  const images = listing.images?.length > 0 ? listing.images : [getImagePlaceholder(800, 600, listing.title)];

  return (
    <Providers>
      <AppLayout>
        <div className="min-h-screen village-bg pt-20">
          {/* Back Button */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span>Back to listings</span>
            </button>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {listing.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">{listing.rating || '4.8'}</span>
                      <span>({listing.review_count || 24} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="w-5 h-5" />
                      <span>{listing.location}</span>
                    </div>
                    {sustainabilityScore && (
                      <div className="flex items-center space-x-1">
                        <SparklesIcon className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">
                          Sustainability: {sustainabilityScore.grade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    <ShareIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={toggleFavorite}
                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    {isFavorite ? (
                      <HeartSolidIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartIcon className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Images Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <div className="relative rounded-2xl overflow-hidden group">
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-96 lg:h-[500px] object-cover"
                    onError={(e) => {
                      e.target.src = getImagePlaceholder(800, 500, listing.title);
                    }}
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                      
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {images.length > 1 && (
                <div className="lg:col-span-1 hidden lg:block">
                  <div className="grid grid-cols-1 gap-4 h-[500px] overflow-y-auto">
                    {images.slice(1, 5).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index + 1)}
                        className="rounded-xl overflow-hidden hover:opacity-80 transition-opacity duration-200"
                      >
                        <img
                          src={image}
                          alt={`${listing.title} ${index + 2}`}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            e.target.src = getImagePlaceholder(200, 100, listing.title);
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Property Info */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 capitalize">
                        {listing.property_type?.replace('_', ' ')} hosted by {listing.host?.full_name}
                      </h2>
                      <p className="text-gray-600">
                        Up to {listing.max_guests} guests
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {listing.host?.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">{listing.description}</p>
                  </div>
                </div>

                {/* Amenities */}
                {listing.amenities?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listing.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <span className="text-2xl">{getAmenityIcon(amenity)}</span>
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sustainability Features */}
                {listing.sustainability_features?.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <SparklesIcon className="w-6 h-6 text-green-500" />
                      <h3 className="text-xl font-semibold text-gray-900">Sustainability Features</h3>
                      {sustainabilityScore && (
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">
                          Grade {sustainabilityScore.grade}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listing.sustainability_features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckIcon className="w-5 h-5 text-green-500" />
                          <span className="text-gray-700 capitalize">{feature.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* House Rules */}
                {listing.house_rules?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">House Rules</h3>
                    <div className="space-y-2">
                      {listing.house_rules.map((rule, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <ShieldCheckIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                          <span className="text-gray-700">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiences */}
                {listing.experiences?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Local Experiences</h3>
                    <div className="space-y-4">
                      {listing.experiences.map((experience, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1">{experience.title}</h4>
                              <p className="text-gray-600 text-sm mb-2">{experience.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Duration: {experience.duration}h</span>
                                <span>Max: {experience.max_participants} people</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(experience.price)}
                              </div>
                              <div className="text-sm text-gray-500">per person</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {listing.reviews?.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <StarIcon className="w-6 h-6 text-yellow-400" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {listing.rating || '4.8'} · {listing.review_count || listing.reviews.length} reviews
                      </h3>
                    </div>
                    <div className="space-y-6">
                      {listing.reviews.slice(0, 3).map((review, index) => (
                        <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold">
                                {review.reviewer?.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{review.reviewer?.full_name || 'Anonymous'}</h4>
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
                              </div>
                              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                              <p className="text-sm text-gray-500 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {listing.reviews.length > 3 && (
                      <button className="mt-4 text-green-600 hover:text-green-700 font-medium">
                        Show all {listing.reviews.length} reviews
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Booking Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(listing.price_per_night)}
                          <span className="text-lg font-normal text-gray-500">/night</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <StarIcon className="w-5 h-5 text-yellow-400" />
                        <span className="font-medium">{listing.rating || '4.8'}</span>
                      </div>
                    </div>

                    <form onSubmit={handleBooking} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-in
                          </label>
                          <input
                            type="date"
                            required
                            value={bookingData.check_in}
                            onChange={(e) => setBookingData(prev => ({ ...prev, check_in: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-out
                          </label>
                          <input
                            type="date"
                            required
                            value={bookingData.check_out}
                            onChange={(e) => setBookingData(prev => ({ ...prev, check_out: e.target.value }))}
                            min={bookingData.check_in || new Date().toISOString().split('T')[0]}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Guests
                        </label>
                        <select
                          value={bookingData.guests}
                          onChange={(e) => setBookingData(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                          className="input-field"
                        >
                          {[...Array(listing.max_guests)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1} guest{i > 0 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Requests (Optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Any special requests or dietary requirements?"
                          value={bookingData.special_requests}
                          onChange={(e) => setBookingData(prev => ({ ...prev, special_requests: e.target.value }))}
                          className="input-field resize-none"
                        />
                      </div>

                      {bookingData.check_in && bookingData.check_out && (
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{formatCurrency(listing.price_per_night)} × {calculateNights(bookingData.check_in, bookingData.check_out)} nights</span>
                            <span>{formatCurrency(listing.price_per_night * calculateNights(bookingData.check_in, bookingData.check_out))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Platform fee</span>
                            <span>{formatCurrency(listing.price_per_night * calculateNights(bookingData.check_in, bookingData.check_out) * 0.05)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                            <span>Total</span>
                            <span>{formatCurrency(calculateTotal())}</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={bookingLoading || !isAuthenticated}
                        className="btn-primary w-full"
                      >
                        {bookingLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="spinner mr-2"></div>
                            Processing...
                          </div>
                        ) : !isAuthenticated ? (
                          'Login to Book'
                        ) : (
                          'Reserve Now'
                        )}
                      </button>

                      {!isAuthenticated && (
                        <p className="text-center text-sm text-gray-500">
                          <Link href="/auth/login" className="text-green-600 hover:text-green-700">
                            Sign in
                          </Link> to make a booking
                        </p>
                      )}
                    </form>

                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">You won't be charged yet</p>
                    </div>
                  </div>

                  {/* Contact Host */}
                  <div className="card p-6 mt-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {listing.host?.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{listing.host?.full_name}</h4>
                        <p className="text-sm text-gray-600">Host since {new Date(listing.host?.created_at).getFullYear()}</p>
                      </div>
                    </div>
                    <button className="btn-secondary w-full flex items-center justify-center space-x-2">
                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      <span>Contact Host</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </Providers>
  );
};

export default ListingDetailPage;