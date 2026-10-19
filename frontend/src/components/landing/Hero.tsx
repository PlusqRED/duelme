import Link from 'next/link';
import { DemoDuel } from '@/components/landing/DemoDuel';
import { DevNote } from '@/components/landing/DevNote';
import { HeroFacts } from '@/components/landing/HeroFacts';
import { buttonVariants } from '@/components/ui/button';
import { getTranslation } from '@/i18n/serverTranslation';
import { LANDING_SECTION_IDS } from '@/lib/navigation';

/**
 * The landing's first screen: the motto and what DuelMe is, the two ways in, the developer's note
 * and the platform's figures; beside them on a wide screen, under them on a narrow one, the demo
 * duel that shows how the money moves.
 */
export async function Hero() {
  const { t } = await getTranslation();

  return (
    <section className="mx-auto grid w-full max-w-page gap-10 px-gutter pt-[clamp(24px,4vw,56px)] hero:grid-cols-2 hero:items-center hero:gap-12">
      <div>
        <h1 className="text-h1">
          <span className="block">{t('motto.1')}</span>
          <span className="block">{t('motto.2')}</span>
        </h1>
        <p className="mt-[22px] max-w-[44ch] text-lg text-ink-2">
          <b className="font-strong text-ink">{t('hero.lede1')}</b> {t('hero.lede2')}
        </p>
        <div className="mt-7 flex flex-wrap gap-3 max-xs:mt-6">
          <Link href="/duel/create" className={buttonVariants({ size: 'lg', className: 'max-xs:basis-full' })}>
            {t('hero.cta')}
          </Link>
          <a href={`#${LANDING_SECTION_IDS.publicDuels}`} className={buttonVariants({ variant: 'paper', size: 'lg', className: 'max-xs:basis-full' })}>
            {t('hero.browse')}
          </a>
        </div>
        <DevNote />
        <HeroFacts />
      </div>
      <DemoDuel />
    </section>
  );
}
