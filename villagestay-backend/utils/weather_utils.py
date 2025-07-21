import requests
import json
from datetime import datetime, timedelta
from config import Config

class WeatherService:
    def __init__(self):
        self.api_key = Config.OPENWEATHER_API_KEY
        self.base_url = "http://api.openweathermap.org/data/2.5"
        self.geocoding_url = "http://api.openweathermap.org/geo/1.0"
    
    def get_coordinates_by_location(self, location):
        """Get latitude and longitude for a location"""
        try:
            url = f"{self.geocoding_url}/direct"
            params = {
                'q': f"{location},IN",  # Assuming India
                'limit': 1,
                'appid': self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data:
                return data[0]['lat'], data[0]['lon']
            return None, None
            
        except Exception as e:
            print(f"Geocoding error for {location}: {e}")
            return None, None
    
    def get_current_weather(self, location):
        """Get current weather for a location"""
        try:
            lat, lon = self.get_coordinates_by_location(location)
            if not lat or not lon:
                return None
            
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'location': location,
                'temperature': data['main']['temp'],
                'feels_like': data['main']['feels_like'],
                'humidity': data['main']['humidity'],
                'description': data['weather'][0]['description'],
                'main': data['weather'][0]['main'],
                'icon': data['weather'][0]['icon'],
                'wind_speed': data['wind']['speed'],
                'visibility': data.get('visibility', 0) / 1000,  # Convert to km
                'pressure': data['main']['pressure'],
                'timestamp': datetime.utcnow()
            }
            
        except Exception as e:
            print(f"Weather API error for {location}: {e}")
            return None
    
    def get_weather_forecast(self, location, days=5):
        """Get weather forecast for next few days"""
        try:
            lat, lon = self.get_coordinates_by_location(location)
            if not lat or not lon:
                return None
            
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Process forecast data
            forecast = []
            for item in data['list'][:days * 8]:  # 8 forecasts per day (3-hour intervals)
                forecast.append({
                    'datetime': datetime.fromtimestamp(item['dt']),
                    'temperature': item['main']['temp'],
                    'description': item['weather'][0]['description'],
                    'main': item['weather'][0]['main'],
                    'humidity': item['main']['humidity'],
                    'wind_speed': item['wind']['speed'],
                    'rain': item.get('rain', {}).get('3h', 0)
                })
            
            return {
                'location': location,
                'forecast': forecast
            }
            
        except Exception as e:
            print(f"Forecast API error for {location}: {e}")
            return None

# Initialize weather service
weather_service = WeatherService()

def get_weather_based_recommendations(location, current_weather, forecast_data):
    """Generate activity recommendations based on weather"""
    
    if not current_weather:
        return []
    
    recommendations = []
    temp = current_weather['temperature']
    main_weather = current_weather['main'].lower()
    description = current_weather['description'].lower()
    
    # Temperature-based recommendations
    if temp > 35:
        recommendations.extend([
            {
                'activity': 'Early Morning Village Walk',
                'reason': 'Beat the heat with sunrise exploration',
                'best_time': '5:00 AM - 7:00 AM',
                'category': 'outdoor',
                'priority': 'high'
            },
            {
                'activity': 'Indoor Cooking Classes',
                'reason': 'Stay cool while learning traditional recipes',
                'best_time': '10:00 AM - 2:00 PM',
                'category': 'cultural',
                'priority': 'high'
            },
            {
                'activity': 'Pottery Making',
                'reason': 'Cool indoor craft activity',
                'best_time': 'Any time',
                'category': 'craft',
                'priority': 'medium'
            }
        ])
    elif temp < 10:
        recommendations.extend([
            {
                'activity': 'Bonfire Evenings',
                'reason': 'Warm up with local stories and music',
                'best_time': '6:00 PM - 9:00 PM',
                'category': 'cultural',
                'priority': 'high'
            },
            {
                'activity': 'Hot Herbal Tea Sessions',
                'reason': 'Traditional warming beverages',
                'best_time': 'Morning and Evening',
                'category': 'wellness',
                'priority': 'high'
            }
        ])
    elif 15 <= temp <= 30:
        recommendations.extend([
            {
                'activity': 'Farm Tours and Harvesting',
                'reason': 'Perfect weather for outdoor farm activities',
                'best_time': '8:00 AM - 5:00 PM',
                'category': 'farming',
                'priority': 'high'
            },
            {
                'activity': 'Village Cycling Tours',
                'reason': 'Comfortable temperature for cycling',
                'best_time': '6:00 AM - 10:00 AM, 4:00 PM - 7:00 PM',
                'category': 'outdoor',
                'priority': 'high'
            }
        ])
    
    # Weather condition-based recommendations
    if 'rain' in main_weather or 'rain' in description:
        recommendations.extend([
            {
                'activity': 'Traditional Dance and Music',
                'reason': 'Perfect indoor cultural activity during rain',
                'best_time': 'Evening',
                'category': 'cultural',
                'priority': 'high'
            },
            {
                'activity': 'Monsoon Photography',
                'reason': 'Capture the beauty of rural landscapes in rain',
                'best_time': 'During light rain',
                'category': 'photography',
                'priority': 'medium'
            },
            {
                'activity': 'Handicraft Workshops',
                'reason': 'Indoor creative activities',
                'best_time': 'Any time',
                'category': 'craft',
                'priority': 'high'
            }
        ])
    elif 'clear' in main_weather:
        recommendations.extend([
            {
                'activity': 'Sunrise/Sunset Photography',
                'reason': 'Clear skies perfect for capturing golden hours',
                'best_time': '5:30 AM - 7:00 AM, 6:00 PM - 7:30 PM',
                'category': 'photography',
                'priority': 'high'
            },
            {
                'activity': 'Stargazing Sessions',
                'reason': 'Clear night skies in rural areas',
                'best_time': '8:00 PM - 11:00 PM',
                'category': 'outdoor',
                'priority': 'high'
            }
        ])
    elif 'cloud' in main_weather:
        recommendations.extend([
            {
                'activity': 'Nature Walks',
                'reason': 'Overcast weather perfect for walking',
                'best_time': 'Any time during day',
                'category': 'outdoor',
                'priority': 'high'
            }
        ])
    
    # Seasonal recommendations
    current_month = datetime.now().month
    
    if current_month in [6, 7, 8, 9]:  # Monsoon season
        recommendations.extend([
            {
                'activity': 'Planting and Sowing Activities',
                'reason': 'Monsoon is perfect for agricultural activities',
                'best_time': 'Morning after rain',
                'category': 'farming',
                'priority': 'high'
            }
        ])
    elif current_month in [10, 11, 12, 1, 2]:  # Post-monsoon/Winter
        recommendations.extend([
            {
                'activity': 'Harvest Festivals',
                'reason': 'Peak harvest season celebrations',
                'best_time': 'Festival days',
                'category': 'cultural',
                'priority': 'high'
            }
        ])
    elif current_month in [3, 4, 5]:  # Summer
        recommendations.extend([
            {
                'activity': 'Mango Picking',
                'reason': 'Summer is mango season in many regions',
                'best_time': 'Early morning',
                'category': 'farming',
                'priority': 'medium'
            }
        ])
    
    # Remove duplicates and sort by priority
    unique_recommendations = []
    seen_activities = set()
    
    for rec in recommendations:
        if rec['activity'] not in seen_activities:
            unique_recommendations.append(rec)
            seen_activities.add(rec['activity'])
    
    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    unique_recommendations.sort(key=lambda x: priority_order.get(x['priority'], 2))
    
    return unique_recommendations[:8]  # Return top 8 recommendations