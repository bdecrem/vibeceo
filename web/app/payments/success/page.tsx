'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const phone = sessionStorage.getItem('payment_phone');
    if (phone) {
      setPhoneNumber(phone);
    }

    // Check for success parameter from LemonSqueezy
    const success = searchParams?.get('success');
    const orderId = searchParams?.get('order_id');

    if (success === 'true' && orderId) {
      // Verify the payment was processed
      verifyPayment(orderId);
    } else {
      setError('Payment verification failed');
      setIsLoading(false);
    }
  }, [searchParams]);

  const verifyPayment = async (orderId: string) => {
    try {
      const response = await fetch('/api/payments/verify-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setCredits(data.credits);
      
      // Clear session storage
      sessionStorage.removeItem('payment_phone');
      sessionStorage.removeItem('payment_session');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneForDisplay = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-3 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Payment Issue</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => router.push('/payments')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
          <div className="text-6xl mb-6">🎉</div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-gray-300 mb-6">
            Your credits have been added to your account
          </p>

          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 mb-8">
            <div className="text-green-200 space-y-2">
              <p className="text-lg">
                📱 <strong>{formatPhoneForDisplay(phoneNumber)}</strong>
              </p>
              <p className="text-2xl font-bold">
                💰 ${credits} Credits Added
              </p>
              <p className="text-sm">
                Ready to create apps via SMS!
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-white/5 rounded-lg p-4 text-left">
              <h3 className="text-white font-semibold mb-2">🚀 How to use your credits:</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Text your app idea to your phone number</li>
                <li>• Each app creation uses 1 credit</li>
                <li>• Apps are instantly live at webtoys.ai</li>
                <li>• No subscription, just pay as you go</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.open('https://webtoys.ai', '_blank')}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              🌐 Visit WEBTOYS
            </button>
            
            <button
              onClick={() => router.push('/payments')}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
            >
              💳 Buy More Credits
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-gray-400 text-xs">
              Receipt sent via email • Questions? Text "HELP" to your number
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-3 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}