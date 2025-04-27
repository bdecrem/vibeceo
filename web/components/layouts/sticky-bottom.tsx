'use client';

import { useViewport } from '@/lib/contexts/viewport-context';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface StickyBottomProps {
  children: React.ReactNode;
  alwaysVisible?: boolean;
  className?: string;
  withSafeArea?: boolean;
}

export function StickyBottom({
  children,
  alwaysVisible = true,
  className,
  withSafeArea = true,
}: StickyBottomProps) {
  const { viewportHeight, safeAreaBottom, keyboardHeight, isMobile } = useViewport();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alwaysVisible && ref.current) {
      const element = ref.current;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            element.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        },
        {
          threshold: 1.0,
          rootMargin: '0px',
        }
      );

      observer.observe(element);
      return () => observer.disconnect();
    }
  }, [alwaysVisible]);

  return (
    <div
      ref={ref}
      className={cn(
        'fixed left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        withSafeArea && 'pb-safe',
        className
      )}
      style={{
        bottom: isMobile ? keyboardHeight : 0,
        transform: 'translate3d(0,0,0)', // Force GPU acceleration
        maxHeight: alwaysVisible ? `${viewportHeight * 0.3}px` : undefined,
        paddingBottom: withSafeArea ? `${safeAreaBottom}px` : undefined,
      }}
    >
      {children}
    </div>
  );
} 