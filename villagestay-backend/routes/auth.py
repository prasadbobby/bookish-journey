from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from database import mongo  # Changed this line
from utils.auth_utils import generate_otp, send_otp_email
from datetime import datetime, timedelta
from bson import ObjectId
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'full_name', 'user_type']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400
        
        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email']):
            return jsonify({"error": "Invalid email format"}), 400
        
        # Check if user already exists
        if mongo.db.users.find_one({"email": data['email']}):
            return jsonify({"error": "Email already registered"}), 400
        
        # Validate user type
        if data['user_type'] not in ['tourist', 'host', 'admin']:
            return jsonify({"error": "Invalid user type"}), 400
        
        # Create user document
        user_doc = {
            "email": data['email'],
            "password": generate_password_hash(data['password']),
            "full_name": data['full_name'],
            "user_type": data['user_type'],
            "phone": data.get('phone'),
            "address": data.get('address'),
            "created_at": datetime.utcnow(),
            "is_verified": False,
            "profile_image": None,
            "preferred_language": data.get('preferred_language', 'en'),
            "verification_otp": generate_otp(),
            "otp_expires_at": datetime.utcnow() + timedelta(minutes=10)
        }
        
        # Insert user
        result = mongo.db.users.insert_one(user_doc)
        
        # Send verification OTP
        send_otp_email(data['email'], user_doc['verification_otp'])
        
        return jsonify({
            "message": "Registration successful. Please verify your email.",
            "user_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({"error": "Email and password are required"}), 400
        
        # Find user
        user = mongo.db.users.find_one({"email": data['email']})
        
        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Create access token
        access_token = create_access_token(
            identity=str(user['_id']),
            expires_delta=timedelta(days=30)
        )
        
        # Update last login
        mongo.db.users.update_one(
            {"_id": user['_id']},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        return jsonify({
            "access_token": access_token,
            "user": {
                "id": str(user['_id']),
                "email": user['email'],
                "full_name": user['full_name'],
                "user_type": user['user_type'],
                "is_verified": user['is_verified']
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('otp'):
            return jsonify({"error": "Email and OTP are required"}), 400
        
        # Find user
        user = mongo.db.users.find_one({"email": data['email']})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check OTP
        if (user.get('verification_otp') != data['otp'] or 
            user.get('otp_expires_at') < datetime.utcnow()):
            return jsonify({"error": "Invalid or expired OTP"}), 400
        
        # Update user as verified
        mongo.db.users.update_one(
            {"_id": user['_id']},
            {
                "$set": {"is_verified": True},
                "$unset": {"verification_otp": "", "otp_expires_at": ""}
            }
        )
        
        return jsonify({"message": "Email verified successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({"error": "Email is required"}), 400
        
        # Find user
        user = mongo.db.users.find_one({"email": data['email']})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.get('is_verified'):
            return jsonify({"error": "Email already verified"}), 400
        
        # Generate new OTP
        new_otp = generate_otp()
        
        # Update user with new OTP
        mongo.db.users.update_one(
            {"_id": user['_id']},
            {
                "$set": {
                    "verification_otp": new_otp,
                    "otp_expires_at": datetime.utcnow() + timedelta(minutes=10)
                }
            }
        )
        
        # Send OTP
        send_otp_email(data['email'], new_otp)
        
        return jsonify({"message": "OTP sent successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user_profile = {
            "id": str(user['_id']),
            "email": user['email'],
            "full_name": user['full_name'],
            "user_type": user['user_type'],
            "phone": user.get('phone'),
            "address": user.get('address'),
            "is_verified": user['is_verified'],
            "profile_image": user.get('profile_image'),
            "preferred_language": user.get('preferred_language', 'en'),
            "created_at": user['created_at'].isoformat()
        }
        
        return jsonify(user_profile), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Allowed fields for update
        allowed_fields = ['full_name', 'phone', 'address', 'preferred_language']
        update_data = {}
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        
        update_data['updated_at'] = datetime.utcnow()
        
        # Update user
        result = mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({"message": "Profile updated successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({"error": "Current password and new password are required"}), 400
        
        # Find user
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Verify current password
        if not check_password_hash(user['password'], data['current_password']):
            return jsonify({"error": "Current password is incorrect"}), 400
        
        # Update password
        new_password_hash = generate_password_hash(data['new_password'])
        
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": new_password_hash, "updated_at": datetime.utcnow()}}
        )
        
        return jsonify({"message": "Password changed successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500