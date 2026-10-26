'use client';

import { useRef } from 'react';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useNavFit } from '@/hooks/useNavFit';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The sections, in the bar of a screen wide enough. The page you are on, or the landing's section
 * you are reading, has an ink bar under it, which grows in under the next one as you scroll.
 *
 * A name never breaks over two lines, and the bar lists the whole row or none of it
 * (`useNavFit`): crowded, the row hides and the menu's button, which reads the bar's mark, takes
 * the sections. Until the page's script has measured it, the row is cut at the bar's end rather
 * than run over the language and the wallet; once it fits it is not, so the focus ring of the first
 * and last name shows whole.
 */
export function NavLinks() {
  const { t } = useTranslation();
  const links = useNavLinks();
  const room = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const fitMark = useNavFit(room, row);

  return (
    <nav
      ref={room}
      aria-label={t('nav.main')}
      {...fitMark}
      className="ml-2 hidden min-w-0 flex-1 overflow-x-clip nav:block data-[nav-fit=crowded]:invisible data-[nav-fit=fits]:overflow-x-visible"
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
