from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from database import mongo
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
            "otp_expires_at": datetime.utcnow() + timedelta(minutes=10),
            "created_via": "website"
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
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Check password - handle both werkzeug and bcrypt hashes
        password_valid = False
        password_source = "unknown"
        
        # Try werkzeug first (existing method for website users)
        if check_password_hash(user['password'], data['password']):
            password_valid = True
            password_source = "werkzeug"
            print(f"✅ Werkzeug password verified for user: {user['email']}")
        else:
            # Try bcrypt for WhatsApp bot created accounts
            try:
                import bcrypt
                if user['password'].startswith('$2b$') or user['password'].startswith('$2a$'):  
                    # bcrypt hash format
                    password_valid = bcrypt.checkpw(
                        data['password'].encode('utf-8'), 
                        user['password'].encode('utf-8')
                    )
                    password_source = "bcrypt"
                    
                    # If bcrypt password is valid, convert to werkzeug for consistency
                    if password_valid:
                        print(f"✅ Bcrypt password verified for user: {user['email']}")
                        print(f"🔄 Converting bcrypt password to werkzeug format...")
                        
                        new_hash = generate_password_hash(data['password'])
                        mongo.db.users.update_one(
                            {"_id": user['_id']},
                            {
                                "$set": {
                                    "password": new_hash, 
                                    "updated_at": datetime.utcnow(),
                                    "password_migrated_from": "bcrypt",
                                    "password_migrated_at": datetime.utcnow()
                                }
                            }
                        )
                        print(f"✅ Password migrated from bcrypt to werkzeug for user: {user['email']}")
                        password_source = "bcrypt_migrated"
                        
            except ImportError:
                print("⚠️ bcrypt not available - install with: pip install bcrypt")
            except Exception as bcrypt_error:
                print(f"❌ Bcrypt verification error: {bcrypt_error}")
        
        if not password_valid:
            print(f"❌ Password verification failed for user: {user['email']}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Create access token
        access_token = create_access_token(
            identity=str(user['_id']),
            expires_delta=timedelta(days=30)
        )
        
        # Update last login with additional info
        mongo.db.users.update_one(
            {"_id": user['_id']},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "last_login_method": password_source
                }
            }
        )
        
        print(f"✅ User logged in successfully: {user['email']} (method: {password_source})")
        
        return jsonify({
            "access_token": access_token,
            "user": {
                "id": str(user['_id']),
                "email": user['email'],
                "full_name": user['full_name'],
                "user_type": user['user_type'],
                "is_verified": user['is_verified'],
                "created_via": user.get('created_via', 'website'),
                "phone": user.get('phone'),
                "address": user.get('address')
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
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
                "$set": {"is_verified": True, "verified_at": datetime.utcnow()},
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
            "created_at": user['created_at'].isoformat(),
            "created_via": user.get('created_via', 'website'),
            "whatsapp_phone": user.get('whatsapp_phone'),
            "last_login": user.get('last_login').isoformat() if user.get('last_login') else None
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
        
        # Verify current password (handle both werkzeug and bcrypt)
        password_valid = False
        
        # Try werkzeug first
        if check_password_hash(user['password'], data['current_password']):
            password_valid = True
        else:
            # Try bcrypt
            try:
                import bcrypt
                if user['password'].startswith('$2b$') or user['password'].startswith('$2a$'):
                    password_valid = bcrypt.checkpw(
                        data['current_password'].encode('utf-8'), 
                        user['password'].encode('utf-8')
                    )
            except:
                pass
        
        if not password_valid:
            return jsonify({"error": "Current password is incorrect"}), 400
        
        # Update password (always use werkzeug for new passwords)
        new_password_hash = generate_password_hash(data['new_password'])
        
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password": new_password_hash, 
                    "updated_at": datetime.utcnow(),
                    "password_changed_at": datetime.utcnow()
                }
            }
        )
        
        return jsonify({"message": "Password changed successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({"error": "Email is required"}), 400
        
        # Find user
        user = mongo.db.users.find_one({"email": data['email']})
        
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({"message": "If email exists, password reset instructions have been sent"}), 200
        
        # Generate reset token
        reset_token = generate_otp(length=8)
        
        # Save reset token with expiry
        mongo.db.users.update_one(
            {"_id": user['_id']},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": datetime.utcnow() + timedelta(hours=1)
                }
            }
        )
        
        # Send reset email (mock implementation)
        send_password_reset_email(data['email'], reset_token)
        
        return jsonify({"message": "If email exists, password reset instructions have been sent"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('token') or not data.get('new_password'):
            return jsonify({"error": "Email, token, and new password are required"}), 400
        
        # Find user with valid reset token
        user = mongo.db.users.find_one({
            "email": data['email'],
            "password_reset_token": data['token'],
            "password_reset_expires": {"$gt": datetime.utcnow()}
        })
        
        if not user:
            return jsonify({"error": "Invalid or expired reset token"}), 400
        
        # Update password
        new_password_hash = generate_password_hash(data['new_password'])
        
        mongo.db.users.update_one(
            {"_id": user['_id']},
            {
                "$set": {
                    "password": new_password_hash,
                    "updated_at": datetime.utcnow(),
                    "password_reset_at": datetime.utcnow()
                },
                "$unset": {
                    "password_reset_token": "",
                    "password_reset_expires": ""
                }
            }
        )
        
        return jsonify({"message": "Password reset successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def send_password_reset_email(email, token):
    """Send password reset email (mock implementation)"""
    print(f"=== PASSWORD RESET EMAIL ===")
    print(f"To: {email}")
    print(f"Subject: VillageStay - Password Reset")
    print(f"Reset Token: {token}")
    print(f"This token will expire in 1 hour.")
    print(f"Use this token on the password reset page.")
    print(f"============================")
    return True