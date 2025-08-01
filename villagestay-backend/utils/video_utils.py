# villagestay-backend/utils/video_utils.py
import time
import os
import uuid
from google import genai
from config import Config
from datetime import datetime
from database import mongo
from bson import ObjectId

class VideoGenerationService:
    def __init__(self):
        self.client = genai.Client(api_key=Config.GOOGLE_AI_API_KEY)
        self.video_folder = Config.VIDEO_FOLDER
        os.makedirs(self.video_folder, exist_ok=True)
    
    def generate_village_story_prompt(self, listing, host_info, user_images=None):
        """Generate a compelling prompt for village story video"""
        
        # Base prompt components
        location = listing.get('location', 'rural village')
        property_type = listing.get('property_type', 'homestay').replace('_', ' ')
        title = listing.get('title', 'Village Experience')
        description = listing.get('description', '')
        amenities = listing.get('amenities', [])
        sustainability_features = listing.get('sustainability_features', [])
        
        # Create detailed scene description
        prompt_parts = []
        
        # Opening scene
        prompt_parts.append(f"A breathtaking sunrise over {location}, with golden light illuminating the peaceful village landscape.")
        
        # Property showcase
        prompt_parts.append(f"A beautiful {property_type} nestled in the heart of the village, showcasing traditional architecture and authentic charm.")
        
        # Add details based on amenities
        if 'traditional_cooking' in ' '.join(amenities).lower() or 'home_cooked_meals' in ' '.join(amenities).lower():
            prompt_parts.append("A warm kitchen scene with local villagers preparing traditional meals using fresh, local ingredients over a wood fire.")
        
        if 'farming' in ' '.join(amenities).lower() or 'agricultural' in description.lower():
            prompt_parts.append("Guests participating in authentic farming activities, working alongside local farmers in lush green fields.")
        
        if 'cultural' in ' '.join(amenities).lower() or 'traditional' in description.lower():
            prompt_parts.append("Villagers in colorful traditional attire performing folk dances and music, with guests joining in the celebration.")
        
        # Sustainability focus
        if sustainability_features:
            prompt_parts.append("Eco-friendly practices in action - solar panels gleaming in sunlight, rainwater harvesting, and organic gardens flourishing.")
        
        # Host interaction
        host_name = host_info.get('full_name', 'local host')
        prompt_parts.append(f"{host_name} warmly welcoming guests with a genuine smile, showing the authentic hospitality of village life.")
        
        # Nature and surroundings
        prompt_parts.append("Scenic village landscapes with rolling hills, traditional houses, wandering cattle, and children playing in dusty lanes.")
        
        # Evening scene
        prompt_parts.append("A peaceful evening with guests sitting around a bonfire, sharing stories under a starlit sky, creating memories that last a lifetime.")
        
        # Combine all parts into a cohesive prompt
        full_prompt = " ".join(prompt_parts)
        
        # Add cinematic direction
        cinematic_prompt = f"""Create a cinematic 30-second village story video showcasing: {full_prompt}
        
        The video should capture the authentic essence of rural Indian hospitality and culture. Use warm, golden lighting throughout, smooth camera movements, and focus on genuine human connections. Show the contrast between peaceful village life and meaningful cultural experiences. End with guests looking content and fulfilled, having discovered something truly special.
        
        Style: Documentary-style cinematography with warm, natural lighting. Emphasize authentic moments, cultural richness, and the unique charm of village hospitality."""
        
        return cinematic_prompt
    
    def generate_video(self, listing, host_info, user_images=None):
        """Generate video using Google Veo 3.0 and store in MongoDB"""
        
        try:
            print(f"🎬 Starting video generation for listing: {listing.get('title')}")
            print(f"📋 Listing ID: {listing.get('_id')}")
            print(f"👤 Host: {host_info.get('full_name')}")
            print(f"🖼️ Images: {len(user_images) if user_images else 0}")
            
            # Generate prompt
            prompt = self.generate_village_story_prompt(listing, host_info, user_images)
            print(f"📝 Generated prompt length: {len(prompt)} characters")
            
            # Initiate video generation
            print("🔄 Calling Google Veo 3.0 API...")
            operation = self.client.models.generate_videos(
                model="veo-3.0-generate-preview",
                prompt=prompt,
            )
            
            print(f"⏳ Video generation started. Operation ID: {operation.name}")
            
            # Poll for completion with detailed logging
            max_wait_time = 300  # 5 minutes max wait
            wait_interval = 10   # Check every 10 seconds
            total_waited = 0
            
            while not operation.done and total_waited < max_wait_time:
                print(f"⏳ Waiting for video generation... ({total_waited}s elapsed)")
                time.sleep(wait_interval)
                total_waited += wait_interval
                
                try:
                    operation = self.client.operations.get(operation)
                    print(f"📊 Operation status: {operation.done}, Error: {operation.error}")
                except Exception as e:
                    print(f"⚠️ Error checking operation status: {e}")
                    continue
            
            if not operation.done:
                raise Exception("Video generation timed out after 5 minutes")
            
            if operation.error:
                raise Exception(f"Video generation failed: {operation.error}")
            
            # Download the generated video
            print("📥 Downloading generated video...")
            generated_video = operation.response.generated_videos[0]
            
            # Generate unique filename
            video_id = str(uuid.uuid4())
            video_filename = f"village_story_{video_id}.mp4"
            video_path = os.path.join(self.video_folder, video_filename)
            
            print(f"💾 Saving video to: {video_path}")
            
            # Download and save video
            self.client.files.download(file=generated_video.video)
            generated_video.video.save(video_path)
            
            # Verify file was saved
            if not os.path.exists(video_path):
                raise Exception(f"Video file was not saved to {video_path}")
            
            file_size = os.path.getsize(video_path)
            print(f"✅ Video saved successfully: {video_path} ({file_size} bytes)")
            
            # Create video document for MongoDB
            video_document = {
                "video_id": video_id,
                "listing_id": ObjectId(listing['_id']),
                "host_id": ObjectId(listing['host_id']),
                "video_filename": video_filename,
                "video_path": video_path,
                "video_url": f"/api/ai-features/videos/{video_filename}",  # CORRECT PATH
                "duration": 30,
                "status": "completed",
                "generated_at": datetime.utcnow(),
                "prompt_used": prompt,
                "file_size": file_size,
                "user_images_count": len(user_images) if user_images else 0,
                "metadata": {
                    "property_type": listing.get('property_type'),
                    "location": listing.get('location'),
                    "amenities_count": len(listing.get('amenities', [])),
                    "sustainability_features_count": len(listing.get('sustainability_features', []))
                }
            }
            
            # Save video document to MongoDB
            video_result = mongo.db.village_story_videos.insert_one(video_document)
            video_document["_id"] = video_result.inserted_id
            
            print(f"💾 Video document saved to MongoDB with ID: {video_result.inserted_id}")
            
            # Return video information with CORRECT URLs
            return {
                "video_id": video_id,
                "video_filename": video_filename,
                "video_path": video_path,
                "video_url": f"/api/ai-features/videos/{video_filename}",  # CORRECT PATH
                "download_url": f"/api/ai-features/videos/{video_filename}/download",  # CORRECT PATH
                "stream_url": f"/api/ai-features/videos/{video_filename}/stream",  # CORRECT PATH
                "duration": 30,
                "status": "completed",
                "generated_at": datetime.utcnow().isoformat(),
                "prompt_used": prompt,
                "file_size": file_size,
                "mongo_id": str(video_result.inserted_id)
            }
            
        except Exception as e:
            print(f"❌ Video generation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Video generation failed: {str(e)}")


    def get_listing_videos(self, listing_id):
        """Get all videos for a specific listing"""
        try:
            videos = list(mongo.db.village_story_videos.find({
                "listing_id": ObjectId(listing_id),
                "status": "completed"
            }).sort("generated_at", -1))
            
            # Convert ObjectId to string for JSON serialization
            for video in videos:
                video["_id"] = str(video["_id"])
                video["listing_id"] = str(video["listing_id"])
                video["host_id"] = str(video["host_id"])
            
            return videos
        except Exception as e:
            print(f"❌ Error fetching listing videos: {e}")
            return []
    
    def get_host_videos(self, host_id):
        """Get all videos for a specific host"""
        try:
            videos = list(mongo.db.village_story_videos.find({
                "host_id": ObjectId(host_id),
                "status": "completed"
            }).sort("generated_at", -1))
            
            # Convert ObjectId to string for JSON serialization
            for video in videos:
                video["_id"] = str(video["_id"])
                video["listing_id"] = str(video["listing_id"])
                video["host_id"] = str(video["host_id"])
            
            return videos
        except Exception as e:
            print(f"❌ Error fetching host videos: {e}")
            return []

# Initialize service
video_service = VideoGenerationService()