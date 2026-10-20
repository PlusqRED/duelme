'use client';

import type { FormEvent, MouseEvent } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAppToast } from '@/hooks/useAppToast';
import { LANGUAGES } from '@/i18n/language';
import { LANGUAGE_FIELDS, LANGUAGE_ROUTE } from '@/i18n/languageSwitch';
import type { Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The language switch: a form the server answers by setting the cookie and sending the reader back
 * to this page, which loads anew in the language. Being a form, it works before the page's script
 * has loaded too.
 */
export function LanguageToggle() {
  const { language } = useTranslation();
  const appToast = useAppToast();
  const pathname = usePathname();
  const query = useSearchParams().toString();

  function choose(event: MouseEvent<HTMLButtonElement>, next: Language) {
    if (next === language) {
      event.preventDefault();
      return;
    }
    // A browser that keeps no cookies for the site would load the page in the old language again.
    if (!navigator.cookieEnabled) {
      event.preventDefault();
      appToast.error('toast.languageNotKept');
    }
  }

  // The hash, where a private duel keeps its invite secret, never reaches the server: it is added here.
  function keepWholeAddress(event: FormEvent<HTMLFormElement>) {
    const back = event.currentTarget.elements.namedItem(LANGUAGE_FIELDS.back);
    if (back instanceof HTMLInputElement) {
      back.value = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    }
  }

  return (
    <form
      method="post"
      action={LANGUAGE_ROUTE}
      onSubmit={keepWholeAddress}
      className="flex items-center rounded-full bg-canvas p-0.5"
    >
      <input type="hidden" name={LANGUAGE_FIELDS.back} defaultValue={query ? `${pathname}?${query}` : pathname} />
      {LANGUAGES.map((next) => (
        <button
          key={next}
          type="submit"
          name={LANGUAGE_FIELDS.language}
          value={next}
          aria-pressed={next === language}
          onClick={(event) => choose(event, next)}
          className="min-h-9 min-w-9 rounded-full px-2.5 text-xs font-bold text-ink-3 transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {next.toUpperCase()}
        </button>
      ))}
    </form>
  );
}
