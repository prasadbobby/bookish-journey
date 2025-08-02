from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database import mongo
from datetime import datetime, timedelta
import uuid
import math

bookings_bp = Blueprint('bookings', __name__)

@bookings_bp.route('/', methods=['POST'])
@jwt_required()
def create_booking():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"📝 Creating booking for user: {user_id}")
        print(f"📋 Booking data: {data}")
        
        # Verify user is a tourist
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user['user_type'] != 'tourist':
            return jsonify({"error": "Only tourists can create bookings"}), 403
        
        # Get listing type and ID
        listing_id = data.get('listing_id')
        listing_type = data.get('listing_type', 'homestay')  # Default to homestay for backward compatibility
        
        if not listing_id:
            return jsonify({"error": "Listing ID is required"}), 400
        
        print(f"🔍 Looking for {listing_type}: {listing_id}")
        
        # Get the listing/experience based on type
        if listing_type == 'experience':
            listing = mongo.db.experiences.find_one({"_id": ObjectId(listing_id)})
            collection_name = 'experiences'
        else:
            listing = mongo.db.listings.find_one({"_id": ObjectId(listing_id)})
            collection_name = 'listings'
        
        if not listing:
            return jsonify({"error": f"{listing_type.capitalize()} not found"}), 404
        
        if not listing.get('is_active', True) or not listing.get('is_approved', False):
            return jsonify({"error": f"{listing_type.capitalize()} is not available for booking"}), 400
        
        # Validate booking data based on type
        if listing_type == 'experience':
            return create_experience_booking(user_id, data, listing)
        else:
            return create_homestay_booking(user_id, data, listing)
            
    except Exception as e:
        print(f"❌ Error creating booking: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def create_homestay_booking(user_id, data, listing):
    """Create a homestay booking"""
    try:
        # Required fields for homestay
        required_fields = ['check_in', 'check_out', 'guests']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Parse dates
        check_in = datetime.strptime(data['check_in'], '%Y-%m-%d').date()
        check_out = datetime.strptime(data['check_out'], '%Y-%m-%d').date()
        
        # Validate dates
        if check_in <= datetime.now().date():
            return jsonify({"error": "Check-in date must be in the future"}), 400
        
        if check_out <= check_in:
            return jsonify({"error": "Check-out date must be after check-in date"}), 400
        
        # Validate guest count
        guests = int(data['guests'])
        max_guests = int(listing.get('max_guests', 4))
        
        if guests > max_guests:
            return jsonify({"error": f"Maximum {max_guests} guests allowed"}), 400
        
        if guests < 1:
            return jsonify({"error": "At least 1 guest is required"}), 400
        
        # Calculate costs
        nights = (check_out - check_in).days
        base_amount = float(listing['price_per_night']) * nights
        
        # Calculate fees
        platform_fee = base_amount * 0.05  # 5% platform fee
        community_contribution = base_amount * 0.02  # 2% community fund
        total_amount = base_amount + platform_fee + community_contribution
        
        # Create booking document
        booking_doc = {
            "booking_reference": f"VS{uuid.uuid4().hex[:8].upper()}",
            "tourist_id": ObjectId(user_id),
            "host_id": listing['host_id'],
            "listing_id": ObjectId(data['listing_id']),
            "listing_type": "homestay",
            "listing_title": listing['title'],
            "listing_location": listing['location'],
            "check_in": datetime.combine(check_in, datetime.min.time()),
            "check_out": datetime.combine(check_out, datetime.min.time()),
            "guests": guests,
            "nights": nights,
            "base_amount": base_amount,
            "platform_fee": platform_fee,
            "community_contribution": community_contribution,
            "total_amount": total_amount,
            "special_requests": data.get('special_requests', ''),
            "status": "pending",
            "payment_status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert booking
        result = mongo.db.bookings.insert_one(booking_doc)
        booking_id = str(result.inserted_id)
        
        print(f"✅ Homestay booking created: {booking_id}")
        
        return jsonify({
            "message": "Homestay booking created successfully",
            "booking_id": booking_id,
            "booking_reference": booking_doc["booking_reference"],
            "total_amount": total_amount
        }), 201
        
    except ValueError as e:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        print(f"❌ Error creating homestay booking: {e}")
        raise e

def create_experience_booking(user_id, data, experience):
    """Create an experience booking"""
    try:
        # Required fields for experience
        required_fields = ['experience_date', 'experience_time', 'participants']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Parse date and time
        experience_date = datetime.strptime(data['experience_date'], '%Y-%m-%d').date()
        experience_time = data['experience_time']  # e.g., "10:00"
        
        # Combine date and time
        try:
            hour, minute = map(int, experience_time.split(':'))
            experience_datetime = datetime.combine(experience_date, datetime.min.time().replace(hour=hour, minute=minute))
        except ValueError:
            return jsonify({"error": "Invalid time format. Use HH:MM"}), 400
        
        # Validate date
        if experience_datetime <= datetime.now():
            return jsonify({"error": "Experience date and time must be in the future"}), 400
        
        # Validate participant count
        participants = int(data['participants'])
        max_participants = int(experience.get('max_participants', 8))
        
        if participants > max_participants:
            return jsonify({"error": f"Maximum {max_participants} participants allowed"}), 400
        
        if participants < 1:
            return jsonify({"error": "At least 1 participant is required"}), 400
        
        # Calculate costs
        base_amount = float(experience['price_per_person']) * participants
        
        # Calculate fees
        platform_fee = base_amount * 0.05  # 5% platform fee
        community_contribution = base_amount * 0.02  # 2% community fund
        total_amount = base_amount + platform_fee + community_contribution
        
        # Calculate end time
        duration_hours = float(experience.get('duration', 2))
        experience_end_datetime = experience_datetime + timedelta(hours=duration_hours)
        
        # Create booking document
        booking_doc = {
            "booking_reference": f"VE{uuid.uuid4().hex[:8].upper()}",
            "tourist_id": ObjectId(user_id),
            "host_id": experience['host_id'],
            "listing_id": ObjectId(data['listing_id']),
            "listing_type": "experience",
            "listing_title": experience['title'],
            "listing_location": experience['location'],
            "experience_date": datetime.combine(experience_date, datetime.min.time()),
            "experience_time": experience_time,
            "experience_datetime": experience_datetime,
            "experience_end_datetime": experience_end_datetime,
            "participants": participants,
            "duration": duration_hours,
            "base_amount": base_amount,
            "platform_fee": platform_fee,
            "community_contribution": community_contribution,
            "total_amount": total_amount,
            "special_requests": data.get('special_requests', ''),
            "category": experience.get('category'),
            "difficulty_level": experience.get('difficulty_level'),
            "status": "pending",
            "payment_status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert booking
        result = mongo.db.bookings.insert_one(booking_doc)
        booking_id = str(result.inserted_id)
        
        print(f"✅ Experience booking created: {booking_id}")
        
        return jsonify({
            "message": "Experience booking created successfully",
            "booking_id": booking_id,
            "booking_reference": booking_doc["booking_reference"],
            "total_amount": total_amount
        }), 201
        
    except ValueError as e:
        return jsonify({"error": "Invalid date or time format"}), 400
    except Exception as e:
        print(f"❌ Error creating experience booking: {e}")
        raise e

@bookings_bp.route('/<booking_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_payment(booking_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"💳 Completing payment for booking: {booking_id}")
        print(f"💳 Payment data: {data}")
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify ownership
        if str(booking['tourist_id']) != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Verify booking is in pending status
        if booking['status'] != 'pending':
            return jsonify({"error": "Booking is not in pending status"}), 400
        
        # Validate payment details
        payment_method = data.get('payment_method')
        transaction_id = data.get('transaction_id')
        
        if not payment_method or not transaction_id:
            return jsonify({"error": "Payment method and transaction ID are required"}), 400
        
        # Create payment record
        payment_record = {
            "method": payment_method,
            "transaction_id": transaction_id,
            "signature": data.get('payment_signature'),
            "upi_id": data.get('upi_id'),
            "card_last_four": data.get('card_last_four'),
            "amount": booking['total_amount'],
            "currency": "INR",
            "status": "completed",
            "processed_at": datetime.utcnow()
        }
        
        # Calculate fees and earnings
        base_amount = booking.get('base_amount', booking['total_amount'] * 0.93)  # Rough calculation if not stored
        platform_fee = booking.get('platform_fee', booking['total_amount'] * 0.05)
        community_contribution = booking.get('community_contribution', booking['total_amount'] * 0.02)
        host_earnings = base_amount
        
        # Update booking with payment completion
        update_data = {
            "status": "confirmed",
            "payment_status": "completed",
            "payment_details": payment_record,
            "host_earnings": host_earnings,
            "platform_fee": platform_fee,
            "community_contribution": community_contribution,
            "confirmed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo.db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Failed to update booking"}), 500
        
        # Get updated booking for response
        updated_booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        
        print(f"✅ Payment completed for booking: {booking_id}")
        
        # Format response
        response_data = {
            "message": "Payment completed successfully",
            "booking_id": booking_id,
            "booking_reference": updated_booking['booking_reference'],
            "status": updated_booking['status'],
            "payment_status": updated_booking['payment_status'],
            "total_amount": updated_booking['total_amount'],
            "transaction_id": transaction_id,
            "confirmed_at": updated_booking['confirmed_at'].isoformat()
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Error completing payment: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@bookings_bp.route('/<booking_id>/confirm-payment', methods=['POST'])
@jwt_required()
def confirm_payment(booking_id):
    """Alternative endpoint name for payment confirmation"""
    return complete_payment(booking_id)

@bookings_bp.route('/<booking_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_booking_with_payment(booking_id):
    """Legacy endpoint for payment confirmation"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify ownership
        if str(booking['tourist_id']) != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Check if this is a payment confirmation (has payment_details) or just booking confirmation
        if 'payment_details' in data or 'payment_method' in data:
            return complete_payment(booking_id)
        
        # Original booking confirmation logic
        if not data.get('payment_details', {}).get('transaction_id'):
            return jsonify({"error": "Payment details required"}), 400
        
        # Update booking status
        update_data = {
            "status": "confirmed",
            "payment_status": "paid",
            "payment_details": data.get('payment_details', {}),
            "confirmed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        mongo.db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": update_data}
        )
        
        return jsonify({"message": "Booking confirmed successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error confirming booking: {e}")
        return jsonify({"error": str(e)}), 500
@bookings_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_bookings():
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Build query based on user type
        if user['user_type'] == 'tourist':
            query = {"tourist_id": ObjectId(user_id)}
        elif user['user_type'] == 'host':
            query = {"host_id": ObjectId(user_id)}
        else:
            return jsonify({"error": "Invalid user type"}), 403
        
        # Get status filter
        status = request.args.get('status')
        if status:
            query["status"] = status
        
        # Get bookings
        bookings = list(mongo.db.bookings.find(query).sort("created_at", -1))
        
        # Format bookings
        formatted_bookings = []
        for booking in bookings:
            # Get listing/experience details
            if booking.get('listing_type') == 'experience':
                listing = mongo.db.experiences.find_one({"_id": booking['listing_id']})
            else:
                listing = mongo.db.listings.find_one({"_id": booking['listing_id']})
            
            # Get other user details
            if user['user_type'] == 'tourist':
                other_user = mongo.db.users.find_one({"_id": booking['host_id']})
                other_user_key = 'host'
            else:
                other_user = mongo.db.users.find_one({"_id": booking['tourist_id']})
                other_user_key = 'tourist'
            
            formatted_booking = {
                "id": str(booking['_id']),
                "booking_reference": booking['booking_reference'],
                "listing_type": booking.get('listing_type', 'homestay'),
                "status": booking['status'],
                "payment_status": booking.get('payment_status', 'pending'),
                "total_amount": booking['total_amount'],
                "special_requests": booking.get('special_requests', ''),
                "created_at": booking['created_at'].isoformat(),
                "listing": {
                    "id": str(listing['_id']),
                    "title": listing['title'],
                    "location": listing['location'],
                    "images": listing.get('images', [])
                } if listing else None
            }
            
            # Add type-specific fields
            if booking.get('listing_type') == 'experience':
                formatted_booking.update({
                    "experience_date": booking['experience_date'].strftime('%Y-%m-%d'),
                    "experience_time": booking.get('experience_time'),
                    "experience_datetime": booking['experience_datetime'].isoformat(),
                    "participants": booking['participants'],
                    "duration": booking.get('duration'),
                    "category": booking.get('category'),
                    "difficulty_level": booking.get('difficulty_level')
                })
            else:
                formatted_booking.update({
                    "check_in": booking['check_in'].strftime('%Y-%m-%d'),
                    "check_out": booking['check_out'].strftime('%Y-%m-%d'),
                    "guests": booking['guests'],
                    "nights": booking.get('nights', 1)
                })
            
            # Add other user info
            if other_user:
                formatted_booking[other_user_key] = {
                    "id": str(other_user['_id']),
                    "full_name": other_user['full_name'],
                    "email": other_user['email'],
                    "phone": other_user.get('phone')
                }
            
            formatted_bookings.append(formatted_booking)
        
        return jsonify({
            "bookings": formatted_bookings,
            "total_count": len(formatted_bookings)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting bookings: {e}")
        return jsonify({"error": str(e)}), 500

@bookings_bp.route('/<booking_id>', methods=['GET'])
@jwt_required()
def get_booking_details(booking_id):
    try:
        user_id = get_jwt_identity()
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify access
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if (str(booking['tourist_id']) != user_id and 
            str(booking['host_id']) != user_id and 
            user.get('user_type') != 'admin'):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get listing/experience details
        if booking.get('listing_type') == 'experience':
            listing = mongo.db.experiences.find_one({"_id": booking['listing_id']})
        else:
            listing = mongo.db.listings.find_one({"_id": booking['listing_id']})
        
        # Get host and tourist details
        host = mongo.db.users.find_one({"_id": booking['host_id']})
        tourist = mongo.db.users.find_one({"_id": booking['tourist_id']})
        
        # Format booking details
        formatted_booking = {
            "id": str(booking['_id']),
            "booking_reference": booking['booking_reference'],
            "listing_type": booking.get('listing_type', 'homestay'),
            "status": booking['status'],
            "payment_status": booking.get('payment_status', 'pending'),
            "base_amount": booking.get('base_amount'),
            "platform_fee": booking.get('platform_fee'),
            "community_contribution": booking.get('community_contribution'),
            "total_amount": booking['total_amount'],
            "special_requests": booking.get('special_requests', ''),
            "created_at": booking['created_at'].isoformat(),
            "confirmed_at": booking.get('confirmed_at').isoformat() if booking.get('confirmed_at') else None,
            "listing": {
                "id": str(listing['_id']),
                "title": listing['title'],
                "description": listing.get('description'),
                "location": listing['location'],
                "images": listing.get('images', []),
                "rating": listing.get('rating', 0)
            } if listing else None,
            "host": {
                "id": str(host['_id']),
                "full_name": host['full_name'],
                "email": host['email'],
                "phone": host.get('phone')
            } if host else None,
            "tourist": {
                "id": str(tourist['_id']),
                "full_name": tourist['full_name'],
                "email": tourist['email'],
                "phone": tourist.get('phone')
            } if tourist else None
        }
        
        # Add type-specific fields
        if booking.get('listing_type') == 'experience':
            formatted_booking.update({
                "experience_date": booking['experience_date'].strftime('%Y-%m-%d'),
                "experience_time": booking.get('experience_time'),
                "experience_datetime": booking['experience_datetime'].isoformat(),
                "experience_end_datetime": booking.get('experience_end_datetime').isoformat() if booking.get('experience_end_datetime') else None,
                "participants": booking['participants'],
                "duration": booking.get('duration'),
                "category": booking.get('category'),
                "difficulty_level": booking.get('difficulty_level')
            })
        else:
            formatted_booking.update({
                "check_in": booking['check_in'].strftime('%Y-%m-%d'),
                "check_out": booking['check_out'].strftime('%Y-%m-%d'),
                "guests": booking['guests'],
                "nights": booking.get('nights', 1)
            })
        
        return jsonify(formatted_booking), 200
        
    except Exception as e:
        print(f"❌ Error getting booking details: {e}")
        return jsonify({"error": str(e)}), 500

# Add cancel booking method
@bookings_bp.route('/<booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get booking
        booking = mongo.db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Verify ownership
        if str(booking['tourist_id']) != user_id:
            return jsonify({"error": "Only the tourist can cancel this booking"}), 403
        
        # Check if booking can be cancelled
        if booking['status'] not in ['pending', 'confirmed']:
            return jsonify({"error": "This booking cannot be cancelled"}), 400
        
        # Check cancellation window for homestays
        if booking.get('listing_type') != 'experience':
            check_in = booking['check_in'].date()
            if (check_in - datetime.now().date()).days < 1:
                return jsonify({"error": "Cancellation not allowed within 24 hours of check-in"}), 400
        else:
            # For experiences, check if it's at least 2 hours before
            experience_datetime = booking['experience_datetime']
            if (experience_datetime - datetime.now()).total_seconds() < 7200:  # 2 hours
                return jsonify({"error": "Cancellation not allowed within 2 hours of experience"}), 400
        
        # Update booking
        mongo.db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "cancellation_reason": data.get('reason', ''),
                    "cancelled_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return jsonify({"message": "Booking cancelled successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error cancelling booking: {e}")
        return jsonify({"error": str(e)}), 500