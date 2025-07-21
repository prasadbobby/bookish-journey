from datetime import datetime
from bson import ObjectId

class User:
    def __init__(self, email, password, full_name, user_type, phone=None, address=None):
        self.email = email
        self.password = password
        self.full_name = full_name
        self.user_type = user_type  # 'tourist', 'host', 'admin'
        self.phone = phone
        self.address = address
        self.created_at = datetime.utcnow()
        self.is_verified = False
        self.profile_image = None
        self.preferred_language = 'en'

class Listing:
    def __init__(self, host_id, title, description, location, price_per_night, property_type, amenities, images, coordinates):
        self.host_id = host_id
        self.title = title
        self.description = description
        self.location = location
        self.price_per_night = price_per_night
        self.property_type = property_type  # 'homestay', 'farmstay', 'village_house', 'eco_lodge'
        self.amenities = amenities
        self.images = images
        self.coordinates = coordinates  # {'lat': float, 'lng': float}
        self.created_at = datetime.utcnow()
        self.is_active = True
        self.is_approved = False
        self.availability_calendar = {}
        self.max_guests = 4
        self.house_rules = []
        self.experiences = []
        self.sustainability_features = []
        self.rating = 0.0
        self.review_count = 0
        self.ai_generated_content = {}

class Booking:
    def __init__(self, listing_id, tourist_id, host_id, check_in, check_out, guests, total_amount):
        self.listing_id = listing_id
        self.tourist_id = tourist_id
        self.host_id = host_id
        self.check_in = check_in
        self.check_out = check_out
        self.guests = guests
        self.total_amount = total_amount
        self.created_at = datetime.utcnow()
        self.status = 'pending'  # 'pending', 'confirmed', 'cancelled', 'completed'
        self.payment_status = 'unpaid'  # 'unpaid', 'paid', 'refunded'
        self.payment_id = None
        self.special_requests = ""
        self.host_earnings = 0.0
        self.platform_fee = 0.0
        self.community_contribution = 0.0

class Review:
    def __init__(self, booking_id, reviewer_id, reviewee_id, rating, comment, review_type):
        self.booking_id = booking_id
        self.reviewer_id = reviewer_id
        self.reviewee_id = reviewee_id
        self.rating = rating
        self.comment = comment
        self.review_type = review_type  # 'host_to_tourist', 'tourist_to_host'
        self.created_at = datetime.utcnow()
        self.is_verified = False

class Experience:
    def __init__(self, host_id, listing_id, title, description, duration, price, category, max_participants):
        self.host_id = host_id
        self.listing_id = listing_id
        self.title = title
        self.description = description
        self.duration = duration  # in hours
        self.price = price
        self.category = category  # 'cultural', 'adventure', 'culinary', 'spiritual', 'farming'
        self.max_participants = max_participants
        self.created_at = datetime.utcnow()
        self.is_active = True
        self.images = []
        self.inclusions = []
        self.requirements = []