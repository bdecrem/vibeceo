'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Verify session from previous step
    const token = sessionStorage.getItem('payment_session');
    const phone = sessionStorage.getItem('payment_phone');
    
    if (!token || !phone) {
      router.push('/payments');
      return;
    }
    
    setSessionToken(token);
    setPhoneNumber(phone);
  }, [router]);

  const formatPhoneForDisplay = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: sessionToken,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to LemonSqueezy checkout
      window.location.href = data.checkout_url;

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              💳 Purchase Credits
            </h1>
            <p className="text-gray-300">
              Ready to buy $10 of WEBTOYS credits
            </p>
            <p className="text-white font-semibold mt-2">
              📱 {formatPhoneForDisplay(phoneNumber)}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">📦 Credit Bundle</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Credits</span>
                <span className="text-white font-semibold">$10 bundle</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Usage</span>
                <span className="text-white">1 credit = 1 app</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Delivery</span>
                <span className="text-white">Instant via SMS</span>
              </div>
              
              <div className="border-t border-white/20 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-2xl font-bold text-green-400">$10.00</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full py-4 px-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold text-lg rounded-lg hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Checkout...
              </span>
            ) : (
              <>🚀 Purchase $10 Credits</>
            )}
          </button>

          <div className="mt-6 text-center text-xs text-gray-400">
            <p>Secure payment powered by LemonSqueezy</p>
            <p className="mt-1">No recurring charges • Pay as you go</p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <button
              onClick={() => router.push('/payments')}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              ← Start Over
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            🔐 Your phone is verified and ready for SMS app creation
          </p>
        </div>
      </div>
    </div>
  );
}