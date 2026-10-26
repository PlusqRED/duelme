'use client';

import { useEffect, useState } from 'react';
import { LANGUAGES } from '@/i18n/language';
import { localePath } from '@/i18n/localePath';
import type { Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface LanguageSwitchProps {
  className?: string;
}

/**
 * EN and RU, with an ink pill that slides to the one pressed at once. The page then loads anew at
 * its address in that language: the layouts the app keeps across a move between pages would
 * otherwise stay in the old one. The query and the hash — a private duel's invite secret — come
 * along, and the history gains no entry. Buttons, not links: a link pressed before the page's
 * script has loaded would leave without the hash, while a button then does nothing. Search engines
 * find the other language through the pages' `hreflang` links.
 */
export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { t, language } = useTranslation();
  const [picked, setPicked] = useState<Language | null>(null);
  const shown = picked ?? language;

  // A page the browser brings back from its back-forward cache shows its own language again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPicked(null);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // A second press before the page has left wins. Back to the page's own language, the page loads
  // anew, which replaces the move the first press started: going to the same address with a hash
  // would only scroll to it, and stopping the move would cut the page's own reads too.
  function choose(next: Language) {
    if (next === shown) return;
    setPicked(next);
    if (next === language) {
      window.location.reload();
      return;
    }
    const { pathname, search, hash } = window.location;
    window.location.replace(localePath(`${pathname}${search}${hash}`, next));
  }

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      style={{ '--pick': LANGUAGES.indexOf(shown) }}
      className={cn('relative inline-flex shrink-0 rounded-full border border-line bg-paper p-0.5', className)}
    >
      <span
        aria-hidden="true"
        className="absolute top-0.5 left-0.5 h-11 w-11 translate-x-[calc(var(--pick)*100%)] rounded-full bg-ink transition-[translate] duration-400 ease-spring"
      />
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === shown}
          onClick={() => choose(option)}
          className="relative min-h-11 w-11 cursor-pointer rounded-full text-sm font-label text-ink-3 transition-colors aria-pressed:text-paper"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
