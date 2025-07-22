# villagestay-backend/utils/semantic_search_utils.py
import re
import json
from utils.ai_utils import call_gemini_api
from database import mongo
from bson import ObjectId

def semantic_search_listings(query, filters=None):
    """Perform semantic search on listings using AI understanding"""
    
    try:
        from database import mongo
        from bson import ObjectId
        
        # Get all available listings
        search_criteria = {"is_active": True, "is_approved": True}
        
        # Apply basic filters first
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
        
        # Get all listings for semantic analysis
        all_listings = list(mongo.db.listings.find(search_criteria))
        
        if not all_listings:
            return []
        
        # Use Gemini to understand user intent and match with listings
        semantic_prompt = f"""
        User Search Query: "{query}"
        
        Analyze this search query and extract:
        1. Intent/mood (peaceful, adventure, spiritual, romantic, family, etc.)
        2. Location preferences (near water, mountains, forest, etc.)
        3. Activity preferences (cooking, farming, crafts, meditation, etc.)
        4. Property features desired (traditional, modern, eco-friendly, etc.)
        5. Experience type (cultural immersion, nature, wellness, etc.)
        
        Based on this analysis, I will provide you with listings data to match against.
        
        Respond with JSON:
        {{
            "search_intent": {{
                "primary_mood": "string",
                "location_type": "string", 
                "activities": ["activity1", "activity2"],
                "property_features": ["feature1", "feature2"],
                "experience_type": "string"
            }},
            "search_keywords": ["keyword1", "keyword2", "keyword3"],
            "semantic_categories": ["category1", "category2"]
        }}
        """
        
        # Get AI analysis of search intent
        from utils.ai_utils import call_gemini_api
        ai_analysis = call_gemini_api(semantic_prompt)
        
        try:
            search_analysis = json.loads(extract_json_from_response(ai_analysis))
        except:
            # Fallback to keyword matching if AI analysis fails
            return keyword_based_search(query, all_listings)
        
        # Score and rank listings based on semantic match
        scored_listings = []
        
        for listing in all_listings:
            score = calculate_semantic_score(listing, search_analysis, query)
            if score > 0:
                formatted_listing = format_listing_for_response(listing)
                formatted_listing.update({
                    'semantic_score': score,
                    'match_reasons': get_match_reasons(listing, search_analysis)
                })
                scored_listings.append(formatted_listing)
        
        # Sort by semantic score
        scored_listings.sort(key=lambda x: x['semantic_score'], reverse=True)
        
        return scored_listings[:20]  # Return top 20 matches
        
    except Exception as e:
        print(f"Semantic search error: {e}")
        return keyword_based_search(query, all_listings if 'all_listings' in locals() else [])

