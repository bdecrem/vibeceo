'use client';

import { useViewport } from '@/lib/contexts/viewport-context';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ViewportContentProps {
  children: ReactNode;
  maxHeight?: boolean;
  preserveSpace?: {
    top?: boolean;
    bottom?: boolean;
  };
  className?: string;
}

export function ViewportContent({
  children,
  maxHeight = false,
  preserveSpace = { top: false, bottom: false },
  className,
}: ViewportContentProps) {
  const { viewportHeight } = useViewport();

  return (
    <div 
      className={cn(
        'relative w-full',
        preserveSpace.top && 'pt-16 sm:pt-20',
        preserveSpace.bottom && 'pb-16 sm:pb-20',
        className
      )}
      style={maxHeight ? { maxHeight: `${viewportHeight}px` } : undefined}
    >
      {children}
    </div>
  );
} 