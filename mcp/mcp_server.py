# mcp_server_with_users.py
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
MONGO_URL = "mongodb+srv://<username>:<password>@cluster.mongodb.net/villagestay?retryWrites=true&w=majority"
DB_NAME = "villagestay"

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
    """Find user by phone number"""
    # Clean phone number (remove +91 prefix if present for matching)
    clean_phone = phone.replace('+91', '').replace('+', '')
    
    # Try different phone number formats
    phone_patterns = [
        phone,  # Original format
        f"+91{clean_phone}",  # With +91
        clean_phone,  # Without country code
        f"91{clean_phone}"  # With 91 prefix
    ]
    
    for pattern in phone_patterns:
        user = db.users.find_one({"phone": pattern})
        if user:
            return user
    
    return None

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
                    "name": "create_booking_with_phone",
                    "description": "Create booking using caller's phone number to identify user",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "listing_id": {"type": "string", "description": "The listing ID to book"},
                            "caller_phone": {"type": "string", "description": "The phone number of the person calling"},
                            "check_in": {"type": "string", "description": "Check-in date in YYYY-MM-DD format"},
                            "check_out": {"type": "string", "description": "Check-out date in YYYY-MM-DD format"},
                            "guests": {"type": "integer", "description": "Number of guests"},
                            "special_requests": {"type": "string", "description": "Any special requests"}
                        },
                        "required": ["listing_id", "caller_phone", "check_in", "check_out", "guests"]
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
            
            if tool_name == "search_experiences_by_location":
                result = await search_experiences_by_location(arguments)
            elif tool_name == "search_experience_by_title":
                result = await search_experience_by_title(arguments)
            elif tool_name == "create_booking_with_phone":
                result = await create_booking_with_phone(arguments)
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

async def search_experiences_by_location(arguments):
    """Search experiences by location"""
    location = arguments.get("location", "").strip()
    if not location:
        return {"content": [{"type": "text", "text": "Please specify a location to search."}]}
    
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
        return {"content": [{"type": "text", "text": f"No experiences found in {location}. Try Goa, Kerala, or Rajasthan."}]}
    
    response_text = f"Found {len(listings)} experiences in {location}:\n\n"
    for i, listing in enumerate(listings, 1):
        response_text += f"{i}. **{listing['title']}**\n"
        response_text += f"   💰 ₹{listing.get('price_per_night', 0)}/night\n"
        response_text += f"   👥 Max {listing.get('max_guests', 2)} guests\n"
        response_text += f"   🆔 ID: {str(listing['_id'])}\n\n"
    
    response_text += "Which one interests you? I can help you book it!"
    return {"content": [{"type": "text", "text": response_text}]}

async def search_experience_by_title(arguments):
    """Search experience by title"""
    title = arguments.get("title", "").strip()
    if not title:
        return {"content": [{"type": "text", "text": "Please provide the experience title."}]}
    
    query = {"$and": [{"title": {"$regex": title, "$options": "i"}}, {"is_active": {"$ne": False}}]}
    listings = list(db.listings.find(query).limit(1))
    
    if not listings:
        return {"content": [{"type": "text", "text": f"Couldn't find '{title}'. Try searching by location instead."}]}
    
    listing = listings[0]
    response_text = f"Found: **{listing['title']}**\n\n"
    response_text += f"📍 Location: {listing.get('location')}\n"
    response_text += f"💰 Price: ₹{listing.get('price_per_night', 0)}/night\n"
    response_text += f"👥 Max guests: {listing.get('max_guests', 2)}\n"
    response_text += f"🆔 ID: {str(listing['_id'])}\n\n"
    
    if listing.get('description'):
        response_text += f"📝 {listing['description']}\n\n"
    
    response_text += "Would you like to book this experience?"
    return {"content": [{"type": "text", "text": response_text}]}

