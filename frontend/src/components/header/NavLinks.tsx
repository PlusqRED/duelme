'use client';

import Link from 'next/link';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useTranslation } from '@/i18n/useTranslation';

/** The sections, in the bar of a screen wide enough. The page you are on has an ink bar under it. */
export function NavLinks() {
  const { t } = useTranslation();
  const links = useNavLinks();

  return (
    <nav aria-label={t('nav.main')} className="ml-4 hidden gap-0.5 nav:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.isCurrent ? 'page' : undefined}
          className="relative inline-flex min-h-11 items-center rounded-xl px-3 text-body-sm font-medium text-ink-2 transition-colors hover:bg-paper hover:text-ink aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-[3px] aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-ink"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
