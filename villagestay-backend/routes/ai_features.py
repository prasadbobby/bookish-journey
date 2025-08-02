# villagestay-backend/routes/ai_features.py

from flask import Blueprint, request, jsonify, Response, stream_template
from utils.weather_utils import weather_service, get_weather_based_recommendations
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import mongo
from config import Config  # ADD THIS IMPORT
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
import os  # ADD THIS IMPORT
import threading

ai_features_bp = Blueprint('ai_features', __name__)

# Import video service
from utils.video_utils import video_service

# ============ VIDEO SERVING ROUTES ============

@ai_features_bp.route('/videos/<filename>', methods=['GET', 'OPTIONS'])
def serve_video(filename):
    """Serve generated videos with proper CORS headers"""
    
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200
    
    try:
        # Construct the full path to the video file
        video_path = os.path.join(Config.VIDEO_FOLDER, filename)
        
        print(f"🎬 Requested video: {filename}")
        print(f"📁 Looking for video at: {video_path}")
        print(f"📂 Video folder: {Config.VIDEO_FOLDER}")
        print(f"✅ File exists: {os.path.exists(video_path)}")
        
        if not os.path.exists(video_path):
            print(f"❌ Video file not found: {video_path}")
            # List all files in the video directory for debugging
            if os.path.exists(Config.VIDEO_FOLDER):
                files = os.listdir(Config.VIDEO_FOLDER)
                print(f"📋 Available files: {files}")
            return jsonify({"error": "Video file not found", "path": video_path}), 404
        
        print(f"📹 Serving video: {video_path}")
        
        # Get file size for headers
        file_size = os.path.getsize(video_path)
        
        # Create response with proper headers for video streaming
        def generate():
            with open(video_path, 'rb') as f:
                data = f.read(1024)
                while data:
                    yield data
                    data = f.read(1024)
        
        response = Response(
            generate(),
            mimetype='video/mp4',
            headers={
                'Content-Disposition': f'inline; filename="{filename}"',
                'Accept-Ranges': 'bytes',
                'Content-Type': 'video/mp4',
                'Content-Length': str(file_size),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
                'Cache-Control': 'public, max-age=3600'
            }
        )
        
        print(f"✅ Successfully serving video: {filename}")
        return response
        
    except Exception as e:
        print(f"❌ Error serving video {filename}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to serve video", "details": str(e)}), 500

@ai_features_bp.route('/videos/<filename>/download', methods=['GET', 'OPTIONS'])
def download_video(filename):
    """Download video file with proper headers"""
    
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200
    
    try:
        from flask import send_file
        video_path = os.path.join(Config.VIDEO_FOLDER, filename)
        
        if not os.path.exists(video_path):
            return jsonify({"error": "Video file not found"}), 404
        
        return send_file(
            video_path,
            mimetype='video/mp4',
            as_attachment=True,
            download_name=f"village_story_{filename}",
            conditional=True
        )
        
    except Exception as e:
        print(f"❌ Error downloading video {filename}: {e}")
        return jsonify({"error": "Failed to download video"}), 500

@ai_features_bp.route('/videos/<filename>/stream', methods=['GET', 'OPTIONS'])
def stream_video(filename):
    """Stream video with range support"""
    
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200
    
    try:
        video_path = os.path.join(Config.VIDEO_FOLDER, filename)
        
        if not os.path.exists(video_path):
            return jsonify({"error": "Video file not found"}), 404
        
        file_size = os.path.getsize(video_path)
        range_header = request.headers.get('Range', None)
        
        if range_header:
            byte_start = 0
            byte_end = file_size - 1
            
            if range_header:
                match = re.search(r'bytes=(\d+)-(\d*)', range_header)
                if match:
                    byte_start = int(match.group(1))
                    if match.group(2):
                        byte_end = int(match.group(2))
            
            chunk_size = byte_end - byte_start + 1
            
            def generate():
                with open(video_path, 'rb') as f:
                    f.seek(byte_start)
                    remaining = chunk_size
                    while remaining:
                        to_read = min(1024, remaining)
                        data = f.read(to_read)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            response = Response(
                generate(),
                status=206,
                headers={
                    'Content-Range': f'bytes {byte_start}-{byte_end}/{file_size}',
                    'Accept-Ranges': 'bytes',
                    'Content-Length': str(chunk_size),
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
                }
            )
        else:
            def generate():
                with open(video_path, 'rb') as f:
                    data = f.read(1024)
                    while data:
                        yield data
                        data = f.read(1024)
            
            response = Response(
                generate(),
                headers={
                    'Content-Length': str(file_size),
                    'Content-Type': 'video/mp4',
                    'Accept-Ranges': 'bytes',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
                }
            )
        
        return response
        
    except Exception as e:
        print(f"❌ Error streaming video {filename}: {e}")
        return jsonify({"error": "Failed to stream video"}), 500

