import uuid
import random
from datetime import datetime

def create_payment(amount, description, booking_id):
    """Create payment (mock implementation)"""
    
    # Generate mock payment ID
    payment_id = f"pay_{uuid.uuid4().hex[:16]}"
    
    # Mock payment gateway response
    payment_data = {
        "payment_id": payment_id,
        "amount": amount,
        "currency": "INR",
        "description": description,
        "booking_id": booking_id,
        "status": "created",
        "payment_url": f"https://mock-payment-gateway.com/pay/{payment_id}",
        "created_at": datetime.utcnow().isoformat()
    }
    
    return payment_data

def verify_payment(payment_id, payment_signature, payment_method):
    """Verify payment (mock implementation)"""
    
    # Mock verification - in production, verify with actual payment gateway
    is_valid = random.choice([True, True, True, False])  # 75% success rate
    
    verification_result = {
        "success": is_valid,
        "payment_id": payment_id,
        "payment_method": payment_method or "upi",
        "verified_at": datetime.utcnow().isoformat()
    }
    
    if is_valid:
        verification_result["status"] = "verified"
        verification_result["transaction_id"] = f"txn_{uuid.uuid4().hex[:12]}"
    else:
        verification_result["status"] = "failed"
        verification_result["error"] = "Payment verification failed"
    
    return verification_result

def process_refund(payment_id, refund_amount):
    """Process refund (mock implementation)"""
    
    # Generate mock refund ID
    refund_id = f"refund_{uuid.uuid4().hex[:16]}"
    
    # Mock refund processing
    refund_data = {
        "refund_id": refund_id,
        "payment_id": payment_id,
        "amount": refund_amount,
        "status": "processed",
        "processed_at": datetime.utcnow().isoformat(),
        "estimated_arrival": "3-5 business days"
    }
    
    return refund_data

def release_host_earnings(host_id, amount):
    """Release earnings to host (mock implementation)"""
    
    # Generate mock transfer ID
    transfer_id = f"transfer_{uuid.uuid4().hex[:16]}"
    
    # Mock transfer processing
    transfer_data = {
        "transfer_id": transfer_id,
        "host_id": host_id,
        "amount": amount,
        "status": "processed",
        "processed_at": datetime.utcnow().isoformat(),
        "account_credited": True
    }
    
    return transfer_data

def calculate_platform_fee(amount):
    """Calculate platform fee"""
    # 5% platform fee
    return amount * 0.05

def calculate_community_contribution(amount):
    """Calculate community fund contribution"""
    # 2% community contribution
    return amount * 0.02

def generate_invoice_data(booking):
    """Generate invoice data for booking"""
    
    invoice_data = {
        "invoice_number": f"INV-{booking['booking_reference']}",
        "booking_reference": booking['booking_reference'],
        "issue_date": datetime.utcnow().strftime('%Y-%m-%d'),
        "amount_breakdown": {
            "base_amount": booking['base_amount'],
            "platform_fee": booking['platform_fee'],
            "total_amount": booking['total_amount']
        },
        "payment_status": booking['payment_status'],
        "guest_details": {
            "check_in": booking['check_in'].strftime('%Y-%m-%d'),
            "check_out": booking['check_out'].strftime('%Y-%m-%d'),
            "guests": booking['guests'],
            "nights": booking['nights']
        }
    }
    
    return invoice_data

def validate_payment_amount(amount):
    """Validate payment amount"""
    
    if not isinstance(amount, (int, float)):
        return False, "Amount must be a number"
    
    if amount <= 0:
        return False, "Amount must be greater than 0"
    
    if amount > 100000:  # Max ₹1,00,000
        return False, "Amount exceeds maximum limit"
    
    return True, "Valid amount"

def format_currency(amount, currency="INR"):
    """Format currency for display"""
    
    if currency == "INR":
        return f"₹{amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"

def calculate_taxes(amount, tax_rate=0.18):
    """Calculate taxes (GST)"""
    
    return {
        "base_amount": amount,
        "tax_amount": amount * tax_rate,
        "total_with_tax": amount * (1 + tax_rate),
        "tax_rate": tax_rate * 100
    }

def mock_payment_webhook(payment_id, status):
    """Mock payment webhook handler"""
    
    webhook_data = {
        "event": "payment.status_changed",
        "payment_id": payment_id,
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
        "signature": f"webhook_sig_{uuid.uuid4().hex[:16]}"
    }
    
    return webhook_data