// src/components/reviews/ReviewsList.js
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  StarIcon, 
  ChevronDownIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { reviewsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const ReviewsList = ({ listingId, canRespond = false, hostId = null }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_count: 0,
    total_pages: 0
  });
  const [sortBy, setSortBy] = useState('newest');
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [responding, setResponding] = useState(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [listingId, sortBy, pagination.page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsAPI.getListingReviews(listingId, {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortBy
      });

      setReviews(response.data.reviews);
      setRatingStats(response.data.rating_stats);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (reviewId) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await reviewsAPI.markHelpful(reviewId);
      toast.success('Marked as helpful!');
      fetchReviews(); // Refresh to show updated count
    } catch (error) {
      toast.error('Failed to mark as helpful');
    }
  };

  const handleRespondToReview = async (reviewId) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      await reviewsAPI.respondToReview(reviewId, {
        response: responseText.trim()
      });
      
      toast.success('Response added successfully!');
      setResponding(null);
      setResponseText('');
      fetchReviews(); // Refresh to show response
    } catch (error) {
      toast.error('Failed to add response');
    }
  };

  const StarRating = ({ rating, size = 'w-5 h-5' }) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`${size} ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const RatingDistribution = ({ stats }) => (
    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {stats.average_rating}
          </div>
          <StarRating rating={stats.average_rating} size="w-6 h-6" />
          <p className="text-gray-600 mt-2">
            Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.rating_distribution[rating] || 0;
            const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600 w-8">
                  {rating}★
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {stats.recommendation_percentage > 0 && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
            <HeartIcon className="w-5 h-5" />
            <span className="font-medium">
              {stats.recommendation_percentage}% of guests recommend this place
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (loading && reviews.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Statistics */}
      {ratingStats && <RatingDistribution stats={ratingStats} />}

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Reviews ({ratingStats?.total_reviews || 0})
        </h3>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card p-6"
            >
              <div className="flex items-start space-x-4">
                {/* Reviewer Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">
                    {review.reviewer.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>

                <div className="flex-1">
                  {/* Review Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {review.reviewer.full_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>

                  {/* Category Ratings */}
                  {review.categories && Object.keys(review.categories).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                      {Object.entries(review.categories).map(([category, rating]) => (
                        rating > 0 && (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-gray-600 capitalize">
                              {category.replace('_', ' ')}
                            </span>
                            <div className="flex items-center space-x-1">
                              <StarRating rating={rating} size="w-3 h-3" />
                              <span className="text-gray-500">{rating}</span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Review Text */}
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">
                      {expandedReviews.has(review._id) || review.comment.length <= 200
                        ? review.comment
                        : `${review.comment.substring(0, 200)}...`
                      }
                    </p>
                    
                    {review.comment.length > 200 && (
                      <button
                        onClick={() => toggleExpanded(review._id)}
                        className="text-green-600 hover:text-green-700 font-medium text-sm mt-2 flex items-center space-x-1"
                      >
                        <span>
                          {expandedReviews.has(review._id) ? 'Show less' : 'Read more'}
                        </span>
                        <ChevronDownIcon 
                          className={`w-4 h-4 transition-transform ${
                            expandedReviews.has(review._id) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                    )}
                  </div>

                  {/* Review Photos */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {review.photos.map((photo, photoIndex) => (
                        <img
                          key={photoIndex}
                          src={photo}
                          alt={`Review photo ${photoIndex + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Host Response */}
                  {review.response && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4 rounded-r-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Response from host</span>
                        <span className="text-sm text-blue-600">
                          {formatDate(review.response_date)}
                        </span>
                      </div>
                      <p className="text-blue-800">{review.response}</p>
                    </div>
                  )}

                  {/* Response Form */}
                  {responding === review._id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write your response to this review..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <div className="flex space-x-3 mt-3">
                        <button
                          onClick={() => handleRespondToReview(review._id)}
                          className="btn-primary py-2 px-4 text-sm"
                        >
                          Post Response
                        </button>
                        <button
                          onClick={() => {
                            setResponding(null);
                            setResponseText('');
                          }}
                          className="btn-secondary py-2 px-4 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleMarkHelpful(review._id)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <HeartIcon className="w-4 h-4" />
                      <span className="text-sm">
                        Helpful ({review.helpful_votes})
                      </span>
                    </button>

                    {canRespond && !review.response && hostId && (
                      <button
                        onClick={() => setResponding(review._id)}
                        className="text-green-600 hover:text-green-700 font-medium text-sm"
                      >
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                  const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i;
                  if (pageNum > pagination.total_pages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      className={`px-3 py-2 rounded-lg font-medium ${
                        pageNum === pagination.page
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.total_pages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-600">Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;