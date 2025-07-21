from flask_pymongo import PyMongo

mongo = PyMongo()

def init_db(app):
    """Initialize database with app"""
    mongo.init_app(app)
    return mongo