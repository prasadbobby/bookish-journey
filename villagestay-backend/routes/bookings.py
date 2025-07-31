from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from utils.payment_utils import create_payment, verify_payment
from datetime import datetime, timedelta
import math
import uuid
import string
import random

bookings_bp = Blueprint('bookings', __name__)

def generate_booking_reference():
    """Generate unique booking reference"""
    prefix = "VS"  # VillageStay prefix
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{random_part}"

@bookings_bp.route('/', methods=['POST'])
@jwt_required()
def create_booking():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user is a tourist
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'tourist':
            return jsonify({"error": "Only tourists can create bookings"}), 403
        
        # Required fields
        required_fields = ['listing_id', 'check_in', 'check_out', 'guests']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400
        
        # Validate listing
        listing = mongo.db.listings.find_one({"_id": ObjectId(data['listing_id'])})
        if not listing:
            return jsonify({"error": "Listing not found"}), 404
        
        if not listing.get('is_active', True) or not listing.get('is_approved', False):
            return jsonify({"error": "Listing is not available for booking"}), 400
        
        # Parse and validate dates
        try:
            check_in_date = datetime.strptime(data['check_in'], '%Y-%m-%d')
            check_out_date = datetime.strptime(data['check_out'], '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        if check_in_date >= check_out_date:
            return jsonify({"error": "Check-out date must be after check-in date"}), 400
        
        if check_in_date < datetime.now().replace(hour=0, minute=0, second=0, microsecond=0):
            return jsonify({"error": "Check-in date cannot be in the past"}), 400
        
        # Check availability
        if not check_availability(data['listing_id'], check_in_date, check_out_date):
            return jsonify({
                "error": "Selected dates are not available. Please choose different dates.",
                "suggestion": "Try selecting dates at least 1 day apart from existing bookings"
            }), 400
        
        # Validate guests
        max_guests = listing.get('max_guests', 4)
        if data['guests'] > max_guests:
            return jsonify({"error": f"Maximum {max_guests} guests allowed"}), 400
        
        # Calculate pricing
        nights = (check_out_date - check_in_date).days
        base_amount = listing['price_per_night'] * nights
        platform_fee = base_amount * 0.05  # 5% platform fee
        community_contribution = base_amount * 0.02  # 2% community fund
        host_earnings = base_amount - platform_fee - community_contribution
        total_amount = base_amount + platform_fee
        
        # Generate unique booking reference
        booking_reference = f"VS{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"
        
        # Create booking document with all required fields
        booking_doc = {
            "listing_id": ObjectId(data['listing_id']),
            "tourist_id": ObjectId(user_id),
            "host_id": listing['host_id'],
            "check_in": check_in_date,
            "check_out": check_out_date,
            "guests": data['guests'],
            "nights": nights,
            "base_amount": base_amount,
            "platform_fee": platform_fee,
            "community_contribution": community_contribution,
            "host_earnings": host_earnings,
            "total_amount": total_amount,
            "special_requests": data.get('special_requests', ''),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": "pending",
            "payment_status": "unpaid",
            "payment_id": None,
            "booking_reference": booking_reference,
            # Additional fields for WhatsApp bot compatibility
            "guest_name": data.get('guest_name', user.get('full_name', '')),
            "guest_email": data.get('guest_email', user.get('email', '')),
            "guest_phone": data.get('guest_phone', user.get('phone', '')),
            "tourist_phone": data.get('tourist_phone', ''),
            "booking_source": data.get('booking_source', 'web_platform')
        }
        
        # Insert booking
        result = mongo.db.bookings.insert_one(booking_doc)
        
        # Create payment
        from utils.payment_utils import create_payment
        payment_data = create_payment(
            total_amount,
            f"Booking for {listing['title']}",
            str(result.inserted_id)
        )
        
        # Update booking with payment ID
        mongo.db.bookings.update_one(
            {"_id": result.inserted_id},
            {"$set": {"payment_id": payment_data['payment_id']}}
        )
        
        return jsonify({
            "message": "Booking created successfully",
            "booking_id": str(result.inserted_id),
            "booking_reference": booking_reference,
            "payment_data": payment_data,
            "booking_details": {
                "listing_title": listing['title'],
                "check_in": data['check_in'],
                "check_out": data['check_out'],
                "guests": data['guests'],
                "nights": nights,
                "total_amount": total_amount
            }
        }), 201
        
    except Exception as e:
        print(f"Booking creation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to create booking. Please try again."}), 500

