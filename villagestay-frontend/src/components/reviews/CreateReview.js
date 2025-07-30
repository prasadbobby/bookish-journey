// src/components/reviews/CreateReview.js
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { StarIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { reviewsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const CreateReview = ({ booking, onReviewCreated, onClose }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    categories: {
      cleanliness: 0,
      location: 0,
      value: 0,
      communication: 0,
      authenticity: 0
    },
    photos: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState({ category: null, rating: 0 });

  const categories = [
    { key: 'cleanliness', label: 'Cleanliness', icon: '✨' },
    { key: 'location', label: 'Location', icon: '📍' },
    { key: 'value', label: 'Value for Money', icon: '💰' },
    { key: 'communication', label: 'Communication', icon: '💬' },
    { key: 'authenticity', label: 'Authenticity', icon: '🏡' }
  ];

  const handleRatingClick = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleCategoryRating = (category, rating) => {
    setFormData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: rating
      }
    }));
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, e.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      toast.error('Please select an overall rating');
      return;
    }

    if (formData.comment.trim().length < 20) {
      toast.error('Please write at least 20 characters in your review');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsAPI.create({
        booking_id: booking.id,
        rating: formData.rating,
        comment: formData.comment.trim(),
        categories: formData.categories,
        photos: formData.photos
      });

      toast.success('Review submitted successfully!');
      onReviewCreated?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, onRate, onHover, size = 'w-8 h-8' }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onHover?.(0)}
          className={`${size} transition-colors duration-200 ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
          }`}
        >
          <StarIcon className="w-full h-full fill-current" />
        </button>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Write a Review</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Booking Info */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center space-x-4">
            <img
              src={booking.listing?.images?.[0] || '/images/placeholder-village.jpg'}
              alt={booking.listing?.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{booking.listing?.title}</h3>
              <p className="text-sm text-gray-600">{booking.listing?.location}</p>
              <p className="text-xs text-gray-500">
                {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Overall Rating *
            </label>
            <div className="flex items-center space-x-4">
              <StarRating
                rating={hoveredRating || formData.rating}
                onRate={handleRatingClick}
                onHover={setHoveredRating}
              />
              <span className="text-lg font-medium text-gray-700">
                {hoveredRating || formData.rating || 0}/5
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {formData.rating >= 4 ? 'Excellent!' : 
               formData.rating >= 3 ? 'Good' : 
               formData.rating >= 2 ? 'Fair' : 
               formData.rating >= 1 ? 'Poor' : 'Select rating'}
            </p>
          </div>

          {/* Category Ratings */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Rate Different Aspects
            </label>
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium text-gray-900">{category.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StarRating
                      rating={
                        hoveredCategory.category === category.key 
                          ? hoveredCategory.rating 
                          : formData.categories[category.key]
                      }
                      onRate={(rating) => handleCategoryRating(category.key, rating)}
                      onHover={(rating) => setHoveredCategory({ category: category.key, rating })}
                      size="w-6 h-6"
                    />
                    <span className="text-sm text-gray-600 w-8">
                      {formData.categories[category.key] || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Written Review */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Written Review *
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience... What made your stay special? How was the host? What would you recommend to future guests?"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              required
            />
            <div className="flex justify-between mt-2 text-sm">
              <span className={formData.comment.length >= 20 ? 'text-green-600' : 'text-gray-500'}>
                Minimum 20 characters
              </span>
              <span className="text-gray-500">
                {formData.comment.length} characters
              </span>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Add Photos (Optional)
            </label>
            <div className="space-y-4">
              <input
                type="file"
                id="review-photos"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label
                htmlFor="review-photos"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <PhotoIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to add photos</span>
                <span className="text-xs text-gray-500">Up to 5 photos, 5MB each</span>
              </label>

              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || formData.rating === 0 || formData.comment.length < 20}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default CreateReview;