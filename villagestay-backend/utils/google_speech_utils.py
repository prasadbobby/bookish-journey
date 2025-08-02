import io
import base64
import tempfile
import os
from google.cloud import speech
from pydub import AudioSegment
from config import Config
import json

# Initialize Google Speech client
speech_client = None
try:
    if Config.GOOGLE_APPLICATION_CREDENTIALS and Config.GOOGLE_CLOUD_PROJECT_ID:
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = Config.GOOGLE_APPLICATION_CREDENTIALS
        speech_client = speech.SpeechClient()
    else:
        raise Exception("Google Cloud credentials not configured")
except Exception as e:
    raise Exception(f"Failed to initialize Google Speech client: {e}")

def transcribe_audio_google_speech(audio_data, language="auto"):
    """Transcribe audio using Google Cloud Speech-to-Text API"""
    
    if not speech_client:
        raise Exception("Google Speech-to-Text client not initialized")
    
    try:
        # Decode base64 audio data
        if isinstance(audio_data, str):
            audio_bytes = base64.b64decode(audio_data)
        else:
            audio_bytes = audio_data
        
        # Convert audio to proper format
        audio_content = convert_audio_for_google_speech(audio_bytes)
        
        # Map language codes
        google_language = get_google_language_code(language)
        
        # Configure recognition with better settings
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=google_language,
            enable_automatic_punctuation=True,
            audio_channel_count=1,
            model="latest_short"  # Better for short audio clips
        )
        
        # Create audio object
        audio = speech.RecognitionAudio(content=audio_content)
        
        # Perform the transcription
        response = speech_client.recognize(config=config, audio=audio)
        
        if not response.results:
            raise Exception("No speech detected in audio")
        
        # Extract transcription
        transcribed_text = ""
        confidence_scores = []
        
        for result in response.results:
            if result.alternatives:
                alternative = result.alternatives[0]
                transcribed_text += alternative.transcript + " "
                if hasattr(alternative, 'confidence'):
                    confidence_scores.append(alternative.confidence)
        
        transcribed_text = transcribed_text.strip()
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.9
        
        if not transcribed_text:
            raise Exception("Empty transcription result")
        
        return {
            "text": transcribed_text,
            "language": language,
            "confidence": avg_confidence
        }
        
    except Exception as e:
        raise Exception(f"Google Speech transcription failed: {str(e)}")

def convert_audio_for_google_speech(audio_bytes):
    """Convert audio to format required by Google Speech API"""
    try:
        # Create audio segment from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        
        # Convert to required format: 16kHz, mono, 16-bit PCM
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        
        # Normalize audio levels
        audio = audio.normalize()
        
        # Export to bytes
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format="wav")
        
        return output_buffer.getvalue()
        
    except Exception as e:
        raise Exception(f"Audio conversion failed: {str(e)}")

def get_google_language_code(language):
    """Map language codes to Google Speech API codes"""
    mapping = {
        "hi": "hi-IN",
        "en": "en-US", 
        "gu": "gu-IN",
        "te": "te-IN",
        "mr": "mr-IN",
        "ta": "ta-IN",
        "bn": "bn-IN",
        "pa": "pa-IN",
        "auto": "hi-IN"  # Default to Hindi for auto
    }
    return mapping.get(language, "hi-IN")

def enhance_listing_with_gemini(transcribed_text, language, listing_category="homestay"):
    """Use Gemini API to enhance transcribed text into professional listing based on category"""
    try:
        from utils.ai_utils import call_gemini_api
        
        if listing_category == "homestay":
            prompt = f"""
            Convert this voice description into a professional rural homestay listing:
            
            Voice input: "{transcribed_text}"
            Language: {language}
            
            Create a JSON response with:
            {{
                "title": "Attractive 5-8 word title for homestay",
                "description": "Professional 150-200 word description highlighting rural homestay experience", 
                "amenities": ["Home-cooked meals", "Wi-Fi", "Local guide", "Traditional activities", "Organic farming", "Cultural experiences"],
               "property_type": "homestay/farmstay/village_house/eco_lodge",
               "pricing_suggestion": "₹2000-3000",
               "house_rules": ["Respect local customs", "No smoking indoors", "Maintain cleanliness"],
               "unique_features": ["Traditional architecture", "Organic farming", "Cultural immersion"],
               "sustainability_features": ["Organic farming", "Local sourcing", "Traditional cooking"],
               "max_guests": 4,
               "location": "Extract location if mentioned"
           }}
           
           Respond with valid JSON only.
           """
        else:  # experience
            prompt = f"""
            Convert this voice description into a professional cultural experience listing:
            
            Voice input: "{transcribed_text}"
            Language: {language}
            
            Create a JSON response with:
            {{
                "title": "Attractive 5-8 word title for experience",
                "description": "Professional 150-200 word description highlighting unique cultural experience", 
                "inclusions": ["All materials", "Light refreshments", "Professional guide", "Take-home items", "Certificate"],
                "category": "cultural/culinary/farming/craft/spiritual/adventure",
                "pricing_suggestion": "₹500-1000",
                "requirements": ["No prior experience needed", "Comfortable clothing", "Open mind"],
                "unique_features": ["Traditional techniques", "Cultural significance", "Hands-on learning"],
                "duration": 2,
                "max_participants": 8,
                "difficulty_level": "easy",
                "location": "Extract location if mentioned"
            }}
            
            Respond with valid JSON only.
            """
        
        response = call_gemini_api(prompt)
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            raise Exception("Invalid JSON response from Gemini")
            
    except Exception as e:
        raise Exception(f"Gemini enhancement failed: {str(e)}")