@bookings_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_bookings():
    try:
        user_id = get_jwt_identity()
        
        # Get user details
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status = request.args.get('status')
        
        print(f"Fetching bookings for user {user_id}, type: {user['user_type']}")
        
        # Build query based on user type
        if user['user_type'] == 'tourist':
            query = {"tourist_id": ObjectId(user_id)}
        elif user['user_type'] == 'host':
            query = {"host_id": ObjectId(user_id)}
        else:
            return jsonify({"error": "Invalid user type"}), 400
        
        # Add status filter if provided
        if status:
            query["status"] = status
        
        print(f"Query: {query}")
        
        # Execute query
        skip = (page - 1) * limit
        
        bookings = list(mongo.db.bookings.find(query)
                       .sort("created_at", -1)
                       .skip(skip)
                       .limit(limit))
        
        print(f"Found {len(bookings)} bookings")
        
        # Get total count
        total_count = mongo.db.bookings.count_documents(query)
        
        # Format bookings
        formatted_bookings = []
        for booking in bookings:
            try:
                # Get listing info (handle missing listings gracefully)
                listing = None
                if 'listing_id' in booking:
                    listing = mongo.db.listings.find_one({"_id": booking['listing_id']})
                
                # Get tourist info (handle missing tourists gracefully)
                tourist = None
                if 'tourist_id' in booking:
                    tourist = mongo.db.users.find_one({"_id": booking['tourist_id']})
                
                # Get host info (handle missing hosts gracefully)
                host = None
                if 'host_id' in booking:
                    host = mongo.db.users.find_one({"_id": booking['host_id']})
                
                # Format dates safely
                check_in_str = booking['check_in'].strftime('%Y-%m-%d') if 'check_in' in booking and booking['check_in'] else 'N/A'
                check_out_str = booking['check_out'].strftime('%Y-%m-%d') if 'check_out' in booking and booking['check_out'] else 'N/A'
                created_at_str = booking['created_at'].isoformat() if 'created_at' in booking and booking['created_at'] else datetime.utcnow().isoformat()
                
                formatted_booking = {
                    "id": str(booking['_id']),
                    "booking_reference": booking.get('booking_reference', f"BK{str(booking['_id'])[-8:]}"),
                    "check_in": check_in_str,
                    "check_out": check_out_str,
                    "guests": booking.get('guests', 1),
                    "nights": booking.get('nights', 1),
                    "total_amount": booking.get('total_amount', 0),
                    "status": booking.get('status', 'pending'),
                    "payment_status": booking.get('payment_status', 'unpaid'),
                    "special_requests": booking.get('special_requests', ''),
                    "guest_name": booking.get('guest_name', ''),
                    "guest_email": booking.get('guest_email', ''),
                    "guest_phone": booking.get('guest_phone', ''),
                    "booking_source": booking.get('booking_source', 'web_platform'),
                    "listing": {
                        "id": str(listing['_id']),
                        "title": listing['title'],
                        "location": listing['location'],
                        "images": listing.get('images', [])[:1] if listing.get('images') else []
                    } if listing else {
                        "id": "unknown",
                        "title": "Property Details Unavailable",
                        "location": "Unknown Location",
                        "images": []
                    },
                    "tourist": {
                        "id": str(tourist['_id']),
                        "full_name": tourist['full_name'],
                        "email": tourist['email'],
                        "phone": tourist.get('phone', '')
                    } if tourist else {
                        "id": "unknown",
                        "full_name": booking.get('guest_name', 'Guest'),
                        "email": booking.get('guest_email', ''),
                        "phone": booking.get('guest_phone', '')
                    },
                    "host": {
                        "id": str(host['_id']),
                        "full_name": host['full_name'],
                        "email": host['email'],
                        "phone": host.get('phone', '')
                    } if host else {
                        "id": "unknown",
                        "full_name": "Host",
                        "email": "",
                        "phone": ""
                    },
                    "created_at": created_at_str
                }
                
                formatted_bookings.append(formatted_booking)
                
            except Exception as booking_error:
                print(f"Error formatting booking {booking.get('_id', 'unknown')}: {booking_error}")
                # Continue with other bookings even if one fails
                continue
        
        return jsonify({
            "bookings": formatted_bookings,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": math.ceil(total_count / limit) if total_count > 0 else 0
            }
        }), 200
        
    except Exception as e:
        print(f"Get bookings error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch bookings"}), 500

