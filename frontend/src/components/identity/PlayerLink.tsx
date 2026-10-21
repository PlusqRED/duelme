import type { ReactNode } from 'react';
import Link from 'next/link';
import { profilePath } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface PlayerLinkProps {
  address: string;
  /** The player's name, with their face where the caller shows one. */
  children: ReactNode;
  className?: string;
}

/**
 * A player's name as the way to their profile. It keeps the look of the name it wraps, colour and
 * all, and is underlined only while pointed at, so a row of names does not read as a row of links.
 */
export function PlayerLink({ address, children, className }: PlayerLinkProps) {
  return (
    <Link href={profilePath(address)} className={cn('decoration-2 underline-offset-4 hover:underline', className)}>
      {children}
    </Link>
  );
}