def emotion_based_search(emotion, filters=None):
    """Search listings based on emotional needs"""
    
    try:
        from database import mongo
        from bson import ObjectId
        
        emotion_mappings = {
            'stress-relief': {
                'keywords': ['peaceful', 'quiet', 'meditation', 'yoga', 'serene', 'tranquil'],
                'amenities': ['yoga', 'meditation', 'spa', 'massage', 'wellness'],
                'property_types': ['eco_lodge', 'cottage'],
                'sustainability': ['organic', 'natural', 'eco-friendly']
            },
            'adventure': {
                'keywords': ['adventure', 'hiking', 'trekking', 'cycling', 'outdoor'],
                'amenities': ['trekking', 'cycling', 'adventure', 'outdoor activities'],
                'property_types': ['farmstay', 'eco_lodge'],
                'activities': ['hiking', 'rock climbing', 'wildlife']
            },
            'cultural-immersion': {
                'keywords': ['traditional', 'cultural', 'heritage', 'authentic', 'local'],
                'amenities': ['cultural activities', 'traditional cooking', 'handicrafts'],
                'property_types': ['heritage_home', 'homestay'],
                'features': ['cultural preservation', 'traditional architecture']
            },
            'relaxation': {
                'keywords': ['peaceful', 'calm', 'relaxing', 'comfortable', 'cozy'],
                'amenities': ['spa', 'massage', 'reading area', 'garden'],
                'property_types': ['cottage', 'homestay'],
                'features': ['quiet environment', 'scenic views']
            },
            'family-bonding': {
                'keywords': ['family', 'children', 'kids', 'group', 'spacious'],
                'amenities': ['family activities', 'games', 'large rooms', 'playground'],
                'property_types': ['farmstay', 'village_house'],
                'features': ['child-friendly', 'safe environment']
            }
        }
        
        emotion_config = emotion_mappings.get(emotion.lower(), {})
        if not emotion_config:
            return []
        
        # Build search criteria
        search_criteria = {"is_active": True, "is_approved": True}
        
        # Apply filters
        if filters:
            if filters.get('min_price'):
                search_criteria["price_per_night"] = {"$gte": float(filters['min_price'])}
            if filters.get('max_price'):
                if "price_per_night" in search_criteria:
                    search_criteria["price_per_night"]["$lte"] = float(filters['max_price'])
                else:
                    search_criteria["price_per_night"] = {"$lte": float(filters['max_price'])}
        
        # Get all listings for emotional analysis
        all_listings = list(mongo.db.listings.find(search_criteria))
        
        scored_listings = []
        
        for listing in all_listings:
            score = calculate_emotion_score(listing, emotion_config)
            if score > 0:
                formatted_listing = format_listing_for_response(listing)
                formatted_listing.update({
                    'emotion_score': score,
                    'emotion_match': emotion,
                    'emotion_reasons': get_emotion_reasons(listing, emotion_config)
                })
                scored_listings.append(formatted_listing)
        
        # Sort by emotion score
        scored_listings.sort(key=lambda x: x['emotion_score'], reverse=True)
        
        return scored_listings[:15]
        
    except Exception as e:
        print(f"Emotion-based search error: {e}")
        import traceback
        traceback.print_exc()
        return []

def image_based_search(image_description, filters=None):
    """Search listings based on image description using AI vision understanding"""
    
    try:
        from database import mongo
        from bson import ObjectId
        from utils.ai_utils import call_gemini_api
        
        # Use Gemini to understand what the user is looking for based on image
        image_analysis_prompt = f"""
        The user has provided this description of an image: "{image_description}"
        
        Analyze what type of rural accommodation/village they might be looking for based on this image description.
        
        Extract:
        1. Architectural style (traditional, modern, heritage, rustic, etc.)
        2. Setting/Environment (mountains, water, fields, forest, etc.) 
        3. Atmosphere (peaceful, vibrant, rustic, luxury, etc.)
        4. Visual elements that suggest activities or amenities
        5. Property type that would match this image
        
        Respond with JSON:
        {{
            "visual_features": {{
                "architecture": "string",
                "setting": "string", 
                "atmosphere": "string",
                "key_elements": ["element1", "element2"]
            }},
            "suggested_property_types": ["type1", "type2"],
            "matching_keywords": ["keyword1", "keyword2", "keyword3"],
            "ideal_amenities": ["amenity1", "amenity2"]
        }}
        """
        
        ai_analysis = call_gemini_api(image_analysis_prompt)
        
        try:
            visual_analysis = json.loads(extract_json_from_response(ai_analysis))
        except:
            return []
        
        # Search based on visual analysis
        search_criteria = {"is_active": True, "is_approved": True}
        
        # Apply filters
        if filters:
            if filters.get('property_type'):
                search_criteria["property_type"] = filters['property_type']
            if filters.get('min_price'):
                search_criteria["price_per_night"] = {"$gte": float(filters['min_price'])}
            if filters.get('max_price'):
                if "price_per_night" in search_criteria:
                    search_criteria["price_per_night"]["$lte"] = float(filters['max_price'])
                else:
                    search_criteria["price_per_night"] = {"$lte": float(filters['max_price'])}
        
        # Filter by suggested property types if available
        suggested_types = visual_analysis.get('suggested_property_types', [])
        if suggested_types and not filters.get('property_type'):
            search_criteria["property_type"] = {"$in": suggested_types}
        
        all_listings = list(mongo.db.listings.find(search_criteria))
        
        scored_listings = []
        
        for listing in all_listings:
            score = calculate_visual_score(listing, visual_analysis)
            if score > 0:
                formatted_listing = format_listing_for_response(listing)
                formatted_listing.update({
                    'visual_score': score,
                    'visual_match_reasons': get_visual_reasons(listing, visual_analysis)
                })
                scored_listings.append(formatted_listing)
        
        scored_listings.sort(key=lambda x: x['visual_score'], reverse=True)
        
        return scored_listings[:12]
        
    except Exception as e:
        print(f"Image-based search error: {e}")
        import traceback
        traceback.print_exc()
        return []
