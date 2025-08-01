from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from datetime import datetime, timedelta
import math

admin_bp = Blueprint('admin', __name__)

def verify_admin():
    """Verify user is admin"""
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    return user and user['user_type'] == 'admin'

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        # Get date range
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Total counts
        total_users = mongo.db.users.count_documents({})
        total_hosts = mongo.db.users.count_documents({"user_type": "host"})
        total_tourists = mongo.db.users.count_documents({"user_type": "tourist"})
        
        # Listings (homestays)
        total_homestays = mongo.db.listings.count_documents({})
        active_homestays = mongo.db.listings.count_documents({"is_active": True, "is_approved": True})
        pending_homestays = mongo.db.listings.count_documents({"is_approved": False})
        
        # Experiences
        total_experiences = mongo.db.experiences.count_documents({})
        active_experiences = mongo.db.experiences.count_documents({"is_active": True, "is_approved": True})
        pending_experiences = mongo.db.experiences.count_documents({"is_approved": False})
        
        # Combined totals
        total_listings = total_homestays + total_experiences
        active_listings = active_homestays + active_experiences
        pending_listings = pending_homestays + pending_experiences
        
        # Booking statistics
        total_bookings = mongo.db.bookings.count_documents({})
        confirmed_bookings = mongo.db.bookings.count_documents({"status": "confirmed"})
        cancelled_bookings = mongo.db.bookings.count_documents({"status": "cancelled"})
        
        # Recent bookings
        recent_bookings = mongo.db.bookings.count_documents({
            "created_at": {"$gte": start_date}
        })
        
        # Revenue statistics
        revenue_pipeline = [
            {"$match": {"status": "confirmed", "payment_status": "paid"}},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total_amount"},
                "platform_fees": {"$sum": "$platform_fee"},
                "host_earnings": {"$sum": "$host_earnings"},
                "community_contributions": {"$sum": "$community_contribution"}
            }}
        ]
        
        revenue_stats = list(mongo.db.bookings.aggregate(revenue_pipeline))
        revenue_data = revenue_stats[0] if revenue_stats else {
            "total_revenue": 0,
            "platform_fees": 0,
            "host_earnings": 0,
            "community_contributions": 0
        }
        
        dashboard_data = {
            "overview": {
                "total_users": total_users,
                "total_hosts": total_hosts,
                "total_tourists": total_tourists,
                "total_listings": total_listings,
                "total_homestays": total_homestays,
                "total_experiences": total_experiences,
                "active_listings": active_listings,
                "active_homestays": active_homestays,
                "active_experiences": active_experiences,
                "pending_listings": pending_listings,
                "pending_homestays": pending_homestays,
                "pending_experiences": pending_experiences,
                "total_bookings": total_bookings,
                "confirmed_bookings": confirmed_bookings,
                "cancelled_bookings": cancelled_bookings,
                "recent_bookings": recent_bookings
            },
            "revenue": revenue_data
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/listings', methods=['GET'])
@jwt_required()
def get_admin_listings():
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status')  # 'pending', 'approved', 'rejected'
        listing_type = request.args.get('type', 'all')  # 'all', 'homestays', 'experiences'
        search = request.args.get('search', '')
        
        print(f"🔍 Admin listings query: status={status}, type={listing_type}, search={search}")
        
        # Get homestays
        homestays = []
        if listing_type in ['all', 'homestays']:
            homestay_query = {}
            
            # Apply status filter
            if status == 'pending':
                homestay_query["is_approved"] = False
                homestay_query["is_active"] = True
            elif status == 'approved':
                homestay_query["is_approved"] = True
                homestay_query["is_active"] = True
            elif status == 'rejected':
                homestay_query["is_approved"] = False
                homestay_query["is_active"] = False
            
            # Apply search filter
            if search:
                homestay_query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"location": {"$regex": search, "$options": "i"}}
                ]
            
            homestays = list(mongo.db.listings.find(homestay_query).sort("created_at", -1))
        
        # Get experiences
        experiences = []
        if listing_type in ['all', 'experiences']:
            experience_query = {}
            
            # Apply status filter
            if status == 'pending':
                experience_query["is_approved"] = False
                experience_query["is_active"] = True
            elif status == 'approved':
                experience_query["is_approved"] = True
                experience_query["is_active"] = True
            elif status == 'rejected':
                experience_query["is_approved"] = False
                experience_query["is_active"] = False
            
            # Apply search filter
            if search:
                experience_query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"location": {"$regex": search, "$options": "i"}}
                ]
            
            experiences = list(mongo.db.experiences.find(experience_query).sort("created_at", -1))
        
        # Format homestays
        formatted_homestays = []
        for listing in homestays:
            # Get host info
            host = mongo.db.users.find_one({"_id": listing['host_id']})
            
            # Get booking stats
            booking_stats = list(mongo.db.bookings.aggregate([
                {"$match": {"listing_id": listing['_id']}},
                {"$group": {
                    "_id": None,
                    "total_bookings": {"$sum": 1},
                    "confirmed_bookings": {"$sum": {"$cond": [{"$eq": ["$status", "confirmed"]}, 1, 0]}},
                    "total_revenue": {"$sum": {"$cond": [{"$eq": ["$status", "confirmed"]}, "$total_amount", 0]}}
                }}
            ]))
            
            booking_data = booking_stats[0] if booking_stats else {
                "total_bookings": 0,
                "confirmed_bookings": 0,
                "total_revenue": 0
            }
            
            formatted_listing = {
                "id": str(listing['_id']),
                "listing_category": "homestay",
                "type": "homestay",
                "title": listing['title'],
                "description": listing.get('description', ''),
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "price_display": listing['price_per_night'],
                "price_unit": "night",
                "property_type": listing['property_type'],
                "max_guests": listing.get('max_guests', 4),
                "images": listing.get('images', []),
                "is_active": listing['is_active'],
                "is_approved": listing['is_approved'],
                "created_at": listing['created_at'].isoformat() if 'created_at' in listing else None,
                "rejection_reason": listing.get('rejection_reason', ''),
                "admin_notes": listing.get('admin_notes', ''),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "email": host['email']
                } if host else None,
                "booking_stats": booking_data
            }
            
            formatted_homestays.append(formatted_listing)
        
        # Format experiences
        formatted_experiences = []
        for experience in experiences:
            # Get host info
            host = mongo.db.users.find_one({"_id": experience['host_id']})
            
            # Note: Experiences might not have bookings yet, so we'll set default values
            booking_data = {
                "total_bookings": 0,
                "confirmed_bookings": 0,
                "total_revenue": 0
            }
            
            formatted_experience = {
                "id": str(experience['_id']),
                "listing_category": "experience",
                "type": "experience", 
                "title": experience['title'],
                "description": experience.get('description', ''),
                "location": experience['location'],
                "price_per_person": experience['price_per_person'],
                "price_display": experience['price_per_person'],
                "price_unit": "person",
                "category": experience['category'],
                "duration": experience['duration'],
                "max_participants": experience.get('max_participants', 8),
                "difficulty_level": experience.get('difficulty_level', 'easy'),
                "images": experience.get('images', []),
                "is_active": experience['is_active'],
                "is_approved": experience['is_approved'],
                "created_at": experience['created_at'].isoformat() if 'created_at' in experience else None,
                "rejection_reason": experience.get('rejection_reason', ''),
                "admin_notes": experience.get('admin_notes', ''),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "email": host['email']
                } if host else None,
                "booking_stats": booking_data
            }
            
            formatted_experiences.append(formatted_experience)
        
        # Combine and sort
        all_listings = formatted_homestays + formatted_experiences
        all_listings.sort(key=lambda x: x['created_at'] or '', reverse=True)
        
        # Apply pagination
        total_count = len(all_listings)
        skip = (page - 1) * limit
        paginated_listings = all_listings[skip:skip + limit]
        
        print(f"✅ Found {total_count} listings: {len(formatted_homestays)} homestays, {len(formatted_experiences)} experiences")
        
        return jsonify({
            "listings": paginated_listings,
            "homestays": formatted_homestays,
            "experiences": formatted_experiences,
            "stats": {
                "total_listings": total_count,
                "total_homestays": len(formatted_homestays),
                "total_experiences": len(formatted_experiences)
            },
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": math.ceil(total_count / limit) if total_count > 0 else 1
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_admin_listings: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/listings/<listing_id>/approve', methods=['POST'])
@jwt_required()
def approve_listing(listing_id):
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        listing_type = data.get('listing_type', 'homestay')
        
        print(f"🔍 Approving {listing_type}: {listing_id}")
        
        # Determine collection based on type
        collection = mongo.db.experiences if listing_type == 'experience' else mongo.db.listings
        
        # Update listing status
        result = collection.update_one(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "is_approved": True,
                    "is_active": True,
                    "approved_at": datetime.utcnow(),
                    "approved_by": get_jwt_identity(),
                    "admin_notes": data.get('notes', ''),
                    "updated_at": datetime.utcnow()
                },
                "$unset": {
                    "rejection_reason": "",
                    "rejected_at": "",
                    "rejected_by": ""
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": f"{listing_type.capitalize()} not found"}), 404
        
        print(f"✅ {listing_type.capitalize()} approved successfully")
        return jsonify({"message": f"{listing_type.capitalize()} approved successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error approving listing: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/listings/<listing_id>/reject', methods=['POST'])
@jwt_required()
def reject_listing(listing_id):
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        listing_type = data.get('listing_type', 'homestay')
        rejection_reason = data.get('reason', '')
        
        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required"}), 400
        
        print(f"🔍 Rejecting {listing_type}: {listing_id}")
        
        # Determine collection based on type
        collection = mongo.db.experiences if listing_type == 'experience' else mongo.db.listings
        
        # Update listing status
        result = collection.update_one(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "is_approved": False,
                    "is_active": False,
                    "rejected_at": datetime.utcnow(),
                    "rejected_by": get_jwt_identity(),
                    "rejection_reason": rejection_reason,
                    "admin_notes": data.get('notes', ''),
                    "updated_at": datetime.utcnow()
                },
                "$unset": {
                    "approved_at": "",
                    "approved_by": ""
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": f"{listing_type.capitalize()} not found"}), 404
        
        print(f"✅ {listing_type.capitalize()} rejected successfully")
        return jsonify({"message": f"{listing_type.capitalize()} rejected successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error rejecting listing: {e}")
        return jsonify({"error": str(e)}), 500

# ... rest of the existing methods (getUsers, getBookings, getAnalytics) remain the same
@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        user_type = request.args.get('user_type')
        search = request.args.get('search', '')
        
        # Build query
        query = {}
        if user_type:
            query["user_type"] = user_type
        
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Execute query
        skip = (page - 1) * limit
        
        users = list(mongo.db.users.find(query, {"password": 0})
                    .sort("created_at", -1)
                    .skip(skip)
                    .limit(limit))
        
        # Get total count
        total_count = mongo.db.users.count_documents(query)
        
        # Format users
        formatted_users = []
        for user in users:
            # Get user stats
            if user['user_type'] == 'host':
                listings_count = mongo.db.listings.count_documents({"host_id": user['_id']})
                experiences_count = mongo.db.experiences.count_documents({"host_id": user['_id']})
                bookings_count = mongo.db.bookings.count_documents({"host_id": user['_id']})
            else:
                listings_count = 0
                experiences_count = 0
                bookings_count = mongo.db.bookings.count_documents({"tourist_id": user['_id']})
            
            formatted_user = {
                "id": str(user['_id']),
                "full_name": user['full_name'],
                "email": user['email'],
                "user_type": user['user_type'],
                "phone": user.get('phone'),
                "is_verified": user['is_verified'],
                "created_at": user['created_at'].isoformat(),
                "last_login": user.get('last_login').isoformat() if user.get('last_login') else None,
                "listings_count": listings_count,
                "experiences_count": experiences_count,
                "total_listings": listings_count + experiences_count,
                "bookings_count": bookings_count
            }
            
            formatted_users.append(formatted_user)
        
        return jsonify({
            "users": formatted_users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": math.ceil(total_count / limit)
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_admin_bookings():
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = {}
        if status:
            query["status"] = status
        
        if date_from and date_to:
            query["created_at"] = {
                "$gte": datetime.strptime(date_from, '%Y-%m-%d'),
                "$lte": datetime.strptime(date_to, '%Y-%m-%d')
            }
        
        # Execute query
        skip = (page - 1) * limit
        
        bookings = list(mongo.db.bookings.find(query)
                       .sort("created_at", -1)
                       .skip(skip)
                       .limit(limit))
        
        # Get total count
        total_count = mongo.db.bookings.count_documents(query)
        
        # Format bookings
        formatted_bookings = []
        for booking in bookings:
            # Get related data
            listing = mongo.db.listings.find_one({"_id": booking['listing_id']})
            tourist = mongo.db.users.find_one({"_id": booking['tourist_id']})
            host = mongo.db.users.find_one({"_id": booking['host_id']})
            
            formatted_booking = {
                "id": str(booking['_id']),
                "booking_reference": booking['booking_reference'],
                "check_in": booking['check_in'].strftime('%Y-%m-%d'),
                "check_out": booking['check_out'].strftime('%Y-%m-%d'),
                "guests": booking['guests'],
                "total_amount": booking['total_amount'],
                "status": booking['status'],
                "payment_status": booking['payment_status'],
                "created_at": booking['created_at'].isoformat(),
                "listing": {
                    "id": str(listing['_id']),
                    "title": listing['title'],
                    "location": listing['location']
                } if listing else None,
                "tourist": {
                    "id": str(tourist['_id']),
                    "full_name": tourist['full_name'],
                    "email": tourist['email']
                } if tourist else None,
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "email": host['email']
                } if host else None
            }
            
            formatted_bookings.append(formatted_booking)
        
        return jsonify({
            "bookings": formatted_bookings,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": math.ceil(total_count / limit)
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        # Get date range
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # User analytics
        user_analytics = list(mongo.db.users.aggregate([
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "user_type": "$user_type"
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.date": 1}}
        ]))
        
        # Booking analytics
        booking_analytics = list(mongo.db.bookings.aggregate([
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "status": "$status"
                },
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$total_amount"}
            }},
            {"$sort": {"_id.date": 1}}
        ]))
        
        # Revenue analytics
        revenue_analytics = list(mongo.db.bookings.aggregate([
            {"$match": {
                "created_at": {"$gte": start_date},
                "status": "confirmed",
                "payment_status": "paid"
            }},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "total_revenue": {"$sum": "$total_amount"},
                "platform_fees": {"$sum": "$platform_fee"},
                "host_earnings": {"$sum": "$host_earnings"}
            }},
            {"$sort": {"_id": 1}}
        ]))
        
        # Location analytics (combine homestays and experiences)
        homestay_locations = list(mongo.db.listings.aggregate([
            {"$group": {
                "_id": "$location",
                "homestay_count": {"$sum": 1},
                "avg_price": {"$avg": "$price_per_night"}
            }}
        ]))
        
        experience_locations = list(mongo.db.experiences.aggregate([
            {"$group": {
                "_id": "$location", 
                "experience_count": {"$sum": 1},
                "avg_price": {"$avg": "$price_per_person"}
            }}
        ]))
        
        # Combine location data
        location_map = {}
        for loc in homestay_locations:
            location_map[loc['_id']] = {
                "location": loc['_id'],
                "homestay_count": loc['homestay_count'],
                "experience_count": 0,
                "total_listings": loc['homestay_count'],
                "avg_homestay_price": loc['avg_price'],
                "avg_experience_price": 0
            }
        
        for loc in experience_locations:
            if loc['_id'] in location_map:
                location_map[loc['_id']]['experience_count'] = loc['experience_count']
                location_map[loc['_id']]['total_listings'] += loc['experience_count']
                location_map[loc['_id']]['avg_experience_price'] = loc['avg_price']
            else:
                location_map[loc['_id']] = {
                    "location": loc['_id'],
                    "homestay_count": 0,
                    "experience_count": loc['experience_count'],
                    "total_listings": loc['experience_count'],
                    "avg_homestay_price": 0,
                    "avg_experience_price": loc['avg_price']
                }
        
        # Sort by total listings
        location_analytics = sorted(location_map.values(), key=lambda x: x['total_listings'], reverse=True)[:10]
        
        analytics_data = {
            "user_growth": user_analytics,
            "booking_trends": booking_analytics,
            "revenue_trends": revenue_analytics,
            "top_locations": location_analytics
        }
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500