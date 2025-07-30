# mcp_server_auto_caller_detection.py
import asyncio
import json
import ssl
from datetime import datetime
import random
from pymongo import MongoClient
from bson import ObjectId
from starlette.applications import Starlette
from starlette.responses import Response, JSONResponse
from starlette.routing import Route
from starlette.requests import Request
import uvicorn

# Configuration
MONGO_URL = "mongodb+srv://bobby:<db_password>@cluster0.nvavp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "villagestay"

# Store current call session info
current_call_session = {}

# MongoDB connection
try:
    client = MongoClient(MONGO_URL, tls=True, tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    count = db.listings.count_documents({})
    print(f"✅ MongoDB connected: {count} listings")
except Exception as e:
    print(f"❌ MongoDB error: {e}")
    db = None

def generate_booking_reference():
    now = datetime.now()
    return f"VS{now.year}{str(now.month).zfill(2)}{str(now.day).zfill(2)}{random.randint(1000, 9999)}"

def calculate_pricing(base_amount, nights):
    total_base = base_amount * nights
    platform_fee = round(total_base * 0.05)
    community_contribution = round(total_base * 0.02)
    host_earnings = total_base - platform_fee - community_contribution
    total_amount = total_base + platform_fee + community_contribution
    
    return {
        "base_amount": total_base,
        "platform_fee": platform_fee,
        "community_contribution": community_contribution,
        "host_earnings": host_earnings,
        "total_amount": total_base + platform_fee + community_contribution
    }

def find_user_by_phone(phone):
    """Find user by phone number with multiple format matching"""
    if not phone:
        return None
    
    # Clean phone number
    clean_phone = phone.replace('+91', '').replace('+', '').replace(' ', '').replace('-', '')
    
    # Try different phone number formats
    phone_patterns = [
        phone,  # Original format
        f"+91{clean_phone}",  # With +91
        f"91{clean_phone}",   # With 91 prefix
        clean_phone,  # Without country code
        f"+{clean_phone}",  # With + but no country code
    ]
    
    print(f"🔍 Searching for user with phone patterns: {phone_patterns}")
    
    for pattern in phone_patterns:
        user = db.users.find_one({"phone": pattern})
        if user:
            print(f"👤 Found user: {user['full_name']} with phone: {user['phone']}")
            return user
    
    print(f"❌ No user found for phone: {phone}")
    return None

# Store call context endpoint (called by ElevenLabs when call starts)
async def store_call_context(request):
    """Store the calling number for this session"""
    try:
        data = await request.json()
        caller_number = data.get('to_number')  # The number being called to
        call_id = data.get('call_id', 'default')
        
        if caller_number:
            # Find user by the number being called
            user = find_user_by_phone(caller_number)
            if user:
                current_call_session[call_id] = {
                    'user': user,
                    'caller_number': caller_number
                }
                print(f"📞 Call session stored for {user['full_name']} ({caller_number})")
        
        return JSONResponse({"status": "success"})
    except Exception as e:
        print(f"❌ Error storing call context: {e}")
        return JSONResponse({"status": "error"})

# MCP Protocol Handler
async def handle_mcp_request(request: Request):
    """Handle MCP JSON-RPC requests"""
    try:
        body = await request.body()
        if not body:
            return JSONResponse({
                "jsonrpc": "2.0",
                "error": {"code": -32700, "message": "Parse error"}
            }, status_code=400)
        
        try:
            message = json.loads(body)
        except json.JSONDecodeError:
            return JSONResponse({
                "jsonrpc": "2.0", 
                "error": {"code": -32700, "message": "Parse error"}
            }, status_code=400)
        
        print(f"📨 MCP Request: {message}")
        
        method = message.get("method")
        msg_id = message.get("id")
        params = message.get("params", {})
        
        if method == "initialize":
            response = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {"listChanged": False}
                    },
                    "serverInfo": {
                        "name": "villagestay-mcp",
                        "version": "1.0.0"
                    }
                }
            }
            
        elif method == "tools/list":
            tools = [
                {
                    "name": "get_caller_info",
                    "description": "Get current caller information automatically",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "search_experiences_by_location",
                    "description": "Search rural tourism experiences by Indian location",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "Location to search (e.g., Goa, Kerala, Rajasthan)"
                            }
                        },
                        "required": ["location"]
                    }
                },
                {
                    "name": "search_experience_by_title",
                    "description": "Find experience by title",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Experience title or partial name"
                            }
                        },
                        "required": ["title"]
                    }
                },
                {
                    "name": "create_booking",
                    "description": "Create booking for the current caller",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "listing_id": {"type": "string", "description": "The listing ID to book"},
                            "check_in": {"type": "string", "description": "Check-in date in YYYY-MM-DD format"},
                            "check_out": {"type": "string", "description": "Check-out date in YYYY-MM-DD format"},
                            "guests": {"type": "integer", "description": "Number of guests"},
                            "special_requests": {"type": "string", "description": "Any special requests"}
                        },
                        "required": ["listing_id", "check_in", "check_out", "guests"]
                    }
                },
                {
                    "name": "get_caller_bookings",
                    "description": "Get previous bookings for the current caller",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            ]
            
            response = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {"tools": tools}
            }
            
        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            print(f"🔧 Tool called: {tool_name}")
            print(f"📋 Arguments: {arguments}")
            
            if tool_name == "get_caller_info":
                result = await get_caller_info(arguments)
            elif tool_name == "search_experiences_by_location":
                result = await search_experiences_by_location(arguments)
            elif tool_name == "search_experience_by_title":
                result = await search_experience_by_title(arguments)
            elif tool_name == "create_booking":
                result = await create_booking(arguments)
            elif tool_name == "get_caller_bookings":
                result = await get_caller_bookings(arguments)
            else:
                result = {"content": [{"type": "text", "text": "Unknown tool"}]}
            
            response = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": result
            }
            
        elif method == "notifications/initialized":
            response = {"jsonrpc": "2.0", "id": msg_id, "result": {}}
            
        else:
            response = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            }
        
        print(f"📤 MCP Response: {response}")
        return JSONResponse(response)
        
    except Exception as e:
        print(f"❌ MCP error: {e}")
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": message.get("id") if 'message' in locals() else None,
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"}
        }, status_code=500)