# Helper functions
def calculate_emotion_score(listing, emotion_config):
    """Calculate how well a listing matches emotional needs"""
    
    score = 0
    
    # Fix: Convert list to string properly
    text_fields = [
        listing.get('title', ''),
        listing.get('description', ''),
        ' '.join(listing.get('amenities', [])),
        ' '.join(listing.get('sustainability_features', []))
    ]
    
    # Join the text fields properly
    text_content = ' '.join(text_fields).lower()
    
    # Keyword matching
    for keyword in emotion_config.get('keywords', []):
        if keyword in text_content:
            score += 5
    
    # Amenity matching
    listing_amenities = [a.lower() for a in listing.get('amenities', [])]
    for amenity in emotion_config.get('amenities', []):
        if any(amenity.lower() in la for la in listing_amenities):
            score += 8
    
    # Property type matching
    if listing.get('property_type') in emotion_config.get('property_types', []):
        score += 10
    
    # Sustainability features
    listing_features = [f.lower() for f in listing.get('sustainability_features', [])]
    for feature in emotion_config.get('sustainability', []):
        if any(feature.lower() in lf for lf in listing_features):
            score += 6
    
    return score

def calculate_visual_score(listing, visual_analysis):
    """Calculate visual similarity score"""
    
    score = 0
    visual_features = visual_analysis.get('visual_features', {})
    keywords = visual_analysis.get('matching_keywords', [])
    
    # Fix: Properly join text content
    text_fields = [
        listing.get('title', ''),
        listing.get('description', ''),
        listing.get('location', ''),
        ' '.join(listing.get('amenities', []))
    ]
    
    text_content = ' '.join(text_fields).lower()
    
    # Architecture matching
    architecture = visual_features.get('architecture', '')
    if architecture and architecture.lower() in text_content:
        score += 15
    
    # Setting matching  
    setting = visual_features.get('setting', '')
    if setting and setting.lower() in text_content:
        score += 12
    
    # Atmosphere matching
    atmosphere = visual_features.get('atmosphere', '')
    if atmosphere and atmosphere.lower() in text_content:
        score += 10
    
    # Keyword matching
    for keyword in keywords:
        if keyword.lower() in text_content:
            score += 5
    
    # Key elements matching
    for element in visual_features.get('key_elements', []):
        if element.lower() in text_content:
            score += 8
    
    return score

def calculate_semantic_score(listing, search_analysis, original_query):
    """Calculate semantic relevance score for a listing"""
    
    score = 0
    search_intent = search_analysis.get('search_intent', {})
    keywords = search_analysis.get('search_keywords', [])
    categories = search_analysis.get('semantic_categories', [])
    
    # Fix: Text fields to search in - properly handle lists
    text_fields = [
        listing.get('title', ''),
        listing.get('description', ''),
        listing.get('location', ''),
        ' '.join(listing.get('amenities', [])),
        ' '.join(listing.get('sustainability_features', [])),
        listing.get('property_type', '')
    ]
    
    searchable_text = ' '.join(text_fields).lower()
    
    # 1. Direct keyword matching (30% weight)
    keyword_score = 0
    for keyword in keywords:
        if keyword.lower() in searchable_text:
            keyword_score += 3
        # Partial matches
        if any(keyword.lower() in word for word in searchable_text.split()):
            keyword_score += 1
    
    score += min(keyword_score, 30)
    
    # 2. Location-based scoring (25% weight)
    location_type = search_intent.get('location_type', '')
    location_score = 0
    
    if location_type:
        location_keywords = {
            'water': ['river', 'lake', 'waterfall', 'stream', 'pond', 'coastal'],
            'mountain': ['hill', 'mountain', 'peak', 'valley', 'highland'],
            'forest': ['forest', 'jungle', 'woods', 'trees', 'wildlife'],
            'rural': ['village', 'countryside', 'rural', 'farm', 'agricultural'],
            'peaceful': ['quiet', 'serene', 'peaceful', 'tranquil', 'calm']
        }
        
        for location_word in location_keywords.get(location_type.lower(), []):
            if location_word in searchable_text:
                location_score += 5
    
    score += min(location_score, 25)
    
    # 3. Activity matching (20% weight)
    activities = search_intent.get('activities', [])
    activity_score = 0
    
    for activity in activities:
        activity_lower = activity.lower()
        if activity_lower in searchable_text:
            activity_score += 4
        
        # Check amenities for activity matches
        for amenity in listing.get('amenities', []):
            if activity_lower in amenity.lower():
                activity_score += 6
    
    score += min(activity_score, 20)
    
    # 4. Property feature matching (15% weight)
    features = search_intent.get('property_features', [])
    feature_score = 0
    
    for feature in features:
        feature_lower = feature.lower()
        if feature_lower in searchable_text:
            feature_score += 3
        
        # Check sustainability features
        for sus_feature in listing.get('sustainability_features', []):
            if feature_lower in sus_feature.lower():
                feature_score += 5
    
    score += min(feature_score, 15)
    
    # 5. Experience type matching (10% weight)
    experience_type = search_intent.get('experience_type', '')
    if experience_type and experience_type.lower() in searchable_text:
        score += 10
    
    return score