@bookings_bp.route('/<booking_id>', methods=['GET'])
@jwt_required()
def get_booking(booking_id):
    try:
        user_id = get_jwt_identity()
        
        # Validate booking_id format
        if not ObjectId.is_valid(booking_id):
            return jsonify({"error": "Invalid booking ID format"}), 400
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify access
        user_object_id = ObjectId(user_id)
        if (booking.get('tourist_id') != user_object_id and 
            booking.get('host_id') != user_object_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get related data safely
        listing = mongo.db.listings.find_one({"_id": booking['listing_id']}) if booking.get('listing_id') else None
        tourist = mongo.db.users.find_one({"_id": booking['tourist_id']}) if booking.get('tourist_id') else None
        host = mongo.db.users.find_one({"_id": booking['host_id']}) if booking.get('host_id') else None
        
        formatted_booking = {
            "id": str(booking['_id']),
            "booking_reference": booking.get('booking_reference', f"BK{str(booking['_id'])[-8:]}"),
            "check_in": booking['check_in'].strftime('%Y-%m-%d') if booking.get('check_in') else 'N/A',
            "check_out": booking['check_out'].strftime('%Y-%m-%d') if booking.get('check_out') else 'N/A',
            "guests": booking.get('guests', 1),
            "nights": booking.get('nights', 1),
            "base_amount": booking.get('base_amount', 0),
            "platform_fee": booking.get('platform_fee', 0),
            "community_contribution": booking.get('community_contribution', 0),
            "total_amount": booking.get('total_amount', 0),
            "status": booking.get('status', 'pending'),
            "payment_status": booking.get('payment_status', 'unpaid'),
            "special_requests": booking.get('special_requests', ''),
            "guest_name": booking.get('guest_name', ''),
            "guest_email": booking.get('guest_email', ''),
            "guest_phone": booking.get('guest_phone', ''),
            "listing": {
                "id": str(listing['_id']),
                "title": listing['title'],
                "description": listing['description'],
                "location": listing['location'],
                "images": listing.get('images', []),
                "amenities": listing.get('amenities', []),
                "house_rules": listing.get('house_rules', []),
                "coordinates": listing.get('coordinates', {})
            } if listing else None,
            "tourist": {
                "id": str(tourist['_id']),
                "full_name": tourist['full_name'],
                "email": tourist['email'],
                "phone": tourist.get('phone', '')
            } if tourist else None,
            "host": {
                "id": str(host['_id']),
                "full_name": host['full_name'],
                "email": host['email'],
                "phone": host.get('phone', '')
            } if host else None,
            "created_at": booking['created_at'].isoformat() if booking.get('created_at') else datetime.utcnow().isoformat(),
            "updated_at": booking.get('updated_at', booking.get('created_at', datetime.utcnow())).isoformat()
        }
        
        return jsonify(formatted_booking), 200
        
    except Exception as e:
        print(f"Get booking error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch booking details"}), 500

