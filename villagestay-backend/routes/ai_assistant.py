from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import mongo
from utils.ai_utils import generate_travel_itinerary, translate_text, generate_content_from_voice, moderate_content
from datetime import datetime

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/travel-assistant', methods=['POST'])
@jwt_required()
def travel_assistant():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        query = data.get('query', '')
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        # Get user preferences
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        user_preferences = {
            "preferred_language": user.get('preferred_language', 'en'),
            "location": user.get('address', ''),
            "budget_range": data.get('budget_range', 'medium')
        }
        
        # Generate AI response
        ai_response = generate_travel_itinerary(query, user_preferences)
        
        # Save conversation
        conversation_doc = {
            "user_id": ObjectId(user_id),
            "query": query,
            "response": ai_response,
            "created_at": datetime.utcnow(),
            "session_id": data.get('session_id', str(user_id))
        }
        
        mongo.db.ai_conversations.insert_one(conversation_doc)
        
        return jsonify({
            "response": ai_response,
            "suggested_actions": extract_suggested_actions(ai_response)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/translate', methods=['POST'])
@jwt_required()
def translate_content():
    try:
        data = request.get_json()
        
        text = data.get('text', '')
        target_language = data.get('target_language', 'en')
        source_language = data.get('source_language', 'auto')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Translate text
        translated_text = translate_text(text, target_language, source_language)
        
        return jsonify({
            "original_text": text,
            "translated_text": translated_text,
            "source_language": source_language,
            "target_language": target_language
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/voice-to-listing', methods=['POST'])
@jwt_required()
def voice_to_listing():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can use this feature"}), 403
        
        voice_text = data.get('voice_text', '')
        if not voice_text:
            return jsonify({"error": "Voice text is required"}), 400
        
        # Generate listing content from voice
        listing_content = generate_content_from_voice(voice_text, user.get('preferred_language', 'en'))
        
        return jsonify({
            "original_voice_text": voice_text,
            "generated_content": listing_content
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/moderate-content', methods=['POST'])
@jwt_required()
def moderate_user_content():
   try:
       data = request.get_json()
       
       content = data.get('content', '')
       content_type = data.get('content_type', 'text')  # text, image, review
       
       if not content:
           return jsonify({"error": "Content is required"}), 400
       
       # Moderate content
       moderation_result = moderate_content(content, content_type)
       
       return jsonify({
           "is_safe": moderation_result['is_safe'],
           "confidence": moderation_result['confidence'],
           "categories": moderation_result['categories'],
           "suggestions": moderation_result.get('suggestions', [])
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@ai_bp.route('/generate-description', methods=['POST'])
@jwt_required()
def generate_listing_description():
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify user is a host
       user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
       if not user or user['user_type'] != 'host':
           return jsonify({"error": "Only hosts can use this feature"}), 403
       
       # Get listing details
       title = data.get('title', '')
       location = data.get('location', '')
       property_type = data.get('property_type', '')
       amenities = data.get('amenities', [])
       unique_features = data.get('unique_features', '')
       
       if not title or not location:
           return jsonify({"error": "Title and location are required"}), 400
       
       # Generate AI description
       from utils.ai_utils import generate_listing_content
       ai_content = generate_listing_content(title, unique_features, location, property_type, amenities)
       
       return jsonify({
           "generated_description": ai_content.get('description', ''),
           "suggested_amenities": ai_content.get('suggested_amenities', []),
           "pricing_tips": ai_content.get('pricing_tips', []),
           "house_rules_suggestions": ai_content.get('house_rules', [])
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@ai_bp.route('/chat-history', methods=['GET'])
@jwt_required()
def get_chat_history():
   try:
       user_id = get_jwt_identity()
       
       # Get query parameters
       page = int(request.args.get('page', 1))
       limit = int(request.args.get('limit', 20))
       session_id = request.args.get('session_id')
       
       # Build query
       query = {"user_id": ObjectId(user_id)}
       if session_id:
           query["session_id"] = session_id
       
       # Execute query
       skip = (page - 1) * limit
       
       conversations = list(mongo.db.ai_conversations.find(query)
                          .sort("created_at", -1)
                          .skip(skip)
                          .limit(limit))
       
       # Format conversations
       formatted_conversations = []
       for conv in conversations:
           formatted_conv = {
               "id": str(conv['_id']),
               "query": conv['query'],
               "response": conv['response'],
               "session_id": conv.get('session_id'),
               "created_at": conv['created_at'].isoformat()
           }
           formatted_conversations.append(formatted_conv)
       
       return jsonify({
           "conversations": formatted_conversations,
           "page": page,
           "limit": limit
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@ai_bp.route('/sustainability-suggestions', methods=['POST'])
@jwt_required()
def get_sustainability_suggestions():
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify user is a host
       user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
       if not user or user['user_type'] != 'host':
           return jsonify({"error": "Only hosts can use this feature"}), 403
       
       listing_id = data.get('listing_id')
       if not listing_id:
           return jsonify({"error": "Listing ID is required"}), 400
       
       # Get listing details
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return jsonify({"error": "Listing not found"}), 404
       
       if str(listing['host_id']) != user_id:
           return jsonify({"error": "Unauthorized"}), 403
       
       # Generate sustainability suggestions
       from utils.ai_utils import generate_sustainability_suggestions
       suggestions = generate_sustainability_suggestions(
           listing['property_type'],
           listing['location'],
           listing.get('amenities', []),
           listing.get('sustainability_features', [])
       )
       
       return jsonify({
           "suggestions": suggestions,
           "current_features": listing.get('sustainability_features', []),
           "potential_impact": calculate_sustainability_impact(suggestions)
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@ai_bp.route('/generate-experience', methods=['POST'])
@jwt_required()
def generate_experience_content():
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify user is a host
       user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
       if not user or user['user_type'] != 'host':
           return jsonify({"error": "Only hosts can use this feature"}), 403
       
       experience_type = data.get('experience_type', '')
       location = data.get('location', '')
       duration = data.get('duration', 2)
       local_culture = data.get('local_culture', '')
       
       if not experience_type or not location:
           return jsonify({"error": "Experience type and location are required"}), 400
       
       # Generate experience content
       from utils.ai_utils import generate_experience_content
       experience_content = generate_experience_content(
           experience_type, location, duration, local_culture
       )
       
       return jsonify({
           "title": experience_content.get('title', ''),
           "description": experience_content.get('description', ''),
           "inclusions": experience_content.get('inclusions', []),
           "requirements": experience_content.get('requirements', []),
           "pricing_suggestion": experience_content.get('pricing_suggestion', 0),
           "best_time": experience_content.get('best_time', ''),
           "cultural_tips": experience_content.get('cultural_tips', [])
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

def extract_suggested_actions(ai_response):
   """Extract suggested actions from AI response"""
   actions = []
   
   # Simple keyword-based extraction
   if "book" in ai_response.lower() or "reserve" in ai_response.lower():
       actions.append({
           "type": "book_listing",
           "label": "Book Now",
           "description": "Book one of the suggested listings"
       })
   
   if "search" in ai_response.lower() or "find" in ai_response.lower():
       actions.append({
           "type": "search_listings",
           "label": "Search Listings",
           "description": "Search for listings matching your criteria"
       })
   
   if "experience" in ai_response.lower():
       actions.append({
           "type": "browse_experiences",
           "label": "Browse Experiences",
           "description": "Explore local experiences and activities"
       })
   
   return actions

def calculate_sustainability_impact(suggestions):
   """Calculate potential sustainability impact"""
   impact_score = 0
   
   for suggestion in suggestions:
       if suggestion['category'] == 'energy':
           impact_score += 30
       elif suggestion['category'] == 'water':
           impact_score += 20
       elif suggestion['category'] == 'waste':
           impact_score += 15
       elif suggestion['category'] == 'transport':
           impact_score += 25
       elif suggestion['category'] == 'local_community':
           impact_score += 35
   
   return {
       "score": min(impact_score, 100),
       "carbon_reduction": f"{impact_score * 0.5}kg CO2/month",
       "water_savings": f"{impact_score * 2}L/day",
       "waste_reduction": f"{impact_score * 0.3}kg/month"
   }