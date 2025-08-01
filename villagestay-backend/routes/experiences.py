from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from datetime import datetime

experiences_bp = Blueprint('experiences', __name__)

@experiences_bp.route('/', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_experience():
    """Create an experience listing"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"🎭 Creating experience for user: {user_id}")
        print(f"📋 Data: {data}")
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can create experiences"}), 403
        
        # Required fields validation for experience
        required_fields = ['title', 'description', 'location', 'price_per_person', 'category', 'duration']
        
        missing_fields = []
        for field in required_fields:
            if not data.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Validate numeric fields
        try:
            price_per_person = float(data['price_per_person'])
            duration = float(data['duration'])
            max_participants = int(data.get('max_participants', 8))
            
            if price_per_person < 100:
                return jsonify({"error": "Price per person must be at least ₹100"}), 400
            if duration <= 0:
                return jsonify({"error": "Duration must be greater than 0"}), 400
            if max_participants <= 0:
                return jsonify({"error": "Max participants must be greater than 0"}), 400
                
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid numeric values: {str(e)}"}), 400
        
        # Create experience document
        experience_doc = {
            "host_id": ObjectId(user_id),
            "listing_category": "experience",
            "title": data['title'],
            "description": data['description'],
            "location": data['location'],
            "price_per_person": price_per_person,
            "category": data['category'],
            "duration": duration,
            "max_participants": max_participants,
            "images": data.get('images', []),
            "coordinates": data.get('coordinates', {}),
            "inclusions": data.get('inclusions', []),
            "requirements": data.get('requirements', []),
            "difficulty_level": data.get('difficulty_level', 'easy'),
            "age_restrictions": data.get('age_restrictions', {'min_age': 0, 'max_age': 100}),
            "languages": data.get('languages', ['English']),
            "meeting_point": data.get('meeting_point', ''),
            "what_to_bring": data.get('what_to_bring', []),
            "cancellation_policy": data.get('cancellation_policy', 'flexible'),
            "availability_schedule": data.get('availability_schedule', {}),
            "group_size_preference": data.get('group_size_preference', 'small'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "is_approved": False,
            "rating": 0.0,
            "review_count": 0
        }
        
        # Insert into experiences collection
        result = mongo.db.experiences.insert_one(experience_doc)
        
        print(f"✅ Experience created with ID: {result.inserted_id}")
        
        return jsonify({
            "message": "Experience created successfully",
            "listing_id": str(result.inserted_id),
            "listing_category": "experience",
            "coordinates": data.get('coordinates', {})
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating experience: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@experiences_bp.route('/', methods=['GET', 'OPTIONS'])
def get_all_experiences():
    """Get all experiences"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        location = request.args.get('location', '')
        category = request.args.get('category', '')
        
        # Build query
        query = {"is_active": True, "is_approved": True}
        
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        
        if category:
            query["category"] = category
        
        # Get total count
        total = mongo.db.experiences.count_documents(query)
        
        # Get experiences with pagination
        skip = (page - 1) * limit
        experiences = list(mongo.db.experiences.find(query)
                          .sort("created_at", -1)
                          .skip(skip)
                          .limit(limit))
        
        # Format experiences
        formatted_experiences = []
        for experience in experiences:
            host = mongo.db.users.find_one({"_id": experience['host_id']})
            
            formatted_experience = {
                "id": str(experience['_id']),
                "listing_category": "experience",
                "title": experience['title'],
                "description": experience['description'],
                "location": experience['location'],
                "price_per_person": experience['price_per_person'],
                "category": experience['category'],
                "duration": experience['duration'],
                "max_participants": experience.get('max_participants', 8),
                "difficulty_level": experience.get('difficulty_level', 'easy'),
                "images": experience.get('images', []),
                "coordinates": experience.get('coordinates', {}),
                "inclusions": experience.get('inclusions', []),
                "rating": experience.get('rating', 0),
                "review_count": experience.get('review_count', 0),
                "created_at": experience['created_at'].isoformat(),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "profile_image": host.get('profile_image')
                } if host else None
            }
            formatted_experiences.append(formatted_experience)
        
        return jsonify({
            "experiences": formatted_experiences,
            "pagination": {
                "current_page": page,
                "total_pages": (total + limit - 1) // limit,
                "total_experiences": total,
                "has_next": page * limit < total,
                "has_prev": page > 1
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting experiences: {e}")
        return jsonify({"error": str(e)}), 500
    

@experiences_bp.route('/<experience_id>', methods=['GET', 'OPTIONS'])
def get_experience(experience_id):
    """Get single experience details"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        if not ObjectId.is_valid(experience_id):
            return jsonify({"error": "Invalid experience ID"}), 400
        
        experience = mongo.db.experiences.find_one({"_id": ObjectId(experience_id)})
        if not experience:
            return jsonify({"error": "Experience not found"}), 404
        
        # Get host information
        host = mongo.db.users.find_one({"_id": experience['host_id']})
        
        # Get reviews
        reviews = list(mongo.db.reviews.find({
            "listing_id": ObjectId(experience_id),
            "listing_type": "experience",
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
        
        # Format experience data
        experience_data = {
            "id": str(experience['_id']),
            "listing_category": "experience",
            "title": experience['title'],
            "description": experience['description'],
            "location": experience['location'],
            "price_per_person": experience['price_per_person'],
            "category": experience['category'],
            "duration": experience['duration'],
            "max_participants": experience.get('max_participants', 8),
            "difficulty_level": experience.get('difficulty_level', 'easy'),
            "images": experience.get('images', []),
            "coordinates": experience.get('coordinates', {}),
            "inclusions": experience.get('inclusions', []),
            "requirements": experience.get('requirements', []),
            "age_restrictions": experience.get('age_restrictions', {}),
            "languages": experience.get('languages', []),
            "meeting_point": experience.get('meeting_point', ''),
            "what_to_bring": experience.get('what_to_bring', []),
            "cancellation_policy": experience.get('cancellation_policy', 'flexible'),
            "rating": experience.get('rating', 0),
            "review_count": experience.get('review_count', 0),
            "created_at": experience['created_at'].isoformat() if 'created_at' in experience else None,
            "is_active": experience.get('is_active', True),
            "is_approved": experience.get('is_approved', False),
            "reviews": formatted_reviews,
            "host": {
                "id": str(host['_id']),
                "full_name": host['full_name'],
                "created_at": host['created_at'].isoformat() if 'created_at' in host else None,
                "profile_image": host.get('profile_image')
            } if host else None
        }
        
        return jsonify(experience_data), 200
        
    except Exception as e:
        print(f"Error getting experience: {e}")
        return jsonify({"error": str(e)}), 500

@experiences_bp.route('/<experience_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_experience(experience_id):
    """Update an experience"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get experience
        experience = mongo.db.experiences.find_one({"_id": ObjectId(experience_id)})
        if not experience:
            return jsonify({"error": "Experience not found"}), 404
        
        # Verify ownership
        if str(experience['host_id']) != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Update fields
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        updatable_fields = [
            'title', 'description', 'location', 'price_per_person', 
            'category', 'duration', 'max_participants', 'images', 'coordinates',
            'inclusions', 'requirements', 'difficulty_level', 'age_restrictions',
            'languages', 'meeting_point', 'what_to_bring', 'cancellation_policy',
            'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ['price_per_person', 'duration']:
                    update_data[field] = float(data[field])
                elif field == 'max_participants':
                    update_data[field] = int(data[field])
                else:
                    update_data[field] = data[field]
        
        # Update experience
        mongo.db.experiences.update_one(
            {"_id": ObjectId(experience_id)},
            {"$set": update_data}
        )
        
        return jsonify({"message": "Experience updated successfully"}), 200
        
    except Exception as e:
        print(f"Error updating experience: {e}")
        return jsonify({"error": str(e)}), 500

@experiences_bp.route('/<experience_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_experience(experience_id):
    """Delete an experience"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        user_id = get_jwt_identity()
        
        # Verify ownership
        experience = mongo.db.experiences.find_one({"_id": ObjectId(experience_id)})
        if not experience:
            return jsonify({"error": "Experience not found"}), 404
        
        if str(experience['host_id']) != user_id:
            return jsonify({"error": "Unauthorized to delete this experience"}), 403
        
        # Soft delete by setting is_active to False
        mongo.db.experiences.update_one(
            {"_id": ObjectId(experience_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        return jsonify({"message": "Experience deleted successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500