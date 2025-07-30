// src/app/host/reviews/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  StarIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { reviewsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const HostReviewsPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('received'); // received, given
  const [responding, setResponding] = useState(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    if (!isHost) {
      toast.error('Access denied. Host account required.');
      router.push('/');
      return;
    }
    fetchReviews();
  }, [isHost, router, filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsAPI.getUserReviews(user.id, {
        type: filter,
        limit: 20
      });
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
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
      fetchReviews();
    } catch (error) {
      toast.error('Failed to add response');
    }
  };

  const StarRating = ({ rating }) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Reviews & Feedback ⭐
          </h1>
          <p className="text-gray-600">
            Manage reviews and feedback from your guests
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setFilter('received')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              filter === 'received'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Reviews I Received
          </button>
          <button
            onClick={() => setFilter('given')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              filter === 'given'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Reviews I Gave
          </button>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review, index) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={review.listing?.images || '/images/placeholder-village.jpg'}
                      alt={review.listing?.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {review.listing?.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {filter === 'received' ? 'From' : 'To'}: {review.other_user?.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StarRating rating={review.rating} />
                    <span className="font-medium text-gray-900">{review.rating}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>

                {/* Host Response */}
                {review.response && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-r-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">Your response</span>
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

                {/* Actions */}
                {filter === 'received' && !review.response && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setResponding(review._id)}
                      className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      <span>Respond</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No reviews yet
            </h3>
            <p className="text-gray-600">
              {filter === 'received' 
                ? 'Reviews from guests will appear here'
                : 'Reviews you give to guests will appear here'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostReviewsPage;