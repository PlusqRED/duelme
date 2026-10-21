'use client';

import { BackLink } from '@/components/duel/room/BackLink';
import { useTranslation } from '@/i18n/useTranslation';

/** A duel id nobody issued, or one that is no id at all. */
export function DuelNotFound() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-1 pb-18">
      <BackLink href="/duels/public">{t('room.back.public')}</BackLink>
      <p className="rounded-3xl border border-line bg-paper px-6 py-12 text-center text-ink-3">{t('duel.notFound')}</p>
    </div>
  );
}
