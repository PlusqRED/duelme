'use client';

import { useRef, useState } from 'react';
import { useAppToast } from '@/hooks/useAppToast';
import { LANGUAGE_ROUTE, LANGUAGES, parseLanguage, readLanguageCookie } from '@/i18n/language';
import type { Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface LanguageSwitchProps {
  className?: string;
}

/**
 * EN and RU, with an ink pill that slides to the one chosen at once. The server keeps the choice in
 * the cookie, then the page loads anew in it at the same address — a private duel's invite secret
 * in the hash stays in the browser — and without a new entry in the history. Until the page's
 * script has loaded a press does nothing.
 */
export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { t, language } = useTranslation();
  const appToast = useAppToast();
  const [picked, setPicked] = useState<Language | null>(null);
  // The post still out, if any: a press while it is out corrects it, so the last press wins.
  const sending = useRef<AbortController | null>(null);
  const shown = picked ?? language;

  async function choose(next: Language) {
    // Another tab may have chosen a language this page has not caught up with: pressing the one
    // shown then keeps it again.
    const isKept = next === language && parseLanguage(readLanguageCookie(document.cookie)) === next;
    if (isKept && !sending.current) return;

    sending.current?.abort();
    const post = new AbortController();
    sending.current = post;
    setPicked(next);
    const response = await fetch(LANGUAGE_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: next }),
      signal: post.signal,
    }).catch(() => null);
    if (post.signal.aborted) return;
    sending.current = null;
    if (!response?.ok) {
      setPicked(null);
      appToast.error('toast.languageNotSaved');
      return;
    }
    // A browser that keeps no cookies for the site would load the page in the old language again.
    if (readLanguageCookie(document.cookie) !== next) {
      setPicked(null);
      appToast.error('toast.languageNotKept');
      return;
    }
    window.location.reload();
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
          aria-pressed={option === shown}
          onClick={() => void choose(option)}
          className="relative min-h-11 w-11 cursor-pointer rounded-full text-sm font-label text-ink-3 transition-colors aria-pressed:text-paper"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