@ai_features_bp.route('/videos/debug', methods=['GET'])
def debug_videos():
    """Debug route to check video files"""
    try:
        video_folder = Config.VIDEO_FOLDER
        
        print(f"🔍 Debug - Video folder: {video_folder}")
        print(f"🔍 Debug - Absolute path: {os.path.abspath(video_folder)}")
        print(f"🔍 Debug - Folder exists: {os.path.exists(video_folder)}")
        
        if not os.path.exists(video_folder):
            return jsonify({
                "error": "Video folder does not exist",
                "path": video_folder,
                "absolute_path": os.path.abspath(video_folder)
            }), 404
        
        files = os.listdir(video_folder)
        video_files = [f for f in files if f.endswith('.mp4')]
        
        file_details = []
        for file in video_files:
            file_path = os.path.join(video_folder, file)
            file_details.append({
                "filename": file,
                "size": os.path.getsize(file_path),
                "full_path": os.path.abspath(file_path),
                "exists": os.path.exists(file_path),
                "url": f"/api/ai-features/videos/{file}"
            })
        
        return jsonify({
            "video_folder": video_folder,
            "absolute_path": os.path.abspath(video_folder),
            "total_files": len(files),
            "video_files": len(video_files),
            "all_files": files,
            "video_details": file_details
        }), 200
        
    except Exception as e:
        print(f"❌ Debug error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Helper function for listing videos
def get_listing_videos(listing_id):
    """Helper function to get videos for a listing"""
    try:
        videos = list(mongo.db.village_story_videos.find({
            "listing_id": ObjectId(listing_id),
            "status": "completed"
        }).sort("generated_at", -1))
        
        formatted_videos = []
        for video in videos:
            # Verify the video file actually exists
            video_path = os.path.join(Config.VIDEO_FOLDER, video["video_filename"])
            file_exists = os.path.exists(video_path)
            
            print(f"📹 Video: {video['video_filename']}, Exists: {file_exists}")
            
            if file_exists:  # Only include videos that actually exist
                video_data = {
                    "id": str(video["_id"]),
                    "video_id": video["video_id"],
                    "video_filename": video["video_filename"],
                    "video_url": f"/api/ai-features/videos/{video['video_filename']}",
                    "download_url": f"/api/ai-features/videos/{video['video_filename']}/download",
                    "stream_url": f"/api/ai-features/videos/{video['video_filename']}/stream",
                    "duration": video.get("duration", 30),
                    "file_size": video.get("file_size", 0),
                    "generated_at": video["generated_at"].isoformat(),
                    "prompt_used": video.get("prompt_used", ""),
                    "file_exists": file_exists,
                    "file_path": video_path  # For debugging
                }
                formatted_videos.append(video_data)
            else:
                print(f"⚠️ Video file missing: {video_path}")
        
        return formatted_videos
    except Exception as e:
        print(f"Error getting listing videos: {e}")
        return []

# ============ EXISTING AI FEATURES ROUTES ============

@ai_features_bp.route('/listing-videos/<listing_id>', methods=['GET'])
def get_listing_videos_route(listing_id):
    """Get all videos for a specific listing"""
    try:
        # Verify listing exists
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        # Get videos for this listing
        videos = get_listing_videos(listing_id)
        
        return jsonify({
            "success": True,
            "videos": videos,
            "total_count": len(videos)
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching listing videos: {e}")
        return jsonify({"error": str(e)}), 500

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
        
        # Create generation record first
        generation_record = {
            "listing_id": ObjectId(listing_id),
            "host_id": ObjectId(user_id),
            "images_used": len(images),
            "created_at": datetime.utcnow(),
            "generation_type": "village_story",
            "status": "processing",
            "video_data": None
        }
        
        result = mongo.db.ai_generations.insert_one(generation_record)
        generation_id = str(result.inserted_id)
        
        # Generate video in background thread to avoid timeout
        def generate_video_async():
            try:
                print(f"🎬 Starting async video generation for listing: {listing['title']}")
                video_result = video_service.generate_video(listing, host_info, images)
                
                print(f"✅ Video generation completed: {video_result}")
                
                # Update generation record with video data
                mongo.db.ai_generations.update_one(
                    {"_id": ObjectId(generation_id)},
                    {
                        "$set": {
                            "status": "completed",
                            "video_data": video_result,
                            "completed_at": datetime.utcnow()
                        }
                    }
                )
                
                # Update listing with video information and set has_village_story flag
                mongo.db.listings.update_one(
                    {"_id": ObjectId(listing_id)},
                    {
                        "$set": {
                            "village_story_video": video_result,
                            "has_village_story": True,
                            "latest_video_generated_at": datetime.utcnow()
                        }
                    }
                )
                
                print(f"✅ Database updated successfully for listing: {listing['title']}")
                
            except Exception as e:
                print(f"❌ Async video generation failed: {str(e)}")
                import traceback
                traceback.print_exc()
                
                # Update record with error
                mongo.db.ai_generations.update_one(
                    {"_id": ObjectId(generation_id)},
                    {
                        "$set": {
                            "status": "error",
                            "error": str(e),
                            "completed_at": datetime.utcnow()
                        }
                    }
                )
        
        # Start video generation in background
        thread = threading.Thread(target=generate_video_async)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "message": "Village story video generation started",
            "generation_id": generation_id,
            "status": "processing",
            "estimated_completion": "2-5 minutes"
        }), 202
        
    except Exception as e:
        print(f"❌ Village story generation error: {str(e)}")
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
        
        status_response = {
            "generation_id": generation_id,
            "status": generation.get('status', 'processing'),
            "progress": 100 if generation.get('status') == 'completed' else 50,
            "created_at": generation['created_at'].isoformat(),
        }
        
        if generation.get('video_data'):
            video_data = generation['video_data']
            # Ensure URLs are properly formatted
            status_response["video_data"] = {
                **video_data,
                "video_url": f"/api/ai-features/videos/{video_data.get('video_filename', '')}",
                "download_url": f"/api/ai-features/videos/{video_data.get('video_filename', '')}/download",
                "stream_url": f"/api/ai-features/videos/{video_data.get('video_filename', '')}/stream"
            }
        
        if generation.get('error'):
            status_response["error"] = generation['error']
        
        return jsonify(status_response), 200
        
    except Exception as e:
        print(f"❌ Status check error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ... REST OF YOUR EXISTING AI FEATURES ROUTES ...
# (voice-to-listing, cultural-concierge, etc. - keep all your existing routes)

# ============ FEATURE 2: VOICE-TO-LISTING MAGIC (GOOGLE SPEECH) ============

@ai_features_bp.route('/voice-to-listing', methods=['POST'])
@jwt_required()
def voice_to_listing():
    try:
        user_id = get_jwt_identity()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can use this feature"}), 403
        
        # Get form data
        if 'audio_data' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio_data']
        language = request.form.get('language', 'hi')
        listing_category = request.form.get('listing_category', 'homestay')  # NEW: Get category
        
        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400
        
        # Read audio data
        audio_data = audio_file.read()
        
        if len(audio_data) == 0:
            return jsonify({"error": "Empty audio file"}), 400
        
        print(f"🎤 Processing {listing_category} voice input: {len(audio_data)} bytes, language: {language}")
        
        # Process voice to listing with category
        from utils.ai_utils import voice_to_listing_magic
        result = voice_to_listing_magic(
            audio_data=audio_data, 
            language=language, 
            host_id=user_id,
            listing_category=listing_category  # NEW: Pass category
        )
        
        # Generate processing ID
        processing_id = f"voice_{user_id}_{int(time.time())}"
        
        # Store in database with category
        voice_processing_doc = {
            "_id": processing_id,
            "user_id": ObjectId(user_id),
            "listing_category": listing_category,  # NEW: Store category
            "processing_result": result,
            "created_at": datetime.utcnow(),
            "status": "completed"
        }
        
        mongo.db.voice_processing.insert_one(voice_processing_doc)
        
        return jsonify({
            "processing_id": processing_id,
            "result": result,
            "status": "completed"
        }), 200
        
    except Exception as e:
        print(f"❌ Voice to listing error: {str(e)}")
        return jsonify({"error": str(e)}), 500

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

# In the create_listing_from_voice function, add geocoding

@ai_features_bp.route('/create-listing-from-voice', methods=['POST'])
@jwt_required()
def create_listing_from_voice():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can use this feature"}), 403
        
        processing_id = data.get('processing_id')
        if not processing_id:
            return jsonify({"error": "Processing ID is required"}), 400
        
        # Get voice processing result
        voice_result = mongo.db.voice_processing.find_one({"_id": processing_id})
        if not voice_result:
            return jsonify({"error": "Voice processing result not found"}), 404
        
        if str(voice_result['user_id']) != user_id:
            return jsonify({"error": "Unauthorized access to processing result"}), 403
        
        # Get category from voice result
        listing_category = data.get('listing_category') or voice_result.get('listing_category', 'homestay')
        custom_edits = data.get('custom_edits', {})
        
        print(f"📝 Creating {listing_category} listing from voice processing: {processing_id}")
        
        # Create listing data based on category
        if listing_category == 'homestay':
            listing_data = {
                "listing_category": "homestay",
                "host_id": ObjectId(user_id),
                "title": custom_edits.get('title', ''),
                "description": custom_edits.get('description', ''),
                "location": custom_edits.get('location', ''),
                "property_type": custom_edits.get('property_type', 'homestay'),
                "price_per_night": float(custom_edits.get('price_per_night', 2000)),
                "max_guests": int(custom_edits.get('max_guests', 4)),
                "amenities": custom_edits.get('amenities', []),
                "house_rules": custom_edits.get('house_rules', []),
                "sustainability_features": custom_edits.get('sustainability_features', []),
                "images": custom_edits.get('images', []),
                "coordinates": custom_edits.get('coordinates', {"lat": 0, "lng": 0}),
                "created_at": datetime.utcnow(),
                "is_active": True,
                "is_approved": False,
                "voice_generated": True,
                "voice_processing_id": processing_id
            }
            
            # Insert into listings collection
            result = mongo.db.listings.insert_one(listing_data)
            created_id = str(result.inserted_id)
            
        else:  # experience
            listing_data = {
                "listing_category": "experience",
                "host_id": ObjectId(user_id),
                "title": custom_edits.get('title', ''),
                "description": custom_edits.get('description', ''),
                "location": custom_edits.get('location', ''),
                "category": custom_edits.get('category', 'cultural'),
                "price_per_person": float(custom_edits.get('price_per_person', 500)),
                "duration": float(custom_edits.get('duration', 2)),
                "max_participants": int(custom_edits.get('max_participants', 8)),
                "difficulty_level": custom_edits.get('difficulty_level', 'easy'),
                "inclusions": custom_edits.get('inclusions', []),
                "requirements": custom_edits.get('requirements', []),
                "images": custom_edits.get('images', []),
                "coordinates": custom_edits.get('coordinates', {"lat": 0, "lng": 0}),
                "created_at": datetime.utcnow(),
                "is_active": True,
                "is_approved": False,
                "voice_generated": True,
                "voice_processing_id": processing_id
            }
            
            # Insert into experiences collection
            result = mongo.db.experiences.insert_one(listing_data)
            created_id = str(result.inserted_id)
        
        print(f"✅ {listing_category.title()} created successfully with ID: {created_id}")
        
        return jsonify({
            "success": True,
            "listing_id": created_id,
            "listing_category": listing_category,
            "message": f"{listing_category.title()} created successfully from voice input!"
        }), 201
        
    except Exception as e:
        print(f"❌ Create listing from voice error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ai_features_bp.route('/generate-listing-content', methods=['POST'])
@jwt_required()
def generate_listing_content_ai():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a host
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Only hosts can generate listing content"}), 403
        
        # Get input data
        title = data.get('title', '').strip()
        location = data.get('location', '').strip()
        price_per_night = data.get('price_per_night', '')
        property_type = data.get('property_type', 'homestay')
        
        # Validation
        if not title:
            return jsonify({"error": "Title is required for AI content generation"}), 400
        
        if not location:
            return jsonify({"error": "Location is required for AI content generation"}), 400
        
        # Generate AI content using Gemini
        content_prompt = f"""
        You are an expert travel content writer specializing in authentic rural and village tourism in India. 
        Create compelling, culturally-rich listing content that attracts travelers seeking genuine experiences.

        Property Details:
        - Title: {title}
        - Location: {location}
        - Property Type: {property_type}
        - Price per Night: ₹{price_per_night}

        Generate a comprehensive listing description (200-250 words) that includes:

        1. **Opening Hook**: Start with what makes this place special
        2. **Cultural Context**: Highlight local traditions, customs, and village life
        3. **Accommodation Details**: Describe the property authentically
        4. **Experiences**: What guests can do (farming, cooking, festivals, crafts)
        5. **Local Highlights**: Nearby attractions, natural beauty, or cultural sites
        6. **Sustainability**: Mention eco-friendly or community-focused aspects
        7. **Emotional Connection**: How guests will feel and what memories they'll create

        Writing Style:
        - Warm, inviting, and authentic tone
        - Use sensory details (sounds, smells, textures)
        - Include Hindi/local terms with explanations where appropriate
        - Focus on experiences over amenities
        - Emphasize cultural immersion and learning

        Create content that makes travelers feel excited about experiencing authentic village life.
        Make it feel personal and genuine, not marketing-heavy.

        Return only the description text, no formatting or extra labels.
        """

        print(f"🤖 Generating AI content for listing: {title} in {location}")
        
        from utils.ai_utils import call_gemini_api
        ai_description = call_gemini_api(content_prompt)
        
        # Generate additional content suggestions
        suggestions_prompt = f"""
        Based on the property "{title}" in {location}, suggest:

        1. 5 relevant amenities for a {property_type}
        2. 3 house rules appropriate for rural/village stays
        3. 3 sustainability features typical for this location
        4. 2 unique selling points that differentiate this property

        Format as JSON:
        {{
            "suggested_amenities": ["amenity1", "amenity2", "amenity3", "amenity4", "amenity5"],
            "house_rules": ["rule1", "rule2", "rule3"],
            "sustainability_features": ["feature1", "feature2", "feature3"],
            "unique_selling_points": ["point1", "point2"]
        }}
        """
        
        try:
            suggestions_response = call_gemini_api(suggestions_prompt)
            # Try to parse JSON from response
            import re
            json_match = re.search(r'\{.*\}', suggestions_response, re.DOTALL)
            if json_match:
                suggestions = json.loads(json_match.group())
            else:
                suggestions = generate_fallback_suggestions(property_type, location)
        except:
            suggestions = generate_fallback_suggestions(property_type, location)
        
        # Log successful generation
        generation_record = {
            "host_id": ObjectId(user_id),
            "title": title,
            "location": location,
            "property_type": property_type,
            "generated_description": ai_description,
            "suggestions": suggestions,
            "created_at": datetime.utcnow(),
            "generation_type": "listing_content"
        }
        
        mongo.db.ai_generations.insert_one(generation_record)
        
        return jsonify({
            "message": "AI content generated successfully",
            "generated_description": ai_description,
            "suggestions": suggestions,
            "word_count": len(ai_description.split()),
            "generation_id": str(generation_record.get("_id"))
        }), 200
        
    except Exception as e:
        print(f"❌ AI content generation error: {str(e)}")
        return jsonify({"error": f"Failed to generate content: {str(e)}"}), 500

def generate_fallback_suggestions(property_type, location):
    """Generate fallback suggestions if AI fails"""
    
    base_amenities = {
        'homestay': ['Home-cooked meals', 'Local guide', 'Wi-Fi', 'Traditional activities', 'Cultural experiences'],
        'farmstay': ['Farm tours', 'Organic meals', 'Animal interaction', 'Harvesting experience', 'Traditional cooking'],
        'heritage_home': ['Historical tours', 'Traditional architecture', 'Cultural performances', 'Heritage walks', 'Antique collections'],
        'eco_lodge': ['Nature walks', 'Bird watching', 'Organic food', 'Solar power', 'Waste management'],
        'village_house': ['Village tours', 'Local interactions', 'Traditional crafts', 'Folk performances', 'Rural lifestyle'],
        'cottage': ['Scenic views', 'Private garden', 'Peaceful environment', 'Nature proximity', 'Rural tranquility']
    }
    
    return {
        "suggested_amenities": base_amenities.get(property_type, base_amenities['homestay']),
        "house_rules": [
            "Respect local customs and traditions",
            "No smoking inside the property",
            "Maintain cleanliness and tidiness"
        ],
        "sustainability_features": [
            "Solar power usage",
            "Rainwater harvesting",
            "Organic farming practices"
        ],
        "unique_selling_points": [
            "Authentic village lifestyle experience",
            "Direct interaction with local community"
        ]
    }

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


@ai_features_bp.route('/weather-recommendations', methods=['POST'])
def get_weather_recommendations():
    try:
        data = request.get_json()
        location = data.get('location', '').strip()
        
        if not location:
            return jsonify({"error": "Location is required"}), 400
        
        print(f"🌤️ Getting weather recommendations for: {location}")
        
        # Get current weather
        current_weather = weather_service.get_current_weather(location)
        if not current_weather:
            return jsonify({"error": "Unable to fetch weather data for this location"}), 400
        
        # Get forecast data
        forecast_data = weather_service.get_weather_forecast(location, days=3)
        
        # Generate recommendations based on current weather
        recommendations = get_weather_based_recommendations(location, current_weather, forecast_data)
        
        # Prepare forecast list - handle the data structure properly
        forecast_list = []
        if forecast_data and 'daily_forecast' in forecast_data:
            # Convert daily forecast to hourly-like format for frontend compatibility
            for day in forecast_data['daily_forecast'][:3]:  # Next 3 days
                # Add multiple entries per day to simulate hourly data
                for hour_offset in [0, 6, 12, 18]:  # 4 times per day
                    forecast_entry = {
                        'datetime': day['date'].strftime('%Y-%m-%d') + f'T{hour_offset:02d}:00:00',
                        'temperature': (day['temp_min'] + day['temp_max']) / 2,
                        'description': day['description'],
                        'main': day['main'],
                        'humidity': day['humidity'],
                        'wind_speed': day['wind_speed'],
                        'rain': day.get('rain', 0)
                    }
                    forecast_list.append(forecast_entry)
        
        return jsonify({
            "location": location,
            "current_weather": current_weather,
            "forecast": forecast_list,  # Properly formatted forecast
            "recommendations": recommendations,
            "search_insights": {
                "best_activities": [rec['activity'] for rec in recommendations[:3]],
                "weather_trend": f"Current conditions are {current_weather['description']} with {current_weather['temperature']}°C - perfect for outdoor village activities!"
            },
            "generated_at": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Weather recommendations error: {str(e)}")
        import traceback
        traceback.print_exc()  # This will help debug the exact error
        return jsonify({"error": f"Failed to get weather recommendations: {str(e)}"}), 500
    
@ai_features_bp.route('/weekly-weather-prediction', methods=['POST'])
def get_weekly_weather_prediction():
    try:
        data = request.get_json()
        location = data.get('location', '').strip()
        
        if not location:
            return jsonify({"error": "Location is required"}), 400
        
        print(f"📅 Getting weekly weather prediction for: {location}")
        
        # Get weekly weather prediction
        weekly_prediction = weather_service.get_weekly_weather_prediction(location)
        
        if not weekly_prediction:
            return jsonify({"error": "Unable to get weather prediction for this location"}), 400
        
        return jsonify(weekly_prediction), 200
        
    except Exception as e:
        print(f"❌ Weekly weather prediction error: {str(e)}")
        return jsonify({"error": f"Failed to get weather prediction: {str(e)}"}), 500

@ai_features_bp.route('/weather-enhanced-search', methods=['POST'])
def weather_enhanced_search():
    try:
        data = request.get_json()
        
        # Search parameters
        location = data.get('location', '').strip()
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        preferences = data.get('preferences', [])  # ['outdoor', 'cultural', 'farming', etc.]
        
        if not location:
            return jsonify({"error": "Location is required"}), 400
        
        print(f"🔍 Weather-enhanced search for: {location}")
        
        # Get weather data
        current_weather = weather_service.get_current_weather(location)
        if not current_weather:
            return jsonify({"error": "Unable to fetch weather data"}), 400
        
        forecast_data = weather_service.get_weather_forecast(location, days=7)
        
        # Get weather recommendations
        recommendations = get_weather_based_recommendations(location, current_weather, forecast_data)
        
        # Filter recommendations based on user preferences
        if preferences:
            filtered_recommendations = [
                rec for rec in recommendations 
                if rec['category'] in preferences
            ]
            if filtered_recommendations:
                recommendations = filtered_recommendations
        
        # Get listings for the location
        listings_query = {
            "location": {"$regex": location, "$options": "i"},
            "is_active": True,
            "is_approved": True
        }
        
        listings = list(mongo.db.listings.find(listings_query).limit(20))
        
        # Score listings based on weather suitability
        scored_listings = []
        for listing in listings:
            try:
                # Get host info
                host = mongo.db.users.find_one({"_id": listing['host_id']})
                
                score = calculate_weather_suitability_score(listing, current_weather, recommendations)
                
                formatted_listing = {
                    "id": str(listing['_id']),
                    "title": listing['title'],
                    "description": listing.get('description', ''),
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
                    "weather_suitability_score": score,
                    "suitable_activities": get_suitable_activities_for_listing(listing, recommendations),
                    "host": {
                        "id": str(host['_id']),
                        "full_name": host['full_name'],
                        "profile_image": host.get('profile_image')
                    } if host else None,
                    "created_at": listing['created_at'].isoformat() if 'created_at' in listing else datetime.utcnow().isoformat()
                }
                scored_listings.append(formatted_listing)
            except Exception as listing_error:
                print(f"Error processing listing {listing.get('_id')}: {listing_error}")
                continue
        
        # Sort by weather suitability
        scored_listings.sort(key=lambda x: x['weather_suitability_score'], reverse=True)
        
        return jsonify({
            "location": location,
            "current_weather": current_weather,
            "recommendations": recommendations,
            "weather_enhanced_listings": scored_listings,
            "search_insights": {
                "weather_summary": f"Current: {current_weather['description']}, {current_weather['temperature']}°C",
                "best_activities": [rec['activity'] for rec in recommendations[:3]],
                "weather_trend": analyze_weather_trend(forecast_data) if forecast_data else "Weather trend analysis not available"
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Weather-enhanced search error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Search failed: {str(e)}"}), 500

def analyze_weather_trend(forecast_data):
    """Analyze weather trend from forecast data"""
    try:
        if not forecast_data or 'daily_forecast' not in forecast_data:
            return "Weather data not available for trend analysis"
        
        daily_forecasts = forecast_data['daily_forecast']
        if not daily_forecasts or len(daily_forecasts) < 2:
            return "Current weather looks stable for the next few days"
        
        # Analyze temperature trend
        temps = []
        for day in daily_forecasts[:3]:
            if isinstance(day.get('temp_min'), (int, float)) and isinstance(day.get('temp_max'), (int, float)):
                temps.append((day['temp_min'] + day['temp_max']) / 2)
        
        if len(temps) < 2:
            return "Current weather looks stable for the next few days"
        
        # Check temperature trend
        if temps[1] > temps[0] + 2:
            trend = "getting warmer"
        elif temps[1] < temps[0] - 2:
            trend = "getting cooler"
        else:
            trend = "remaining stable"
        
        # Check for rain
        rain_days = sum(1 for day in daily_forecasts[:3] if 'rain' in str(day.get('main', '')).lower())
        
        if rain_days >= 2:
            weather_note = "with some rainy days expected"
        elif rain_days == 1:
            weather_note = "with occasional rain possible"
        else:
            weather_note = "with mostly clear skies"
        
        return f"Weather is {trend} over the next few days {weather_note}"
    
    except Exception as e:
        print(f"Error analyzing weather trend: {e}")
        return "Weather trend analysis not available"
    
# Helper functions
def calculate_weather_suitability_score(listing, current_weather, recommendations):
    """Calculate how suitable a listing is for current weather conditions"""
    score = 0
    base_score = 50  # Base score for all listings
    
    # Property type bonuses based on weather
    temp = current_weather['temperature']
    weather_main = current_weather['main'].lower()
    
    property_type = listing.get('property_type', '').lower()
    amenities = [a.lower() for a in listing.get('amenities', [])]
    
    # Temperature-based scoring
    if temp > 30:  # Hot weather
        if 'swimming' in ' '.join(amenities) or 'pool' in ' '.join(amenities):
            score += 20
        if 'air_conditioning' in ' '.join(amenities) or 'ac' in ' '.join(amenities):
            score += 15
        if property_type in ['eco_lodge', 'cottage']:
            score += 10
    elif temp < 15:  # Cold weather
        if 'fireplace' in ' '.join(amenities) or 'heating' in ' '.join(amenities):
            score += 20
        if property_type in ['homestay', 'heritage_home']:
            score += 15
    else:  # Pleasant weather
        score += 10  # All properties get bonus for good weather
    
    # Weather condition bonuses
    if 'rain' in weather_main:
        if 'indoor_activities' in ' '.join(amenities) or 'cooking' in ' '.join(amenities):
            score += 15
        if property_type in ['homestay', 'heritage_home']:
            score += 10
    elif 'clear' in weather_main:
        if 'outdoor_activities' in ' '.join(amenities) or 'garden' in ' '.join(amenities):
            score += 15
        if property_type in ['farmstay', 'eco_lodge']:
            score += 10
    
    # Activity matching bonus
    listing_amenities_text = ' '.join(amenities).lower()
    for rec in recommendations[:5]:  # Top 5 recommendations
        activity_keywords = rec['activity'].lower().split()
        for keyword in activity_keywords:
            if keyword in listing_amenities_text:
                score += 5
    
    # Sustainability bonus for eco-conscious travelers
    if listing.get('sustainability_features'):
        score += 10
    
    return min(base_score + score, 100)  # Cap at 100

def get_suitable_activities_for_listing(listing, recommendations):
    """Get activities that are suitable for this listing based on weather recommendations"""
    suitable_activities = []
    amenities = [a.lower() for a in listing.get('amenities', [])]
    amenities_text = ' '.join(amenities)
    
    for rec in recommendations:
        activity = rec['activity']
        category = rec['category']
        
        # Check if listing supports this activity
        is_suitable = False
        
        if category == 'outdoor' and any(keyword in amenities_text for keyword in ['garden', 'outdoor', 'cycling', 'walking']):
            is_suitable = True
        elif category == 'cultural' and any(keyword in amenities_text for keyword in ['cultural', 'traditional', 'local', 'heritage']):
            is_suitable = True
        elif category == 'cooking' and any(keyword in amenities_text for keyword in ['cooking', 'kitchen', 'meals', 'traditional']):
            is_suitable = True
        elif category == 'farming' and any(keyword in amenities_text for keyword in ['farm', 'organic', 'agricultural', 'harvesting']):
            is_suitable = True
        elif category == 'craft' and any(keyword in amenities_text for keyword in ['workshop', 'craft', 'pottery', 'handicraft']):
            is_suitable = True
        
        if is_suitable:
            suitable_activities.append({
                'activity': activity,
                'category': category,
                'reason': rec['reason'],
                'best_time': rec['best_time']
            })
    
    return suitable_activities[:3]  # Return top 3



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