'use client';

import { Swords } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {/* Brand */}
          <div className="flex flex-1 flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex shrink-0 items-center gap-2">
              <Swords className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-900">DuelMe</span>
            </div>
            <span className="hidden sm:inline text-sm text-slate-400">&mdash;</span>
            <span className="text-xs text-slate-500 sm:text-sm">
              {t('footer.tagline')}
            </span>
          </div>

          {/* Links */}
          <div className="flex shrink-0 items-center gap-4 text-sm text-slate-500">
            <a
              href="https://github.com/duelme"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-slate-900"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="transition-colors hover:text-slate-900"
            >
              Docs
            </a>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} DuelMe. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
