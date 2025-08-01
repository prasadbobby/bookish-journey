from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from utils.geocoding_utils import get_coordinates_from_location, validate_coordinates
from utils.ai_utils import generate_listing_content, translate_text, generate_pricing_suggestion
from utils.geocoding_utils import get_coordinates_from_location, validate_coordinates, get_location_suggestions, get_place_details
from datetime import datetime, timedelta
import math
from utils.semantic_search_utils import (
    semantic_search_listings, 
    emotion_based_search, 
    image_based_search
)

import base64
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io

listings_bp = Blueprint('listings', __name__)


def get_listing_videos(listing_id):
    """Helper function to get videos for a listing"""
    try:
        videos = list(mongo.db.village_story_videos.find({
            "listing_id": ObjectId(listing_id),
            "status": "completed"
        }).sort("generated_at", -1))
        
        formatted_videos = []
        for video in videos:
            video_data = {
                "id": str(video["_id"]),
                "video_id": video["video_id"],
                "video_filename": video["video_filename"],
                "video_url": f"/api/ai-features/videos/{video['video_filename']}",
                "download_url": f"/api/ai-features/videos/{video['video_filename']}/download",
                "duration": video.get("duration", 30),
                "file_size": video.get("file_size", 0),
                "generated_at": video["generated_at"].isoformat(),
                "prompt_used": video.get("prompt_used", "")
            }
            formatted_videos.append(video_data)
        
        return formatted_videos
    except Exception as e:
        print(f"Error getting listing videos: {e}")
        return []



