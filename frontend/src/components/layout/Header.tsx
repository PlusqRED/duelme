'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

export function Header() {
  const { t, language, setLanguage } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">DuelMe</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              {t('nav.dashboard')}
            </Button>
          </Link>
          <Link href="/duel/create">
            <Button variant="ghost" size="sm">
              {t('nav.createDuel')}
            </Button>
          </Link>
        </nav>

        {/* Right side */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Language toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                language === 'en'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ru')}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                language === 'ru'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              RU
            </button>
          </div>

          <Button variant="default" size="sm">
            {t('nav.connectWallet')}
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {t('nav.dashboard')}
              </Button>
            </Link>
            <Link
              href="/duel/create"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {t('nav.createDuel')}
              </Button>
            </Link>
          </nav>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5">
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ru')}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  language === 'ru'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                RU
              </button>
            </div>
            <Button variant="default" size="sm" className="flex-1">
              {t('nav.connectWallet')}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
