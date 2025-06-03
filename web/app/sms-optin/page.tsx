'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="min-h-screen bg-[#1a3d3d] flex flex-col">
      {/* Header/navigation */}
      <nav className="container mx-auto py-6">
        <div className="flex items-center gap-2">
          <Link href="/">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="AdvisorsFoundry Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <div className="text-2xl font-bold text-white">
                <span className="text-[#40e0d0]">Advisors</span>Foundry
              </div>
            </div>
          </Link>
        </div>
      </nav>
      
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-[#40e0d0] rounded-xl shadow-md overflow-hidden"
        >
          <div className="p-8">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <h1 className="text-3xl font-bold text-black mb-2">
                  You just signed up for daily startup chaos… via SMS. Bold move.
                </h1>
                <p className="text-black mb-8">
                  Check your phone. A tiny text-based oracle is on its way.
                </p>
                <div className="w-16 h-16 bg-[#1a3d3d] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#40e0d0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-black text-lg mb-8">Carrier pigeons were busy.</p>
                <Link href="/">
                  <button className="bg-[#1a3d3d] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#1a3d3d]/90 transition-all duration-300">
                    Back to Reality
                  </button>
                </Link>
              </motion.div>
            ) : (
              <>
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
                  <h1 className="text-3xl font-bold text-black mb-2">
                    Get Daily Texts from AF
                  </h1>
                  <p className="text-black">Startup wisdom. Spirals. Possibly threats.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-black mb-4">
                      Craving one unhinged line of founder truth each morning?
                    </h2>
                    <p className="text-black mb-6">
                      We’re delivering startup wisdom via SMS like it’s 2006. No apps. No portals. Just raw, unhinged advice… on your phone.
                    </p>
                    <p className="text-black">
                      Welcome to the lowest-tech way to level up.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
                      Your Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full bg-white border border-[#1a3d3d]/10 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1a3d3d] focus:border-transparent"
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
                        className="h-4 w-4 text-[#1a3d3d] border-gray-300 rounded focus:ring-[#1a3d3d]"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="consent" className="text-black">
                        I agree to receive daily SMS spiral fuel like it’s still T9.
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
                        ? 'bg-[#1a3d3d]/50 cursor-not-allowed'
                        : 'bg-[#1a3d3d] hover:bg-[#1a3d3d]/90 shadow-lg hover:shadow-[#1a3d3d]/20'
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
                      'Inject the Chaos'
                    )}
                  </motion.button>
                </div>

                <div className="mt-6 border-t border-[#1a3d3d]/10 pt-6">
                  <p className="text-xs text-center text-black">
                    By subscribing, you agree to our{' '}
                    <a href="https://thefoundry.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1a3d3d] hover:underline">
                      Privacy Policy
                    </a>
                    . We promise never to spam you.{' '}
                    Only spiral responsibly.
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
