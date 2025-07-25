import requests
import os
from config import Config

def get_coordinates_from_location(location):
    """
    Get latitude and longitude coordinates from a location string using Google Maps Geocoding API
    """
    try:
        if not Config.GOOGLE_MAPS_API_KEY:
            raise Exception("Google Maps API key not configured")
        
        # Clean and format the location
        location = location.strip()
        if not location:
            raise Exception("Location is required")
        
        # Google Maps Geocoding API endpoint
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        
        params = {
            'address': location,
            'key': Config.GOOGLE_MAPS_API_KEY,
            'region': 'in',  # Bias results towards India
            'language': 'en'
        }
        
        print(f"🌍 Geocoding location: {location}")
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] == 'OK' and len(data['results']) > 0:
            result = data['results'][0]
            
            # Extract coordinates
            geometry = result['geometry']
            lat = geometry['location']['lat']
            lng = geometry['location']['lng']
            
            # Get formatted address
            formatted_address = result['formatted_address']
            
            print(f"✅ Geocoding successful: {formatted_address} -> ({lat}, {lng})")
            
            return {
                'lat': lat,
                'lng': lng,
                'formatted_address': formatted_address,
                'place_id': result.get('place_id'),
                'types': result.get('types', [])
            }
        
        elif data['status'] == 'ZERO_RESULTS':
            print(f"❌ No results found for location: {location}")
            raise Exception(f"Location '{location}' not found. Please provide a more specific address.")
        
        elif data['status'] == 'OVER_QUERY_LIMIT':
            print(f"❌ Google Maps API quota exceeded")
            raise Exception("Geocoding service temporarily unavailable. Please try again later.")
        
        elif data['status'] == 'REQUEST_DENIED':
            print(f"❌ Google Maps API request denied")
            raise Exception("Geocoding service access denied. Please contact support.")
        
        else:
            print(f"❌ Geocoding failed with status: {data['status']}")
            raise Exception(f"Failed to geocode location: {data.get('error_message', 'Unknown error')}")
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during geocoding: {e}")
        raise Exception("Network error while fetching location coordinates. Please check your internet connection.")
    
    except Exception as e:
        print(f"❌ Geocoding error: {e}")
        raise Exception(str(e))

def get_location_suggestions(query, limit=5):
    """
    Get location suggestions using Google Places Autocomplete API
    """
    try:
        if not Config.GOOGLE_MAPS_API_KEY:
            raise Exception("Google Maps API key not configured")
        
        if not query or len(query.strip()) < 2:
            return []
        
        url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        
        params = {
            'input': query.strip(),
            'key': Config.GOOGLE_MAPS_API_KEY,
            'types': '(regions)',
            'components': 'country:in',  # Restrict to India
            'language': 'en'
        }
        
        print(f"🔍 Getting location suggestions for: {query}")
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        suggestions = []
        if data['status'] == 'OK':
            for prediction in data.get('predictions', [])[:limit]:
                suggestion = {
                    'place_id': prediction['place_id'],
                    'description': prediction['description'],
                    'main_text': prediction['structured_formatting'].get('main_text', ''),
                    'secondary_text': prediction['structured_formatting'].get('secondary_text', ''),
                    'types': prediction.get('types', [])
                }
                suggestions.append(suggestion)
        
        print(f"✅ Found {len(suggestions)} location suggestions")
        return suggestions
        
    except Exception as e:
        print(f"❌ Location suggestions error: {e}")
        return []

def get_place_details(place_id):
    """
    Get detailed information about a place using Google Places Details API
    """
    try:
        if not Config.GOOGLE_MAPS_API_KEY:
            raise Exception("Google Maps API key not configured")
        
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        
        params = {
            'place_id': place_id,
            'key': Config.GOOGLE_MAPS_API_KEY,
            'fields': 'formatted_address,geometry,name,types,address_components'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] == 'OK' and 'result' in data:
            result = data['result']
            
            return {
                'formatted_address': result.get('formatted_address'),
                'name': result.get('name'),
                'lat': result['geometry']['location']['lat'],
                'lng': result['geometry']['location']['lng'],
                'types': result.get('types', []),
                'address_components': result.get('address_components', [])
            }
        
        else:
            raise Exception("Could not get place details")
            
    except Exception as e:
        print(f"❌ Place details error: {e}")
        raise Exception(str(e))

def validate_coordinates(lat, lng):
    """
    Validate if coordinates are valid
    """
    try:
        lat = float(lat)
        lng = float(lng)
        
        # Check if coordinates are within valid range
        if not (-90 <= lat <= 90):
            return False
        if not (-180 <= lng <= 180):
            return False
        
        # Check if coordinates are not (0, 0) which is in the ocean
        if lat == 0 and lng == 0:
            return False
        
        return True
    except (ValueError, TypeError):
        return False