'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCEO } from '@/lib/contexts/ceo-context';
import { ceos } from '@/data/ceos';
import { MarketingLayout } from '@/components/layouts/marketing-layout';

export default function Onboarding() {
  const { setSelectedCEO } = useCEO();
  const router = useRouter();

  const handleCEOSelect = (ceo: typeof ceos[0]) => {
    setSelectedCEO(ceo);
    router.push('/dashboard');
  };

  return (
    <MarketingLayout>
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-bold text-white text-center mb-12 sm:mb-16">
          Pick your advisor:
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 max-w-4xl mx-auto w-full">
          {ceos.map((ceo) => (
            <div key={ceo.id} className="flex flex-col items-center">
              <button 
                onClick={() => handleCEOSelect(ceo)}
                className="group w-full max-w-sm transition-transform hover:scale-[1.02] duration-200"
              >
                <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden">
                  <Image
                    src={ceo.image}
                    alt={ceo.name}
                    fill
                    className="object-cover object-[center_40%]"
                    priority
                  />
                </div>
                <div className="text-white text-xl sm:text-2xl font-bold text-center group-hover:opacity-90 transition-opacity">
                  {ceo.name}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
} 