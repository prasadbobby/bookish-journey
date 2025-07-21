from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from utils.ai_utils import generate_listing_content, translate_text, generate_pricing_suggestion
from datetime import datetime, timedelta
import math

listings_bp = Blueprint('listings', __name__)

@listings_bp.route('/', methods=['GET'])
def get_listings():
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        location = request.args.get('location')
        property_type = request.args.get('property_type')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', type=float, default=50)  # km
        guests = int(request.args.get('guests', 1))
        check_in = request.args.get('check_in')
        check_out = request.args.get('check_out')
        sort_by = request.args.get('sort_by', 'created_at')
        order = request.args.get('order', 'desc')
        
        # Build query
        query = {"is_active": True, "is_approved": True}
        
        # Location filter
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        
        # Property type filter
        if property_type:
            query["property_type"] = property_type
        
        # Price range filter
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            query["price_per_night"] = price_query
        
        # Guests filter
        if guests > 1:
            query["max_guests"] = {"$gte": guests}
        
        # Geolocation filter
        if lat and lng:
            query["coordinates"] = {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": radius * 1000  # Convert km to meters
                }
            }
        
        # Build sort
        sort_order = 1 if order == 'asc' else -1
        sort_criteria = [(sort_by, sort_order)]
        
        # Execute query
        skip = (page - 1) * limit
        
        listings = list(mongo.db.listings.find(query)
                       .sort(sort_criteria)
                       .skip(skip)
                       .limit(limit))
        
        # Get total count
        total_count = mongo.db.listings.count_documents(query)
        
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
                "amenities": listing['amenities'],
                "images": listing['images'],
                "coordinates": listing['coordinates'],
                "max_guests": listing['max_guests'],
                "rating": listing.get('rating', 0),
                "review_count": listing.get('review_count', 0),
                "sustainability_features": listing.get('sustainability_features', []),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "profile_image": host.get('profile_image')
                } if host else None,
                "created_at": listing['created_at'].isoformat()
            }
            
            # Check availability if dates provided
            if check_in and check_out:
                formatted_listing['is_available'] = check_availability(
                    listing['_id'], check_in, check_out
                )
            
            formatted_listings.append(formatted_listing)
        
        return jsonify({
            "listings": formatted_listings,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": math.ceil(total_count / limit)
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@listings_bp.route('/<listing_id>', methods=['GET'])
def get_listing(listing_id):
    try:
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        # Get host info
        host = mongo.db.users.find_one({"_id": listing['host_id']})
        
        # Get experiences
        experiences = list(mongo.db.experiences.find({"listing_id": ObjectId(listing_id)}))
        
        # Get reviews
        reviews = list(mongo.db.reviews.find({"reviewee_id": listing['host_id']}))
        
        formatted_listing = {
            "id": str(listing['_id']),
            "title": listing['title'],
            "description": listing['description'],
            "location": listing['location'],
            "price_per_night": listing['price_per_night'],
            "property_type": listing['property_type'],
            "amenities": listing['amenities'],
            "images": listing['images'],
            "coordinates": listing['coordinates'],
            "max_guests": listing['max_guests'],
            "house_rules": listing.get('house_rules', []),
            "rating": listing.get('rating', 0),
            "review_count": listing.get('review_count', 0),
            "sustainability_features": listing.get('sustainability_features', []),
            "availability_calendar": listing.get('availability_calendar', {}),
            "host": {
                "id": str(host['_id']),
                "full_name": host['full_name'],
                "profile_image": host.get('profile_image'),
                "created_at": host['created_at'].isoformat()
            } if host else None,
            "experiences": [format_experience(exp) for exp in experiences],
            "reviews": [format_review(review) for review in reviews],
            "created_at": listing['created_at'].isoformat()
        }
        
        return jsonify(formatted_listing), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# In your backend listings.py, make sure to handle the images properly:

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
        required_fields = ['title', 'location', 'price_per_night', 'property_type']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"{field} is required"}), 400
        
        # Handle images - convert base64 to URLs or store as-is for now
        images = data.get('images', [])
        if not images:
            return jsonify({"error": "At least one image is required"}), 400
        
        # Create listing document
        listing_doc = {
            "host_id": ObjectId(user_id),
            "title": data['title'],
            "description": data.get('description', ''),
            "location": data['location'],
            "price_per_night": float(data['price_per_night']),
            "property_type": data['property_type'],
            "amenities": data.get('amenities', []),
            "images": images,  # Store the image URLs/base64 data
            "coordinates": data.get('coordinates', {"lat": 0, "lng": 0}),
            "max_guests": int(data.get('max_guests', 4)),
            "house_rules": data.get('house_rules', []),
            "sustainability_features": data.get('sustainability_features', []),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "is_approved": False,  # Needs admin approval
            "rating": 0.0,
            "review_count": 0,
            "availability_calendar": {}
        }
        
        # Insert listing
        result = mongo.db.listings.insert_one(listing_doc)
        
        return jsonify({
            "message": "Listing created successfully",
            "listing_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error creating listing: {str(e)}")  # Debug log
        return jsonify({"error": str(e)}), 500


@listings_bp.route('/<listing_id>', methods=['PUT'])
@jwt_required()
def update_listing(listing_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify ownership
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        if str(listing['host_id']) != user_id:
            return jsonify({"error": "Unauthorized to modify this listing"}), 403
        
        # Allowed fields for update
        allowed_fields = [
            'title', 'description', 'location', 'price_per_night',
            'amenities', 'images', 'max_guests', 'house_rules',
            'sustainability_features', 'is_active'
        ]
        
        update_data = {}
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        
        update_data['updated_at'] = datetime.utcnow()
        
        # Update listing
        result = mongo.db.listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Listing not found"}), 404
        
        return jsonify({"message": "Listing updated successfully"}), 200
        
    except Exception as e:
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

@listings_bp.route('/search', methods=['GET'])
def search_listings():
    try:
        query = request.args.get('q', '')
        location = request.args.get('location')
        
        if not query and not location:
            return jsonify({"error": "Search query or location is required"}), 400
        
        # Build search query
        search_query = {"is_active": True, "is_approved": True}
        
        if query:
            search_query["$or"] = [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"location": {"$regex": query, "$options": "i"}},
                {"amenities": {"$in": [query]}},
                {"property_type": {"$regex": query, "$options": "i"}}
            ]
        
        if location:
            search_query["location"] = {"$regex": location, "$options": "i"}
        
        # Execute search
        listings = list(mongo.db.listings.find(search_query).limit(50))
        
        # Format results
        formatted_listings = []
        for listing in listings:
            host = mongo.db.users.find_one({"_id": listing['host_id']})
            
            formatted_listing = {
                "id": str(listing['_id']),
                "title": listing['title'],
                "description": listing['description'][:200] + "..." if len(listing['description']) > 200 else listing['description'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "property_type": listing['property_type'],
                "images": listing['images'][:1],  # Only first image
                "coordinates": listing['coordinates'],
                "rating": listing.get('rating', 0),
                "review_count": listing.get('review_count', 0),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name']
                } if host else None
            }
            
            formatted_listings.append(formatted_listing)
        
        return jsonify({
            "listings": formatted_listings,
            "total_found": len(formatted_listings)
        }), 200
        
    except Exception as e:
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

@listings_bp.route('/host/<host_id>', methods=['GET'])
def get_host_listings(host_id):
   try:
       # Get query parameters
       page = int(request.args.get('page', 1))
       limit = int(request.args.get('limit', 10))
       
       # Build query
       query = {"host_id": ObjectId(host_id), "is_active": True}
       
       # Execute query
       skip = (page - 1) * limit
       
       listings = list(mongo.db.listings.find(query)
                      .sort("created_at", -1)
                      .skip(skip)
                      .limit(limit))
       
       # Get total count
       total_count = mongo.db.listings.count_documents(query)
       
       # Format listings
       formatted_listings = []
       for listing in listings:
           formatted_listing = {
               "id": str(listing['_id']),
               "title": listing['title'],
               "description": listing['description'][:200] + "..." if len(listing['description']) > 200 else listing['description'],
               "location": listing['location'],
               "price_per_night": listing['price_per_night'],
               "property_type": listing['property_type'],
               "images": listing['images'][:1],
               "rating": listing.get('rating', 0),
               "review_count": listing.get('review_count', 0),
               "is_approved": listing.get('is_approved', False),
               "created_at": listing['created_at'].isoformat()
           }
           
           formatted_listings.append(formatted_listing)
       
       return jsonify({
           "listings": formatted_listings,
           "pagination": {
               "page": page,
               "limit": limit,
               "total_count": total_count,
               "total_pages": math.ceil(total_count / limit)
           }
       }), 200
       
   except Exception as e:
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

