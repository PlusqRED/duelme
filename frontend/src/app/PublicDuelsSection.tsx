'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePublicDuels } from '@/hooks/usePublicDuels';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { ArrowRight, Globe, Gamepad2 } from 'lucide-react';
import { useMemo } from 'react';

export function PublicDuelsSection() {
  const { t } = useTranslation();
  const { duels, isLoading } = usePublicDuels();

  const preview = useMemo(() => duels.slice(0, 6), [duels]);
  const duelIds = useMemo(() => preview.map((d) => d.id), [preview]);
  const addresses = useMemo(() => preview.map((d) => d.creator), [preview]);

  const { metaByDuelId } = usePublicDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const { resolveDisplay } = useNicknames(addresses);

  return (
    <section id="public-duels" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('publicDuels.title')}</h2>
          <p className="mt-1 text-slate-500">{t('publicDuels.subtitle')}</p>
        </div>
        {!isLoading && preview.length > 0 && (
          <Link
            href="/duels/public"
            className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
          >
            {t('publicDuels.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80"
            />
          ))}
        </div>
      ) : preview.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((duel) => {
              const meta = metaByDuelId[duel.id];
              return (
                <Link
                  key={duel.id}
                  href={`/duel/${duel.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">{duel.wager} USDT</span>
                    {meta ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        <Gamepad2 className="h-2.5 w-2.5" />
                        {meta.gameName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Globe className="h-2.5 w-2.5" />
                        {t('duel.public')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {t('duel.createdBy')} {resolveDisplay(duel.creator)}
                  </span>
                  {hasVisibleDuelMessage(duel.message) && (
                    <span className="text-xs text-slate-400 italic">
                      &ldquo;{truncateUnicode(duel.message, 30)}&rdquo;
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link href="/duels/public" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              {t('publicDuels.viewAll')} &rarr;
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            {t('publicDuels.empty')}
          </p>
          <div className="mt-6">
            <Link href="/duel/create">
              <Button
                size="lg"
                className="rounded-2xl bg-slate-950 px-8 text-white hover:bg-slate-900"
              >
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
