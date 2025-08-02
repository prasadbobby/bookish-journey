import googlemaps
import requests
from config import Config
import logging

# Initialize Google Maps client
gmaps = googlemaps.Client(key=Config.GOOGLE_PLACES_API_KEY)

def get_coordinates_from_location(location_text):
    """
    Get coordinates from location text using Google Geocoding API
    """
    try:
        # Use Google Maps Geocoding API
        geocode_result = gmaps.geocode(location_text)
        
        if not geocode_result:
            raise Exception(f"No results found for location: {location_text}")
        
        # Get the first result
        result = geocode_result[0]
        geometry = result['geometry']
        location = geometry['location']
        
        return {
            'lat': location['lat'],
            'lng': location['lng'],
            'formatted_address': result['formatted_address'],
            'place_id': result['place_id'],
            'types': result.get('types', [])
        }
        
    except Exception as e:
        logging.error(f"Geocoding error for '{location_text}': {str(e)}")
        raise Exception(f"Failed to geocode location: {str(e)}")

def validate_coordinates(lat, lng):
    """
    Validate if coordinates are valid
    """
    try:
        lat = float(lat)
        lng = float(lng)
        
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return True
        return False
    except (ValueError, TypeError):
        return False

def get_location_suggestions(query, limit=6):
    """
    Get location suggestions using Google Places Autocomplete API
    """
    try:
        # Use Google Places Autocomplete
        predictions = gmaps.places_autocomplete(
            input_text=query,
            types=['(regions)'],  # Focus on regions, cities, etc.
            components={'country': 'in'},  # Restrict to India
            language='en'
        )
        
        suggestions = []
        for prediction in predictions[:limit]:
            suggestion = {
                'place_id': prediction['place_id'],
                'description': prediction['description'],
                'main_text': prediction['structured_formatting']['main_text'],
                'secondary_text': prediction['structured_formatting'].get('secondary_text', ''),
                'types': prediction.get('types', [])
            }
            suggestions.append(suggestion)
        
        return suggestions
        
    except Exception as e:
        logging.error(f"Location suggestions error for '{query}': {str(e)}")
        raise Exception(f"Failed to get location suggestions: {str(e)}")

def get_place_details(place_id):
    """
    Get detailed place information from place_id
    """
    try:
        # Get place details with correct field names
        place_result = gmaps.place(
            place_id=place_id,
            fields=[
                'name', 
                'formatted_address', 
                'geometry/location',
                'geometry/viewport', 
                'type',  # Changed from 'types' to 'type'
                'address_component',  # Changed from 'address_components' to 'address_component'
                'place_id'
            ]
        )
        
        if not place_result or 'result' not in place_result:
            raise Exception(f"No details found for place_id: {place_id}")
        
        result = place_result['result']
        geometry = result.get('geometry', {})
        location = geometry.get('location', {})
        
        # Handle the case where location might be empty
        if not location:
            raise Exception(f"No location data found for place_id: {place_id}")
        
        return {
            'place_id': place_id,
            'name': result.get('name', ''),
            'formatted_address': result.get('formatted_address', ''),
            'lat': location.get('lat', 0),
            'lng': location.get('lng', 0),
            'types': result.get('type', []),  # Changed from 'types' to 'type'
            'address_components': result.get('address_component', [])  # Changed field name
        }
        
    except Exception as e:
        logging.error(f"Place details error for place_id '{place_id}': {str(e)}")
        raise Exception(f"Failed to get place details: {str(e)}")

def reverse_geocode(lat, lng):
    """
    Get address from coordinates using reverse geocoding
    """
    try:
        reverse_geocode_result = gmaps.reverse_geocode((lat, lng))
        
        if not reverse_geocode_result:
            raise Exception(f"No address found for coordinates: {lat}, {lng}")
        
        result = reverse_geocode_result[0]
        
        return {
            'formatted_address': result['formatted_address'],
            'place_id': result['place_id'],
            'types': result.get('types', []),
            'address_components': result.get('address_components', [])
        }
        
    except Exception as e:
        logging.error(f"Reverse geocoding error for {lat}, {lng}: {str(e)}")
        raise Exception(f"Failed to reverse geocode: {str(e)}")