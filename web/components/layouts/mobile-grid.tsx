'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MobileGridProps {
  template: 'hero' | 'split' | 'stacked';
  topContent?: ReactNode;
  mainContent: ReactNode;
  bottomContent?: ReactNode;
  className?: string;
  spacing?: 'none' | 'normal' | 'large';
}

export function MobileGrid({
  template,
  topContent,
  mainContent,
  bottomContent,
  className,
  spacing = 'normal',
}: MobileGridProps) {
  const spacingClasses = {
    none: 'gap-0',
    normal: 'gap-4 sm:gap-8',
    large: 'gap-8 sm:gap-12',
  };

  const templateClasses = {
    hero: 'grid-cols-1 lg:grid-cols-2',
    split: 'grid-cols-2',
    stacked: 'grid-cols-1',
  };

  return (
    <div className={cn('w-full h-full flex flex-col', spacingClasses[spacing], className)}>
      {topContent && (
        <div className="w-full">
          {topContent}
        </div>
      )}

      <div className={cn(
        'flex-1 grid',
        templateClasses[template]
      )}>
        {mainContent}
      </div>

      {bottomContent && (
        <div className="w-full">
          {bottomContent}
        </div>
      )}
    </div>
  );
} 