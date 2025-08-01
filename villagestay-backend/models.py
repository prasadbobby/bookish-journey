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
        self.listing_category = 'homestay'  # 'homestay' or 'experience'

class Experience:
    def __init__(self, host_id, title, description, location, price_per_person, category, duration, max_participants, images, coordinates):
        self.host_id = host_id
        self.title = title
        self.description = description
        self.location = location
        self.price_per_person = price_per_person
        self.category = category  # 'cultural', 'adventure', 'culinary', 'spiritual', 'farming', 'craft'
        self.duration = duration  # in hours
        self.max_participants = max_participants
        self.images = images
        self.coordinates = coordinates
        self.created_at = datetime.utcnow()
        self.is_active = True
        self.is_approved = False
        self.availability_schedule = {}  # Weekly schedule
        self.inclusions = []
        self.requirements = []
        self.difficulty_level = 'easy'  # 'easy', 'moderate', 'challenging'
        self.age_restrictions = {'min_age': 0, 'max_age': 100}
        self.cancellation_policy = 'flexible'
        self.rating = 0.0
        self.review_count = 0
        self.listing_category = 'experience'

class Booking:
    def __init__(self, listing_id, tourist_id, host_id, check_in, check_out, guests, total_amount, listing_type='homestay'):
        self.listing_id = listing_id
        self.tourist_id = tourist_id
        self.host_id = host_id
        self.check_in = check_in
        self.check_out = check_out
        self.guests = guests
        self.total_amount = total_amount
        self.listing_type = listing_type  # 'homestay' or 'experience'
        self.created_at = datetime.utcnow()
        self.status = 'pending'  # 'pending', 'confirmed', 'cancelled', 'completed'
        self.payment_status = 'unpaid'  # 'unpaid', 'paid', 'refunded'
        self.payment_id = None
        self.special_requests = ""
        self.host_earnings = 0.0
        self.platform_fee = 0.0
        self.community_contribution = 0.0
        # For experiences
        self.experience_date = None
        self.experience_time = None
        self.participants = guests  # Same as guests for experiences

class Review:
    def __init__(self, booking_id, listing_id, reviewer_id, reviewee_id, rating, comment, review_type, categories=None):
        self.booking_id = booking_id
        self.listing_id = listing_id
        self.reviewer_id = reviewer_id
        self.reviewee_id = reviewee_id
        self.rating = rating  # Overall rating 1-5
        self.comment = comment
        self.review_type = review_type  # 'tourist_to_host', 'host_to_tourist', 'tourist_to_listing'
        self.categories = categories or {}  # Category-specific ratings
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.is_verified = False
        self.helpful_votes = 0
        self.response = None
        self.response_date = None
        self.photos = []
        self.status = 'active'
        self.listing_type = 'homestay'  # 'homestay' or 'experience'