@listings_bp.route('/', methods=['GET', 'OPTIONS'])
def get_listings():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        location = request.args.get('location', '')
        property_type = request.args.get('property_type', '')
        min_price = request.args.get('min_price', type=int)
        max_price = request.args.get('max_price', type=int)
        guests = request.args.get('guests', type=int)
        
        # Build query
        query = {"is_active": True, "is_approved": True}
        
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        
        if property_type:
            query["property_type"] = property_type
        
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            query["price_per_night"] = price_query
        
        if guests:
            query["max_guests"] = {"$gte": guests}
        
        # Get total count
        total = mongo.db.listings.count_documents(query)
        
        # Get listings with pagination
        skip = (page - 1) * limit
        listings = list(mongo.db.listings.find(query)
                       .sort("created_at", -1)
                       .skip(skip)
                       .limit(limit))
        
        # Format listings
        formatted_listings = []
        for listing in listings:
            # Get host info
            host = mongo.db.users.find_one({"_id": listing['host_id']})
            
            formatted_listing = {
                "id": str(listing['_id']),
                "title": listing['title'],
                "description": listing['description'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "property_type": listing['property_type'],
                "amenities": listing.get('amenities', []),
                "images": listing.get('images', []),
                "coordinates": listing.get('coordinates', {}),
                "max_guests": listing.get('max_guests', 4),
                "sustainability_features": listing.get('sustainability_features', []),
                "rating": listing.get('rating', 0),
                "review_count": listing.get('review_count', 0),
                "has_village_story": listing.get('has_village_story', False),
                "created_at": listing['created_at'].isoformat() if 'created_at' in listing else None,
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "profile_image": host.get('profile_image')
                } if host else None
            }
            formatted_listings.append(formatted_listing)
        
        return jsonify({
            "listings": formatted_listings,
            "pagination": {
                "current_page": page,
                "total_pages": (total + limit - 1) // limit,
                "total_listings": total,
                "has_next": page * limit < total,
                "has_prev": page > 1
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting listings: {e}")
        return jsonify({"error": str(e)}), 500

@listings_bp.route('/<listing_id>', methods=['GET', 'OPTIONS'])
def get_listing(listing_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        print(f"📖 Getting listing: {listing_id}")
        
        # Validate ObjectId
        if not ObjectId.is_valid(listing_id):
            return jsonify({"error": "Invalid listing ID"}), 400
        
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        print(f"✅ Found listing: {listing['title']}")
        
        # Get host information
        host = mongo.db.users.find_one({"_id": listing['host_id']})
        
        # Get listing videos
        videos = get_listing_videos(listing_id)
        print(f"🎬 Found {len(videos)} videos for listing")
        
        # Get reviews
        reviews = list(mongo.db.reviews.find({
            "listing_id": ObjectId(listing_id),
            "status": "active"
        }).sort("created_at", -1).limit(10))
        
        formatted_reviews = []
        for review in reviews:
            reviewer = mongo.db.users.find_one({"_id": review['reviewer_id']})
            formatted_review = {
                "id": str(review['_id']),
                "rating": review['rating'],
                "comment": review['comment'],
                "created_at": review['created_at'].isoformat() if 'created_at' in review else None,
                "reviewer": {
                    "full_name": reviewer['full_name'] if reviewer else "Anonymous",
                    "profile_image": reviewer.get('profile_image') if reviewer else None
                }
            }
            formatted_reviews.append(formatted_review)
        
        # Format listing data
        listing_data = {
            "id": str(listing['_id']),
            "title": listing['title'],
            "description": listing['description'],
            "location": listing['location'],
            "price_per_night": listing['price_per_night'],
            "property_type": listing['property_type'],
            "amenities": listing.get('amenities', []),
            "images": listing.get('images', []),
            "coordinates": listing.get('coordinates', {}),
            "max_guests": listing.get('max_guests', 4),
            "house_rules": listing.get('house_rules', []),
            "sustainability_features": listing.get('sustainability_features', []),
            "experiences": listing.get('experiences', []),
            "rating": listing.get('rating', 0),
            "review_count": listing.get('review_count', 0),
            "created_at": listing['created_at'].isoformat() if 'created_at' in listing else None,
            "is_active": listing.get('is_active', True),
            "is_approved": listing.get('is_approved', False),
            "has_village_story": listing.get('has_village_story', False),
            "village_story_videos": videos,  # Add videos array
            "village_story_video": videos[0] if videos else None,  # Add latest video for backward compatibility
            "reviews": formatted_reviews,
            "host": {
                "id": str(host['_id']),
                "full_name": host['full_name'],
                "created_at": host['created_at'].isoformat() if 'created_at' in host else None,
                "profile_image": host.get('profile_image')
            } if host else None
        }
        
        print(f"📦 Returning listing data with {len(videos)} videos")
        return jsonify(listing_data), 200
        
    except Exception as e:
        print(f"❌ Error getting listing: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@listings_bp.route('/', methods=['POST'])
@jwt_required()
def create_listing():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can create listings"}), 403
        
        # Required fields validation
        required_fields = ['title', 'description', 'location', 'price_per_night', 'property_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Create listing document
        listing_doc = {
            "host_id": ObjectId(user_id),
            "title": data['title'],
            "description": data['description'],
            "location": data['location'],
            "price_per_night": float(data['price_per_night']),
            "property_type": data['property_type'],
            "amenities": data.get('amenities', []),
            "images": data.get('images', []),
            "coordinates": data.get('coordinates', {}),
            "max_guests": int(data.get('max_guests', 4)),
            "house_rules": data.get('house_rules', []),
            "sustainability_features": data.get('sustainability_features', []),
            "experiences": data.get('experiences', []),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "is_approved": False,  # Needs admin approval
            "rating": 0.0,
            "review_count": 0,
            "has_village_story": False,
            "availability_calendar": {}
        }
        
        # Insert listing
        result = mongo.db.listings.insert_one(listing_doc)
        
        return jsonify({
            "message": "Listing created successfully",
            "listing_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error creating listing: {e}")
        return jsonify({"error": str(e)}), 500



# Add new route for geocoding validation
@listings_bp.route('/geocode', methods=['POST'])
@jwt_required()
def geocode_location():
    """
    Endpoint to validate and geocode a location before creating listing
    """
    try:
        data = request.get_json()
        location = data.get('location', '').strip()
        
        if not location:
            return jsonify({"error": "Location is required"}), 400
        
        # Get coordinates from location
        geocoding_result = get_coordinates_from_location(location)
        
        return jsonify({
            "success": True,
            "coordinates": {
                "lat": geocoding_result['lat'],
                "lng": geocoding_result['lng']
            },
            "formatted_address": geocoding_result['formatted_address'],
            "place_id": geocoding_result.get('place_id'),
            "types": geocoding_result.get('types', [])
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@listings_bp.route('/<listing_id>', methods=['PUT'])
@jwt_required()
def update_listing(listing_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get listing
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        # Verify ownership
        if str(listing['host_id']) != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Update fields
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        updatable_fields = [
            'title', 'description', 'location', 'price_per_night', 
            'property_type', 'amenities', 'images', 'coordinates',
            'max_guests', 'house_rules', 'sustainability_features', 'experiences'
        ]
        
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Update listing
        mongo.db.listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": update_data}
        )
        
        return jsonify({"message": "Listing updated successfully"}), 200
        
    except Exception as e:
        print(f"Error updating listing: {e}")
        return jsonify({"error": str(e)}), 500


@listings_bp.route('/<listing_id>', methods=['DELETE'])
@jwt_required()
def delete_listing(listing_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify ownership
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        if str(listing['host_id']) != user_id:
            return jsonify({"error": "Unauthorized to delete this listing"}), 403
        
        # Soft delete by setting is_active to False
        mongo.db.listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        return jsonify({"message": "Listing deleted successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@listings_bp.route('/search', methods=['GET', 'OPTIONS'])
def search_listings():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        # Get search parameters
        query = request.args.get('q', '')
        location = request.args.get('location', '')
        property_type = request.args.get('property_type', '')
        min_price = request.args.get('min_price', type=int)
        max_price = request.args.get('max_price', type=int)
        guests = request.args.get('guests', type=int)
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        
        # Build search query
        search_query = {"is_active": True, "is_approved": True}
        
        if query:
            search_query["$or"] = [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"location": {"$regex": query, "$options": "i"}},
                {"amenities": {"$in": [query]}}
            ]
        
        if location:
            search_query["location"] = {"$regex": location, "$options": "i"}
        
        if property_type:
            search_query["property_type"] = property_type
        
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            search_query["price_per_night"] = price_query
        
        if guests:
            search_query["max_guests"] = {"$gte": guests}
        
        # Execute search
        total = mongo.db.listings.count_documents(search_query)
        skip = (page - 1) * limit
        
        listings = list(mongo.db.listings.find(search_query)
                       .sort("rating", -1)
                       .skip(skip)
                       .limit(limit))
        
        # Format results
        formatted_listings = []
        for listing in listings:
            host = mongo.db.users.find_one({"_id": listing['host_id']})
            
            formatted_listing = {
                "id": str(listing['_id']),
                "title": listing['title'],
                "description": listing['description'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "property_type": listing['property_type'],
                "amenities": listing.get('amenities', []),
                "images": listing.get('images', []),
                "coordinates": listing.get('coordinates', {}),
                "max_guests": listing.get('max_guests', 4),
                "rating": listing.get('rating', 0),
                "review_count": listing.get('review_count', 0),
                "has_village_story": listing.get('has_village_story', False),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name']
                } if host else None
            }
            formatted_listings.append(formatted_listing)
        
        return jsonify({
            "listings": formatted_listings,
            "pagination": {
                "current_page": page,
                "total_pages": (total + limit - 1) // limit,
                "total_listings": total,
                "has_next": page * limit < total,
                "has_prev": page > 1
            },
            "search_query": {
                "query": query,
                "location": location,
                "property_type": property_type,
                "min_price": min_price,
                "max_price": max_price,
                "guests": guests
            }
        }), 200
        
    except Exception as e:
        print(f"Error searching listings: {e}")
        return jsonify({"error": str(e)}), 500


@listings_bp.route('/<listing_id>/availability', methods=['GET'])
def check_listing_availability(listing_id):
   try:
       check_in = request.args.get('check_in')
       check_out = request.args.get('check_out')
       
       if not check_in or not check_out:
           return jsonify({"error": "Check-in and check-out dates are required"}), 400
       
       is_available = check_availability(listing_id, check_in, check_out)
       
       return jsonify({
           "listing_id": listing_id,
           "check_in": check_in,
           "check_out": check_out,
           "is_available": is_available
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@listings_bp.route('/<listing_id>/availability', methods=['POST'])
@jwt_required()
def update_availability(listing_id):
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify ownership
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return jsonify({"error": "Listing not found"}), 404
       
       if str(listing['host_id']) != user_id:
           return jsonify({"error": "Unauthorized to modify this listing"}), 403
       
       # Update availability calendar
       availability_updates = data.get('availability', {})
       
       current_calendar = listing.get('availability_calendar', {})
       current_calendar.update(availability_updates)
       
       mongo.db.listings.update_one(
           {"_id": ObjectId(listing_id)},
           {"$set": {"availability_calendar": current_calendar, "updated_at": datetime.utcnow()}}
       )
       
       return jsonify({"message": "Availability updated successfully"}), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@listings_bp.route('/host/<host_id>', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_host_listings(host_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        user_id = get_jwt_identity()
        
        # Verify user can access these listings
        if user_id != host_id:
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user or user['user_type'] != 'admin':
                return jsonify({"error": "Unauthorized"}), 403
        
        # Get listings
        listings = list(mongo.db.listings.find({"host_id": ObjectId(host_id)})
                       .sort("created_at", -1))
        
        formatted_listings = []
        for listing in listings:
            # Get videos for each listing
            videos = get_listing_videos(str(listing['_id']))
            
            formatted_listing = {
                "id": str(listing['_id']),
                "title": listing['title'],
                "description": listing['description'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "property_type": listing['property_type'],
                "amenities": listing.get('amenities', []),
                "images": listing.get('images', []),
                "coordinates": listing.get('coordinates', {}),
                "max_guests": listing.get('max_guests', 4),
                "is_active": listing.get('is_active', True),
                "is_approved": listing.get('is_approved', False),
                "has_village_story": listing.get('has_village_story', False),
                "village_story_videos": videos,
                "rating": listing.get('rating', 0),
                "review_count": listing.get('review_count', 0),
                "created_at": listing['created_at'].isoformat() if 'created_at' in listing else None
            }
            formatted_listings.append(formatted_listing)
        
        return jsonify({
            "listings": formatted_listings,
            "total_count": len(formatted_listings)
        }), 200
        
    except Exception as e:
        print(f"Error getting host listings: {e}")
        return jsonify({"error": str(e)}), 500


@listings_bp.route('/<listing_id>/pricing-suggestion', methods=['GET'])
@jwt_required()
def get_pricing_suggestion(listing_id):
   try:
       user_id = get_jwt_identity()
       
       # Verify ownership
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return jsonify({"error": "Listing not found"}), 404
       
       if str(listing['host_id']) != user_id:
           return jsonify({"error": "Unauthorized"}), 403
       
       # Get AI pricing suggestion
       pricing_suggestion = generate_pricing_suggestion(
           listing['location'],
           listing['property_type'],
           listing['amenities'],
           listing.get('max_guests', 4),
           listing.get('rating', 0)
       )
       
       return jsonify({
           "current_price": listing['price_per_night'],
           "ai_suggestion": pricing_suggestion
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

def check_availability(listing_id, check_in, check_out):
   """Check if listing is available for given dates"""
   try:
       # Convert dates to datetime objects
       check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
       check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
       
       # Check for existing bookings
       existing_bookings = mongo.db.bookings.find({
           "listing_id": ObjectId(listing_id),
           "status": {"$in": ["confirmed", "pending"]},
           "$or": [
               {"check_in": {"$lte": check_in}, "check_out": {"$gt": check_in}},
               {"check_in": {"$lt": check_out}, "check_out": {"$gte": check_out}},
               {"check_in": {"$gte": check_in}, "check_out": {"$lte": check_out}}
           ]
       })
       
       if existing_bookings.count() > 0:
           return False
       
       # Check availability calendar
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return False
       
       availability_calendar = listing.get('availability_calendar', {})
       
       # Check each date in the range
       current_date = check_in_date
       while current_date < check_out_date:
           date_str = current_date.strftime('%Y-%m-%d')
           if availability_calendar.get(date_str) == False:
               return False
           current_date += timedelta(days=1)
       
       return True
       
   except Exception as e:
       return False

def format_experience(experience):
   """Format experience document for response"""
   return {
       "id": str(experience['_id']),
       "title": experience['title'],
       "description": experience['description'],
       "duration": experience['duration'],
       "price": experience['price'],
       "category": experience['category'],
       "max_participants": experience['max_participants'],
       "images": experience.get('images', []),
       "inclusions": experience.get('inclusions', []),
       "requirements": experience.get('requirements', [])
   }

def format_review(review):
   """Format review document for response"""
   reviewer = mongo.db.users.find_one({"_id": review['reviewer_id']})
   
   return {
       "id": str(review['_id']),
       "rating": review['rating'],
       "comment": review['comment'],
       "reviewer": {
           "full_name": reviewer['full_name'] if reviewer else "Anonymous",
           "profile_image": reviewer.get('profile_image') if reviewer else None
       },
       "created_at": review['created_at'].isoformat()
   }


@listings_bp.route('/semantic-search', methods=['POST'])
def semantic_search():
    try:
        data = request.get_json()
        
        query = data.get('query', '')
        filters = data.get('filters', {})
        
        if not query:
            return jsonify({"error": "Search query is required"}), 400
        
        print(f"🔍 Semantic search for: {query}")
        
        # Perform semantic search
        results = semantic_search_listings(query, filters)
        
        return jsonify({
            "results": results,
            "total_found": len(results),
            "search_type": "semantic",
            "query": query,
            "message": f"Found {len(results)} listings matching your search intent"
        }), 200
        
    except Exception as e:
        print(f"Semantic search error: {e}")
        return jsonify({"error": str(e)}), 500

@listings_bp.route('/emotion-search', methods=['POST'])
def emotion_search():
    try:
        data = request.get_json()
        
        emotion = data.get('emotion', '')
        filters = data.get('filters', {})
        
        if not emotion:
            return jsonify({"error": "Emotion is required"}), 400
        
        print(f"😊 Emotion-based search for: {emotion}")
        
        # Perform emotion-based search
        results = emotion_based_search(emotion, filters)
        
        return jsonify({
            "results": results,
            "total_found": len(results),
            "search_type": "emotion",
            "emotion": emotion,
            "message": f"Found {len(results)} listings perfect for {emotion}"
        }), 200
        
    except Exception as e:
        print(f"Emotion search error: {e}")
        return jsonify({"error": str(e)}), 500

@listings_bp.route('/image-search', methods=['POST'])
def image_search():
    try:
        data = request.get_json()
        
        image_description = data.get('image_description', '')
        filters = data.get('filters', {})
        
        if not image_description:
            return jsonify({"error": "Image description is required"}), 400
        
        print(f"🖼️ Image-based search for: {image_description}")
        
        # Perform image-based search
        results = image_based_search(image_description, filters)
        
        return jsonify({
            "results": results,
            "total_found": len(results),
            "search_type": "image",
            "image_description": image_description,
            "message": f"Found {len(results)} listings matching your visual preferences"
        }), 200
        
    except Exception as e:
        print(f"Image search error: {e}")
        return jsonify({"error": str(e)}), 500

@listings_bp.route('/smart-search', methods=['POST'])
def smart_search():
    """Intelligent search that determines the best search method"""
    try:
        data = request.get_json()
        
        query = data.get('query', '')
        search_type = data.get('search_type', 'auto')  # auto, semantic, emotion, image
        filters = data.get('filters', {})
        
        if not query:
            return jsonify({"error": "Search query is required"}), 400
        
        results = []
        detected_type = search_type
        
        if search_type == 'auto':
            # Auto-detect search type based on query content
            detected_type = detect_search_type(query)
        
        if detected_type == 'semantic':
            results = semantic_search_listings(query, filters)
        elif detected_type == 'emotion':
            # Extract emotion from query
            emotion = extract_emotion_from_query(query)
            results = emotion_based_search(emotion, filters)
        elif detected_type == 'image':
            results = image_based_search(query, filters)
        else:
            # Default to semantic search
            results = semantic_search_listings(query, filters)
        
        return jsonify({
            "results": results,
            "total_found": len(results),
            "search_type": detected_type,
            "query": query,
            "message": f"Smart search found {len(results)} perfect matches"
        }), 200
        
    except Exception as e:
        print(f"Smart search error: {e}")
        return jsonify({"error": str(e)}), 500

def detect_search_type(query):
    """Auto-detect the type of search based on query content"""
    
    query_lower = query.lower()
    
    # Emotion indicators
    emotion_words = ['stress', 'relax', 'peaceful', 'adventure', 'romantic', 'family', 'calm', 'excited']
    if any(word in query_lower for word in emotion_words):
        return 'emotion'
    
    # Image description indicators
    image_words = ['looks like', 'similar to', 'photo', 'picture', 'image', 'visual', 'appears']
    if any(word in query_lower for word in image_words):
        return 'image'
    
    # Default to semantic
    return 'semantic'

def extract_emotion_from_query(query):
    """Extract emotion from search query"""
    
    query_lower = query.lower()
    
    emotion_map = {
        'stress': 'stress-relief',
        'relax': 'relaxation', 
        'peaceful': 'relaxation',
        'calm': 'relaxation',
        'adventure': 'adventure',
        'romantic': 'romantic',
        'family': 'family-bonding',
        'culture': 'cultural-immersion',
        'traditional': 'cultural-immersion'
    }
    
    for word, emotion in emotion_map.items():
        if word in query_lower:
            return emotion
    
    return 'relaxation'  # Default emotion


# villagestay-backend/routes/listings.py - Add the complete image upload route

@listings_bp.route('/image-visual-search', methods=['POST'])
def image_visual_search():
    """Visual search with actual image upload"""
    try:
        data = request.get_json()
        
        image_base64 = data.get('image_data', '')
        filters = data.get('filters', {})
        
        if not image_base64:
            return jsonify({"error": "Image data is required"}), 400
        
        print(f"🖼️ Processing uploaded image for visual search")
        
        # Analyze image using Gemini Vision
        visual_analysis = analyze_image_with_gemini(image_base64)
        
        if not visual_analysis:
            return jsonify({"error": "Failed to analyze image"}), 400
        
        # Search listings based on visual analysis
        results = search_listings_by_visual_analysis(visual_analysis, filters)
        
        return jsonify({
            "results": results,
            "total_found": len(results),
            "search_type": "visual_upload",
            "visual_analysis": visual_analysis,
            "message": f"Found {len(results)} listings matching your uploaded image"
        }), 200
        
    except Exception as e:
        print(f"Image visual search error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def analyze_image_with_gemini(image_base64):
    """Analyze uploaded image using Gemini Vision API"""
    
    try:
        from utils.ai_utils import call_gemini_with_image
        
        # Clean base64 data
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',')[1]
        
        analysis_prompt = """
        Analyze this image and extract details that would help find similar rural accommodations or village stays.
        
        Look for:
        1. Architectural style (traditional, modern, rustic, heritage, etc.)
        2. Building materials (wood, stone, brick, mud, etc.)
        3. Setting/Environment (mountains, fields, water, forest, village, etc.)
        4. Property type (house, cottage, hut, mansion, farm building, etc.)
        5. Atmosphere/mood (peaceful, vibrant, rustic, luxury, cozy, etc.)
        6. Outdoor features (garden, courtyard, terrace, balcony, etc.)
        7. Landscape elements (trees, plants, water bodies, hills, etc.)
        8. Cultural elements (traditional design, local architecture, etc.)
        
        Respond with JSON:
        {
            "visual_features": {
                "architecture": "description of architectural style",
                "materials": ["material1", "material2"],
                "setting": "description of setting/environment",
                "property_type": "type of property seen",
                "atmosphere": "mood/atmosphere of the place",
                "outdoor_features": ["feature1", "feature2"],
                "landscape": ["element1", "element2"],
                "cultural_elements": ["element1", "element2"]
            },
            "matching_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
            "suggested_amenities": ["amenity1", "amenity2", "amenity3"],
            "confidence_score": 0.95
        }
        """
        
        response = call_gemini_with_image(analysis_prompt, image_base64)
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            import json
            return json.loads(json_match.group())
        else:
            return create_fallback_visual_analysis()
            
    except Exception as e:
        print(f"Gemini image analysis error: {e}")
        return create_fallback_visual_analysis()

def search_listings_by_visual_analysis(visual_analysis, filters):
    """Search listings based on visual analysis results"""
    
    try:
        from utils.semantic_search_utils import format_listing_for_response
        from database import mongo
        from bson import ObjectId
        
        # Build search criteria
        search_criteria = {"is_active": True, "is_approved": True}
        
        # Apply basic filters
        if filters:
            if filters.get('min_price'):
                search_criteria["price_per_night"] = {"$gte": float(filters['min_price'])}
            if filters.get('max_price'):
                if "price_per_night" in search_criteria:
                    search_criteria["price_per_night"]["$lte"] = float(filters['max_price'])
                else:
                    search_criteria["price_per_night"] = {"$lte": float(filters['max_price'])}
            if filters.get('property_type'):
                search_criteria["property_type"] = filters['property_type']
            if filters.get('guests'):
                search_criteria["max_guests"] = {"$gte": int(filters['guests'])}
        
        # Get all listings for visual analysis
        all_listings = list(mongo.db.listings.find(search_criteria))
        
        scored_listings = []
        
        for listing in all_listings:
            score = calculate_visual_similarity_score(listing, visual_analysis)
            if score > 0:
                formatted_listing = format_listing_for_response(listing)
                formatted_listing.update({
                    'visual_similarity_score': score,
                    'visual_match_reasons': get_visual_similarity_reasons(listing, visual_analysis)
                })
                scored_listings.append(formatted_listing)
        
        # Sort by visual similarity score
        scored_listings.sort(key=lambda x: x['visual_similarity_score'], reverse=True)
        
        return scored_listings[:15]
        
    except Exception as e:
        print(f"Visual search error: {e}")
        import traceback
        traceback.print_exc()
        return []

def calculate_visual_similarity_score(listing, visual_analysis):
    """Calculate visual similarity score based on image analysis"""
    
    score = 0
    visual_features = visual_analysis.get('visual_features', {})
    keywords = visual_analysis.get('matching_keywords', [])
    suggested_amenities = visual_analysis.get('suggested_amenities', [])
    
    # Prepare searchable text
    text_fields = [
        listing.get('title', ''),
        listing.get('description', ''),
        listing.get('location', ''),
        ' '.join(listing.get('amenities', [])),
        ' '.join(listing.get('sustainability_features', []))
    ]
    
    searchable_text = ' '.join(text_fields).lower()
    
    # 1. Architecture matching (25% weight)
    architecture = visual_features.get('architecture', '').lower()
    if architecture:
        arch_keywords = architecture.split()
        for keyword in arch_keywords:
            if keyword in searchable_text:
                score += 5
    
    # 2. Materials matching (15% weight)
    materials = visual_features.get('materials', [])
    for material in materials:
        if material.lower() in searchable_text:
            score += 3
    
    # 3. Setting/Environment matching (20% weight)
    setting = visual_features.get('setting', '').lower()
    if setting:
        setting_keywords = setting.split()
        for keyword in setting_keywords:
            if keyword in searchable_text:
                score += 4
    
    # 4. Property type matching (15% weight)
    property_type = visual_features.get('property_type', '').lower()
    listing_property_type = listing.get('property_type', '').lower()
    
    # Direct property type match
    if property_type in listing_property_type or listing_property_type in property_type:
        score += 15
    
    # 5. Atmosphere matching (10% weight)
    atmosphere = visual_features.get('atmosphere', '').lower()
    if atmosphere:
        atm_keywords = atmosphere.split()
        for keyword in atm_keywords:
            if keyword in searchable_text:
                score += 2
    
    # 6. Outdoor features matching (10% weight)
    outdoor_features = visual_features.get('outdoor_features', [])
    for feature in outdoor_features:
        if feature.lower() in searchable_text:
            score += 2
    
    # 7. Landscape elements matching (5% weight)
    landscape = visual_features.get('landscape', [])
    for element in landscape:
        if element.lower() in searchable_text:
            score += 1
    
    # 8. General keyword matching
    for keyword in keywords:
        if keyword.lower() in searchable_text:
            score += 2
    
    # 9. Suggested amenities matching
    listing_amenities = [a.lower() for a in listing.get('amenities', [])]
    for amenity in suggested_amenities:
        if any(amenity.lower() in la for la in listing_amenities):
            score += 3
    
    # 10. Confidence bonus
    confidence = visual_analysis.get('confidence_score', 0.5)
    score = score * confidence
    
    return round(score, 2)

def get_visual_similarity_reasons(listing, visual_analysis):
    """Get reasons why this listing matches the uploaded image"""
    
    reasons = []
    visual_features = visual_analysis.get('visual_features', {})
    
    searchable_text = ' '.join([
        listing.get('title', ''),
        listing.get('description', ''),
        ' '.join(listing.get('amenities', []))
    ]).lower()
    
    # Check architecture match
    architecture = visual_features.get('architecture', '')
    if architecture and any(word.lower() in searchable_text for word in architecture.split()):
        reasons.append(f"Similar {architecture.lower()} architecture")
    
    # Check setting match
    setting = visual_features.get('setting', '')
    if setting and any(word.lower() in searchable_text for word in setting.split()):
        reasons.append(f"Located in {setting.lower()} environment")
    
    # Check property type match
    property_type = visual_features.get('property_type', '')
    if property_type and property_type.lower() in listing.get('property_type', '').lower():
        reasons.append(f"Same property type: {property_type}")
    
    # Check materials match
    for material in visual_features.get('materials', []):
        if material.lower() in searchable_text:
            reasons.append(f"Built with {material.lower()}")
    
    # Check outdoor features
    for feature in visual_features.get('outdoor_features', []):
        if feature.lower() in searchable_text:
            reasons.append(f"Has {feature.lower()}")
    
    return reasons[:3]  # Return top 3 reasons

def create_fallback_visual_analysis():
    """Create fallback analysis if AI fails"""
    return {
        "visual_features": {
            "architecture": "traditional rural",
            "materials": ["wood", "stone"],
            "setting": "rural village",
            "property_type": "homestay",
            "atmosphere": "peaceful",
            "outdoor_features": ["garden"],
            "landscape": ["trees", "fields"],
            "cultural_elements": ["traditional design"]
        },
        "matching_keywords": ["rural", "traditional", "peaceful", "village", "authentic"],
        "suggested_amenities": ["traditional cooking", "local guide", "garden"],
        "confidence_score": 0.7
    }


# Add new route for location suggestions
@listings_bp.route('/location-suggestions', methods=['GET'])
def get_location_suggestions_route():
    """
    Get location suggestions for autocomplete
    """
    try:
        query = request.args.get('query', '').strip()
        limit = int(request.args.get('limit', 5))
        
        if not query or len(query) < 2:
            return jsonify({"suggestions": []}), 200
        
        suggestions = get_location_suggestions(query, limit)
        
        return jsonify({
            "suggestions": suggestions,
            "query": query
        }), 200
        
    except Exception as e:
        print(f"Location suggestions error: {e}")
        return jsonify({
            "suggestions": [],
            "error": str(e)
        }), 400

# Add route for place details
@listings_bp.route('/place-details', methods=['POST'])
def get_place_details_route():
    """
    Get detailed place information from place_id
    """
    try:
        data = request.get_json()
        place_id = data.get('place_id')
        
        if not place_id:
            return jsonify({"error": "Place ID is required"}), 400
        
        place_details = get_place_details(place_id)
        
        return jsonify({
            "success": True,
            "place_details": place_details
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    

@listings_bp.route('/host/<host_id>/stats', methods=['GET'])
@jwt_required()
def get_host_listing_stats(host_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify ownership
        if str(user_id) != host_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get all listings for this host (including inactive)
        all_listings = list(mongo.db.listings.find({"host_id": ObjectId(host_id)}))
        
        # Calculate stats
        total_listings = len(all_listings)
        active_listings = len([l for l in all_listings if l.get('is_approved', False) and l.get('is_active', True)])
        pending_listings = len([l for l in all_listings if not l.get('is_approved', False) and l.get('is_active', True)])
        inactive_listings = len([l for l in all_listings if not l.get('is_active', True)])
        
        # Calculate average rating
        total_rating = sum(l.get('rating', 0) for l in all_listings if l.get('rating', 0) > 0)
        rated_listings = len([l for l in all_listings if l.get('rating', 0) > 0])
        avg_rating = round(total_rating / rated_listings, 1) if rated_listings > 0 else 0.0
        
        return jsonify({
            "total_listings": total_listings,
            "active_listings": active_listings,
            "pending_listings": pending_listings,
            "inactive_listings": inactive_listings,
            "avg_rating": avg_rating
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500