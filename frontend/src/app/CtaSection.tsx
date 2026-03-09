'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { Swords } from 'lucide-react';

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-gray-200 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('cta.ready')}
        </h2>
        <p className="mt-3 text-base text-gray-500 sm:text-lg">
          {t('cta.subtitle')}
        </p>
        <div className="mt-8">
          <Link href="/duel/create">
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Swords className="mr-2 h-4 w-4" />
              {t('hero.cta')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