@bookings_bp.route('/<booking_id>/payment', methods=['POST'])
@jwt_required()
def complete_payment(booking_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"Payment completion request for booking: {booking_id}")
        
        # Validate booking_id format
        if not ObjectId.is_valid(booking_id):
            return jsonify({"error": "Invalid booking ID format"}), 400
        
        # Verify booking ownership
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        if str(booking.get('tourist_id', '')) != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Check if booking is still pending
        if booking.get('status') != 'pending':
            return jsonify({"error": f"Booking is not in pending status. Current status: {booking.get('status', 'unknown')}"}), 400
        
        # Get payment details
        payment_method = data.get('payment_method', 'upi')
        payment_signature = data.get('payment_signature', 'mock_signature')
        transaction_id = data.get('transaction_id', f"txn_{booking_id}")
        
        # Mock payment verification - always successful for demo
        payment_verification = {
            'success': True,
            'payment_id': booking.get('payment_id', f"pay_{booking_id}"),
            'payment_method': payment_method,
            'transaction_id': transaction_id,
            'verified_at': datetime.utcnow().isoformat()
        }
        
        if not payment_verification['success']:
            return jsonify({"error": "Payment verification failed"}), 400
        
        # Update booking status
        update_data = {
            "payment_status": "paid",
            "status": "confirmed",
            "payment_completed_at": datetime.utcnow(),
            "payment_method": payment_method,
            "payment_signature": payment_signature,
            "transaction_id": transaction_id,
            "updated_at": datetime.utcnow()
        }
        
        update_result = mongo.db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": update_data}
        )
        
        if update_result.matched_count == 0:
            return jsonify({"error": "Failed to update booking"}), 500
        
        # Block dates in listing availability
        try:
            block_dates(booking['listing_id'], booking['check_in'], booking['check_out'])
        except Exception as e:
            print(f"Warning: Failed to block dates: {e}")
        
        return jsonify({
            "message": "Payment completed successfully",
            "booking_status": "confirmed",
            "payment_verification": payment_verification,
            "booking_reference": booking.get('booking_reference')
        }), 200
        
    except Exception as e:
        print(f"Payment completion error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Payment processing failed"}), 500

@bookings_bp.route('/<booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate booking_id format
        if not ObjectId.is_valid(booking_id):
            return jsonify({"error": "Invalid booking ID format"}), 400
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify access (tourist or host can cancel)
        user_object_id = ObjectId(user_id)
        if (booking.get('tourist_id') != user_object_id and 
            booking.get('host_id') != user_object_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Check if booking can be cancelled
        if booking.get('status') in ['cancelled', 'completed']:
            return jsonify({"error": "Booking cannot be cancelled"}), 400
        
        # Calculate refund amount based on cancellation policy
        refund_amount = calculate_refund_amount(booking, datetime.utcnow())
        
        # Update booking status
        mongo.db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow(),
                    "cancelled_by": user_id,
                    "cancellation_reason": data.get('reason', ''),
                    "refund_amount": refund_amount,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Free up dates in listing availability
        if booking.get('listing_id') and booking.get('check_in') and booking.get('check_out'):
            free_dates(booking['listing_id'], booking['check_in'], booking['check_out'])
        
        return jsonify({
            "message": "Booking cancelled successfully",
            "refund_amount": refund_amount
        }), 200
        
    except Exception as e:
        print(f"Cancel booking error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to cancel booking"}), 500

@bookings_bp.route('/<booking_id>/complete', methods=['POST'])
@jwt_required()
def complete_booking(booking_id):
    try:
        user_id = get_jwt_identity()
        
        # Validate booking_id format
        if not ObjectId.is_valid(booking_id):
            return jsonify({"error": "Invalid booking ID format"}), 400
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify host access
        if str(booking.get('host_id', '')) != user_id:
            return jsonify({"error": "Only host can complete booking"}), 403
        
        # Check if booking can be completed
        if booking.get('status') != 'confirmed':
            return jsonify({"error": "Booking is not confirmed"}), 400
        
        # Check if check-out date has passed
        if booking.get('check_out') and booking['check_out'] > datetime.utcnow():
            return jsonify({"error": "Cannot complete booking before check-out date"}), 400
        
        # Update booking status
        mongo.db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return jsonify({"message": "Booking completed successfully"}), 200
        
    except Exception as e:
        print(f"Complete booking error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to complete booking"}), 500

