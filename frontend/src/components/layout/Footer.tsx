'use client';

import Image from 'next/image';
import { Mail } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

const DEVELOPER_EMAIL = 'rickes.oleg@gmail.com';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:gap-4 sm:px-6 sm:py-8 sm:text-left">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2">
          <Image
            src="/logo.png"
            alt="DuelMe logo"
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 rounded-full"
          />
          <span className="text-sm font-semibold text-slate-900">DuelMe</span>
          <span className="hidden text-sm text-slate-300 sm:inline">&middot;</span>
          <span className="text-xs text-slate-500 sm:text-sm">
            {t('footer.tagline')}
          </span>
        </div>

        <a
          href={`mailto:${DEVELOPER_EMAIL}`}
          title={t('footer.developer')}
          aria-label={`${t('footer.developer')}: ${DEVELOPER_EMAIL}`}
          className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 sm:text-sm"
        >
          <Mail className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-indigo-600" />
          <span className="font-medium">{DEVELOPER_EMAIL}</span>
        </a>

        <span className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} DuelMe. {t('footer.rights')}
        </span>
      </div>
    </footer>
  );
}
