import Link from 'next/link';
import Image from 'next/image';
import { MarketingLayout } from '@/components/layouts/marketing-layout';

export default function Home() {
  return (
    <MarketingLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 min-h-[calc(100dvh-88px)] sm:min-h-[calc(100dvh-96px)]">
        {/* Text Content */}
        <div className="flex flex-col justify-center">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold text-white leading-[1.1] mb-8">
            World leading<br />
            startup coaches,<br />
            freshly minted.
          </h1>
          <Link 
            href="/onboarding"
            className="bg-white text-[#3B0A64] hover:bg-white/90 font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-colors duration-200 w-fit text-base sm:text-lg"
          >
            Get Started
          </Link>
        </div>

        {/* Image Container */}
        <div className="relative flex items-end justify-center lg:justify-end h-[min(50vh,500px)] lg:h-auto">
          <div className="relative w-full h-full lg:aspect-[4/3] lg:max-h-[600px]">
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
    </MarketingLayout>
  );
} 