def keyword_based_search(query, listings):
    """Fallback keyword-based search"""
    
    query_words = query.lower().split()
    scored_listings = []
    
    for listing in listings:
        score = 0
        text_content = ' '.join([
            listing.get('title', ''),
            listing.get('description', ''),
            listing.get('location', ''),
            ' '.join(listing.get('amenities', []))
        ]).lower()
        
        for word in query_words:
            if word in text_content:
                score += 3
        
        if score > 0:
            formatted_listing = format_listing_for_response(listing)
            formatted_listing['keyword_score'] = score
            scored_listings.append(formatted_listing)
    
    scored_listings.sort(key=lambda x: x['keyword_score'], reverse=True)
    return scored_listings

def format_listing_for_response(listing):
    """Format listing for API response"""
    
    from database import mongo
    from bson import ObjectId
    
    host = mongo.db.users.find_one({"_id": listing['host_id']})
    
    return {
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
        "sustainability_features": listing.get('sustainability_features', []),
        "host": {
            "id": str(host['_id']),
            "full_name": host['full_name']
        } if host else None,
        "created_at": listing['created_at'].isoformat()
    }


def get_match_reasons(listing, search_analysis):
    """Get reasons why this listing matches the search"""
    
    reasons = []
    search_intent = search_analysis.get('search_intent', {})
    
    # Check what matched
    text_content = ' '.join([
        listing.get('title', ''),
        listing.get('description', ''),
        ' '.join(listing.get('amenities', []))
    ]).lower()
    
    if search_intent.get('primary_mood'):
        mood = search_intent['primary_mood'].lower()
        if mood in text_content:
            reasons.append(f"Perfect for {mood} experience")
    
    if search_intent.get('location_type'):
        location = search_intent['location_type'].lower()
        if location in text_content:
            reasons.append(f"Located in {location} setting")
    
    for activity in search_intent.get('activities', []):
        if activity.lower() in text_content:
            reasons.append(f"Offers {activity} activities")
    
    return reasons


def get_emotion_reasons(listing, emotion_config):
    """Get reasons for emotional match"""
    
    reasons = []
    
    # Check amenities
    for amenity in listing.get('amenities', []):
        if any(ea.lower() in amenity.lower() for ea in emotion_config.get('amenities', [])):
            reasons.append(f"Features {amenity}")
    
    # Check keywords in description
    description = listing.get('description', '').lower()
    for keyword in emotion_config.get('keywords', []):
        if keyword in description:
            reasons.append(f"Described as {keyword}")
    
    return reasons

def get_visual_reasons(listing, visual_analysis):
    """Get reasons for visual match"""
    
    reasons = []
    visual_features = visual_analysis.get('visual_features', {})
    
    if visual_features.get('architecture'):
        reasons.append(f"Matches {visual_features['architecture']} style")
    
    if visual_features.get('setting'):
        reasons.append(f"Located in {visual_features['setting']} environment")
    
    return reasons

def extract_json_from_response(response):
    """Extract JSON from AI response"""
    
    import re
    json_match = re.search(r'\{.*\}', response, re.DOTALL)
    if json_match:
        return json_match.group()
    return '{}'

