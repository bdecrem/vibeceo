import { useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmsModal({ isOpen, onClose }: SmsModalProps) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center pt-24 md:pt-36 z-50">
      <div className="w-full max-w-md rounded-2xl p-8 bg-[#1a2937] text-white shadow-2xl mt-12 mx-4 relative overflow-hidden border border-white/10">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div>
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Get Daily Texts from AF
            </h2>
            <p className="text-[#7dd3fc] text-base md:text-xl">Startup wisdom. Spirals. Possibly threats.</p>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                You just signed up for daily startup chaos… via SMS. Bold move.
              </h3>
              <p className="text-[#7dd3fc] mb-6 md:mb-8 italic text-base md:text-lg">
                Your phone is now a vessel. Prepare for bangers.
              </p>
              <button
                onClick={onClose}
                className="bg-[#40e0d0] text-[#1a2937] px-6 md:px-8 py-3 md:py-4 rounded-full font-medium hover:bg-[#40e0d0]/90 transition-all duration-300"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-4">
                  Craving one unhinged line of founder truth each morning?
                </h3>
                <p className="text-[#7dd3fc] text-base md:text-lg">
                  We're delivering startup wisdom via SMS like it's 2006. Welcome to the lowest-tech way to level up.
                </p>
              </div>

              <div>
                <label htmlFor="phone-modal" className="block text-sm font-medium text-gray-300 mb-1 md:mb-2">
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  id="phone-modal"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 md:py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent backdrop-blur-sm"
                />
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-4 md:h-5">
                  <input
                    id="consent-modal"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="h-4 w-4 text-[#40e0d0] border-white/20 rounded focus:ring-[#40e0d0] bg-white/5"
                  />
                </div>
                <label htmlFor="consent-modal" className="ml-3 text-xs md:text-sm text-gray-300">
                  I agree to receive daily SMS spiral fuel like it's still T9.
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!phone || !consent || isSubmitting}
                className={`w-full py-3 md:py-4 px-6 md:px-8 rounded-full font-medium transition-all duration-300 ${
                  !phone || !consent || isSubmitting
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
                    Sending...
                  </span>
                ) : (
                  'Inject the Chaos'
                )}
              </button>

              <div className="text-center space-y-2 md:space-y-4 text-gray-300">
                <p className="text-xs md:text-sm">
                  ✈️ SMS only works if you're US-based and emotionally unwell.<br />
                  Not in the US? <a href="/email-signup" className="text-[#7dd3fc] hover:text-[#7dd3fc]/80">Get the daily chaos via email instead.</a>
                </p>
                <p className="text-xs">
                  By subscribing, you agree to our{' '}
                  <a href="https://thefoundry.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#7dd3fc] hover:text-[#7dd3fc]/80">
                    Privacy Policy
                  </a>.
                  <span className="hidden md:inline">We promise never to spam you. Only spiral responsibly.</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 