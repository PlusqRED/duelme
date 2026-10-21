'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LanguageSwitch } from '@/components/header/LanguageSwitch';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The sections on a screen too narrow to list them in the bar, and on a phone the language too.
 * Following a link closes it.
 */
export function NavMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        aria-label={t('nav.menu')}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink transition-colors hover:border-line-strong data-popup-open:border-line-strong nav:hidden"
      >
        <Icon name="menu" />
      </PopoverTrigger>
      <PopoverContent title={t('nav.menu')} className="[--panel-width:320px]">
        <MenuLinks onFollow={() => setIsOpen(false)} />
        <div className="flex items-center justify-between gap-3 border-t border-line px-3 pt-3 font-label text-ink-2 xs:hidden">
          <span aria-hidden="true">{t('nav.language')}</span>
          <LanguageSwitch />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The menu's links, there only while it is open, so a closed menu watches none of the landing's sections. */
function MenuLinks({ onFollow }: { onFollow: () => void }) {
  const { t } = useTranslation();
  const links = useNavLinks();

  return (
    <nav aria-label={t('nav.main')} className="grid gap-0.5">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.current}
          onClick={() => {
            link.onFollow?.();
            onFollow();
          }}
          className="flex min-h-12 items-center rounded-[14px] px-3 text-body font-label text-ink-2 transition-colors hover:bg-canvas hover:text-ink [&[aria-current]]:bg-canvas [&[aria-current]]:text-ink [&[aria-current]]:shadow-[inset_3px_0_0_var(--color-ink)]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
