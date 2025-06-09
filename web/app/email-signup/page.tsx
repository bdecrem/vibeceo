'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';

export default function EmailSignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !consent) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/email-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl p-8 bg-[#1a2937] text-white shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Close button that links back to home */}
        <Link 
          href="/"
          className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </Link>

        <div>
          {isSuccess ? (
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Welcome to the chaos collective.
              </h1>
              <p className="text-[#7dd3fc] mb-6 md:mb-8 italic text-base md:text-lg">
                Your inbox is now a direct line to startup enlightenment. Starting tomorrow, you'll receive daily doses of unfiltered founder wisdom.
              </p>
              <Link
                href="/"
                className="inline-block bg-[#40e0d0] text-[#1a2937] px-6 md:px-8 py-3 md:py-4 rounded-full font-medium hover:bg-[#40e0d0]/90 transition-all duration-300"
              >
                Return to Reality
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Subscribe to AF Daily: Startup wisdom, barely regulated
                </h1>
                <p className="text-[#7dd3fc] text-base md:text-lg">
                  A bite-sized email from our AI coaching system, delivered daily. Zero fluff. Occasional delusion. Just vibes, strategy, and subtle panic.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Please enter your first name."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Please enter your last name."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Please enter your email."
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent backdrop-blur-sm"
                  />
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="consent"
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="h-4 w-4 text-[#40e0d0] border-white/20 rounded focus:ring-[#40e0d0] bg-white/5"
                      required
                    />
                  </div>
                  <label htmlFor="consent" className="ml-3 text-sm text-gray-300">
                    I agree to receive daily email doses of startup chaos and acknowledge that I'm voluntarily subscribing to controlled insanity.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!email || !consent || isSubmitting}
                  className={`w-full py-4 px-8 rounded-full font-medium transition-all duration-300 ${
                    !email || !consent || isSubmitting
                      ? 'bg-white/10 text-white/50 cursor-not-allowed'
                      : 'bg-[#40e0d0] hover:bg-[#40e0d0]/90 text-[#1a2937]'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#1a2937]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Joining the chaos...
                    </span>
                  ) : (
                    'Yes, I crave chaos'
                  )}
                </button>
              </form>

              <div className="text-center text-gray-300 text-sm space-y-2">
                <p>
                  By subscribing, you agree to our{' '}
                  <a href="https://thefoundry.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#7dd3fc] hover:text-[#7dd3fc]/80">
                    Privacy Policy
                  </a>.
                  We promise never to spam you. Only spiral responsibly.
                </p>
                <p>
                  Prefer SMS instead?{' '}
                  <Link href="/" className="text-[#7dd3fc] hover:text-[#7dd3fc]/80">
                    Get daily chaos via text
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 