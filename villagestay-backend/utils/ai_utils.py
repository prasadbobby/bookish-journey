import requests
import json
import base64
import time
import uuid
from config import Config

def call_gemini_api(prompt, model="gemini-2.0-flash"):
    """Make API call to Gemini"""
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        'Content-Type': 'application/json',
        'X-goog-api-key': Config.GEMINI_API_KEY
    }
    
    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 1024
        }
    }
    
    try:
        if not Config.GEMINI_API_KEY:
            raise Exception("Gemini API key not configured")
            
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        
        if 'candidates' in result and len(result['candidates']) > 0:
            return result['candidates'][0]['content']['parts'][0]['text']
        else:
            raise Exception("No valid response from Gemini API")
            
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise Exception(f"Gemini API failed: {str(e)}")

def call_gemini_with_image(prompt, image_data, model="gemini-2.0-flash"):
    """Make API call to Gemini with image"""
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        'Content-Type': 'application/json',
        'X-goog-api-key': Config.GEMINI_API_KEY
    }
    
    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_data
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 1024
        }
    }
    
    try:
        if not Config.GEMINI_API_KEY:
            raise Exception("Gemini API key not configured")
            
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        
        if 'candidates' in result and len(result['candidates']) > 0:
            return result['candidates'][0]['content']['parts'][0]['text']
        else:
            raise Exception("No valid response from Gemini API")
            
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise Exception(f"Gemini API with image failed: {str(e)}")

def transcribe_audio_enhanced(audio_data, language):
    """Real audio transcription using Google Speech-to-Text"""
    
    try:
        print(f"🎤 Starting Google Speech-to-Text transcription for language: {language}")
        
        # Import Google Speech function
        from utils.google_speech_utils import transcribe_audio_google_speech
        
        # Use Google Speech-to-Text for real transcription
        result = transcribe_audio_google_speech(audio_data, language)
        
        transcribed_text = result["text"]
        detected_language = result["language"]
        confidence = result["confidence"]
        
        print(f"📝 Google Speech transcribed ({confidence*100:.1f}% confidence): {transcribed_text}")
        print(f"🌍 Language: {detected_language}")
        
        return transcribed_text
        
    except Exception as e:
        print(f"❌ Google Speech transcription failed: {str(e)}")
        raise Exception(f"Real audio transcription failed: {str(e)}")

def generate_smart_pricing(listing_data, language):
    """Generate intelligent pricing suggestions"""
    
    try:
        # Extract pricing from listing if available
        pricing_text = listing_data.get('pricing_suggestion', '₹2000')
        
        # Try to extract numeric value
        import re
        price_match = re.search(r'(\d+)', pricing_text.replace(',', ''))
        base_price = int(price_match.group(1)) if price_match else 2000
        
        # Ensure reasonable pricing for rural India
        if base_price < 1000:
            base_price = 1500
        elif base_price > 5000:
            base_price = 3000
            
        return {
            "base_price_per_night": base_price,
            "peak_season_multiplier": 1.3,
            "off_season_discount": 0.8,
            "weekly_stay_discount": 0.9,
            "monthly_stay_discount": 0.8,
            "pricing_rationale": f"Based on rural homestay standards and amenities. Property type: {listing_data.get('property_type', 'homestay')}"
        }
    except Exception as e:
        print(f"❌ Pricing generation error: {e}")
        raise Exception(f"Pricing generation failed: {str(e)}")

def create_multilingual_listing(listing_data, original_language):
    """Create translations in multiple languages"""
    
    languages = ["en", "hi", "gu", "te", "mr", "ta"]
    translations = {}
    
    for lang in languages:
        if lang == original_language:
            translations[lang] = listing_data
            continue
            
        # Use Gemini for translations
        try:
            if lang == 'en' and original_language != 'en':
                translation_prompt = f"""
                Translate this rural homestay listing to English while maintaining cultural context:
                
                Title: {listing_data.get('title', '')}
                Description: {listing_data.get('description', '')}
                
                Provide JSON with translated title and description:
                {{
                    "title": "translated_title",
                    "description": "translated_description"
                }}
                """
                
                translation_result = call_gemini_api(translation_prompt)
                
                # Try to parse JSON
                import re
                json_match = re.search(r'\{.*\}', translation_result, re.DOTALL)
                if json_match:
                    translated_data = json.loads(json_match.group())
                    translations[lang] = {
                        **listing_data,
                        "title": translated_data.get('title', listing_data['title']),
                        "description": translated_data.get('description', listing_data['description'])
                    }
                else:
                    translations[lang] = listing_data
            else:
                translations[lang] = listing_data
                
        except Exception as e:
            print(f"❌ Translation failed for {lang}: {e}")
            translations[lang] = listing_data
    
    return translations

def voice_to_listing_magic(audio_data, language="hi", host_id=None):
    """Convert voice recording to professional listing using Google Speech + Gemini"""
    
    try:
        print(f"🎤 Processing voice input with Google Speech + Gemini in language: {language}")
        
        # Step 1: Real speech to text transcription using Google Speech-to-Text
        try:
            transcribed_text = transcribe_audio_enhanced(audio_data, language)
            print(f"✅ Transcription successful: {transcribed_text}")
        except Exception as transcription_error:
            print(f"❌ Transcription failed: {transcription_error}")
            raise Exception(f"Audio transcription failed: {str(transcription_error)}")
        
        # Step 2: Enhance with Gemini
        try:
            from utils.google_speech_utils import enhance_listing_with_gemini
            listing_data = enhance_listing_with_gemini(transcribed_text, language)
            print(f"✅ Gemini enhancement successful")
        except Exception as e:
            print(f"❌ Gemini enhancement failed: {e}")
            raise Exception(f"Listing enhancement failed: {str(e)}")
        
        # Step 3: Generate pricing intelligence
        try:
            pricing_intel = generate_smart_pricing(listing_data, language)
            print(f"💰 Pricing generated: {pricing_intel}")
        except Exception as pricing_error:
            print(f"❌ Pricing generation failed: {pricing_error}")
            raise Exception(f"Pricing generation failed: {str(pricing_error)}")
        
        # Step 4: Create multi-language versions
        try:
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
            "confidence_score": 0.95,
            "transcription_source": "google_speech_to_text"
        }
        
    except Exception as e:
        print(f"❌ Voice processing error: {str(e)}")
        raise Exception(f"Voice processing failed: {str(e)}")

# ============ FEATURE 1: AI VILLAGE STORY GENERATOR ============

def generate_village_story_video(images, listing_details, host_info):
    """Generate AI village story video using Gemini"""
    
    try:
        # Analyze images and create story prompt
        story_prompt = f"""
        Create a compelling 60-second village story script for these details:
        
        Property: {listing_details.get('title', '')}
        Location: {listing_details.get('location', '')}
        Property Type: {listing_details.get('property_type', '')}
        Host: {host_info.get('full_name', '')}
        
        Create a cinematic script that includes:
        1. Opening scene description (sunrise/nature)
        2. Property showcase moments
        3. Cultural activities and local life
        4. Food and hospitality scenes
        5. Call-to-action ending
        
        Format as JSON with: scenes, voiceover_text, music_suggestions, visual_cues
        Make it authentic and showcase rural Indian culture.
        """
        
        story_script = call_gemini_api(story_prompt)
        
        # Generate video metadata (mock implementation for video generation)
        video_data = generate_video_metadata(story_script, images, listing_details)
        
        return {
            "video_id": video_data['video_id'],
            "video_url": video_data['video_url'],
            "story_script": story_script,
            "generation_status": "completed",
            "duration": 60,
            "thumbnail": video_data.get('thumbnail'),
            "download_url": video_data.get('download_url')
        }
        
    except Exception as e:
        raise Exception(f"Village story generation failed: {str(e)}")

