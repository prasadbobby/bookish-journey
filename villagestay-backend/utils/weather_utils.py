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
    
    def get_weather_forecast(self, location, days=7):
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
            
            # Process forecast data - group by days
            daily_forecasts = {}
            for item in data['list']:
                date = datetime.fromtimestamp(item['dt']).date()
                
                if date not in daily_forecasts:
                    daily_forecasts[date] = {
                        'date': date,
                        'temp_min': item['main']['temp'],
                        'temp_max': item['main']['temp'],
                        'humidity': item['main']['humidity'],
                        'description': item['weather'][0]['description'],
                        'main': item['weather'][0]['main'],
                        'icon': item['weather'][0]['icon'],
                        'wind_speed': item['wind']['speed'],
                        'rain': item.get('rain', {}).get('3h', 0),
                        'forecasts': []
                    }
                else:
                    daily_forecasts[date]['temp_min'] = min(daily_forecasts[date]['temp_min'], item['main']['temp'])
                    daily_forecasts[date]['temp_max'] = max(daily_forecasts[date]['temp_max'], item['main']['temp'])
                
                daily_forecasts[date]['forecasts'].append({
                    'datetime': datetime.fromtimestamp(item['dt']),
                    'temperature': item['main']['temp'],
                    'description': item['weather'][0]['description'],
                    'main': item['weather'][0]['main'],
                    'humidity': item['main']['humidity'],
                    'wind_speed': item['wind']['speed'],
                    'rain': item.get('rain', {}).get('3h', 0)
                })
            
            # Convert to list and sort by date
            forecast_list = list(daily_forecasts.values())
            forecast_list.sort(key=lambda x: x['date'])
            
            return {
                'location': location,
                'daily_forecast': forecast_list[:days],
                'forecast': [forecast for day in forecast_list[:days] for forecast in day['forecasts']]  # Add this line for backward compatibility
            }
            
        except Exception as e:
            print(f"Forecast API error for {location}: {e}")
            return None
    def get_weekly_weather_prediction(self, location):
        """Get 7-day weather prediction with activity recommendations"""
        try:
            forecast_data = self.get_weather_forecast(location, days=7)
            if not forecast_data:
                return None
            
            weekly_predictions = []
            
            for day_forecast in forecast_data['daily_forecast']:
                avg_temp = (day_forecast['temp_min'] + day_forecast['temp_max']) / 2
                recommendations = self.get_weather_based_recommendations_for_day(
                    day_forecast, avg_temp
                )
                
                weekly_predictions.append({
                    'date': day_forecast['date'].strftime('%Y-%m-%d'),
                    'day_name': day_forecast['date'].strftime('%A'),
                    'temp_min': round(day_forecast['temp_min'], 1),
                    'temp_max': round(day_forecast['temp_max'], 1),
                    'avg_temp': round(avg_temp, 1),
                    'description': day_forecast['description'],
                    'main': day_forecast['main'],
                    'icon': day_forecast['icon'],
                    'humidity': day_forecast['humidity'],
                    'wind_speed': day_forecast['wind_speed'],
                    'rain_chance': min(day_forecast['rain'] * 10, 100),  # Convert to percentage
                    'recommendations': recommendations[:3],  # Top 3 recommendations
                    'weather_advice': self.get_weather_advice_for_day(day_forecast, avg_temp)
                })
            
            return {
                'location': location,
                'weekly_predictions': weekly_predictions,
                'best_days': self.find_best_days_for_activities(weekly_predictions),
                'generated_at': datetime.utcnow()
            }
            
        except Exception as e:
            print(f"Weekly prediction error for {location}: {e}")
            return None

    def get_weather_based_recommendations_for_day(self, day_forecast, avg_temp):
        """Generate activity recommendations for a specific day"""
        recommendations = []
        main_weather = day_forecast['main'].lower()
        description = day_forecast['description'].lower()
        
        # Temperature-based recommendations
        if avg_temp > 35:
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
                }
            ])
        elif avg_temp < 10:
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
        elif 15 <= avg_temp <= 30:
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
        
        return recommendations

    def get_weather_advice_for_day(self, day_forecast, avg_temp):
        """Get weather advice for a specific day"""
        if avg_temp > 35:
            return {
                'type': 'warning',
                'message': 'Very hot day. Stay hydrated and avoid midday sun.',
                'color': 'red'
            }
        elif avg_temp < 10:
            return {
                'type': 'info',
                'message': 'Cold day. Pack warm clothes and enjoy cozy indoor activities.',
                'color': 'blue'
            }
        elif 'rain' in day_forecast['main'].lower():
            return {
                'type': 'info',
                'message': 'Rainy day. Perfect for indoor cultural activities.',
                'color': 'blue'
            }
        else:
            return {
                'type': 'success',
                'message': 'Great weather for exploring village life and local culture.',
                'color': 'green'
            }

    def find_best_days_for_activities(self, weekly_predictions):
        """Find best days for different types of activities"""
        best_days = {
            'outdoor': None,
            'cultural': None,
            'farming': None,
            'photography': None
        }
        
        for prediction in weekly_predictions:
            temp = prediction['avg_temp']
            weather = prediction['main'].lower()
            
            # Best outdoor day
            if 20 <= temp <= 28 and 'clear' in weather:
                if not best_days['outdoor']:
                    best_days['outdoor'] = prediction
            
            # Best cultural day (indoor activities)
            if 'rain' in weather or temp > 35:
                if not best_days['cultural']:
                    best_days['cultural'] = prediction
            
            # Best farming day
            if 18 <= temp <= 30 and 'clear' in weather:
                if not best_days['farming']:
                    best_days['farming'] = prediction
            
            # Best photography day
            if 'clear' in weather and 15 <= temp <= 25:
                if not best_days['photography']:
                    best_days['photography'] = prediction
        
        return best_days

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