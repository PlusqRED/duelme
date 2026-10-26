'use client';

import { useRef } from 'react';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useCrowdedNav } from '@/hooks/useCrowdedNav';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The sections, in the bar of a screen wide enough. The page you are on, or the landing's section
 * you are reading, has an ink bar under it, which grows in under the next one as you scroll.
 *
 * A name never breaks over two lines, and the bar lists the sections only while the whole row
 * fits: Russian names run a third longer than English ones and a signed-in player's wallet takes
 * room of its own, so no one breakpoint holds. Out of room, the row hides as `data-crowded` and the
 * menu's button, which reads that off the bar, takes the sections.
 */
export function NavLinks() {
  const { t } = useTranslation();
  const links = useNavLinks();
  const room = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const isCrowded = useCrowdedNav(room, row);

  return (
    <nav
      ref={room}
      aria-label={t('nav.main')}
      data-crowded={isCrowded || undefined}
      className="ml-2 hidden min-w-0 flex-1 nav:block data-crowded:invisible data-crowded:overflow-x-clip"
    >
      <div ref={row} className="flex w-max gap-0.5">
        {links.map((link) => (
          <LocaleLink
            key={link.href}
            href={link.href}
            aria-current={link.current}
            onClick={link.onFollow}
            className="relative inline-flex min-h-11 items-center rounded-xl px-2.5 text-body-sm font-medium whitespace-nowrap text-ink-2 transition-colors after:absolute after:inset-x-2.5 after:bottom-[3px] after:h-[3px] after:scale-x-0 after:rounded-full after:bg-ink after:transition-transform after:duration-450 after:ease-sheet hover:bg-paper hover:text-ink [&[aria-current]]:text-ink [&[aria-current]]:after:scale-x-100"
          >
            {link.label}
          </LocaleLink>
        ))}
      </div>
    </nav>
  );
}
