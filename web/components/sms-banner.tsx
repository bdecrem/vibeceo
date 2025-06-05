import { useState } from 'react';

interface SmsBannerProps {
  onSignupClick?: () => void;
}

export default function SmsBanner({ onSignupClick }: SmsBannerProps) {
  return (
    <div className="relative z-20 w-full flex justify-start pt-4 pb-1">
      <div className="bg-gradient-to-r from-[#5dd5f7] to-[#9333ea] py-2 md:py-2 pl-6 md:pl-20 pr-4 md:pr-12 flex items-center justify-between rounded-r-lg md:rounded-r-2xl w-full mr-4 md:mr-8">
        <div className="flex-1 mr-3">
          <span className="text-white font-semibold text-sm md:text-xl lg:whitespace-nowrap">
            <span className="text-lg md:text-3xl mr-1 md:mr-3">💬</span>
            Daily founder chaos? Delivered by SMS.
            <span className="hidden lg:inline"> 160 characters. Zero accountability. Full delusion.</span>
          </span>
        </div>
        <button
          className="w-24 h-8 md:w-36 md:h-10 flex-shrink-0 bg-white text-[#2c2179] font-bold rounded-full shadow hover:bg-gray-100 transition-colors text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-white/30 whitespace-nowrap flex items-center justify-center"
          onClick={onSignupClick}
        >
          <span className="md:hidden">Sign Up</span>
          <span className="hidden md:inline">Sign Me Up</span>
          <span aria-hidden className="ml-1">→</span>
        </button>
      </div>
    </div>
  );
}
