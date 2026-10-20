'use client';

import { useAppToast } from '@/hooks/useAppToast';
import { LANGUAGE_ROUTE, LANGUAGES, parseLanguage, readLanguageCookie } from '@/i18n/language';
import type { Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The language switch. The server keeps the choice in the cookie, then the page loads anew in it at
 * the same address — a private duel's invite secret in the hash stays in the browser — and without
 * a new entry in the history. Until the page's script has loaded a press does nothing.
 */
export function LanguageToggle() {
  const { t, language } = useTranslation();
  const appToast = useAppToast();

  async function choose(next: Language) {
    // Another tab may have chosen a language this page has not caught up with: pressing the one
    // shown then keeps it again.
    if (next === language && parseLanguage(readLanguageCookie(document.cookie)) === next) return;

    const response = await fetch(LANGUAGE_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: next }),
    }).catch(() => null);
    if (!response?.ok) {
      appToast.error('toast.languageNotSaved');
      return;
    }
    // A browser that keeps no cookies for the site would load the page in the old language again.
    if (readLanguageCookie(document.cookie) !== next) {
      appToast.error('toast.languageNotKept');
      return;
    }
    window.location.reload();
  }

  return (
    <div role="group" aria-label={t('nav.language')} className="flex items-center rounded-full border border-line bg-paper p-0.5">
      {LANGUAGES.map((next) => (
        <button
          key={next}
          type="button"
          aria-pressed={next === language}
          onClick={() => void choose(next)}
          className="min-h-11 min-w-11 rounded-full px-2 text-sm font-label text-ink-3 transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {next.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