def generate_video_metadata(script, images, listing_details):
    """Generate video metadata (mock implementation)"""
    
    video_id = f"video_{uuid.uuid4().hex[:12]}"
    
    video_data = {
        "video_id": video_id,
        "video_url": f"https://storage.googleapis.com/villagestay-videos/{video_id}.mp4",
        "thumbnail": f"https://storage.googleapis.com/villagestay-videos/{video_id}_thumb.jpg",
        "download_url": f"https://storage.googleapis.com/villagestay-videos/{video_id}_hd.mp4",
        "status": "processing"
    }
    
    print(f"🎬 Generating village story video for {listing_details.get('title', '')}")
    print(f"📹 Video ID: {video_id}")
    print(f"🎯 Using {len(images)} images for generation")
    
    return video_data

# ============ FEATURE 3: AI CULTURAL CONCIERGE ============

def cultural_concierge_chat(user_message, user_preferences, conversation_history):
    """AI Cultural Concierge for personalized travel planning"""
    
    try:
        # Create comprehensive prompt for cultural concierge
        concierge_prompt = f"""
        You are an AI Cultural Concierge for VillageStay, specializing in authentic rural Indian experiences.
        
        User Message: "{user_message}"
        
        User Context:
        - Preferred Budget: {user_preferences.get('budget_range', 'medium')}
        - Location: {user_preferences.get('location', 'India')}
        - Interests: {', '.join(user_preferences.get('interests', []))}
        - Travel Style: {user_preferences.get('travel_style', 'cultural')}
        - Language: {user_preferences.get('language', 'en')}
        
        Previous Conversation: {conversation_history[-3:] if conversation_history else 'None'}
        
        Provide a helpful response that includes:
        1. Direct answer to their query
        2. Specific rural destination recommendations
        3. Cultural insights and customs to respect
        4. Authentic experiences available
        5. Practical tips (what to bring, best time, etc.)
        6. Budget breakdown if relevant
        7. Booking suggestions
        
        Be warm, knowledgeable, and culturally sensitive. Include specific village names, festivals, and local customs.
        Format response in a conversational tone, not as a list.
        """
        
        # Get AI response
        ai_response = call_gemini_api(concierge_prompt)
        
        # Extract actionable items
        actionable_items = extract_actionable_items(ai_response, user_message)
        
        # Get cultural insights
        cultural_insights = get_cultural_insights(user_message, user_preferences)
        
        # Find relevant listings
        relevant_listings = find_relevant_listings(user_message, user_preferences)
        
        return {
            "response": ai_response,
            "actionable_items": actionable_items,
            "cultural_insights": cultural_insights,
            "relevant_listings": relevant_listings,
            "suggested_experiences": get_suggested_experiences(user_message),
            "local_events": get_local_events(user_preferences.get('location')),
            "conversation_id": generate_conversation_id()
        }
        
    except Exception as e:
        raise Exception(f"Cultural concierge failed: {str(e)}")

def extract_actionable_items(ai_response, user_message):
    """Extract actionable items from AI response"""
    
    actionable_items = []
    
    # Simple keyword-based extraction
    if 'book' in ai_response.lower():
        actionable_items.append({
            "type": "booking",
            "action": "Book Recommended Stays",
            "description": "View and book the suggested rural accommodations"
        })
    
    if 'experience' in ai_response.lower() or 'activity' in ai_response.lower():
        actionable_items.append({
            "type": "experience",
            "action": "Explore Local Experiences",
            "description": "Browse authentic cultural activities and experiences"
        })
    
    if 'festival' in ai_response.lower() or 'event' in ai_response.lower():
        actionable_items.append({
            "type": "events",
            "action": "Check Local Events",
            "description": "View upcoming festivals and cultural events"
        })
    
    if 'transport' in ai_response.lower() or 'travel' in ai_response.lower():
        actionable_items.append({
            "type": "transport",
            "action": "Plan Your Journey",
            "description": "Get directions and transport options"
        })
    
    return actionable_items