# Utility functions
def block_dates(listing_id, check_in, check_out):
    """Block dates in listing availability calendar"""
    try:
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return
        
        availability_calendar = listing.get('availability_calendar', {})
        
        current_date = check_in
        while current_date < check_out:
            date_str = current_date.strftime('%Y-%m-%d')
            availability_calendar[date_str] = False
            current_date += timedelta(days=1)
        
        mongo.db.listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": {"availability_calendar": availability_calendar}}
        )
    except Exception as e:
        print(f"Block dates error: {e}")

def free_dates(listing_id, check_in, check_out):
    """Free up dates in listing availability calendar"""
    try:
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return
        
        availability_calendar = listing.get('availability_calendar', {})
        
        current_date = check_in
        while current_date < check_out:
            date_str = current_date.strftime('%Y-%m-%d')
            if date_str in availability_calendar:
                del availability_calendar[date_str]
            current_date += timedelta(days=1)
        
        mongo.db.listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": {"availability_calendar": availability_calendar}}
        )
    except Exception as e:
        print(f"Free dates error: {e}")

def calculate_refund_amount(booking, cancellation_date):
    """Calculate refund amount based on cancellation policy"""
    try:
        if not booking.get('check_in'):
            return 0
            
        days_until_checkin = (booking['check_in'] - cancellation_date).days
        total_amount = booking.get('total_amount', 0)
        
        if days_until_checkin >= 7:
            return total_amount  # Full refund
        elif days_until_checkin >= 3:
            return total_amount * 0.5  # 50% refund
        else:
            return 0  # No refund
    except Exception as e:
        print(f"Refund calculation error: {e}")
        return 0

def check_availability(listing_id, check_in, check_out):
    """Check if listing is available for given dates"""
    try:
        # Convert dates to datetime objects if they're strings
        if isinstance(check_in, str):
            check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
        else:
            check_in_date = check_in
            
        if isinstance(check_out, str):
            check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
        else:
            check_out_date = check_out
        
        # Check for existing confirmed bookings that overlap
        existing_bookings = mongo.db.bookings.find({
            "listing_id": ObjectId(listing_id),
            "status": {"$in": ["confirmed", "pending"]},
            "$or": [
                # New booking starts during existing booking
                {
                    "check_in": {"$lte": check_in_date},
                    "check_out": {"$gt": check_in_date}
                },
                # New booking ends during existing booking  
                {
                    "check_in": {"$lt": check_out_date},
                    "check_out": {"$gte": check_out_date}
                },
                # New booking completely contains existing booking
                {
                    "check_in": {"$gte": check_in_date},
                    "check_out": {"$lte": check_out_date}
                },
                # Existing booking completely contains new booking
                {
                    "check_in": {"$lte": check_in_date},
                    "check_out": {"$gte": check_out_date}
                }
            ]
        })
        
        if existing_bookings.count() > 0:
            return False
        
        # Check availability calendar (host-blocked dates)
        listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            return False
        
        availability_calendar = listing.get('availability_calendar', {})
        
        # Check each date in the range
        current_date = check_in_date
        while current_date < check_out_date:
            date_str = current_date.strftime('%Y-%m-%d')
            # If date is explicitly blocked (False), not available
            if availability_calendar.get(date_str) == False:
                return False
            current_date += timedelta(days=1)
        
        return True
        
    except Exception as e:
        print(f"Error checking availability: {str(e)}")
        return False