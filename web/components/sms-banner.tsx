import { useState } from 'react';

interface SmsBannerProps {
  onSignupClick?: () => void;
}

export default function SmsBanner({ onSignupClick }: SmsBannerProps) {
  return (
    <div className="relative z-20 bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] py-5 md:mr-7 md:rounded-r-3xl">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:pl-8 md:pr-8 text-white text-center md:text-left">
        <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug max-w-5xl">
          💬 Daily founder chaos? Delivered by SMS. 160 characters. Zero accountability. Full delusion.
        </p>
        <button
          onClick={onSignupClick}
          className="mt-4 md:mt-0 shrink-0 bg-white text-[#8b5cf6] font-bold px-6 py-3 rounded-full hover:opacity-90 transition whitespace-nowrap shadow-md"
        >
          Sign Me Up →
        </button>
      </div>
    </div>
  );
}