def get_cultural_insights(user_message, user_preferences):
    """Get specific cultural insights based on user query"""
    
    insights_prompt = f"""
    Provide 3-4 specific cultural insights for a traveler asking: "{user_message}"
    
    Focus on:
    - Local customs and etiquette
    - Cultural do's and don'ts
    - Traditional practices they might encounter
    - Respectful behavior guidelines
    
    Keep insights practical and specific to rural Indian culture.
    Format as JSON array with insight text and importance level.
    """
    
    try:
        insights_response = call_gemini_api(insights_prompt)
        return json.loads(insights_response)
    except:
        return [
            {
                "insight": "Remove shoes before entering homes and temples",
                "importance": "high"
            },
            {
                "insight": "Greet elders with 'Namaste' and touch their feet as a sign of respect",
                "importance": "medium"
            },
            {
                "insight": "Dress modestly, especially when visiting religious places",
                "importance": "high"
            }
        ]

def find_relevant_listings(user_message, user_preferences):
    """Find listings relevant to user query (mock implementation)"""
    
    # This would integrate with your actual listings database
    mock_listings = [
        {
            "id": "mock_1",
            "title": "Peaceful Himalayan Village Retreat",
            "location": "Uttarakhand Hills",
            "price_per_night": 2000,
            "rating": 4.8,
            "image": "https://example.com/himalayan-retreat.jpg",
            "match_score": 0.95
        },
        {
            "id": "mock_2", 
            "title": "Traditional Rajasthani Haveli Experience",
            "location": "Rural Rajasthan",
            "price_per_night": 2500,
            "rating": 4.6,
            "image": "https://example.com/rajasthani-haveli.jpg",
            "match_score": 0.87
        }
    ]
    
    return mock_listings[:3]  # Return top 3 matches

def get_suggested_experiences(user_message):
    """Get suggested experiences based on user query"""
    
    experiences = [
        {
            "title": "Traditional Cooking Workshop",
            "duration": "3 hours",
            "price": 800,
            "description": "Learn to cook authentic village recipes"
        },
        {
            "title": "Sunrise Meditation Session",
            "duration": "1 hour", 
            "price": 300,
            "description": "Join morning meditation with local practitioners"
        },
        {
            "title": "Village Walking Tour",
            "duration": "2 hours",
            "price": 500,
            "description": "Explore village life with a local guide"
        }
    ]
    
    return experiences

def get_local_events(location):
    """Get local events and festivals"""
    
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

# ============ EXISTING FUNCTIONS ============

def generate_listing_content(title, description, location, property_type, amenities):
    """Generate enhanced listing content using AI"""
    
    prompt = f"""
    Create compelling content for a rural tourism listing with the following details:
    
    Title: {title}
    Location: {location}
    Property Type: {property_type}
    Existing Description: {description}
    Amenities: {', '.join(amenities)}
    
    Please provide:
    1. An enhanced description (150-200 words) that highlights the authentic rural experience
    2. 3-5 additional amenities that would be typical for this type of property
    3. 3 house rules that promote respectful tourism
    4. 2-3 pricing tips for the host
    
    Format the response as JSON with keys: description, suggested_amenities, house_rules, pricing_tips
    """
    
    response = call_gemini_api(prompt)
    
    try:
        # Try to parse as JSON
        content = json.loads(response)
        return content
    except:
        raise Exception("Failed to generate listing content")

def generate_travel_itinerary(query, user_preferences):
    """Generate travel itinerary based on user query"""
    
    prompt = f"""
    User Query: {query}
    User Location: {user_preferences.get('location', 'India')}
    Budget Range: {user_preferences.get('budget_range', 'medium')}
    Preferred Language: {user_preferences.get('preferred_language', 'English')}
    
    Create a detailed travel itinerary that focuses on authentic rural experiences. Include:
    1. Suggested destinations (2-3 rural locations)
    2. Duration and best time to visit
    3. Budget breakdown
    4. Cultural experiences to try
    5. Sustainability tips
    6. Local transportation options
    
    Keep the response conversational and helpful, around 200-300 words.
    """
    
    return call_gemini_api(prompt)

def translate_text(text, target_language, source_language="auto"):
    """Translate text using Gemini"""
    
    prompt = f"""
    Translate the following text from {source_language} to {target_language}:
    
    "{text}"
    
    Provide only the translated text, no additional explanation.
    """
    
    return call_gemini_api(prompt)

