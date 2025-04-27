'use client';

import { useViewport } from '@/lib/contexts/viewport-context';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MobileViewportProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  alignment?: 'top' | 'center' | 'bottom';
  className?: string;
  fullHeight?: boolean;
}

export function MobileViewport({
  children,
  header,
  footer,
  alignment = 'top',
  className,
  fullHeight = true,
}: MobileViewportProps) {
  const { viewportHeight, safeAreaTop, safeAreaBottom } = useViewport();

  const alignmentClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  return (
    <div 
      className={cn(
        'relative flex flex-col',
        fullHeight && 'min-h-[100dvh]',
        className
      )}
      style={fullHeight ? { minHeight: `${viewportHeight}px` } : undefined}
    >
      {header && (
        <div className="w-full" style={{ paddingTop: safeAreaTop }}>
          {header}
        </div>
      )}
      
      <div className={cn(
        'flex-1 flex flex-col',
        alignmentClasses[alignment]
      )}>
        {children}
      </div>

      {footer && (
        <div className="w-full" style={{ paddingBottom: safeAreaBottom }}>
          {footer}
        </div>
      )}
    </div>
  );
} 