async def get_caller_info(arguments):
    """Get caller information automatically - no phone number needed"""
    # For now, we'll use a default number since we need ElevenLabs integration
    # In production, this would come from the call context
    default_number = "+916300807459"  # Your number for testing
    
    user = find_user_by_phone(default_number)
    
    if user:
        # Store user in session for other tools to use
        current_call_session['current_user'] = user
        
        # Get user's booking history count
        booking_count = db.bookings.count_documents({"tourist_id": user['_id']})
        
        response_text = f"Hello {user['full_name']}! 🙏\n\n"
        
        if booking_count > 0:
            response_text += f"Welcome back! I see you have {booking_count} booking{'s' if booking_count > 1 else ''} with us. "
            response_text += "Would you like to make a new booking or check your existing ones?\n\n"
        else:
            response_text += "Welcome to VillageStay! I'm excited to help you make your first booking with us!\n\n"
        
        response_text += "I can help you discover amazing rural experiences across India. What destination interests you today?"
        
        return {"content": [{"type": "text", "text": response_text}]}
    else:
        response_text = "Welcome to VillageStay! I'd love to help you discover rural experiences, but I couldn't find your account. "
        response_text += "You might need to register first. Would you like help with that?"
        
        return {"content": [{"type": "text", "text": response_text}]}

