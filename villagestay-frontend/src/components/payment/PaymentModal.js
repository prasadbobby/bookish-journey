'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  // Log booking data for debugging
  console.log('Payment Modal - Booking data:', booking);

  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI Payment',
      icon: DevicePhoneMobileIcon,
      description: 'Pay using Google Pay, PhonePe, Paytm'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: CreditCardIcon,
      description: 'Visa, Mastercard, RuPay'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: BanknotesIcon,
      description: 'All major banks supported'
    }
  ];

const handlePayment = async () => {
  // Validate payment details based on method
  if (selectedMethod === 'upi' && !upiId.trim()) {
    toast.error('Please enter your UPI ID');
    return;
  }
  
  if (selectedMethod === 'card') {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
      toast.error('Please fill all card details');
      return;
    }
  }

  setProcessing(true);
  
  // Simulate payment processing
  try {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock payment success (90% success rate)
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      toast.success('Payment successful!');
      
      // Pass payment details back to parent
      const paymentDetails = {
        method: selectedMethod,
        signature: `mock_signature_${Date.now()}`,
        transaction_id: `txn_${Date.now()}`,
        upi_id: selectedMethod === 'upi' ? upiId : null,
        card_last_four: selectedMethod === 'card' ? cardDetails.number.slice(-4) : null
      };
      
      onSuccess(paymentDetails);
    } else {
      toast.error('Payment failed. Please try again.');
    }
  } catch (error) {
    toast.error('Payment processing error');
  } finally {
    setProcessing(false);
  }
};

  // Ensure we have the booking amount
  const totalAmount = booking?.total_amount || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Complete Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

       {/* Booking Summary */}
<div className="p-6 bg-gray-50">
  <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span>{booking.listing_type === 'experience' ? 'Experience:' : 'Property:'}</span>
      <span className="font-medium">{booking.listing_title || 'Village Stay'}</span>
    </div>
    
    {booking.listing_type === 'experience' ? (
      <>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{booking.experience_date}</span>
        </div>
        <div className="flex justify-between">
          <span>Time:</span>
          <span>{booking.experience_time}</span>
        </div>
        <div className="flex justify-between">
          <span>Participants:</span>
          <span>{booking.participants}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration:</span>
          <span>{booking.duration} hours</span>
        </div>
      </>
    ) : (
      <>
        <div className="flex justify-between">
          <span>Dates:</span>
          <span>{booking.check_in} to {booking.check_out}</span>
        </div>
        <div className="flex justify-between">
          <span>Guests:</span>
          <span>{booking.guests}</span>
        </div>
        <div className="flex justify-between">
          <span>Nights:</span>
          <span>{booking.nights}</span>
        </div>
      </>
    )}
    
    {/* Detailed breakdown */}
    {booking.base_amount && (
      <>
        <div className="flex justify-between">
          <span>Base Amount:</span>
          <span>{formatCurrency(booking.base_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Platform Fee:</span>
          <span>{formatCurrency(booking.platform_fee || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Community Fund:</span>
          <span>{formatCurrency(booking.community_contribution || 0)}</span>
        </div>
      </>
    )}
    
    <div className="border-t pt-2 mt-2">
      <div className="flex justify-between font-semibold text-lg">
        <span>Total Amount:</span>
        <span className="text-green-600">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  </div>
</div>

        {/* Rest of the component remains the same... */}
        {/* Payment Methods */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Select Payment Method</h3>
          
          <div className="space-y-3 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full p-4 border-2 rounded-xl transition-colors text-left ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <method.icon className="w-6 h-6 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{method.name}</h4>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                  {selectedMethod === method.id && (
                    <CheckCircleIcon className="w-5 h-5 text-green-500 ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Payment Details Form */}
          {selectedMethod === 'upi' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                placeholder="yourname@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="input-field"
              />
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
                  className="input-field"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Bank
              </label>
              <select className="input-field">
                <option>State Bank of India</option>
                <option>HDFC Bank</option>
                <option>ICICI Bank</option>
                <option>Axis Bank</option>
                <option>Punjab National Bank</option>
              </select>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={processing || totalAmount === 0}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="spinner mr-3"></div>
                Processing Payment...
              </div>
            ) : (
              `Pay ${formatCurrency(totalAmount)}`
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Your payment is secured with 256-bit SSL encryption
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentModal;