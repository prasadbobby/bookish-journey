from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
from database import mongo, init_db
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    init_db(app)
    jwt = JWTManager(app)
    CORS(app)

    # Create upload directory
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.listings import listings_bp
    from routes.bookings import bookings_bp
    from routes.ai_assistant import ai_bp
    from routes.admin import admin_bp
    from routes.impact import impact_bp
    from routes.ai_features import ai_features_bp  # New AI features

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(listings_bp, url_prefix='/api/listings')
    app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(impact_bp, url_prefix='/api/impact')
    app.register_blueprint(ai_features_bp, url_prefix='/api/ai-features')  # New routes

    @app.route('/')
    def health_check():
        return jsonify({
            "message": "VillageStay AI-Powered API is running!", 
            "status": "healthy",
            "ai_features": [
                "AI Village Story Generator",
                "Voice-to-Listing Magic", 
                "Cultural Concierge Chat",
                "Property Image Analysis"
            ]
        })

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)