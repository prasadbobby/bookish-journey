import requests
from openai import AzureOpenAI
import json
import tempfile
import os
import base64
from pydub import AudioSegment
import io
from config import Config

# Initialize Azure OpenAI Client
azure_client = None
try:
    azure_client = AzureOpenAI(
        api_key=Config.AZURE_GPT_API_KEY,
        api_version=Config.AZURE_GPT_API_VERSION,
        azure_endpoint=Config.AZURE_GPT_ENDPOINT
    )
    print("✅ Azure OpenAI client initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize Azure OpenAI client: {e}")

def transcribe_audio_azure_whisper(audio_data, language="auto"):
    """
    Transcribe audio using Azure OpenAI Whisper
    """
    try:
        print(f"🎵 Starting Azure Whisper transcription for language: {language}")
        
        # Create temporary file for audio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            # Decode base64 audio data if needed
            if isinstance(audio_data, str):
                audio_bytes = base64.b64decode(audio_data)
            else:
                audio_bytes = audio_data
            
            print(f"🎵 Processing {len(audio_bytes)} bytes of audio data")
            
            # Convert webm to wav using pydub
            try:
                audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
                # Ensure proper format for Whisper (16kHz, mono)
                audio = audio.set_frame_rate(16000).set_channels(1)
                audio.export(temp_file.name, format="wav")
                print(f"🔄 Converted audio to WAV format: {temp_file.name}")
            except Exception as conversion_error:
                print(f"❌ Audio conversion error: {conversion_error}")
                # Write raw audio data if conversion fails
                temp_file.write(audio_bytes)
                temp_file.flush()
            
            # Map language codes for Azure Whisper
            azure_language = get_azure_language_code(language)
            
            # Prepare API request
            with open(temp_file.name, "rb") as audio_file:
                files = {
                    "file": (temp_file.name, audio_file, "audio/wav"),
                }
                data = {
                    "language": azure_language,
                    "response_format": "text"
                }
                headers = {
                    "api-key": Config.AZURE_WHISPER_API_KEY,
                }

                url = f"{Config.AZURE_WHISPER_ENDPOINT}?api-version={Config.AZURE_WHISPER_API_VERSION}"
                
                print(f"🎤 Calling Azure Whisper API (language: {azure_language})")
                print(f"📡 URL: {url}")
                
                response = requests.post(url, headers=headers, data=data, files=files)

                if response.status_code == 200:
                    transcribed_text = response.text.strip()
                    print(f"✅ Azure Whisper transcription successful!")
                    print(f"📝 Result: {transcribed_text}")
                    
                    # Cleanup
                    os.unlink(temp_file.name)
                    
                    return {
                        "text": transcribed_text,
                        "language": language,
                        "confidence": 0.95
                    }
                else:
                    error_msg = f"Azure Whisper Error {response.status_code}: {response.text}"
                    print(f"❌ {error_msg}")
                    # Cleanup
                    os.unlink(temp_file.name)
                    raise Exception(error_msg)
                    
    except Exception as e:
        print(f"❌ Azure Whisper transcription error: {e}")
        # Cleanup on error
        if 'temp_file' in locals() and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        raise Exception(f"Azure audio transcription failed: {str(e)}")

def enhance_listing_with_azure_gpt(transcribed_text, language):
    """
    Use Azure GPT-4o to enhance the transcribed text into a professional listing
    """
    if not azure_client:
        raise Exception("Azure OpenAI client not available")
    
    try:
        system_prompt = """
        You are an expert in creating professional rural tourism listings. 
        You help hosts convert their voice descriptions into compelling property listings 
        that attract travelers seeking authentic village experiences.
        """

        user_prompt = f"""
        A host has described their rural property in {language}. Create a professional listing from this description:
        
        Original Description: "{transcribed_text}"
        
        Generate a comprehensive listing with the following structure:
        1. Catchy title (5-8 words) - make it appealing and descriptive
        2. Professional description (150-200 words) highlighting authentic rural experience
        3. List of amenities (based on description + typical for this property type) - at least 6 amenities
        4. Property type (choose from: homestay, farmstay, village_house, eco_lodge, heritage_home, cottage)
        5. Suggested pricing range per night (in INR, consider rural India pricing 1000-5000)
        6. House rules (3-4 culturally appropriate rules)
        7. Unique selling points (3-4 points)
        8. Sustainability features mentioned or implied (at least 3)
        9. Maximum guests (reasonable number 2-8)
        
        Maintain cultural authenticity and local charm. 
        
        Respond with valid JSON only in this exact format:
        {{
            "title": "string",
            "description": "string", 
            "amenities": ["string1", "string2", "string3", "string4", "string5", "string6"],
            "property_type": "string",
            "pricing_suggestion": "₹XXXX",
            "house_rules": ["string1", "string2", "string3"],
            "unique_features": ["string1", "string2", "string3"],
            "sustainability_features": ["string1", "string2", "string3"],
            "max_guests": number
        }}
        """

        print("🤖 Enhancing listing with Azure GPT-4o...")
        
        response = azure_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=2048,
            temperature=0.7,
            top_p=1.0,
            model=Config.AZURE_GPT_DEPLOYMENT
        )

        gpt_response = response.choices[0].message.content
        print(f"✅ Azure GPT-4o enhancement successful")
        print(f"📝 Response: {gpt_response[:200]}...")
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', gpt_response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            print("⚠️ No valid JSON found in GPT response, using fallback")
            return create_fallback_listing_data(transcribed_text, language)
            
    except Exception as e:
        print(f"❌ Azure GPT enhancement error: {e}")
        return create_fallback_listing_data(transcribed_text, language)

def get_azure_language_code(language):
    """Map our language codes to Azure Whisper language codes"""
    mapping = {
        "hi": "hi",      # Hindi
        "en": "en",      # English
        "gu": "gu",      # Gujarati
        "te": "te",      # Telugu
        "mr": "mr",      # Marathi
        "ta": "ta",      # Tamil
        "bn": "bn",      # Bengali
        "pa": "pa",      # Punjabi
        "auto": "en"     # Default to English for auto
    }
    return mapping.get(language, "en")

def create_fallback_listing_data(transcribed_text, language):
    """Create fallback listing data if AI enhancement fails"""
    return {
        "title": "Authentic Village Experience" if language == 'en' else "पारंपरिक गांव का अनुभव",
        "description": transcribed_text,
        "amenities": [
            "Home-cooked meals",
            "Local guide", 
            "Wi-Fi connectivity",
            "Traditional activities",
            "Organic farming",
            "Cultural experiences"
        ],
        "property_type": "homestay",
        "pricing_suggestion": "₹2000",
        "house_rules": [
            "Respect local customs",
            "No smoking indoors",
            "Keep premises clean"
        ],
        "unique_features": [
            "Traditional architecture",
            "Organic farming experience",
            "Local cultural immersion"
        ],
        "sustainability_features": [
            "Organic farming",
            "Local sourcing",
            "Traditional cooking methods"
        ],
        "max_guests": 4
    }

def test_azure_transcription():
    """Test Azure transcription setup"""
    print("🧪 Testing Azure transcription setup...")
    
    # Test Azure OpenAI client
    if azure_client:
        print("✅ Azure OpenAI client available")
    else:
        print("❌ Azure OpenAI client not available")
        return False
    
    # Test API keys
    if Config.AZURE_WHISPER_API_KEY and Config.AZURE_GPT_API_KEY:
        print("✅ Azure API keys configured")
    else:
        print("❌ Azure API keys missing")
        return False
    
    print("✅ Azure setup ready for transcription!")
    return True