async def create_booking_with_phone(arguments):
    """Create booking using caller's phone number"""
    listing_id = arguments.get("listing_id", "").strip()
    caller_phone = arguments.get("caller_phone", "").strip()
    check_in_str = arguments.get("check_in", "").strip()
    check_out_str = arguments.get("check_out", "").strip()
    guests = arguments.get("guests", 1)
    special_requests = arguments.get("special_requests", "")
    
    print(f"📞 Creating booking for phone: {caller_phone}")
    
    # Validate required fields
    missing = []
    if not listing_id: missing.append("listing ID")
    if not caller_phone: missing.append("phone number")
    if not check_in_str: missing.append("check-in date")
    if not check_out_str: missing.append("check-out date")
    
    if missing:
        return {"content": [{"type": "text", "text": f"Missing: {', '.join(missing)}. Please provide these details."}]}
    
    # Find user by phone number
    user = find_user_by_phone(caller_phone)
    if not user:
        return {"content": [{"type": "text", "text": f"I couldn't find your account with phone number {caller_phone}. Please make sure you're registered with VillageStay or contact support."}]}
    
    print(f"👤 Found user: {user['full_name']} ({user['email']})")
    
    # Get listing
    try:
        listing = db.listings.find_one({"_id": ObjectId(listing_id)})
    except:
        listing = db.listings.find_one({"title": {"$regex": listing_id, "$options": "i"}})
    
    if not listing:
        return {"content": [{"type": "text", "text": "Experience not found."}]}
    
    # Parse dates
    try:
        check_in = datetime.strptime(check_in_str, '%Y-%m-%d')
        check_out = datetime.strptime(check_out_str, '%Y-%m-%d')
    except ValueError:
        return {"content": [{"type": "text", "text": "Use YYYY-MM-DD format for dates (e.g., 2025-08-15)."}]}
    
    nights = (check_out - check_in).days
    if nights <= 0:
        return {"content": [{"type": "text", "text": "Check-out must be after check-in."}]}
    
    # Create booking with user information
    pricing = calculate_pricing(listing['price_per_night'], nights)
    booking_ref = generate_booking_reference()
    
    booking = {
        "listing_id": listing['_id'],
        "tourist_id": user['_id'],  # Link to user account
        "host_id": listing.get('host_id'),
        "tourist_name": user['full_name'],  # Use user's full name
        "tourist_phone": user['phone'],  # Use user's registered phone
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
    print(f"✅ Booking created: {booking_ref} for user: {user['full_name']}")
    
    response_text = f"🎉 Booking confirmed, {user['full_name']}!\n\n"
    response_text += f"📋 **Booking Reference:** {booking_ref}\n"
    response_text += f"🏠 **Experience:** {listing['title']}\n"
    response_text += f"📍 **Location:** {listing.get('location')}\n"
    response_text += f"📅 **Check-in:** {check_in.strftime('%B %d, %Y')}\n"
    response_text += f"📅 **Check-out:** {check_out.strftime('%B %d, %Y')}\n"
    response_text += f"👥 **Guests:** {guests} for {nights} nights\n"
    response_text += f"💰 **Total Amount:** ₹{pricing['total_amount']}\n\n"
    
    if special_requests:
        response_text += f"📝 **Special Requests:** {special_requests}\n\n"
    
    response_text += f"Your booking is saved to your account and you can view it in your bookings section. Payment details will be sent to {user['phone']}. Thank you for choosing VillageStay!"
    
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

# API endpoint to get user bookings
async def get_user_bookings(request):
    """Get bookings for a specific user"""
    try:
        user_id = request.path_params.get('user_id')
        
        # Find bookings for this user
        bookings = list(db.bookings.find({"tourist_id": ObjectId(user_id)}).sort("created_at", -1))
        
        # Convert ObjectIds to strings and get listing details
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
            booking['listing_id'] = str(booking['listing_id'])
            booking['tourist_id'] = str(booking['tourist_id'])
            if 'host_id' in booking:
                booking['host_id'] = str(booking['host_id'])
            
            # Get listing details
            listing = db.listings.find_one({"_id": ObjectId(booking['listing_id'])})
            if listing:
                booking['listing_title'] = listing['title']
                booking['listing_location'] = listing.get('location')
        
        return JSONResponse({
            "success": True,
            "bookings": bookings,
            "count": len(bookings)
        })
        
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# Routes
routes = [
    Route("/", handle_mcp_request, methods=["POST"]),
    Route("/mcp", handle_mcp_request, methods=["POST"]),
    Route("/health", health_check, methods=["GET"]),
    Route("/api/user/{user_id}/bookings", get_user_bookings, methods=["GET"]),
]

app = Starlette(routes=routes)

if __name__ == "__main__":
    print("🚀 VillageStay MCP User-Integrated Server Starting...")
    print("🔗 MCP Endpoint: / and /mcp")
    print("🏥 Health Check: /health")
    print("👤 User Bookings: /api/user/{user_id}/bookings")
    uvicorn.run(app, host="0.0.0.0", port=8000)