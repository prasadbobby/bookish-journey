# villagestay-backend/config.py

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/villagestay'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
    # Google Maps and Places API
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')
    GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY') or os.environ.get('GOOGLE_MAPS_API_KEY')
    
    # Use absolute paths for upload and video folders
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    VIDEO_FOLDER = os.path.join(BASE_DIR, 'videos')
    
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')
    
    # Google Cloud Speech-to-Text Configuration
    GOOGLE_CLOUD_PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT_ID') or 'gen-lang-client-0707370600'
    GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    
    # Google AI API Key for Veo 3.0
    GOOGLE_AI_API_KEY = os.environ.get('GOOGLE_AI_API_KEY') or 'AIzaSyDoBk3KSlc2DmAuJsfe3ykWuXxUlhFdaoE'
    
    # Azure OpenAI Configuration
    AZURE_GPT_ENDPOINT = os.environ.get('AZURE_GPT_ENDPOINT') or 'https://codecuffs1.openai.azure.com/'
    AZURE_GPT_API_KEY = os.environ.get('AZURE_GPT_API_KEY')
    AZURE_GPT_API_VERSION = os.environ.get('AZURE_GPT_API_VERSION') or '2024-12-01-preview'
    AZURE_GPT_DEPLOYMENT = os.environ.get('AZURE_GPT_DEPLOYMENT') or 'gpt-4o'