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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-[#1a2937] to-[#1d4352] text-white rounded-3xl w-full max-w-xl mx-4 relative overflow-hidden border border-white/10">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-12">
          <div className="text-center mb-12">
            <div className="inline-block mb-6">
              <div className="w-20 h-20 relative mx-auto">
                <Image
                  src="/logo.png"
                  alt="Advisors Foundry Logo"
                  fill
                  className="object-contain brightness-200"
                />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">
              Get Daily Texts from AF
            </h2>
            <p className="text-[#40e0d0] text-xl">Startup wisdom. Spirals. Possibly threats.</p>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-3">
                You just signed up for daily startup chaos… via SMS. Bold move.
              </h3>
              <p className="text-[#40e0d0] mb-8 italic text-lg">
                Your phone is now a vessel. Prepare for bangers.
              </p>
              <button
                onClick={onClose}
                className="bg-[#40e0d0] text-[#1a2937] px-8 py-4 rounded-full font-medium hover:bg-[#40e0d0]/90 transition-all duration-300"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Craving one unhinged line of founder truth each morning?
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-2">
                  We're delivering startup wisdom via SMS like it's 2006. No apps. No portals. Just raw, unhinged advice… on your phone.
                </p>
                <p className="text-[#40e0d0] text-lg">
                  Welcome to the lowest-tech way to level up.
                </p>
              </div>

              <div>
                <label htmlFor="phone-modal" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  id="phone-modal"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent backdrop-blur-sm"
                />
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="consent-modal"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="h-4 w-4 text-[#40e0d0] border-white/20 rounded focus:ring-[#40e0d0] bg-white/5"
                  />
                </div>
                <label htmlFor="consent-modal" className="ml-3 text-sm text-gray-300">
                  I agree to receive daily SMS spiral fuel like it's still T9.
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!phone || !consent || isSubmitting}
                className={`w-full py-4 px-8 rounded-full font-medium transition-all duration-300 ${
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

              <div className="text-center text-sm space-y-4 text-gray-300">
                <p>
                  ✈️ SMS only works if you're US-based and emotionally unwell.<br />
                  Not in the US? <a href="https://advisorsfoundry.substack.com" target="_blank" rel="noopener noreferrer" className="text-[#40e0d0] hover:text-[#40e0d0]/80">Join the mailing list</a> for weekly startup spirals.
                </p>
                <p className="text-xs">
                  By subscribing, you agree to our{' '}
                  <a href="https://thefoundry.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#40e0d0] hover:text-[#40e0d0]/80">
                    Privacy Policy
                  </a>.
                  We promise never to spam you. Only spiral responsibly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 