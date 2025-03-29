import Link from 'next/link';
import Image from 'next/image';
import { MobileViewport } from '@/components/layouts/mobile-viewport';
import { ViewportContent } from '@/components/layouts/viewport-content';
import { MobileGrid } from '@/components/layouts/mobile-grid';

export default function Home() {
  const Header = (
    <div className="flex items-center gap-3 px-4 py-4">
      <Image
        src="/logo.png"
        alt="myVEO Logo"
        width={40}
        height={40}
        priority
        className="object-contain sm:w-12 sm:h-12"
      />
      <span className="text-white text-xl sm:text-2xl font-bold">myVEO</span>
    </div>
  );

  const HeroContent = (
    <div className="flex flex-col h-[100dvh]">
      {/* Header space compensation */}
      <div className="h-[4rem] shrink-0" />
      
      {/* Main content area with image */}
      <div className="flex-1 flex flex-col px-4">
        <div className="flex-1 flex flex-col justify-center -mt-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Leadership that<br />
            inspires,<br />
            automated.
          </h1>
          <Link 
            href="/onboarding"
            className="bg-white text-[#8B3A1D] hover:bg-white/90 font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-colors duration-200 w-fit text-base sm:text-lg"
          >
            Get Started
          </Link>
        </div>

        <div className="relative w-full h-[35vh] shrink-0">
          <Image
            src="/executives.png"
            alt="Business Executives"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
      </div>
    </div>
  );

  return (
    <MobileViewport
      header={Header}
      className="bg-gradient-to-br from-[#6B2916] via-[#8B3A1D] to-[#B84C24]"
      alignment="top"
    >
      <ViewportContent>
        <MobileGrid
          template="stacked"
          mainContent={HeroContent}
          spacing="none"
        />
      </ViewportContent>
    </MobileViewport>
  );
} 