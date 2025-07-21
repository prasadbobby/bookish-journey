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
        total_listings = mongo.db.listings.count_documents({})
        active_listings = mongo.db.listings.count_documents({"is_active": True, "is_approved": True})
        pending_listings = mongo.db.listings.count_documents({"is_approved": False})
        
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
        
        # Growth statistics
        new_users_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        new_users_growth = list(mongo.db.users.aggregate(new_users_pipeline))
        
        # Top performing listings
        top_listings_pipeline = [
            {"$match": {"status": "confirmed"}},
            {"$group": {
                "_id": "$listing_id",
                "booking_count": {"$sum": 1},
                "total_revenue": {"$sum": "$total_amount"}
            }},
            {"$sort": {"booking_count": -1}},
            {"$limit": 10}
        ]
        
        top_listings_data = list(mongo.db.bookings.aggregate(top_listings_pipeline))
        
        # Get listing details for top performers
        top_listings = []
        for listing_data in top_listings_data:
            listing = mongo.db.listings.find_one({"_id": listing_data['_id']})
            if listing:
                top_listings.append({
                    "id": str(listing['_id']),
                    "title": listing['title'],
                    "location": listing['location'],
                    "booking_count": listing_data['booking_count'],
                    "total_revenue": listing_data['total_revenue']
                })
        
        dashboard_data = {
            "overview": {
                "total_users": total_users,
                "total_hosts": total_hosts,
                "total_tourists": total_tourists,
                "total_listings": total_listings,
                "active_listings": active_listings,
                "pending_listings": pending_listings,
                "total_bookings": total_bookings,
                "confirmed_bookings": confirmed_bookings,
                "cancelled_bookings": cancelled_bookings,
                "recent_bookings": recent_bookings
            },
            "revenue": revenue_data,
            "growth": new_users_growth,
            "top_listings": top_listings
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
                bookings_count = mongo.db.bookings.count_documents({"host_id": user['_id']})
            else:
                listings_count = 0
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
        search = request.args.get('search', '')
        
        # Build query
        query = {}
        if status == 'pending':
            query["is_approved"] = False
        elif status == 'approved':
            query["is_approved"] = True
            query["is_active"] = True
        elif status == 'rejected':
            query["is_approved"] = False
            query["is_active"] = False
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}}
            ]
        
        # Execute query
        skip = (page - 1) * limit
        
        listings = list(mongo.db.listings.find(query)
                       .sort("created_at", -1)
                       .skip(skip)
                       .limit(limit))
        
        # Get total count
        total_count = mongo.db.listings.count_documents(query)
        
        # Format listings
        formatted_listings = []
        for listing in listings:
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
                "title": listing['title'],
                "location": listing['location'],
                "price_per_night": listing['price_per_night'],
                "property_type": listing['property_type'],
                "is_active": listing['is_active'],
                "is_approved": listing['is_approved'],
                "created_at": listing['created_at'].isoformat(),
                "host": {
                    "id": str(host['_id']),
                    "full_name": host['full_name'],
                    "email": host['email']
                } if host else None,
                "booking_stats": booking_data
            }
            
            formatted_listings.append(formatted_listing)
        
        return jsonify({
            "listings": formatted_listings,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": math.ceil(total_count / limit)
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/listings/<listing_id>/approve', methods=['POST'])
@jwt_required()
def approve_listing(listing_id):
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        
        # Update listing status
        result = mongo.db.listings.update_one(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "is_approved": True,
                    "is_active": True,
                    "approved_at": datetime.utcnow(),
                    "approved_by": get_jwt_identity(),
                    "admin_notes": data.get('notes', ''),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Listing not found"}), 404
        
        # Send approval notification to host
        # send_listing_approval_notification(listing_id)
        
        return jsonify({"message": "Listing approved successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/listings/<listing_id>/reject', methods=['POST'])
@jwt_required()
def reject_listing(listing_id):
    try:
        if not verify_admin():
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        rejection_reason = data.get('reason', '')
        
        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required"}), 400
        
        # Update listing status
        result = mongo.db.listings.update_one(
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
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Listing not found"}), 404
        
        # Send rejection notification to host
        # send_listing_rejection_notification(listing_id, rejection_reason)
        
        return jsonify({"message": "Listing rejected successfully"}), 200
        
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
        
        # Location analytics
        location_analytics = list(mongo.db.listings.aggregate([
            {"$group": {
                "_id": "$location",
                "listing_count": {"$sum": 1},
                "avg_price": {"$avg": "$price_per_night"}
            }},
            {"$sort": {"listing_count": -1}},
            {"$limit": 10}
        ]))
        
        analytics_data = {
            "user_growth": user_analytics,
            "booking_trends": booking_analytics,
            "revenue_trends": revenue_analytics,
            "top_locations": location_analytics
        }
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500