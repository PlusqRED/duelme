'use client';

import { Swords } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">DuelMe</span>
            <span className="text-sm text-gray-500">
              &mdash; {t('footer.tagline')}
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a
              href="https://github.com/duelme"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gray-900"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="transition-colors hover:text-gray-900"
            >
              Docs
            </a>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} DuelMe. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