async def search_experiences_by_location(arguments):
    """Search experiences by location"""
    location = arguments.get("location", "").strip()
    if not location:
        return {"content": [{"type": "text", "text": "Please tell me which location you're interested in."}]}
    
    # Search with variations
    variations = [location]
    if location.lower() == 'goa':
        variations.extend(['goan', 'goanese'])
    elif location.lower() == 'kerala':
        variations.extend(['kochi', 'munnar', 'alleppey'])
    elif location.lower() == 'rajasthan':
        variations.extend(['rajasthani', 'jaipur', 'udaipur'])
    
    patterns = []
    for var in variations:
        patterns.extend([
            {"location": {"$regex": var, "$options": "i"}},
            {"title": {"$regex": var, "$options": "i"}},
            {"description": {"$regex": var, "$options": "i"}}
        ])
    
    query = {"$and": [{"$or": patterns}, {"is_active": {"$ne": False}}]}
    listings = list(db.listings.find(query).limit(5))
    
    print(f"📋 Found {len(listings)} listings for {location}")
    
    if not listings:
        return {"content": [{"type": "text", "text": f"I couldn't find any experiences in {location} right now. Would you like me to suggest experiences in other popular destinations like Goa, Kerala, or Rajasthan?"}]}
    
    response_text = f"Perfect! I found {len(listings)} amazing experiences in {location}:\n\n"
    for i, listing in enumerate(listings, 1):
        response_text += f"{i}. **{listing['title']}**\n"
        response_text += f"   💰 ₹{listing.get('price_per_night', 0)} per night\n"
        response_text += f"   👥 Up to {listing.get('max_guests', 2)} guests\n"
        response_text += f"   🆔 ID: {str(listing['_id'])}\n\n"
    
    response_text += "Which of these experiences interests you? I can help you book any of them!"
    return {"content": [{"type": "text", "text": response_text}]}

async def search_experience_by_title(arguments):
    """Search experience by title"""
    title = arguments.get("title", "").strip()
    if not title:
        return {"content": [{"type": "text", "text": "Please tell me the name of the experience you're looking for."}]}
    
    query = {"$and": [{"title": {"$regex": title, "$options": "i"}}, {"is_active": {"$ne": False}}]}
    listings = list(db.listings.find(query).limit(1))
    
    if not listings:
        return {"content": [{"type": "text", "text": f"I couldn't find an experience called '{title}'. Could you try a different name or search by location?"}]}
    
    listing = listings[0]
    response_text = f"Great! I found **{listing['title']}**\n\n"
    response_text += f"📍 **Location:** {listing.get('location')}\n"
    response_text += f"💰 **Price:** ₹{listing.get('price_per_night', 0)} per night\n"
    response_text += f"👥 **Max guests:** {listing.get('max_guests', 2)}\n"
    # response_text += f"🆔 **Listing ID:** {str(listing['_id'])}\n\n"
    
    if listing.get('description'):
        response_text += f"📝 **About:** {listing['description'][:150]}...\n\n"
    
    response_text += "Would you like to book this experience? I can help you with that right now!"
    
    return {"content": [{"type": "text", "text": response_text}]}

