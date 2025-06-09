"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';


export default function SmsPage() {
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
    <main className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-[#e2e8f0] to-[#cbd5e1]">
      {/* SMS Banner - same as homepage */}
      <div className="relative z-20 bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] py-5 md:mr-7 md:rounded-r-3xl">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 md:pl-8 md:pr-8 text-white text-center md:text-left">
          <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug max-w-5xl">
            World leading startup coaches, freshly minted. Still cheaper than a cofounder.
          </p>
          <Link href="/">
                          <button className="mt-4 md:mt-0 shrink-0 bg-white text-[#8b5cf6] font-bold px-6 py-3 rounded-full hover:opacity-90 transition whitespace-nowrap shadow-md">
                Take me there →
              </button>
          </Link>
        </div>
      </div>

      {/* AdvisorsFoundry Logo & Textmark - matching homepage layout */}
      <nav className="container mx-auto py-6">
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo-grey.png?v=2"
            alt="AdvisorsFoundry Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <div className="text-xl font-bold">
            <span className="text-[#40e0d0]">Advisors</span>
            <span className="text-gray-500">Foundry</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl p-8 md:p-10 bg-white shadow-2xl border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl">✨</span>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] bg-clip-text text-transparent">
                Get Daily Texts from AF
              </h1>
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-xl text-gray-700 font-medium">Startup wisdom. Spirals. Possibly threats.</p>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <div className="bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] p-8 rounded-2xl mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  You just signed up for daily startup chaos… via SMS. Bold move.
                </h2>
                <p className="text-white/90 text-lg italic">
                  Your phone is now a vessel. Prepare for bangers.
                </p>
              </div>
              <Link href="/">
                <button className="bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] text-white px-8 py-4 rounded-full font-semibold hover:shadow-lg transition-all duration-300 text-lg">
                  Back to Home
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
                             <div className="bg-gradient-to-br from-[#40e0d0]/15 to-[#8b5cf6]/15 p-6 rounded-2xl border border-[#40e0d0]/30">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Craving one unhinged line of <span className="bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] bg-clip-text text-transparent">founder truth</span> each morning?
                </h2>
                                 <p className="text-gray-700 text-lg">
                   We're delivering startup wisdom via SMS like it's 2006. Welcome to the <span className="font-semibold text-[#8b5cf6]">lowest-tech way to level up</span>.
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="phone" className="block text-lg font-semibold text-gray-700 mb-3">
                    Your Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#40e0d0] focus:border-[#40e0d0] transition-all duration-200 text-lg shadow-sm"
                    required
                  />
                </div>

                                 <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-[#40e0d0]/10 to-[#8b5cf6]/10 rounded-xl border border-[#40e0d0]/30">
                  <input
                    id="consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                                         className="h-5 w-5 mt-1 text-[#40e0d0] border-2 border-gray-400 rounded focus:ring-[#40e0d0] bg-white shadow-sm"
                    required
                  />
                                     <label htmlFor="consent" className="text-gray-800 font-medium">
                    I agree to receive daily SMS spiral fuel like it's still T9.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!phone || !consent || isSubmitting}
                  className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                    !phone || !consent || isSubmitting
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] hover:shadow-lg hover:scale-[1.02] text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Inject the Chaos'
                  )}
                </button>
              </form>

              <div className="text-center space-y-4 text-gray-600 bg-gray-50 p-6 rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🚀</span>
                  <p className="font-semibold">
                    SMS only works if you're US-based and emotionally unwell.
                  </p>
                </div>
                <p>
                  Not in the US? <a href="https://cdn.forms-content-1.sg-form.com/f348d1a4-4304-11f0-b649-8e824612f419" target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:text-[#8b5cf6]/80 font-semibold underline">Get the daily chaos via email instead</a>.
                </p>
                <p className="text-sm">
                  By subscribing, you agree to our{' '}
                  <a href="https://thefoundry.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#40e0d0] hover:text-[#40e0d0]/80 underline">
                    Privacy Policy
                  </a>. We promise never to spam you. Only spiral responsibly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 