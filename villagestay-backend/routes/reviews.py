from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import mongo
from bson import ObjectId
from datetime import datetime, timedelta
import statistics

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/create', methods=['POST'])
@jwt_required()
def create_review():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['booking_id', 'rating', 'comment']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400
        
        # Get booking details
        booking = mongo.db.bookings.find_one({"_id": ObjectId(data['booking_id'])})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify user is part of this booking
        if str(booking['tourist_id']) != user_id and str(booking['host_id']) != user_id:
            return jsonify({"error": "Unauthorized to review this booking"}), 403
        
        # Check if booking is completed
        if booking['status'] != 'completed':
            return jsonify({"error": "Can only review completed bookings"}), 400
        
        # Check if review already exists
        existing_review = mongo.db.reviews.find_one({
            "booking_id": ObjectId(data['booking_id']),
            "reviewer_id": ObjectId(user_id)
        })
        if existing_review:
            return jsonify({"error": "Review already exists for this booking"}), 400
        
        # Determine review type and reviewee
        if str(booking['tourist_id']) == user_id:
            review_type = 'tourist_to_host'
            reviewee_id = booking['host_id']
        else:
            review_type = 'host_to_tourist'
            reviewee_id = booking['tourist_id']
        
        # Validate rating
        if not isinstance(data['rating'], (int, float)) or data['rating'] < 1 or data['rating'] > 5:
            return jsonify({"error": "Rating must be between 1 and 5"}), 400
        
        # Create review document
        review_doc = {
            "booking_id": ObjectId(data['booking_id']),
            "listing_id": ObjectId(booking['listing_id']),
            "reviewer_id": ObjectId(user_id),
            "reviewee_id": ObjectId(reviewee_id),
            "rating": float(data['rating']),
            "comment": data['comment'],
            "review_type": review_type,
            "categories": data.get('categories', {}),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_verified": True,  # Auto-verify for completed bookings
            "helpful_votes": 0,
            "response": None,
            "response_date": None,
            "photos": data.get('photos', []),
            "status": 'active'
        }
        
        # Insert review
        result = mongo.db.reviews.insert_one(review_doc)
        
        # Update listing average rating if it's a tourist review
        if review_type == 'tourist_to_host':
            update_listing_rating(booking['listing_id'])
        
        # Update user ratings
        update_user_rating(reviewee_id, review_type)
        
        return jsonify({
            "message": "Review created successfully",
            "review_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error creating review: {e}")
        return jsonify({"error": str(e)}), 500

@reviews_bp.route('/listing/<listing_id>', methods=['GET'])
def get_listing_reviews(listing_id):
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        sort_by = request.args.get('sort', 'newest')  # newest, oldest, highest, lowest
        
        # Build sort criteria
        sort_criteria = []
        if sort_by == 'newest':
            sort_criteria.append(('created_at', -1))
        elif sort_by == 'oldest':
            sort_criteria.append(('created_at', 1))
        elif sort_by == 'highest':
            sort_criteria.append(('rating', -1))
        elif sort_by == 'lowest':
            sort_criteria.append(('rating', 1))
        
        # Get reviews with pagination
        skip = (page - 1) * limit
        
        pipeline = [
            {
                "$match": {
                    "listing_id": ObjectId(listing_id),
                    "review_type": "tourist_to_host",
                    "status": "active"
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "reviewer_id",
                    "foreignField": "_id",
                    "as": "reviewer"
                }
            },
            {"$unwind": "$reviewer"},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},  # Convert ObjectId to string
                    "rating": 1,
                    "comment": 1,
                    "categories": 1,
                    "created_at": {"$dateToString": {"date": "$created_at", "format": "%Y-%m-%dT%H:%M:%S.%LZ"}},  # Convert date to string
                    "helpful_votes": 1,
                    "response": 1,
                    "response_date": {
                        "$cond": {
                            "if": "$response_date",
                            "then": {"$dateToString": {"date": "$response_date", "format": "%Y-%m-%dT%H:%M:%S.%LZ"}},
                            "else": None
                        }
                    },
                    "photos": 1,
                    "reviewer": {
                        "_id": {"$toString": "$reviewer._id"},  # Convert reviewer ID to string
                        "full_name": "$reviewer.full_name",
                        "profile_image": "$reviewer.profile_image"
                    }
                }
            },
            {"$sort": dict(sort_criteria)} if sort_criteria else {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        reviews = list(mongo.db.reviews.aggregate(pipeline))
        
        # Get total count
        total_count = mongo.db.reviews.count_documents({
            "listing_id": ObjectId(listing_id),
            "review_type": "tourist_to_host",
            "status": "active"
        })
        
        # Get rating statistics
        rating_stats = get_listing_rating_stats(listing_id)
        
        return jsonify({
            "reviews": reviews,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit
            },
            "rating_stats": rating_stats
        }), 200
        
    except Exception as e:
        print(f"Error getting listing reviews: {e}")
        return jsonify({"error": str(e)}), 500


