'use client';

import Link from 'next/link';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The sections, in the bar of a screen wide enough. The page you are on, or the landing's section
 * you are reading, has an ink bar under it, which grows in under the next one as you scroll.
 */
export function NavLinks() {
  const { t } = useTranslation();
  const links = useNavLinks();

  return (
    <nav aria-label={t('nav.main')} className="ml-4 hidden gap-0.5 nav:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.current}
          onClick={link.onFollow}
          className="relative inline-flex min-h-11 items-center rounded-xl px-3 text-body-sm font-medium text-ink-2 transition-colors after:absolute after:inset-x-3 after:bottom-[3px] after:h-[3px] after:scale-x-0 after:rounded-full after:bg-ink after:transition-transform after:duration-450 after:ease-sheet hover:bg-paper hover:text-ink [&[aria-current]]:text-ink [&[aria-current]]:after:scale-x-100"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
