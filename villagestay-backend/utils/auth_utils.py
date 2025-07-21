import random
import string
from config import Config
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from database import mongo
from bson import ObjectId

def require_user_type(*allowed_types):
    """Decorator to require specific user types"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            
            user_id = get_jwt_identity()
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            if user['user_type'] not in allowed_types:
                return jsonify({
                    "error": f"Access denied. Required user type: {' or '.join(allowed_types)}"
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user or user['user_type'] != 'admin':
            return jsonify({"error": "Admin privileges required"}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def require_host(f):
    """Decorator to require host privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user or user['user_type'] != 'host':
            return jsonify({"error": "Host account required"}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def generate_otp(length=6):
    """Generate random OTP"""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email, otp):
    """Send OTP via email (mock implementation)"""
    # Mock email sending for development
    print(f"=== EMAIL NOTIFICATION ===")
    print(f"To: {email}")
    print(f"Subject: VillageStay - Email Verification")
    print(f"OTP: {otp}")
    print(f"This code will expire in 10 minutes.")
    print(f"========================")
    return True

def send_email_notification(to_email, subject, body):
    """Send email notification (mock implementation)"""
    print(f"=== EMAIL NOTIFICATION ===")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print(f"========================")
    return True

def validate_phone_number(phone):
    """Validate Indian phone number format"""
    import re
    
    # Remove spaces and special characters
    phone = re.sub(r'[^\d+]', '', phone)
    
    # Check Indian phone number patterns
    patterns = [
        r'^\+91[6-9]\d{9}$',  # +91 followed by 10 digits starting with 6-9
        r'^91[6-9]\d{9}$',    # 91 followed by 10 digits starting with 6-9
        r'^[6-9]\d{9}$'       # 10 digits starting with 6-9
    ]
    
    for pattern in patterns:
        if re.match(pattern, phone):
            return True
    
    return False

def hash_password(password):
    """Hash password with salt"""
    from werkzeug.security import generate_password_hash
    return generate_password_hash(password)

def verify_password(password, password_hash):
    """Verify password against hash"""
    from werkzeug.security import check_password_hash
    return check_password_hash(password_hash, password)

def generate_secure_token(length=32):
    """Generate secure random token"""
    import secrets
    return secrets.token_urlsafe(length)

def validate_password_strength(password):
    """Validate password strength"""
    import re
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    return True, "Password is strong"

def sanitize_input(text):
    """Sanitize user input to prevent XSS"""
    import html
    
    if not text:
        return text
    
    # Escape HTML characters
    sanitized = html.escape(str(text))
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&']
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized.strip()