import { ReactNode } from 'react';
import Image from 'next/image';

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-tr from-[#3B0A64] to-[#D1A6CB] overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 w-full relative">
        {/* Header */}
        <header className="py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Advisors Foundry Logo"
              width={40}
              height={40}
              priority
              className="object-contain sm:w-12 sm:h-12"
            />
            <span className="text-white text-xl sm:text-2xl font-bold">Advisors Foundry</span>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
} 