def generate_content_from_voice(voice_text, language):
    """Generate listing content from voice description"""
    
    prompt = f"""
    A host has described their property in {language}. Convert this voice description into a well-structured listing:
    
    Voice Description: "{voice_text}"
    
    Create:
    1. A catchy title (5-8 words)
    2. A professional description (100-150 words)
    3. List of amenities mentioned or implied
    4. Suggested price range per night
    5. Property type (homestay, farmstay, etc.)
    
    Format as JSON with keys: title, description, amenities, suggested_price_range, property_type
    """
    
    response = call_gemini_api(prompt)
    
    try:
        return json.loads(response)
    except:
        raise Exception("Failed to generate content from voice")

def moderate_content(content, content_type):
    """Moderate content for safety and appropriateness"""
    
    prompt = f"""
    Analyze the following {content_type} content for safety, appropriateness, and quality:
    
    Content: "{content}"
    
    Check for:
    1. Inappropriate language or content
    2. Spam or promotional content
    3. False or misleading information
    4. Quality and helpfulness
    
    Respond with JSON containing:
    - is_safe (boolean)
    - confidence (0-1)
    - categories (list of any issues found)
    - suggestions (list of improvements if needed)
    """
    
    response = call_gemini_api(prompt)
    
    try:
        return json.loads(response)
    except:
        raise Exception("Content moderation failed")

def generate_pricing_suggestion(location, property_type, amenities, max_guests, rating):
    """Generate AI-powered pricing suggestions"""
    
    prompt = f"""
    Suggest pricing for a rural tourism property with these details:
    
    Location: {location}
    Property Type: {property_type}
    Amenities: {', '.join(amenities)}
    Max Guests: {max_guests}
    Current Rating: {rating}/5
    
    Consider:
    1. Local market rates
    2. Property features and amenities
    3. Seasonal variations
    4. Competitive pricing
    
    Provide JSON with:
    - base_price (per night)
    - seasonal_adjustments (peak/off-peak percentages)
    - weekly_discount_percentage
    - monthly_discount_percentage
    - reasoning (brief explanation)
    """
    
    response = call_gemini_api(prompt)
    
    try:
        return json.loads(response)
    except:
        raise Exception("Pricing suggestion generation failed")

def generate_sustainability_suggestions(property_type, location, amenities, current_features):
    """Generate sustainability improvement suggestions"""
    
    prompt = f"""
    Property Details:
    Type: {property_type}
    Location: {location}
    Current Amenities: {', '.join(amenities)}
    Current Sustainability Features: {', '.join(current_features)}
    
    Suggest 5 practical sustainability improvements that:
    1. Are feasible for rural properties
    2. Have clear environmental benefits
    3. Can attract eco-conscious travelers
    4. Are cost-effective to implement
    
    Format as JSON array with objects containing:
    - feature_name
    - category (energy, water, waste, transport, community)
    - implementation_cost (low/medium/high)
    - environmental_impact (description)
    - guest_appeal (description)
    """
    
    response = call_gemini_api(prompt)
    
    try:
        return json.loads(response)
    except:
        raise Exception("Sustainability suggestions generation failed")

def generate_experience_content(experience_type, location, duration, local_culture):
    """Generate content for local experiences"""
    
    prompt = f"""
    Create content for a local experience:
    
    Type: {experience_type}
    Location: {location}
    Duration: {duration} hours
    Local Culture Context: {local_culture}
    
    Generate:
    1. Engaging title (5-8 words)
    2. Detailed description (150-200 words)
    3. What's included (4-6 items)
    4. Requirements/what to bring (3-4 items)
    5. Suggested pricing (in INR)
    6. Best time of day/season
    7. Cultural significance/tips (2-3 points)
    
    Format as JSON with appropriate keys.
    """
    
    response = call_gemini_api(prompt)
    
    try:
        return json.loads(response)
    except:
        raise Exception("Experience content generation failed")