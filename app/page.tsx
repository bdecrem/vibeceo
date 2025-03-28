import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#8B3A1D] via-[#B84C24] to-[#E67E22]">
      {/* Logo Section */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10">
        <div className="flex items-center gap-3">
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
      </div>

      {/* Main Grid Container */}
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 px-4 sm:px-8 pt-24 sm:pt-32 pb-8 sm:pb-16">
        {/* Left Column - Text Content */}
        <div className="flex flex-col justify-center z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8 sm:mb-16">
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

        {/* Right Column - Image */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-2xl aspect-[4/3]">
            <Image
              src="/executives.png"
              alt="Business Executives"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  );
} 