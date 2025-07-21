from flask import Blueprint, request, jsonify, Response, stream_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import mongo
from utils.ai_utils import (
    generate_village_story_video, 
    voice_to_listing_magic, 
    cultural_concierge_chat,
    call_gemini_with_image,
    call_gemini_api
)
from datetime import datetime
from bson import ObjectId
import base64
import json
import uuid
import time
import re

ai_features_bp = Blueprint('ai_features', __name__)

# ============ FEATURE 1: AI VILLAGE STORY GENERATOR ============

@ai_features_bp.route('/generate-village-story', methods=['POST'])
@jwt_required()
def generate_village_story():
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify user is a host
       user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
       if not user or user['user_type'] != 'host':
           return jsonify({"error": "Only hosts can generate village stories"}), 403
       
       listing_id = data.get('listing_id')
       images = data.get('images', [])  # Array of image URLs or base64
       
       if not listing_id:
           return jsonify({"error": "Listing ID is required"}), 400
       
       # Get listing details
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return jsonify({"error": "Listing not found"}), 404
       
       if str(listing['host_id']) != user_id:
           return jsonify({"error": "Unauthorized to generate story for this listing"}), 403
       
       # Host information
       host_info = {
           "full_name": user['full_name'],
           "location": user.get('address', listing['location'])
       }
       
       # Generate village story video
       story_result = generate_village_story_video(images, listing, host_info)
       
       # Save generation record
       generation_record = {
           "listing_id": ObjectId(listing_id),
           "host_id": ObjectId(user_id),
           "video_data": story_result,
           "images_used": len(images),
           "created_at": datetime.utcnow(),
           "generation_type": "village_story"
       }
       
       mongo.db.ai_generations.insert_one(generation_record)
       
       return jsonify({
           "message": "Village story video generated successfully",
           "video_data": story_result,
           "generation_id": str(generation_record["_id"]) if "_id" in generation_record else None
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@ai_features_bp.route('/village-story-status/<generation_id>', methods=['GET'])
@jwt_required()
def get_village_story_status(generation_id):
   try:
       user_id = get_jwt_identity()
       
       # Get generation record
       generation = mongo.db.ai_generations.find_one({
           "_id": ObjectId(generation_id),
           "host_id": ObjectId(user_id)
       })
       
       if not generation:
           return jsonify({"error": "Generation not found"}), 404
       
       # Mock status update (in production, check actual video generation status)
       status = "completed" if generation['created_at'] < datetime.utcnow() else "processing"
       
       return jsonify({
           "generation_id": generation_id,
           "status": status,
           "video_data": generation['video_data'],
           "created_at": generation['created_at'].isoformat(),
           "progress": 100 if status == "completed" else 75
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

# ============ FEATURE 2: VOICE-TO-LISTING MAGIC (GOOGLE SPEECH) ============

@ai_features_bp.route('/voice-to-listing', methods=['POST'])
@jwt_required()
def voice_to_listing():
    try:
        user_id = get_jwt_identity()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can use voice-to-listing"}), 403
        
        # Handle form data with file upload
        if request.content_type and 'multipart/form-data' in request.content_type:
            language = request.form.get('language', 'hi')
            audio_file = request.files.get('audio_data')
            
            if not audio_file:
                return jsonify({"error": "Audio data is required"}), 400
                
            audio_data = audio_file.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
        else:
            # Handle JSON data
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            language = data.get('language', 'hi')
            audio_data = data.get('audio_data')
            
            if not audio_data:
                return jsonify({"error": "Audio data is required"}), 400
            
            if audio_data.startswith('data:audio'):
                audio_base64 = audio_data.split(',')[1]
            else:
                audio_base64 = audio_data
        
        # Process voice to listing
        from utils.google_speech_utils import transcribe_audio_google_speech, enhance_listing_with_gemini
        from utils.ai_utils import generate_smart_pricing, create_multilingual_listing
        
        # Step 1: Transcribe audio
        transcription_result = transcribe_audio_google_speech(audio_base64, language)
        transcribed_text = transcription_result["text"]
        confidence = transcription_result["confidence"]
        
        # Step 2: Enhance with Gemini
        listing_data = enhance_listing_with_gemini(transcribed_text, language)
        
        # Step 3: Generate pricing
        pricing_intel = generate_smart_pricing(listing_data, language)
        
        # Step 4: Create translations
        translations = create_multilingual_listing(listing_data, language)
        
        # Create the processing result
        processing_result = {
            "original_audio_language": language,
            "transcribed_text": transcribed_text,
            "enhanced_listing": listing_data,
            "pricing_intelligence": pricing_intel,
            "translations": translations,
            "processing_status": "completed",
            "confidence_score": confidence,
            "transcription_source": "google_speech_to_text"
        }
        
        # Save processing record
        voice_record = {
            "host_id": ObjectId(user_id),
            "original_language": language,
            "processing_result": processing_result,
            "created_at": datetime.utcnow(),
            "processing_type": "voice_to_listing"
        }
        
        result = mongo.db.voice_generations.insert_one(voice_record)
        
        # Add the processing_id to the result
        processing_result["processing_id"] = str(result.inserted_id)
        
        return jsonify({
            "message": "Voice successfully converted to listing",
            "result": processing_result,
            "processing_id": str(result.inserted_id)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Voice processing failed: {str(e)}"}), 500
def voice_to_listing_magic_google(audio_data, language="hi", host_id=None):
    """Convert voice recording to professional listing using Google Speech-to-Text + Gemini"""
    
    try:
        print(f"🎤 Processing voice input with Google Speech-to-Text + Gemini in language: {language}")
        
        # Step 1: Real speech to text transcription using Google Speech-to-Text
        try:
            from utils.google_speech_utils import transcribe_audio_google_speech
            
            # Direct call to Google Speech-to-Text - NO FALLBACKS
            result = transcribe_audio_google_speech(audio_data, language)
            transcribed_text = result["text"]
            confidence = result["confidence"]
            
            print(f"✅ Google Speech transcription successful: {transcribed_text}")
            print(f"🎯 Confidence: {confidence:.2f}")
            
            # Verify we got actual transcription (not empty)
            if not transcribed_text or len(transcribed_text.strip()) == 0:
                raise Exception("Google Speech returned empty transcription")
                
        except Exception as transcription_error:
            print(f"❌ Google Speech transcription failed: {transcription_error}")
            raise Exception(f"Real audio transcription failed: {str(transcription_error)}")
        
        # Step 2: Enhance with Gemini API
        try:
            from utils.google_speech_utils import enhance_listing_with_gemini
            listing_data = enhance_listing_with_gemini(transcribed_text, language)
            print(f"✅ Gemini enhancement successful")
        except Exception as e:
            print(f"❌ Gemini enhancement failed: {e}")
            raise Exception(f"Listing enhancement failed: {str(e)}")
        
        # Step 3: Generate pricing intelligence
        try:
            from utils.ai_utils import generate_smart_pricing
            pricing_intel = generate_smart_pricing(listing_data, language)
            print(f"💰 Pricing generated: {pricing_intel}")
        except Exception as pricing_error:
            print(f"❌ Pricing generation failed: {pricing_error}")
            raise Exception(f"Pricing generation failed: {str(pricing_error)}")
        
        # Step 4: Create multi-language versions
        try:
            from utils.ai_utils import create_multilingual_listing
            translations = create_multilingual_listing(listing_data, language)
            print(f"🌍 Translations created: {len(translations)} languages")
        except Exception as translation_error:
            print(f"❌ Translation failed: {translation_error}")
            translations = {language: listing_data}
        
        return {
            "original_audio_language": language,
            "transcribed_text": transcribed_text,
            "enhanced_listing": listing_data,
            "pricing_intelligence": pricing_intel,
            "translations": translations,
            "processing_status": "completed",
            "confidence_score": confidence,
            "transcription_source": "google_speech_to_text"
        }
        
    except Exception as e:
        print(f"❌ Voice processing error: {str(e)}")
        raise Exception(f"Voice processing failed: {str(e)}")

@ai_features_bp.route('/create-listing-from-voice', methods=['POST'])
@jwt_required()
def create_listing_from_voice():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can create listings"}), 403
        
        processing_id = data.get('processing_id')
        selected_language = data.get('selected_language', 'en')
        custom_edits = data.get('custom_edits', {})
        
        if not processing_id:
            return jsonify({"error": "Processing ID is required"}), 400
        
        print(f"🔍 Looking for processing_id: {processing_id}")
        
        # Get voice processing result
        try:
            voice_record = mongo.db.voice_generations.find_one({
                "_id": ObjectId(processing_id),
                "host_id": ObjectId(user_id)
            })
        except Exception as e:
            print(f"❌ Error querying voice_generations: {e}")
            return jsonify({"error": "Invalid processing ID format"}), 400
        
        if not voice_record:
            print(f"❌ No voice record found for processing_id: {processing_id}, user_id: {user_id}")
            
            # Debug: Check what records exist for this user
            user_records = list(mongo.db.voice_generations.find({"host_id": ObjectId(user_id)}))
            print(f"🔍 Found {len(user_records)} voice records for user {user_id}")
            for record in user_records:
                print(f"  - ID: {record['_id']}, Created: {record['created_at']}")
            
            return jsonify({"error": "Voice processing record not found"}), 404
        
        print(f"✅ Found voice record: {voice_record['_id']}")
        
        # Get the enhanced listing data
        processing_result = voice_record['processing_result']
        
        if 'error' in processing_result:
            return jsonify({"error": "Voice processing failed"}), 400
        
        listing_data = processing_result.get('enhanced_listing', {})
        translations = processing_result.get('translations', {})
        
        # Use selected language version or default
        final_listing = translations.get(selected_language, listing_data)
        
        # Apply custom edits
        for key, value in custom_edits.items():
            if key in ['title', 'description', 'property_type', 'price_per_night', 'max_guests', 'images']:
                final_listing[key] = value
        
        # Extract price from pricing suggestion if available
        pricing_intel = processing_result.get('pricing_intelligence', {})
        suggested_price = pricing_intel.get('base_price_per_night', 2000)
        
        # Create the actual listing
        listing_doc = {
            "host_id": ObjectId(user_id),
            "title": final_listing.get('title', 'Rural Village Experience'),
            "description": final_listing.get('description', 'Authentic rural stay experience'),
            "location": user.get('address', 'Rural India'),
            "price_per_night": custom_edits.get('price_per_night', suggested_price),
            "property_type": final_listing.get('property_type', 'homestay'),
            "amenities": final_listing.get('amenities', ['Home-cooked meals', 'Local guide']),
            "images": custom_edits.get('images', []),  # Images from custom_edits
            "coordinates": {"lat": 0, "lng": 0},  # Will be geocoded later
            "max_guests": custom_edits.get('max_guests', final_listing.get('max_guests', 4)),
            "house_rules": final_listing.get('house_rules', []),
            "sustainability_features": final_listing.get('sustainability_features', []),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "is_approved": False,  # Needs admin approval
            "rating": 0.0,
            "review_count": 0,
            "availability_calendar": {},
            "ai_generated": True,
            "voice_generated": True,
            "original_voice_language": voice_record['original_language'],
            "voice_processing_id": processing_id
        }
        
        print(f"📝 Creating listing: {listing_doc['title']}")
        
        # Insert listing
        result = mongo.db.listings.insert_one(listing_doc)
        
        print(f"✅ Listing created with ID: {result.inserted_id}")
        
        return jsonify({
            "message": "Listing created successfully from voice",
            "listing_id": str(result.inserted_id),
            "listing_data": {
                "title": listing_doc['title'],
                "description": listing_doc['description'],
                "price_per_night": listing_doc['price_per_night'],
                "property_type": listing_doc['property_type'],
                "images_count": len(listing_doc['images'])
            }
        }), 201
        
    except Exception as e:
        print(f"❌ Create listing error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============ FEATURE 3: AI CULTURAL CONCIERGE ============

@ai_features_bp.route('/cultural-concierge', methods=['POST'])
@jwt_required()
def cultural_concierge():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a tourist/traveler
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        if user['user_type'] != 'tourist':
            return jsonify({"error": "AI Cultural Concierge is available only for travelers"}), 403
        
        user_message = data.get('message', '')
        session_id = data.get('session_id')
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get user preferences with defaults
        user_preferences = {
            "budget_range": data.get('budget_range', 'medium'),
            "location": user.get('address', 'India'),
            "language": user.get('preferred_language', 'en'),
            "interests": data.get('interests', []),
            "travel_style": data.get('travel_style', 'cultural'),
            "group_size": data.get('group_size', 2),
            "duration": data.get('duration', '3-5 days')
        }
        
        # Get conversation history for context
        conversation_history = []
        if session_id:
            history_records = list(mongo.db.concierge_conversations.find({
                "session_id": session_id,
                "user_id": ObjectId(user_id)
            }).sort("created_at", -1).limit(5))
            
            # Build conversation history
            for record in reversed(history_records):
                conversation_history.extend([
                    {"role": "user", "content": record.get('message', '')},
                    {"role": "assistant", "content": record.get('response', '')}
                ])
        
        # Generate comprehensive AI response
        concierge_response = generate_professional_cultural_response(
            user_message, user_preferences, conversation_history, user
        )
        
        # Save conversation with rich metadata
        conversation_record = {
            "user_id": ObjectId(user_id),
            "session_id": session_id or concierge_response['conversation_id'],
            "message": user_message,
            "response": concierge_response['response'],
            "user_preferences": user_preferences,
            "recommendations": concierge_response.get('recommendations', []),
            "cultural_insights": concierge_response.get('cultural_insights', []),
            "actionable_items": concierge_response.get('actionable_items', []),
            "relevant_listings": concierge_response.get('relevant_listings', []),
            "created_at": datetime.utcnow(),
            "response_quality": "high"
        }
        
        mongo.db.concierge_conversations.insert_one(conversation_record)
        
        return jsonify({
            "response": concierge_response['response'],
            "session_id": conversation_record['session_id'],
            "recommendations": concierge_response.get('recommendations', []),
            "cultural_insights": concierge_response.get('cultural_insights', []),
            "actionable_items": concierge_response.get('actionable_items', []),
            "relevant_listings": concierge_response.get('relevant_listings', []),
            "suggested_experiences": concierge_response.get('suggested_experiences', []),
            "local_events": concierge_response.get('local_events', []),
            "travel_tips": concierge_response.get('travel_tips', []),
            "budget_breakdown": concierge_response.get('budget_breakdown', {}),
            "response_metadata": {
                "confidence": concierge_response.get('confidence', 0.9),
                "sources": concierge_response.get('sources', []),
                "processing_time": concierge_response.get('processing_time', 0)
            }
        }), 200
        
    except Exception as e:
        print(f"Cultural concierge error: {str(e)}")
        return jsonify({"error": "Unable to process your request. Please try again."}), 500

def generate_professional_cultural_response(user_message, preferences, history, user):
    """Generate a comprehensive, professional cultural concierge response"""
    
    try:
        start_time = time.time()
        
        # Build comprehensive context
        context = f"""
You are VillageStay's AI Cultural Concierge - an expert guide specializing in authentic rural Indian experiences. 
You're helping {user.get('full_name', 'a traveler')} plan their cultural journey.

USER PROFILE:
- Travel Style: {preferences['travel_style']}
- Budget Range: {preferences['budget_range']} (low: ₹500-1500/day, medium: ₹1500-3000/day, high: ₹3000+/day)
- Group Size: {preferences['group_size']} people
- Interests: {', '.join(preferences.get('interests', ['cultural experiences']))}
- Preferred Language: {preferences['language']}
- Duration: {preferences.get('duration', '3-5 days')}
- Current Location Context: {preferences['location']}

CONVERSATION HISTORY:
{format_conversation_history(history)}

CURRENT REQUEST: "{user_message}"

Provide a comprehensive response that includes:
1. Direct, helpful answer to their question
2. Specific destination recommendations with village names
3. Cultural insights and local customs
4. Practical travel information
5. Budget-conscious suggestions
6. Safety and respectful travel tips
7. Unique experiences they shouldn't miss

Be warm, knowledgeable, and culturally sensitive. Include specific details like:
- Village names and locations
- Local festivals and timing
- Traditional foods to try
- Cultural etiquette
- Transportation options
- Best seasons to visit
- What to pack
- Photography guidelines

Format your response as natural, conversational text (not lists) that shows deep cultural knowledge.
"""

        # Get AI response using Gemini
        ai_response = call_gemini_api(context)
        
        # Extract and structure the response
        recommendations = extract_destination_recommendations(ai_response, preferences)
        cultural_insights = extract_cultural_insights(ai_response)
        actionable_items = extract_actionable_items(ai_response, user_message)
        relevant_listings = find_relevant_listings_advanced(user_message, preferences)
        travel_tips = extract_travel_tips(ai_response)
        budget_breakdown = generate_budget_breakdown(preferences)
        
        processing_time = round(time.time() - start_time, 2)
        
        return {
            "response": ai_response,
            "recommendations": recommendations,
            "cultural_insights": cultural_insights,
            "actionable_items": actionable_items,
            "relevant_listings": relevant_listings[:3],  # Top 3 matches
            "suggested_experiences": generate_experience_suggestions(preferences),
            "local_events": get_upcoming_events(preferences['location']),
            "travel_tips": travel_tips,
            "budget_breakdown": budget_breakdown,
            "conversation_id": generate_conversation_id(),
            "confidence": 0.95,
            "sources": ["Local Cultural Database", "Travel Expert Knowledge", "Community Insights"],
            "processing_time": processing_time
        }
        
    except Exception as e:
        print(f"AI response generation error: {e}")
        raise Exception("Failed to generate cultural guidance")

def format_conversation_history(history):
    """Format conversation history for context"""
    if not history:
        return "No previous conversation."
    
    formatted = []
    for item in history:
        role = item.get('role', 'unknown')
        content = item.get('content', '')
        formatted.append(f"{role.title()}: {content}")
    
    return "\n".join(formatted[-6:])  # Last 6 exchanges

def extract_destination_recommendations(response, preferences):
    """Extract structured destination recommendations"""
    
    # Use AI to extract recommendations
    extraction_prompt = f"""
    From this cultural guide response, extract destination recommendations and format as JSON:
    
    Response: "{response}"
    
    Extract up to 5 destinations with this structure:
    {{
        "destinations": [
            {{
                "name": "destination name",
                "state": "state name",
                "description": "brief description",
                "best_for": ["cultural experience", "adventure", etc],
                "duration": "recommended days",
                "budget_estimate": "daily budget range",
                "highlights": ["top 3 highlights"],
                "best_time": "season/months"
            }}
        ]
    }}
    """
    
    try:
        extraction_result = call_gemini_api(extraction_prompt)
        return json.loads(extraction_result).get('destinations', [])
    except:
        return []

def extract_cultural_insights(response):
    """Extract cultural insights from response"""
    
    try:
        insights_prompt = f"""
        Extract cultural insights from this response and format as a list:
        
        Response: "{response}"
        
        Return a JSON array of cultural insights:
        ["insight 1", "insight 2", "insight 3"]
        """
        
        result = call_gemini_api(insights_prompt)
        return json.loads(result)
    except:
        return [
            "Remove shoes before entering homes and temples",
            "Greet elders with respect and touch their feet",
            "Dress modestly, especially in religious places",
            "Try to learn basic local greetings"
        ]

def extract_actionable_items(response, user_message):
    """Extract actionable items from response"""
    
    actionable_items = []
    
    # Simple keyword-based extraction
    if 'book' in response.lower() or 'reserve' in response.lower():
        actionable_items.append({
            "type": "booking",
            "action": "Book Recommended Stays",
            "description": "View and book the suggested rural accommodations"
        })
    
    if 'experience' in response.lower() or 'activity' in response.lower():
        actionable_items.append({
            "type": "experience",
            "action": "Explore Local Experiences",
            "description": "Browse authentic cultural activities and experiences"
        })
    
    if 'festival' in response.lower() or 'event' in response.lower():
        actionable_items.append({
            "type": "events",
            "action": "Check Local Events",
            "description": "View upcoming festivals and cultural events"
        })
    
    return actionable_items

def find_relevant_listings_advanced(query, preferences):
    """Find relevant listings using advanced matching"""
    
    try:
        # Build search criteria
        search_criteria = {"is_active": True, "is_approved": True}
        
        # Add budget filter
        if preferences['budget_range'] == 'low':
            search_criteria["price_per_night"] = {"$lte": 1500}
        elif preferences['budget_range'] == 'medium':
            search_criteria["price_per_night"] = {"$gte": 1500, "$lte": 3000}
        elif preferences['budget_range'] == 'high':
            search_criteria["price_per_night"] = {"$gte": 3000}
        
        # Add group size filter
        search_criteria["max_guests"] = {"$gte": preferences['group_size']}
        
        # Text search in title, description, location
        query_terms = query.lower().split()
        search_terms = []
        
        for term in query_terms:
            search_terms.extend([
                {"title": {"$regex": term, "$options": "i"}},
                {"description": {"$regex": term, "$options": "i"}},
                {"location": {"$regex": term, "$options": "i"}},
                {"amenities": {"$in": [term]}},
                {"sustainability_features": {"$in": [term]}}
            ])
        
        if search_terms:
            search_criteria["$or"] = search_terms
        
        # Execute search
        listings = list(mongo.db.listings.find(search_criteria).limit(10))
        
        # Format results
        formatted_listings = []
        for listing in listings:
            host = mongo.db.users.find_one({"_id": listing['host_id']})
            
            formatted_listing = {
                "id": str(listing['_id']),
                "title": listing['title'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "rating": listing.get('rating', 4.5),
                "image": listing['images'][0] if listing.get('images') else None,
                "property_type": listing['property_type'],
                "amenities": listing.get('amenities', [])[:3],
                "sustainability_score": len(listing.get('sustainability_features', [])),
                "host_name": host.get('full_name', 'Local Host') if host else 'Local Host',
                "match_score": calculate_match_score(listing, query, preferences)
            }
            formatted_listings.append(formatted_listing)
        
        # Sort by match score and rating
        formatted_listings.sort(key=lambda x: (x['match_score'], x['rating']), reverse=True)
        
        return formatted_listings
        
    except Exception as e:
        print(f"Listing search error: {e}")
        return []

def calculate_match_score(listing, query, preferences):
    """Calculate relevance score for a listing"""
    
    score = 0
    query_lower = query.lower()
    
    # Title and description relevance
    if any(term in listing['title'].lower() for term in query_lower.split()):
        score += 3
    
    if any(term in listing['description'].lower() for term in query_lower.split()):
        score += 2
    
    # Budget alignment
    price = listing['price_per_night']
    if preferences['budget_range'] == 'low' and price <= 1500:
        score += 2
    elif preferences['budget_range'] == 'medium' and 1500 <= price <= 3000:
        score += 2
    elif preferences['budget_range'] == 'high' and price >= 3000:
        score += 2
    
    # Group size fit
    if listing['max_guests'] >= preferences['group_size']:
        score += 1
    
    # Sustainability features
    score += len(listing.get('sustainability_features', [])) * 0.5
    
    # Rating bonus
    score += listing.get('rating', 0) * 0.5
    
    return round(score, 2)

def extract_travel_tips(response):
    """Extract travel tips from response"""
    
    try:
        tips_prompt = f"""
        Extract practical travel tips from this response:
        
        Response: "{response}"
        
        Return a JSON array of travel tips:
        ["tip 1", "tip 2", "tip 3"]
        """
        
        result = call_gemini_api(tips_prompt)
        return json.loads(result)
    except:
        return [
            "Book accommodations in advance during festival seasons",
            "Carry cash as many rural areas have limited ATM access",
            "Learn basic local phrases to connect with villagers",
            "Pack modest clothing for temple visits"
        ]

def generate_budget_breakdown(preferences):
    """Generate detailed budget breakdown"""
    
    budget_ranges = {
        'low': {'min': 500, 'max': 1500},
        'medium': {'min': 1500, 'max': 3000},
        'high': {'min': 3000, 'max': 8000}
    }
    
    range_data = budget_ranges[preferences['budget_range']]
    daily_budget = (range_data['min'] + range_data['max']) // 2
    
    return {
        "daily_budget": daily_budget,
        "breakdown": {
            "accommodation": int(daily_budget * 0.4),
            "meals": int(daily_budget * 0.3),
            "local_transport": int(daily_budget * 0.15),
            "experiences": int(daily_budget * 0.1),
            "miscellaneous": int(daily_budget * 0.05)
        },
        "group_total": daily_budget * preferences['group_size'],
        "savings_tips": [
            "Book directly with hosts for better rates",
            "Travel during off-season for discounts",
            "Try local transportation options",
            "Eat at local eateries for authentic experiences"
        ]
    }

def generate_experience_suggestions(preferences):
    """Generate experience suggestions based on preferences"""
    
    experiences = {
        'cultural': [
            {
                "title": "Traditional Cooking Workshop",
                "duration": "3 hours",
                "price": 800,
                "description": "Learn to cook authentic village recipes"
            },
            {
                "title": "Local Handicraft Session",
                "duration": "2 hours",
                "price": 600,
                "description": "Create traditional crafts with local artisans"
            }
        ],
        'spiritual': [
            {
                "title": "Sunrise Meditation Session",
                "duration": "1 hour",
                "price": 300,
                "description": "Join morning meditation with local practitioners"
            },
            {
                "title": "Temple Architecture Tour",
                "duration": "2 hours",
                "price": 500,
                "description": "Explore ancient temples with a local guide"
            }
        ],
        'adventure': [
            {
                "title": "Village Nature Walk",
                "duration": "3 hours",
                "price": 400,
                "description": "Explore rural landscapes and wildlife"
            },
            {
                "title": "Bullock Cart Ride",
                "duration": "1 hour",
                "price": 250,
                "description": "Traditional transportation experience"
            }
        ]
    }
    
    return experiences.get(preferences['travel_style'], experiences['cultural'])

def get_upcoming_events(location):
    """Get upcoming local events"""
    
    # Mock local events - in production, integrate with real event data
    events = [
        {
            "name": "Harvest Festival",
            "date": "2024-04-15",
            "location": "Village Square",
            "description": "Celebrate the spring harvest with traditional music and dance"
        },
        {
            "name": "Local Handicraft Fair",
            "date": "2024-04-20",
            "location": "Community Center",
            "description": "Browse and buy authentic local crafts"
        }
    ]
    
    return events

def generate_conversation_id():
    """Generate unique conversation ID"""
    return f"conv_{uuid.uuid4().hex[:12]}"




# ============ STREAMING AI CULTURAL CONCIERGE ============

@ai_features_bp.route('/cultural-concierge/stream', methods=['POST'])
@jwt_required()
def cultural_concierge_stream():
    """Streaming AI Cultural Concierge with real-time responses"""
    
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a tourist/traveler
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        if user['user_type'] != 'tourist':
            return jsonify({"error": "AI Cultural Concierge is available only for travelers"}), 403
        
        user_message = data.get('message', '')
        session_id = data.get('session_id')
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get user preferences
        user_preferences = {
            "budget_range": data.get('budget_range', 'medium'),
            "location": user.get('address', 'India'),
            "language": user.get('preferred_language', 'en'),
            "interests": data.get('interests', []),
            "travel_style": data.get('travel_style', 'cultural'),
            "group_size": data.get('group_size', 2),
            "duration": data.get('duration', '3-5 days')
        }
        
        # Create streaming response
        def generate_stream():
            try:
                # Send initial acknowledgment
                yield f"data: {json.dumps({'type': 'start', 'message': 'Processing your request...'})}\n\n"
                
                # Get conversation context
                conversation_history = get_conversation_context(user_id, session_id)
                
                # Generate streaming AI response
                yield from stream_ai_response(user_message, user_preferences, conversation_history, user, session_id)
                
                # Send completion signal
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                
            except Exception as e:
                print(f"Streaming error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to process request'})}\n\n"
        
        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            }
        )
        
    except Exception as e:
        print(f"Cultural concierge stream error: {str(e)}")
        return jsonify({"error": "Unable to process your request"}), 500

def stream_ai_response(user_message, preferences, history, user, session_id):
    """Stream AI response with agentic approach"""
    
    try:
        # Phase 1: Analyze user intent and generate context
        yield f"data: {json.dumps({'type': 'thinking', 'message': 'Understanding your travel preferences...'})}\n\n"
        
        # Build comprehensive context
        context = build_comprehensive_context(user_message, preferences, history, user)
        
        # Phase 2: Generate streaming AI response
        yield f"data: {json.dumps({'type': 'thinking', 'message': 'Consulting cultural database...'})}\n\n"
        
        # Get AI response
        ai_response = call_gemini_api(context)
        
        # Phase 3: Stream the response word by word with formatting
        yield f"data: {json.dumps({'type': 'response_start'})}\n\n"
        
        # Stream response with markdown formatting
        words = ai_response.split()
        current_text = ""
        
        for i, word in enumerate(words):
            current_text += word + " "
            
            # Send chunk every 3-5 words for natural flow
            if i % 4 == 0 or i == len(words) - 1:
                yield f"data: {json.dumps({'type': 'response_chunk', 'content': word + ' '})}\n\n"
                time.sleep(0.1)  # Natural typing speed
        
        yield f"data: {json.dumps({'type': 'response_end'})}\n\n"
        
        # Phase 4: Generate and stream agentic components
        yield from stream_agentic_components(ai_response, user_message, preferences, user)
        
        # Phase 5: Save conversation
        save_conversation(user.get('_id'), session_id, user_message, ai_response, preferences)
        
    except Exception as e:
        print(f"Stream AI response error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate response'})}\n\n"

def stream_agentic_components(ai_response, user_message, preferences, user):
    """Stream agentic components based on AI response"""
    
    try:
        # Analyze response for entities and generate relevant components
        yield f"data: {json.dumps({'type': 'thinking', 'message': 'Finding relevant places and experiences...'})}\n\n"
        
        # Extract locations mentioned in response
        locations = extract_locations_from_response(ai_response)
        
        if locations:
            yield f"data: {json.dumps({'type': 'component', 'component_type': 'locations', 'data': locations})}\n\n"
            time.sleep(0.5)
        
        # Find relevant listings
        yield f"data: {json.dumps({'type': 'thinking', 'message': 'Searching for perfect stays...'})}\n\n"
        
        relevant_listings = find_relevant_listings_advanced(user_message, preferences)
        if relevant_listings:
            yield f"data: {json.dumps({'type': 'component', 'component_type': 'listings', 'data': relevant_listings[:3]})}\n\n"
            time.sleep(0.5)
        
        # Generate experiences
        experiences = generate_contextual_experiences(ai_response, preferences)
        if experiences:
            yield f"data: {json.dumps({'type': 'component', 'component_type': 'experiences', 'data': experiences})}\n\n"
            time.sleep(0.5)
        
        # Cultural insights
        cultural_insights = extract_cultural_insights_advanced(ai_response)
        if cultural_insights:
            yield f"data: {json.dumps({'type': 'component', 'component_type': 'cultural_insights', 'data': cultural_insights})}\n\n"
            time.sleep(0.5)
        
        # Budget breakdown
        budget_breakdown = generate_dynamic_budget_breakdown(preferences, locations)
        yield f"data: {json.dumps({'type': 'component', 'component_type': 'budget', 'data': budget_breakdown})}\n\n"
        time.sleep(0.5)
        
        # Generate contextual follow-up questions
        follow_up_questions = generate_contextual_followups(ai_response, user_message, preferences)
        yield f"data: {json.dumps({'type': 'component', 'component_type': 'follow_ups', 'data': follow_up_questions})}\n\n"
        
    except Exception as e:
        print(f"Stream agentic components error: {e}")

def build_comprehensive_context(user_message, preferences, history, user):
    """Build comprehensive context for AI"""
    
    context = f"""
You are VillageStay's AI Cultural Concierge - an expert guide specializing in authentic rural Indian experiences. 
You're helping {user.get('full_name', 'a traveler')} plan their cultural journey.

USER PROFILE:
- Name: {user.get('full_name', 'Traveler')}
- Travel Style: {preferences['travel_style']}
- Budget Range: {preferences['budget_range']} (low: ₹500-1500/day, medium: ₹1500-3000/day, high: ₹3000+/day)
- Group Size: {preferences['group_size']} people
- Duration: {preferences.get('duration', '3-5 days')}
- Interests: {', '.join(preferences.get('interests', ['cultural experiences']))}
- Location Context: {preferences['location']}

CONVERSATION HISTORY:
{format_conversation_history(history)}

CURRENT REQUEST: "{user_message}"

INSTRUCTIONS:
Provide a comprehensive, warm response that includes:

1. **Direct Answer**: Address their specific question naturally
2. **Specific Destinations**: Mention actual village names, districts, and states
3. **Cultural Context**: Local customs, festivals, traditions
4. **Practical Information**: Transportation, timing, what to expect
5. **Budget Considerations**: Cost-effective suggestions within their range
6. **Authentic Experiences**: Unique activities they can't find elsewhere

Use markdown formatting for emphasis:
- **Bold** for destination names and important points
- *Italics* for village names and special terms
- Natural paragraphs for easy reading

Be conversational, knowledgeable, and culturally sensitive. Include specific details like:
- Exact village names and their specialties
- Local festivals with dates if relevant
- Traditional foods and where to try them
- Cultural etiquette and customs
- Best seasons and timing
- Transportation options from major cities
- Photography opportunities and guidelines
- Local crafts and where to learn them

Format your response as engaging, informative content that feels like talking to a knowledgeable local friend.
"""
    
    return context

def extract_locations_from_response(response):
    """Extract locations mentioned in AI response"""
    
    try:
        # Use regex to find location patterns
        location_patterns = [
            r'\*([A-Z][a-zA-Z\s]+)\*',  # Italicized names
            r'\*\*([A-Z][a-zA-Z\s]+)\*\*',  # Bold names
            r'([A-Z][a-zA-Z]+)\s+village',  # Village names
            r'([A-Z][a-zA-Z]+)\s+district',  # District names
        ]
        
        locations = []
        for pattern in location_patterns:
            matches = re.findall(pattern, response)
            for match in matches:
                if len(match) > 2 and match not in [loc['name'] for loc in locations]:
                    locations.append({
                        'name': match.strip(),
                        'type': 'village' if 'village' in pattern else 'destination',
                        'mentioned_context': extract_context_around_location(response, match)
                    })
        
        return locations[:5]  # Top 5 locations
        
    except Exception as e:
        print(f"Location extraction error: {e}")
        return []

def extract_context_around_location(text, location):
    """Extract context around a location mention"""
    
    try:
        # Find the sentence containing the location
        sentences = text.split('.')
        for sentence in sentences:
            if location in sentence:
                return sentence.strip()[:100] + "..."
        return f"Experience authentic culture in {location}"
    except:
        return f"Discover {location}"

def generate_contextual_experiences(ai_response, preferences):
    """Generate experiences based on AI response context"""
    
    # Analyze response for experience keywords
    experience_map = {
        'cooking': {
            'title': 'Traditional Cooking Workshop',
            'duration': '3-4 hours',
            'price': 800,
            'description': 'Learn authentic recipes with local families'
        },
        'craft': {
            'title': 'Local Handicraft Session',
            'duration': '2-3 hours', 
            'price': 600,
            'description': 'Create traditional crafts with master artisans'
        },
        'temple': {
            'title': 'Spiritual Temple Tour',
            'duration': '2 hours',
            'price': 400,
            'description': 'Explore sacred temples with cultural insights'
        },
        'farming': {
            'title': 'Farm Life Experience',
            'duration': '4 hours',
            'price': 500,
            'description': 'Participate in traditional farming activities'
        },
        'festival': {
            'title': 'Local Festival Participation',
            'duration': 'Half day',
            'price': 300,
            'description': 'Join authentic local celebrations'
        }
    }
    
    experiences = []
    response_lower = ai_response.lower()
    
    for keyword, exp in experience_map.items():
        if keyword in response_lower:
            experiences.append(exp)
    
    # Add default cultural experience if none found
    if not experiences:
        experiences.append({
            'title': 'Village Cultural Walk',
            'duration': '2 hours',
            'price': 400,
            'description': 'Guided tour of village life and traditions'
        })
    
    return experiences[:3]

def extract_cultural_insights_advanced(response):
    """Extract cultural insights from response"""
    
    insights = []
    
    # Look for cultural patterns in response
    cultural_keywords = {
        'namaste': 'Traditional greeting with palms together shows respect',
        'shoes': 'Remove footwear before entering homes and temples',
        'dress': 'Modest clothing is appreciated, especially in rural areas',
        'elder': 'Touch feet of elders as a mark of respect',
        'temple': 'Maintain silence and follow dress codes in religious places',
        'food': 'Eating with hands is traditional, use right hand only',
        'festival': 'Participate respectfully in local celebrations',
        'photo': 'Always ask permission before photographing people'
    }
    
    response_lower = response.lower()
    
    for keyword, insight in cultural_keywords.items():
        if keyword in response_lower:
            insights.append({
                'insight': insight,
                'importance': 'high' if keyword in ['shoes', 'dress', 'temple'] else 'medium'
            })
    
    # Add default insights if none found
    if not insights:
        insights = [
            {'insight': 'Greet locals with "Namaste" and a smile', 'importance': 'medium'},
            {'insight': 'Learn a few words in the local language', 'importance': 'medium'},
            {'insight': 'Be patient and embrace the slower pace of village life', 'importance': 'high'}
        ]
    
    return insights[:4]

def generate_dynamic_budget_breakdown(preferences, locations):
    """Generate dynamic budget based on context"""
    
    budget_ranges = {
        'low': {'min': 500, 'max': 1500},
        'medium': {'min': 1500, 'max': 3000},
        'high': {'min': 3000, 'max': 8000}
    }
    
    range_data = budget_ranges[preferences['budget_range']]
    daily_budget = (range_data['min'] + range_data['max']) // 2
    
    # Adjust based on locations mentioned
    location_multiplier = 1.0
    if locations:
        # Certain regions might be more expensive
        expensive_regions = ['Rajasthan', 'Kerala', 'Himachal']
        if any(region in str(locations) for region in expensive_regions):
            location_multiplier = 1.2
    
    adjusted_budget = int(daily_budget * location_multiplier)
    
    return {
        "daily_budget": adjusted_budget,
        "breakdown": {
            "accommodation": int(adjusted_budget * 0.35),
            "meals": int(adjusted_budget * 0.30),
            "local_transport": int(adjusted_budget * 0.15),
            "experiences": int(adjusted_budget * 0.15),
            "miscellaneous": int(adjusted_budget * 0.05)
        },
        "group_total": adjusted_budget * preferences['group_size'],
        "duration_total": adjusted_budget * preferences['group_size'] * extract_duration_days(preferences['duration']),
        "savings_tips": [
            "Book directly with village hosts for authentic experiences",
            "Travel during off-season for better rates",
            "Use local transportation like buses and shared autos",
            "Eat at local dhabas and family kitchens"
        ]
    }

def generate_contextual_followups(ai_response, user_message, preferences):
    """Generate contextual follow-up questions"""
    
    followups = []
    response_lower = ai_response.lower()
    
    # Context-based follow-ups
    if 'festival' in response_lower:
        followups.append({
            'question': 'What festivals are happening during my travel dates?',
            'type': 'festival_timing',
            'icon': '🎉'
        })
    
    if 'food' in response_lower or 'cooking' in response_lower:
        followups.append({
            'question': 'Can you recommend authentic local dishes to try?',
            'type': 'food_recommendations',
            'icon': '🍛'
        })
    
    if 'temple' in response_lower or 'spiritual' in response_lower:
        followups.append({
            'question': 'What are the important temples and their visiting hours?',
            'type': 'temple_info',
            'icon': '🛕'
        })
    
    if 'craft' in response_lower or 'art' in response_lower:
        followups.append({
            'question': 'Where can I learn traditional crafts hands-on?',
            'type': 'craft_workshops',
            'icon': '🎨'
        })
    
    # Always include these practical follow-ups
    followups.extend([
        {
            'question': 'What should I pack for this trip?',
            'type': 'packing_list',
            'icon': '🎒'
        },
        {
            'question': 'How do I get there from the nearest city?',
            'type': 'transportation',
            'icon': '🚌'
        },
        {
            'question': 'Are there any cultural customs I should know?',
            'type': 'cultural_customs',
            'icon': '🙏'
        }
    ])
    
    return followups[:5]  # Top 5 follow-ups

def extract_duration_days(duration_string):
    """Extract number of days from duration string"""
    
    duration_map = {
        '1-2 days': 2,
        '3-5 days': 4,
        '1 week': 7,
        '2 weeks': 14,
        '1 month': 30
    }
    
    return duration_map.get(duration_string, 4)

# Helper functions (same as before)
def get_conversation_context(user_id, session_id):
    """Get conversation context"""
    if not session_id:
        return []
    
    history_records = list(mongo.db.concierge_conversations.find({
        "session_id": session_id,
        "user_id": ObjectId(user_id)
    }).sort("created_at", -1).limit(5))
    
    conversation_history = []
    for record in reversed(history_records):
        conversation_history.extend([
            {"role": "user", "content": record.get('message', '')},
            {"role": "assistant", "content": record.get('response', '')}
        ])
    
    return conversation_history

def format_conversation_history(history):
    """Format conversation history"""
    if not history:
        return "No previous conversation."
    
    formatted = []
    for item in history:
        role = item.get('role', 'unknown')
        content = item.get('content', '')
        formatted.append(f"{role.title()}: {content}")
    
    return "\n".join(formatted[-6:])

def save_conversation(user_id, session_id, message, response, preferences):
    """Save conversation to database"""
    try:
        conversation_record = {
            "user_id": ObjectId(user_id),
            "session_id": session_id or f"session_{uuid.uuid4().hex[:12]}",
            "message": message,
            "response": response,
            "user_preferences": preferences,
            "created_at": datetime.utcnow(),
            "response_quality": "high"
        }
        
        mongo.db.concierge_conversations.insert_one(conversation_record)
    except Exception as e:
        print(f"Save conversation error: {e}")

def find_relevant_listings_advanced(query, preferences):
    """Find relevant listings (same as before but with enhanced filtering)"""
    try:
        search_criteria = {"is_active": True, "is_approved": True}
        
        # Budget filter
        if preferences['budget_range'] == 'low':
            search_criteria["price_per_night"] = {"$lte": 1500}
        elif preferences['budget_range'] == 'medium':
            search_criteria["price_per_night"] = {"$gte": 1500, "$lte": 3000}
        elif preferences['budget_range'] == 'high':
            search_criteria["price_per_night"] = {"$gte": 3000}
        
        # Group size filter
        search_criteria["max_guests"] = {"$gte": preferences['group_size']}
        
        # Execute search
        listings = list(mongo.db.listings.find(search_criteria).limit(6))
        
        # Format results
        formatted_listings = []
        for listing in listings:
            host = mongo.db.users.find_one({"_id": listing['host_id']})
            
            formatted_listing = {
                "id": str(listing['_id']),
                "title": listing['title'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "rating": listing.get('rating', 4.5),
                "image": listing['images'][0] if listing.get('images') else None,
                "property_type": listing['property_type'],
                "amenities": listing.get('amenities', [])[:3],
                "host_name": host.get('full_name', 'Local Host') if host else 'Local Host'
            }
            formatted_listings.append(formatted_listing)
        
        return formatted_listings
        
    except Exception as e:
        print(f"Listing search error: {e}")
        return []


@ai_features_bp.route('/cultural-concierge/history', methods=['GET'])
@jwt_required()
def get_concierge_history():
    try:
        user_id = get_jwt_identity()
        session_id = request.args.get('session_id')
        
        # Build query
        query = {"user_id": ObjectId(user_id)}
        if session_id:
            query["session_id"] = session_id
        
        # Get conversation history
        conversations = list(mongo.db.concierge_conversations.find(query)
                           .sort("created_at", 1)
                           .limit(50))
        
        # Format conversations
        formatted_conversations = []
        for conv in conversations:
            formatted_conv = {
                "id": str(conv['_id']),
                "message": conv['message'],
                "response": conv['response'],
                "session_id": conv['session_id'],
                "created_at": conv['created_at'].isoformat(),
                "actionable_items": conv.get('actionable_items', [])
            }
            formatted_conversations.append(formatted_conv)
        
        return jsonify({
            "conversations": formatted_conversations,
            "session_id": session_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_features_bp.route('/cultural-insights/<location>', methods=['GET'])
def get_location_cultural_insights(location):
    try:
        # Get cultural insights for a specific location
        insights_prompt = f"""
        Provide comprehensive cultural insights for travelers visiting {location} in rural India:
        
        Include:
        1. Local customs and traditions
        2. Festival calendar and important dates
        3. Traditional food and dining etiquette
        4. Dress code and behavioral guidelines
        5. Language basics and common phrases
        6. Religious and spiritual practices
        7. Local crafts and art forms
        8. Best time to visit and weather considerations
        
        Format as JSON with organized sections.
        """
        
        insights_response = call_gemini_api(insights_prompt)
        
        try:
            cultural_data = json.loads(insights_response)
        except:
            cultural_data = {
                "location": location,
                "customs": ["Respect local traditions", "Greet with Namaste"],
                "festivals": ["Harvest festivals in spring", "Local deity celebrations"],
                "food_etiquette": ["Eat with right hand", "Try local specialties"],
                "dress_code": ["Modest clothing", "Remove shoes in homes"],
                "language": ["Learn basic greetings", "Hindi is widely understood"],
                "spirituality": ["Visit local temples", "Participate respectfully"],
                "crafts": ["Traditional weaving", "Pottery making"],
                "best_time": "October to March for pleasant weather"
            }
        
        return jsonify({
            "location": location,
            "cultural_insights": cultural_data,
            "generated_at": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500





# ============ AI IMAGE ANALYSIS ROUTES ============

@ai_features_bp.route('/analyze-property-images', methods=['POST'])
@jwt_required()
def analyze_property_images():
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify user is a host
       user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
       if not user or user['user_type'] != 'host':
           return jsonify({"error": "Only hosts can analyze property images"}), 403
       
       images = data.get('images', [])  # Array of base64 images
       
       if not images:
           return jsonify({"error": "Images are required"}), 400
       
       analysis_results = []
       
       for i, image_data in enumerate(images[:5]):  # Limit to 5 images
           analysis_prompt = f"""
           Analyze this rural property image and provide:
           
           1. Property assessment (cleanliness, condition, appeal)
           2. Suggested improvements for better guest appeal
           3. Safety features visible
           4. Unique selling points to highlight
           5. Photography tips for better shots
           6. Authenticity score (how authentic rural experience it represents)
           
           Rate each aspect from 1-10 and provide specific actionable feedback.
           Format as JSON.
           """
           
           try:
               analysis = call_gemini_with_image(analysis_prompt, image_data)
               analysis_results.append({
                   "image_index": i,
                   "analysis": analysis,
                   "processed_at": datetime.utcnow().isoformat()
               })
           except Exception as e:
               analysis_results.append({
                   "image_index": i,
                   "error": str(e),
                   "processed_at": datetime.utcnow().isoformat()
               })
       
       return jsonify({
           "message": "Property images analyzed successfully",
           "analysis_results": analysis_results,
           "total_images_processed": len(analysis_results)
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@ai_features_bp.route('/generate-listing-photos', methods=['POST'])
@jwt_required()
def generate_listing_photos():
   try:
       user_id = get_jwt_identity()
       data = request.get_json()
       
       # Verify user is a host
       user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
       if not user or user['user_type'] != 'host':
           return jsonify({"error": "Only hosts can generate listing photos"}), 403
       
       listing_id = data.get('listing_id')
       photo_types = data.get('photo_types', ['exterior', 'interior', 'dining', 'surroundings'])
       
       if not listing_id:
           return jsonify({"error": "Listing ID is required"}), 400
       
       # Get listing details
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return jsonify({"error": "Listing not found"}), 404
       
       if str(listing['host_id']) != user_id:
           return jsonify({"error": "Unauthorized"}), 403
       
       # Generate photo prompts for each type
       generated_photos = []
       
       for photo_type in photo_types:
           prompt = create_photo_generation_prompt(listing, photo_type)
           
           # Mock photo generation (replace with actual AI image generation)
           generated_photo = {
               "type": photo_type,
               "prompt": prompt,
               "generated_url": f"https://ai-generated-images.com/{photo_type}_{listing_id}.jpg",
               "status": "generated",
               "created_at": datetime.utcnow().isoformat()
           }
           
           generated_photos.append(generated_photo)
       
       return jsonify({
           "message": "Listing photos generated successfully",
           "generated_photos": generated_photos,
           "listing_title": listing['title']
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

def create_photo_generation_prompt(listing, photo_type):
   """Create specific prompts for different photo types"""
   
   base_info = f"Rural {listing['property_type']} in {listing['location']}, India"
   
   prompts = {
       "exterior": f"Beautiful exterior view of {base_info}, traditional architecture, surrounded by nature, golden hour lighting, authentic rural setting",
       "interior": f"Cozy interior of {base_info}, traditional furniture, clean and welcoming, warm lighting, cultural decorations",
       "dining": f"Traditional dining area in {base_info}, local food setup, copper utensils, floor seating or simple wooden table",
       "surroundings": f"Scenic surroundings of {base_info}, village landscape, fields, trees, peaceful rural environment",
       "activity": f"Cultural activity near {base_info}, local people engaged in traditional work, authentic village life"
   }
   
   return prompts.get(photo_type, f"Authentic rural property image of {base_info}")

# ============ DEMO AND TEST ROUTES ============

@ai_features_bp.route('/test-google-speech', methods=['GET'])
def test_google_speech():
    try:
        from utils.google_speech_utils import test_google_speech_setup
        result = test_google_speech_setup()
        
        return jsonify({
            "google_speech_setup_complete": result,
            "message": "Check console logs for detailed status"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_features_bp.route('/demo/voice-transcription', methods=['POST'])
def demo_voice_transcription():
   """Demo endpoint for voice transcription testing - REMOVED MOCK DATA"""
   return jsonify({
       "error": "Demo mode disabled - use real Google Speech-to-Text only",
       "message": "Configure Google Cloud credentials to use voice transcription"
   }), 400

@ai_features_bp.route('/demo/cultural-chat', methods=['POST'])
def demo_cultural_chat():
   """Demo endpoint for cultural concierge testing"""
   try:
       data = request.get_json()
       
       user_message = data.get('message', '')
       
       # Demo responses for common queries
       demo_responses = {
           "spiritual": "For a spiritual experience, I recommend visiting the ashrams near Rishikesh or the peaceful villages in Uttarakhand hills. You can participate in morning yoga sessions, evening aartis by the Ganges, and experience simple village life. Budget around ₹1500-2000 per day including stay and meals.",
           "cultural": "For authentic cultural experiences, consider visiting rural Rajasthan where you can stay in traditional havelis, learn pottery from local artisans, and participate in folk dance evenings. The village of Hodka in Kutch offers incredible cultural immersion with local families.",
           "food": "For food experiences, rural Punjab and Haryana offer incredible farm-to-table experiences. You can learn traditional cooking methods, participate in wheat harvesting, and enjoy authentic dal-baati-churma cooked on wood fires.",
           "default": "I'd love to help you discover authentic rural India! Could you tell me what type of experience interests you - spiritual retreats, cultural immersion, culinary adventures, or nature experiences?"
       }
       
       # Simple keyword matching for demo
       response_key = "default"
       for key in demo_responses.keys():
           if key in user_message.lower():
               response_key = key
               break
       
       response = demo_responses[response_key]
       
       return jsonify({
           "response": response,
           "actionable_items": [
               {"type": "search", "action": "Find Listings", "description": "Search for recommended stays"},
               {"type": "experiences", "action": "Browse Experiences", "description": "Explore local activities"}
           ],
           "cultural_insights": [
               {"insight": "Always remove shoes before entering homes", "importance": "high"},
               {"insight": "Greet elders with respect", "importance": "medium"}
           ],
           "demo_mode": True
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500