@reviews_bp.route('/user/<user_id>', methods=['GET'])
def get_user_reviews(user_id):
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        review_type = request.args.get('type', 'received')  # received, given
        
        skip = (page - 1) * limit
        
        # Build match criteria
        if review_type == 'received':
            match_criteria = {"reviewee_id": ObjectId(user_id)}
        else:
            match_criteria = {"reviewer_id": ObjectId(user_id)}
        
        match_criteria["status"] = "active"
        
        pipeline = [
            {"$match": match_criteria},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "reviewer_id" if review_type == 'received' else "reviewee_id",
                    "foreignField": "_id",
                    "as": "other_user"
                }
            },
            {"$unwind": "$other_user"},
            {
                "$lookup": {
                    "from": "listings",
                    "localField": "listing_id",
                    "foreignField": "_id",
                    "as": "listing"
                }
            },
            {"$unwind": "$listing"},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},  # Convert ObjectId to string
                    "rating": 1,
                    "comment": 1,
                    "review_type": 1,
                    "created_at": {"$dateToString": {"date": "$created_at", "format": "%Y-%m-%dT%H:%M:%S.%LZ"}},
                    "response": 1,
                    "response_date": {
                        "$cond": {
                            "if": "$response_date",
                            "then": {"$dateToString": {"date": "$response_date", "format": "%Y-%m-%dT%H:%M:%S.%LZ"}},
                            "else": None
                        }
                    },
                    "other_user": {
                        "_id": {"$toString": "$other_user._id"},
                        "full_name": "$other_user.full_name",
                        "profile_image": "$other_user.profile_image"
                    },
                    "listing": {
                        "_id": {"$toString": "$listing._id"},
                        "title": "$listing.title",
                        "images": {"$arrayElemAt": ["$listing.images", 0]}
                    }
                }
            },
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        reviews = list(mongo.db.reviews.aggregate(pipeline))
        
        total_count = mongo.db.reviews.count_documents(match_criteria)
        
        return jsonify({
            "reviews": reviews,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting user reviews: {e}")
        return jsonify({"error": str(e)}), 500

@reviews_bp.route('/<review_id>/respond', methods=['POST'])
@jwt_required()
def respond_to_review(review_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('response'):
            return jsonify({"error": "Response text is required"}), 400
        
        # Get review
        review = mongo.db.reviews.find_one({"_id": ObjectId(review_id)})
        if not review:
            return jsonify({"error": "Review not found"}), 404
        
        # Verify user can respond (only reviewee can respond)
        if str(review['reviewee_id']) != user_id:
            return jsonify({"error": "Unauthorized to respond to this review"}), 403
        
        # Check if response already exists
        if review.get('response'):
            return jsonify({"error": "Response already exists"}), 400
        
        # Update review with response
        mongo.db.reviews.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$set": {
                    "response": data['response'],
                    "response_date": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return jsonify({"message": "Response added successfully"}), 200
        
    except Exception as e:
        print(f"Error responding to review: {e}")
        return jsonify({"error": str(e)}), 500

@reviews_bp.route('/<review_id>/helpful', methods=['POST'])
@jwt_required()
def mark_helpful(review_id):
    try:
        user_id = get_jwt_identity()
        
        # Check if user already marked this review as helpful
        existing_vote = mongo.db.review_votes.find_one({
            "review_id": ObjectId(review_id),
            "user_id": ObjectId(user_id)
        })
        
        if existing_vote:
            return jsonify({"error": "Already marked as helpful"}), 400
        
        # Add vote record
        mongo.db.review_votes.insert_one({
            "review_id": ObjectId(review_id),
            "user_id": ObjectId(user_id),
            "created_at": datetime.utcnow()
        })
        
        # Increment helpful votes count
        mongo.db.reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$inc": {"helpful_votes": 1}}
        )
        
        return jsonify({"message": "Marked as helpful"}), 200
        
    except Exception as e:
        print(f"Error marking helpful: {e}")
        return jsonify({"error": str(e)}), 500

# FIX: Update this route to properly handle the booking_id parameter
@reviews_bp.route('/booking/<booking_id>/can-review', methods=['GET'])
@jwt_required()
def can_review_booking(booking_id):  # Add booking_id parameter here
    try:
        user_id = get_jwt_identity()
        
        print(f"Checking review eligibility for booking: {booking_id}, user: {user_id}")  # Debug log
        
        # Validate booking_id format
        if not ObjectId.is_valid(booking_id):
            return jsonify({"error": "Invalid booking ID format"}), 400
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            print(f"Booking not found: {booking_id}")  # Debug log
            return jsonify({"error": "Booking not found"}), 404
        
        print(f"Found booking: {booking['_id']}, status: {booking['status']}")  # Debug log
        
        # Check if user is part of booking
        if str(booking['tourist_id']) != user_id and str(booking['host_id']) != user_id:
            print(f"User {user_id} not authorized for booking {booking_id}")  # Debug log
            return jsonify({"error": "Unauthorized"}), 403
        
        # Check booking status and dates
        is_completed = booking['status'] == 'completed'
        checkout_passed = datetime.utcnow() > booking['check_out']
        
        can_review = is_completed and checkout_passed
        
        print(f"Booking status check - completed: {is_completed}, checkout_passed: {checkout_passed}")  # Debug log
        
        # Check if review already exists
        existing_review = mongo.db.reviews.find_one({
            "booking_id": ObjectId(booking_id),
            "reviewer_id": ObjectId(user_id)
        })
        
        has_reviewed = bool(existing_review)
        print(f"Review check - has_reviewed: {has_reviewed}")  # Debug log
        
        # Calculate review deadline (30 days after checkout)
        review_deadline = None
        if can_review:
            review_deadline = (booking['check_out'] + timedelta(days=30)).isoformat()
        
        result = {
            "can_review": can_review and not has_reviewed,
            "booking_status": booking['status'],
            "has_reviewed": has_reviewed,
            "review_deadline": review_deadline,
            "is_completed": is_completed,
            "checkout_passed": checkout_passed
        }
        
        print(f"Returning result: {result}")  # Debug log
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in can_review_booking: {e}")  # Debug log
        return jsonify({"error": str(e)}), 500

def update_listing_rating(listing_id):
    """Update listing's average rating based on reviews"""
    try:
        pipeline = [
            {
                "$match": {
                    "listing_id": ObjectId(listing_id),
                    "review_type": "tourist_to_host",
                    "status": "active"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "average_rating": {"$avg": "$rating"},
                    "total_reviews": {"$sum": 1}
                }
            }
        ]
        
        result = list(mongo.db.reviews.aggregate(pipeline))
        
        if result:
            avg_rating = round(result[0]['average_rating'], 1)
            review_count = result[0]['total_reviews']
            
            mongo.db.listings.update_one(
                {"_id": ObjectId(listing_id)},
                {
                    "$set": {
                        "rating": avg_rating,
                        "review_count": review_count,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            print(f"Updated listing {listing_id} rating to {avg_rating} with {review_count} reviews")
    except Exception as e:
        print(f"Error updating listing rating: {e}")

def update_user_rating(user_id, review_type):
    """Update user's average rating"""
    try:
        pipeline = [
            {
                "$match": {
                    "reviewee_id": ObjectId(user_id),
                    "status": "active"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "average_rating": {"$avg": "$rating"},
                    "total_reviews": {"$sum": 1}
                }
            }
        ]
        
        result = list(mongo.db.reviews.aggregate(pipeline))
        
        if result:
            avg_rating = round(result[0]['average_rating'], 1)
            review_count = result[0]['total_reviews']
            
            mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "average_rating": avg_rating,
                        "review_count": review_count,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            print(f"Updated user {user_id} rating to {avg_rating} with {review_count} reviews")
    except Exception as e:
        print(f"Error updating user rating: {e}")

def get_listing_rating_stats(listing_id):
    """Get detailed rating statistics for a listing"""
    try:
        pipeline = [
            {
                "$match": {
                    "listing_id": ObjectId(listing_id),
                    "review_type": "tourist_to_host",
                    "status": "active"
                }
            },
            {
                "$group": {
                    "_id": "$rating",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": -1}}
        ]
        
        rating_distribution = list(mongo.db.reviews.aggregate(pipeline))
        
        # Calculate overall stats
        all_ratings = []
        total_reviews = 0
        
        for item in rating_distribution:
            rating = item['_id']
            count = item['count']
            all_ratings.extend([rating] * count)
            total_reviews += count
        
        if not all_ratings:
            return {
                "average_rating": 0,
                "total_reviews": 0,
                "rating_distribution": {},
                "recommendation_percentage": 0
            }
        
        average_rating = sum(all_ratings) / len(all_ratings)
        recommendation_percentage = (len([r for r in all_ratings if r >= 4]) / len(all_ratings)) * 100
        
        # Format distribution
        distribution = {str(i): 0 for i in range(1, 6)}
        for item in rating_distribution:
            distribution[str(item['_id'])] = item['count']
        
        return {
            "average_rating": round(average_rating, 1),
            "total_reviews": total_reviews,
            "rating_distribution": distribution,
            "recommendation_percentage": round(recommendation_percentage, 1)
        }
        
    except Exception as e:
        print(f"Error getting rating stats: {e}")
        return {
            "average_rating": 0,
            "total_reviews": 0,
            "rating_distribution": {},
            "recommendation_percentage": 0
        }