async def create_booking(arguments):
    """Create booking for the current caller (no phone number needed)"""
    listing_id = arguments.get("listing_id", "").strip()
    check_in_str = arguments.get("check_in", "").strip()
    check_out_str = arguments.get("check_out", "").strip()
    guests = arguments.get("guests", 1)
    special_requests = arguments.get("special_requests", "")
    
    # Get current user from session
    user = current_call_session.get('current_user')
    if not user:
        # Fallback - try to find user by default number
        user = find_user_by_phone("+916300807459")
    
    if not user:
        return {"content": [{"type": "text", "text": "I need to identify your account first. Could you please tell me your registered email or phone number?"}]}
    
    print(f"👤 Creating booking for user: {user['full_name']}")
    
    # Validate required fields
    missing = []
    if not listing_id: missing.append("listing ID")
    if not check_in_str: missing.append("check-in date")
    if not check_out_str: missing.append("check-out date")
    
    if missing:
        return {"content": [{"type": "text", "text": f"I need a few more details: {', '.join(missing)}. Could you provide those?"}]}
    
    # Get listing
    try:
        listing = db.listings.find_one({"_id": ObjectId(listing_id)})
    except:
        listing = db.listings.find_one({"title": {"$regex": listing_id, "$options": "i"}})
    
    if not listing:
        return {"content": [{"type": "text", "text": "I couldn't find that experience. Could you provide the correct listing ID?"}]}
    
    # Parse dates
    try:
        check_in = datetime.strptime(check_in_str, '%Y-%m-%d')
        check_out = datetime.strptime(check_out_str, '%Y-%m-%d')
    except ValueError:
        return {"content": [{"type": "text", "text": "Please provide dates in YYYY-MM-DD format, like 2025-08-15."}]}
    
    nights = (check_out - check_in).days
    if nights <= 0:
        return {"content": [{"type": "text", "text": "Check-out date should be after check-in date. Could you correct that?"}]}
    
    # Create booking
    pricing = calculate_pricing(listing['price_per_night'], nights)
    booking_ref = generate_booking_reference()
    
    booking = {
        "listing_id": listing['_id'],
        "tourist_id": user['_id'],  # Automatically link to user account
        "host_id": listing.get('host_id'),
        "tourist_name": user['full_name'],  # Use user's name from account
        "tourist_phone": user['phone'],  # Use user's phone from account
        "check_in": check_in,
        "check_out": check_out,
        "guests": int(guests),
        "nights": nights,
        "base_amount": pricing['base_amount'],
        "platform_fee": pricing['platform_fee'],
        "community_contribution": pricing['community_contribution'],
        "host_earnings": pricing['host_earnings'],
        "total_amount": pricing['total_amount'],
        "special_requests": special_requests,
        "booking_reference": booking_ref,
        "status": "confirmed",
        "payment_status": "pending",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    # Save to MongoDB
    result = db.bookings.insert_one(booking)
    print(f"✅ Booking created: {booking_ref} for {user['full_name']}")
    
    response_text = f"🎉 Perfect, {user['full_name']}! Your booking is confirmed!\n\n"
    response_text += f"📋 **Booking Reference:** {booking_ref}\n"
    response_text += f"🏠 **Experience:** {listing['title']}\n"
    response_text += f"📅 **Dates:** {check_in.strftime('%B %d')} to {check_out.strftime('%B %d, %Y')}\n"
    response_text += f"👥 **Guests:** {guests} for {nights} night{'s' if nights > 1 else ''}\n"
    response_text += f"💰 **Total:** ₹{pricing['total_amount']}\n\n"
    
    response_text += f"Your booking is saved to your account! Payment details will be sent to {user['phone']}. Thank you, {user['full_name']}!"
    
    return {"content": [{"type": "text", "text": response_text}]}

async def get_caller_bookings(arguments):
    """Get caller's previous bookings"""
    user = current_call_session.get('current_user')
    if not user:
        user = find_user_by_phone("+916300807459")
    
    if not user:
        return {"content": [{"type": "text", "text": "I need to identify your account first to show your bookings."}]}
    
    bookings = list(db.bookings.find({"tourist_id": user['_id']}).sort("created_at", -1).limit(5))
    
    if not bookings:
        return {"content": [{"type": "text", "text": f"Hi {user['full_name']}! You don't have any bookings yet. Would you like to make your first booking?"}]}
    
    response_text = f"Here are your recent bookings, {user['full_name']}:\n\n"
    
    for i, booking in enumerate(bookings, 1):
        listing = db.listings.find_one({"_id": booking['listing_id']})
        listing_title = listing['title'] if listing else "Experience"
        
        check_in = booking['check_in'].strftime('%B %d, %Y')
        status = booking.get('status', 'unknown')
        
        response_text += f"{i}. **{listing_title}**\n"
        response_text += f"   📅 {check_in} | ₹{booking['total_amount']} | {status}\n"
        response_text += f"   📋 {booking['booking_reference']}\n\n"
    
    response_text += "Would you like to make a new booking?"
    
    return {"content": [{"type": "text", "text": response_text}]}

# Health check endpoint
async def health_check(request):
    """Health check"""
    try:
        listings_count = db.listings.count_documents({})
        users_count = db.users.count_documents({})
        bookings_count = db.bookings.count_documents({})
        return JSONResponse({
            "status": "healthy",
            "listings": listings_count,
            "users": users_count,
            "bookings": bookings_count,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return JSONResponse({
            "status": "unhealthy",
            "error": str(e)
        }, status_code=500)

# Routes
routes = [
    Route("/", handle_mcp_request, methods=["POST"]),
    Route("/mcp", handle_mcp_request, methods=["POST"]),
    Route("/health", health_check, methods=["GET"]),
    Route("/call-context", store_call_context, methods=["POST"]),
]

app = Starlette(routes=routes)

if __name__ == "__main__":
    print("🚀 VillageStay MCP Server with Auto Caller Detection Starting...")
    print("🔗 MCP Endpoint: / and /mcp")
    print("📞 Auto-detects caller, no phone number input needed")
    uvicorn.run(app, host="0.0.0.0", port=8000)