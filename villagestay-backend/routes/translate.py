from flask import Blueprint, request, jsonify
import requests
import os
from config import Config

translate_bp = Blueprint('translate', __name__)

@translate_bp.route('/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        
        text = data.get('text', '')
        target_language = data.get('targetLanguage', 'en')
        source_language = data.get('sourceLanguage', 'auto')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Google Translate API
        api_key = Config.GOOGLE_TRANSLATE_API_KEY
        if not api_key:
            return jsonify({"error": "Translation service not configured"}), 500
            
        url = f"https://translation.googleapis.com/language/translate/v2"
        
        params = {
            'key': api_key,
            'q': text,
            'target': target_language,
            'source': source_language,
            'format': 'text'
        }
        
        response = requests.post(url, data=params)
        
        if response.status_code != 200:
            return jsonify({"error": "Translation service error"}), 500
            
        result = response.json()
        
        if 'data' in result and 'translations' in result['data']:
            translated_text = result['data']['translations'][0]['translatedText']
            detected_language = result['data']['translations'][0].get('detectedSourceLanguage', source_language)
            
            return jsonify({
                "translatedText": translated_text,
                "detectedSourceLanguage": detected_language,
                "targetLanguage": target_language
            })
        else:
            return jsonify({"error": "Invalid translation response"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@translate_bp.route('/translate/batch', methods=['POST'])
def translate_batch():
    try:
        data = request.get_json()
        
        texts = data.get('texts', [])
        target_language = data.get('targetLanguage', 'en')
        source_language = data.get('sourceLanguage', 'auto')
        
        if not texts:
            return jsonify({"error": "Texts array is required"}), 400
        
        api_key = Config.GOOGLE_TRANSLATE_API_KEY
        if not api_key:
            return jsonify({"error": "Translation service not configured"}), 500
            
        url = f"https://translation.googleapis.com/language/translate/v2"
        
        # Batch translate
        translations = []
        for text in texts[:50]:  # Limit to 50 texts per batch
            params = {
                'key': api_key,
                'q': text,
                'target': target_language,
                'source': source_language,
                'format': 'text'
            }
            
            response = requests.post(url, data=params)
            
            if response.status_code == 200:
                result = response.json()
                if 'data' in result and 'translations' in result['data']:
                    translated_text = result['data']['translations'][0]['translatedText']
                    translations.append(translated_text)
                else:
                    translations.append(text)  # Return original if translation fails
            else:
                translations.append(text)  # Return original if translation fails
        
        return jsonify({
            "translations": translations,
            "targetLanguage": target_language
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@translate_bp.route('/translate/languages', methods=['GET'])
def get_supported_languages():
    """Get list of supported languages"""
    try:
        api_key = Config.GOOGLE_TRANSLATE_API_KEY
        if not api_key:
            return jsonify({"error": "Translation service not configured"}), 500
            
        url = f"https://translation.googleapis.com/language/translate/v2/languages"
        
        params = {
            'key': api_key,
            'target': 'en'  # Get language names in English
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            result = response.json()
            return jsonify(result)
        else:
            return jsonify({"error": "Failed to fetch languages"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500