'use client';

import type { ReactNode } from 'react';
import { useIsScrolled } from '@/hooks/useIsScrolled';
import { cn } from '@/lib/utils';

interface TopBarProps {
  children: ReactNode;
}

/** The bar held at the top of the page. Once the page scrolls under it, it draws its lower edge. */
export function TopBar({ children }: TopBarProps) {
  const isScrolled = useIsScrolled();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-canvas transition-colors duration-200',
        isScrolled ? 'border-line' : 'border-transparent'
      )}
    >
      {children}
    </header>
  );
}
