import type { ReactNode } from 'react';
import { LocaleLink } from '@/components/ui/LocaleLink';
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
 * all, under a faint underline that a phone, which cannot point, still shows. A page of rows holds
 * dozens of names, so none is fetched ahead of a press.
 */
export function PlayerLink({ address, children, className }: PlayerLinkProps) {
  return (
    <LocaleLink
      href={profilePath(address)}
      prefetch={false}
      className={cn('underline decoration-line-strong decoration-[1.5px] underline-offset-4 hover:decoration-current', className)}
    >
      {children}
    </LocaleLink>
  );
}
