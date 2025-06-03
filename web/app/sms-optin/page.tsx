'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SmsOptIn() {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !consent) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/sms-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone,
          consentGiven: consent
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to subscribe');
      }
      
      setIsSuccess(true);
    } catch (error) {
      console.error('Error subscribing:', error);
      alert(error instanceof Error ? error.message : 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e6f2f2] flex flex-col">
      {/* Header with logo */}
      <div className="w-full bg-[#1a9d8f] py-3">
        <div className="ml-2">
          <a href="/" className="inline-flex items-center">
            <img 
              src="/logo.png" 
              alt="Advisors Foundry Logo" 
              className="h-5 w-auto"
            />
            <span className="ml-2 text-base font-medium text-white">Advisors Foundry</span>
          </a>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-[#1a3d3d] rounded-xl shadow-md overflow-hidden"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-block mb-4"
              >
                <div className="w-40 h-16 relative">
                  <img
                    src="/logo.png"
                    alt="Advisors Foundry Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Get Daily Texts from AF
              </h1>
              <p className="text-teal-300">Startup wisdom. Spirals.</p>
            </div>

            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">You're In!</h3>
                <p className="text-gray-300">Check your phone for a confirmation message.</p>
              </motion.div>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-200 mb-4">
                      Want a daily dose of unhinged startup insight?
                    </h2>
                    <p className="text-gray-300">
                      Sign up for texts from Advisors Foundry and get a one-line banger every morning — from your favorite algorithmic startup coaches.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                      Your Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="consent"
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="h-4 w-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="consent" className="text-gray-400">
                        I agree to receive daily SMS messages from AF. Message & data rates may apply. Reply STOP to ghost us.
                      </label>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!phone || !consent || isSubmitting}
                    onClick={handleSubmit}
                    className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-all duration-300 ${
                      !phone || !consent || isSubmitting
                        ? 'bg-teal-700/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 shadow-lg hover:shadow-teal-400/20'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Text Me the Chaos'
                    )}
                  </motion.button>
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <p className="text-xs text-center text-gray-400">
                    By subscribing, you agree to our{' '}
                    <a href="https://thefoundry.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      Privacy Policy
                    </a>
                    . We'll never spam you.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
