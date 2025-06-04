import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmsModal({ isOpen, onClose }: SmsModalProps) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement SMS signup logic
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6 md:p-8">
          {!submitted ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Founder Affirmations via SMS</h2>
              <p className="text-gray-600 mb-6">
                Receive daily doses of startup wisdom, straight to your phone. No ghosting, just pure algorithmic encouragement.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#40e0d0] hover:bg-[#40e0d0]/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Sign Up for SMS Updates
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  By signing up, you agree to receive SMS messages. Message and data rates may apply. Reply STOP to opt out.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-[#40e0d0] mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h3>
              <p className="text-gray-600">
                Get ready for daily doses of startup wisdom. Your first message will arrive shortly.
              </p>
              <Button
                onClick={onClose}
                className="mt-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 