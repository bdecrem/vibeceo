import Link from 'next/link';
import Image from 'next/image';

export default function Onboarding() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#8B3A1D] via-[#B84C24] to-[#E67E22]">
      {/* Logo Section */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Image
            src="/logo.png"
            alt="myVEO Logo"
            width={40}
            height={40}
            priority
            className="object-contain sm:w-12 sm:h-12"
          />
          <span className="text-white text-xl sm:text-2xl font-bold">myVEO</span>
        </Link>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-8">
        <div className="text-center space-y-8 sm:space-y-12 max-w-4xl z-10 -mt-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-16">
            Pick your VEO:
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            <div className="flex flex-col items-center">
              <Link href="/dashboard" className="block">
                <div className="relative w-48 sm:w-64 aspect-square mb-4">
                  <Image
                    src="/donte.png"
                    alt="Donte"
                    fill
                    className="object-cover object-top rounded-lg"
                    priority
                  />
                </div>
                <div className="text-white text-xl sm:text-2xl font-bold hover:text-white/90 transition-colors text-center">
                  Donte
                </div>
              </Link>
            </div>
            
            <div className="flex flex-col items-center">
              <Link href="/dashboard" className="block">
                <div className="relative w-48 sm:w-64 aspect-square mb-4">
                  <Image
                    src="/kailey.png"
                    alt="Kailey"
                    fill
                    className="object-cover object-top rounded-lg"
                    priority
                  />
                </div>
                <div className="text-white text-xl sm:text-2xl font-bold hover:text-white/90 transition-colors text-center">
                  Kailey
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  );
} 