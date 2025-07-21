from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from datetime import datetime, timedelta

impact_bp = Blueprint('impact', __name__)

@impact_bp.route('/user/<user_id>', methods=['GET'])
@jwt_required()
def get_user_impact(user_id):
    try:
        # Verify access
        current_user_id = get_jwt_identity()
        if current_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user['user_type'] == 'tourist':
            impact_data = calculate_tourist_impact(user_id)
        elif user['user_type'] == 'host':
            impact_data = calculate_host_impact(user_id)
        else:
            return jsonify({"error": "Invalid user type"}), 400
        
        return jsonify(impact_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@impact_bp.route('/community/<location>', methods=['GET'])
def get_community_impact(location):
    try:
        listings = list(mongo.db.listings.find({
           "location": {"$regex": location, "$options": "i"},
           "is_active": True,
           "is_approved": True
        }))
        
        if not listings:
            return jsonify({"error": "No listings found for this location"}), 404
        
        listing_ids = [listing['_id'] for listing in listings]
        
        # Calculate community impact
        impact_data = calculate_community_impact(listing_ids, location)
        
        return jsonify(impact_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@impact_bp.route('/overall', methods=['GET'])
def get_overall_impact():
   try:
       # Get date range
       days = int(request.args.get('days', 365))
       start_date = datetime.utcnow() - timedelta(days=days)
       
       # Calculate overall platform impact
       impact_data = calculate_overall_impact(start_date)
       
       return jsonify(impact_data), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@impact_bp.route('/sustainability-score/<listing_id>', methods=['GET'])
def get_sustainability_score(listing_id):
   try:
       listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
       if not listing:
           return jsonify({"error": "Listing not found"}), 404
       
       # Calculate sustainability score
       score_data = calculate_sustainability_score(listing)
       
       return jsonify(score_data), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@impact_bp.route('/carbon-footprint', methods=['POST'])
@jwt_required()
def calculate_trip_carbon_footprint():
   try:
       data = request.get_json()
       
       origin = data.get('origin')
       destination = data.get('destination')
       transport_mode = data.get('transport_mode', 'car')
       guests = data.get('guests', 1)
       nights = data.get('nights', 1)
       
       if not origin or not destination:
           return jsonify({"error": "Origin and destination are required"}), 400
       
       # Calculate carbon footprint
       footprint_data = calculate_carbon_footprint(
           origin, destination, transport_mode, guests, nights
       )
       
       return jsonify(footprint_data), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@impact_bp.route('/leaderboard', methods=['GET'])
def get_impact_leaderboard():
   try:
       category = request.args.get('category', 'hosts')  # 'hosts', 'tourists', 'locations'
       limit = int(request.args.get('limit', 10))
       
       if category == 'hosts':
           leaderboard_data = get_host_leaderboard(limit)
       elif category == 'tourists':
           leaderboard_data = get_tourist_leaderboard(limit)
       elif category == 'locations':
           leaderboard_data = get_location_leaderboard(limit)
       else:
           return jsonify({"error": "Invalid category"}), 400
       
       return jsonify({
           "category": category,
           "leaderboard": leaderboard_data
       }), 200
       
   except Exception as e:
       return jsonify({"error": str(e)}), 500

def calculate_tourist_impact(user_id):
   """Calculate environmental and economic impact for a tourist"""
   
   # Get all completed bookings
   bookings = list(mongo.db.bookings.find({
       "tourist_id": ObjectId(user_id),
       "status": "completed"
   }))
   
   if not bookings:
       return {
           "total_trips": 0,
           "total_spent": 0,
           "communities_supported": 0,
           "carbon_saved": 0,
           "local_jobs_supported": 0,
           "sustainability_score": 0
       }
   
   total_spent = sum(booking['total_amount'] for booking in bookings)
   community_contribution = sum(booking.get('community_contribution', 0) for booking in bookings)
   
   # Get unique locations visited
   listing_ids = [booking['listing_id'] for booking in bookings]
   listings = list(mongo.db.listings.find({"_id": {"$in": listing_ids}}))
   unique_locations = set(listing['location'] for listing in listings)
   
   # Calculate carbon savings (rural vs urban stays)
   carbon_saved = 0
   for booking in bookings:
       nights = booking['nights']
       # Assume rural stays save 5kg CO2 per night vs urban hotels
       carbon_saved += nights * 5
   
   # Calculate jobs supported (estimate based on spending)
   jobs_supported = int(total_spent / 10000)  # Rough estimate: 1 job per ₹10,000 spent
   
   # Calculate sustainability score
   sustainability_features_count = 0
   for listing in listings:
       sustainability_features_count += len(listing.get('sustainability_features', []))
   
   sustainability_score = min(100, (sustainability_features_count / len(listings)) * 20) if listings else 0
   
   return {
       "total_trips": len(bookings),
       "total_spent": total_spent,
       "community_contribution": community_contribution,
       "communities_supported": len(unique_locations),
       "carbon_saved": f"{carbon_saved}kg CO2",
       "local_jobs_supported": jobs_supported,
       "sustainability_score": round(sustainability_score, 1),
       "impact_breakdown": {
           "accommodation_spending": total_spent - community_contribution,
           "community_fund_contribution": community_contribution,
           "average_per_trip": round(total_spent / len(bookings), 2) if bookings else 0
       }
   }

def calculate_host_impact(user_id):
   """Calculate impact metrics for a host"""
   
   # Get host listings
   listings = list(mongo.db.listings.find({"host_id": ObjectId(user_id)}))
   
   if not listings:
       return {
           "total_listings": 0,
           "total_guests_hosted": 0,
           "total_earnings": 0,
           "sustainability_score": 0,
           "community_impact": 0
       }
   
   listing_ids = [listing['_id'] for listing in listings]
   
   # Get completed bookings
   bookings = list(mongo.db.bookings.find({
       "listing_id": {"$in": listing_ids},
       "status": "completed"
   }))
   
   total_guests = sum(booking['guests'] for booking in bookings)
   total_earnings = sum(booking.get('host_earnings', 0) for booking in bookings)
   
   # Calculate sustainability score
   total_sustainability_features = sum(len(listing.get('sustainability_features', [])) for listing in listings)
   sustainability_score = min(100, (total_sustainability_features / len(listings)) * 10) if listings else 0
   
   # Calculate community impact
   total_nights = sum(booking['nights'] for booking in bookings)
   community_impact = total_nights * 2  # Estimate 2 points per night hosted
   
   return {
       "total_listings": len(listings),
       "total_guests_hosted": total_guests,
       "total_earnings": total_earnings,
       "total_bookings": len(bookings),
       "sustainability_score": round(sustainability_score, 1),
       "community_impact": community_impact,
       "average_earnings_per_booking": round(total_earnings / len(bookings), 2) if bookings else 0,
       "guest_satisfaction": calculate_host_rating(user_id)
   }

def calculate_community_impact(listing_ids, location):
   """Calculate impact for a specific community/location"""
   
   # Get all bookings for listings in this location
   bookings = list(mongo.db.bookings.find({
       "listing_id": {"$in": listing_ids},
       "status": "completed"
   }))
   
   if not bookings:
       return {
           "location": location,
           "total_visitors": 0,
           "total_economic_impact": 0,
           "jobs_created": 0,
           "sustainability_rating": 0
       }
   
   total_visitors = sum(booking['guests'] for booking in bookings)
   total_revenue = sum(booking['total_amount'] for booking in bookings)
   community_fund = sum(booking.get('community_contribution', 0) for booking in bookings)
   
   # Estimate jobs created (1 job per ₹50,000 annual revenue)
   jobs_created = int(total_revenue / 50000)
   
   # Get sustainability rating for the area
   listings = list(mongo.db.listings.find({"_id": {"$in": listing_ids}}))
   total_sustainability_features = sum(len(listing.get('sustainability_features', [])) for listing in listings)
   sustainability_rating = min(5, (total_sustainability_features / len(listings))) if listings else 0
   
   return {
       "location": location,
       "total_visitors": total_visitors,
       "total_economic_impact": total_revenue,
       "community_fund_raised": community_fund,
       "jobs_created": jobs_created,
       "active_hosts": len(set(booking['host_id'] for booking in bookings)),
       "sustainability_rating": round(sustainability_rating, 1),
       "average_stay_duration": round(sum(booking['nights'] for booking in bookings) / len(bookings), 1) if bookings else 0
   }

def calculate_overall_impact(start_date):
   """Calculate overall platform impact"""
   
   # Get all completed bookings since start_date
   bookings = list(mongo.db.bookings.find({
       "status": "completed",
       "created_at": {"$gte": start_date}
   }))
   
   if not bookings:
       return {
           "total_bookings": 0,
           "total_economic_impact": 0,
           "communities_benefited": 0,
           "carbon_footprint_reduced": 0,
           "jobs_supported": 0
       }
   
   total_revenue = sum(booking['total_amount'] for booking in bookings)
   total_community_fund = sum(booking.get('community_contribution', 0) for booking in bookings)
   total_guests = sum(booking['guests'] for booking in bookings)
   total_nights = sum(booking['nights'] for booking in bookings)
   
   # Get unique locations
   listing_ids = [booking['listing_id'] for booking in bookings]
   listings = list(mongo.db.listings.find({"_id": {"$in": listing_ids}}))
   unique_locations = set(listing['location'] for listing in listings)
   
   # Calculate carbon savings
   carbon_saved = total_nights * 5  # 5kg CO2 per night vs urban hotels
   
   # Estimate jobs supported
   jobs_supported = int(total_revenue / 25000)  # 1 job per ₹25,000
   
   return {
       "total_bookings": len(bookings),
       "total_guests": total_guests,
       "total_economic_impact": total_revenue,
       "community_fund_raised": total_community_fund,
       "communities_benefited": len(unique_locations),
       "carbon_footprint_reduced": f"{carbon_saved}kg CO2",
       "jobs_supported": jobs_supported,
       "average_booking_value": round(total_revenue / len(bookings), 2),
       "platform_growth": calculate_growth_metrics(start_date)
   }

def calculate_sustainability_score(listing):
   """Calculate sustainability score for a listing"""
   
   sustainability_features = listing.get('sustainability_features', [])
   
   # Define scoring criteria
   feature_scores = {
       'solar_power': 15,
       'rainwater_harvesting': 10,
       'organic_farming': 12,
       'waste_composting': 8,
       'local_sourcing': 10,
       'plastic_free': 8,
       'energy_efficient': 7,
       'water_conservation': 9,
       'local_employment': 15,
       'cultural_preservation': 6
   }
   
   score = 0
   for feature in sustainability_features:
       score += feature_scores.get(feature, 5)
   
   # Cap at 100
   score = min(100, score)
   
   # Get additional factors
   reviews = list(mongo.db.reviews.find({"reviewee_id": listing['host_id']}))
   sustainability_mentions = sum(1 for review in reviews if 'eco' in review['comment'].lower() or 'green' in review['comment'].lower())
   
   if sustainability_mentions > 0:
       score += min(10, sustainability_mentions * 2)
   
   return {
       "score": min(100, score),
       "features": sustainability_features,
       "grade": get_sustainability_grade(score),
       "recommendations": get_sustainability_recommendations(listing)
   }

def calculate_carbon_footprint(origin, destination, transport_mode, guests, nights):
   """Calculate carbon footprint for a trip"""
   
   # Simplified calculation - in production, use proper APIs
   distance = 500  # Default distance in km
   
   # Carbon emission factors (kg CO2 per km per person)
   emission_factors = {
       'flight': 0.255,
       'train': 0.041,
       'bus': 0.089,
       'car': 0.171,
       'bike': 0,
       'walk': 0
   }
   
   factor = emission_factors.get(transport_mode, 0.171)
   transport_emissions = distance * factor * guests * 2  # Round trip
   
   # Accommodation emissions (rural stays are typically lower)
   accommodation_emissions = nights * guests * 3  # 3kg CO2 per night per person
   
   total_emissions = transport_emissions + accommodation_emissions
   
   # Calculate savings vs conventional travel
   conventional_emissions = nights * guests * 8  # Urban hotel emissions
   savings = max(0, conventional_emissions - accommodation_emissions)
   
   return {
       "total_emissions": round(total_emissions, 2),
       "transport_emissions": round(transport_emissions, 2),
       "accommodation_emissions": round(accommodation_emissions, 2),
       "emissions_saved": round(savings, 2),
       "offset_suggestions": get_offset_suggestions(total_emissions)
   }

def get_host_leaderboard(limit):
   """Get top hosts by impact"""
   
   pipeline = [
       {"$match": {"status": "completed"}},
       {"$group": {
           "_id": "$host_id",
           "total_earnings": {"$sum": "$host_earnings"},
           "total_guests": {"$sum": "$guests"},
           "total_bookings": {"$sum": 1}
       }},
       {"$sort": {"total_earnings": -1}},
       {"$limit": limit}
   ]
   
   host_stats = list(mongo.db.bookings.aggregate(pipeline))
   
   leaderboard = []
   for stat in host_stats:
       host = mongo.db.users.find_one({"_id": stat['_id']})
       if host:
           leaderboard.append({
               "host_id": str(host['_id']),
               "host_name": host['full_name'],
               "total_earnings": stat['total_earnings'],
               "total_guests": stat['total_guests'],
               "total_bookings": stat['total_bookings'],
               "impact_score": calculate_host_impact_score(stat)
           })
   
   return leaderboard

def get_tourist_leaderboard(limit):
   """Get top tourists by impact"""
   
   pipeline = [
       {"$match": {"status": "completed"}},
       {"$group": {
           "_id": "$tourist_id",
           "total_spent": {"$sum": "$total_amount"},
           "total_trips": {"$sum": 1},
           "community_contribution": {"$sum": "$community_contribution"}
       }},
       {"$sort": {"community_contribution": -1}},
       {"$limit": limit}
   ]
   
   tourist_stats = list(mongo.db.bookings.aggregate(pipeline))
   
   leaderboard = []
   for stat in tourist_stats:
       tourist = mongo.db.users.find_one({"_id": stat['_id']})
       if tourist:
           leaderboard.append({
               "tourist_id": str(tourist['_id']),
               "tourist_name": tourist['full_name'],
               "total_spent": stat['total_spent'],
               "total_trips": stat['total_trips'],
               "community_contribution": stat['community_contribution'],
               "impact_score": calculate_tourist_impact_score(stat)
           })
   
   return leaderboard

def get_location_leaderboard(limit):
   """Get top locations by impact"""
   
   pipeline = [
       {"$lookup": {
           "from": "listings",
           "localField": "listing_id",
           "foreignField": "_id",
           "as": "listing"
       }},
       {"$unwind": "$listing"},
       {"$match": {"status": "completed"}},
       {"$group": {
           "_id": "$listing.location",
           "total_revenue": {"$sum": "$total_amount"},
           "total_visitors": {"$sum": "$guests"},
           "total_bookings": {"$sum": 1}
       }},
       {"$sort": {"total_revenue": -1}},
       {"$limit": limit}
   ]
   
   location_stats = list(mongo.db.bookings.aggregate(pipeline))
   
   leaderboard = []
   for stat in location_stats:
       leaderboard.append({
           "location": stat['_id'],
           "total_revenue": stat['total_revenue'],
           "total_visitors": stat['total_visitors'],
           "total_bookings": stat['total_bookings'],
           "impact_score": calculate_location_impact_score(stat)
       })
   
   return leaderboard

def calculate_host_rating(host_id):
   """Calculate average rating for a host"""
   reviews = list(mongo.db.reviews.find({"reviewee_id": ObjectId(host_id)}))
   if not reviews:
       return 0
   
   total_rating = sum(review['rating'] for review in reviews)
   return round(total_rating / len(reviews), 1)

def get_sustainability_grade(score):
   """Get sustainability grade based on score"""
   if score >= 80:
       return "A+"
   elif score >= 70:
       return "A"
   elif score >= 60:
       return "B+"
   elif score >= 50:
       return "B"
   elif score >= 40:
       return "C+"
   elif score >= 30:
       return "C"
   else:
       return "D"

def get_sustainability_recommendations(listing):
   """Get sustainability recommendations for a listing"""
   existing_features = listing.get('sustainability_features', [])
   
   all_features = [
       'solar_power', 'rainwater_harvesting', 'organic_farming',
       'waste_composting', 'local_sourcing', 'plastic_free',
       'energy_efficient', 'water_conservation', 'local_employment'
   ]
   
   missing_features = [f for f in all_features if f not in existing_features]
   
   recommendations = []
   for feature in missing_features[:3]:  # Top 3 recommendations
       recommendations.append({
           "feature": feature,
           "impact": f"+{feature_scores.get(feature, 5)} points",
           "description": get_feature_description(feature)
       })
   
   return recommendations

def get_offset_suggestions(emissions):
   """Get carbon offset suggestions"""
   
   tree_count = int(emissions / 22)  # 1 tree absorbs ~22kg CO2/year
   
   return [
       {
           "type": "tree_planting",
           "quantity": tree_count,
           "description": f"Plant {tree_count} trees to offset your emissions"
       },
       {
           "type": "renewable_energy",
           "quantity": int(emissions * 2),
           "description": f"Support renewable energy projects"
       },
       {
           "type": "local_transport",
           "description": "Use local public transport or cycling during your stay"
       }
   ]

def calculate_host_impact_score(stats):
   """Calculate impact score for host"""
   return (stats['total_earnings'] * 0.0001) + (stats['total_guests'] * 0.5) + (stats['total_bookings'] * 2)

def calculate_tourist_impact_score(stats):
   """Calculate impact score for tourist"""
   return (stats['community_contribution'] * 0.1) + (stats['total_trips'] * 5)

def calculate_location_impact_score(stats):
   """Calculate impact score for location"""
   return (stats['total_revenue'] * 0.0001) + (stats['total_visitors'] * 0.2) + (stats['total_bookings'] * 1)

def calculate_growth_metrics(start_date):
   """Calculate growth metrics"""
   
   # Compare with previous period
   period_length = (datetime.utcnow() - start_date).days
   previous_start = start_date - timedelta(days=period_length)
   
   current_bookings = mongo.db.bookings.count_documents({
       "created_at": {"$gte": start_date},
       "status": "completed"
   })
   
   previous_bookings = mongo.db.bookings.count_documents({
       "created_at": {"$gte": previous_start, "$lt": start_date},
       "status": "completed"
   })
   
   growth_rate = ((current_bookings - previous_bookings) / previous_bookings * 100) if previous_bookings > 0 else 0
   
   return {
       "booking_growth_rate": round(growth_rate, 1),
       "current_period_bookings": current_bookings,
       "previous_period_bookings": previous_bookings
   }

def get_feature_description(feature):
   """Get description for sustainability feature"""
   descriptions = {
       'solar_power': 'Install solar panels for renewable energy',
       'rainwater_harvesting': 'Collect and store rainwater for reuse',
       'organic_farming': 'Practice chemical-free farming methods',
       'waste_composting': 'Compost organic waste on-site',
       'local_sourcing': 'Source food and materials from local suppliers',
       'plastic_free': 'Eliminate single-use plastics',
       'energy_efficient': 'Use LED lights and energy-efficient appliances',
       'water_conservation': 'Install water-saving fixtures',
       'local_employment': 'Hire staff from the local community'
   }
   return descriptions.get(feature, 'Sustainable practice')

# Define feature scores globally
feature_scores = {
   'solar_power': 15,
   'rainwater_harvesting': 10,
   'organic_farming': 12,
   'waste_composting': 8,
   'local_sourcing': 10,
   'plastic_free': 8,
   'energy_efficient': 7,
   'water_conservation': 9,
   'local_employment': 15,
   'cultural_preservation': 6
}