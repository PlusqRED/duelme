import type { Metadata } from 'next';
import { PROSE_TEXT, ProsePage, ProseSection } from '@/components/layout/Prose';
import { buttonVariants } from '@/components/ui/button';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/how-it-works', title: t('seo.howItWorks.title'), description: t('seo.howItWorks.description') });
}

/** A duel from sign-in to payout, the keys written out so the translation guard sees them used. */
const STEPS: readonly (readonly [TranslationKey, TranslationKey])[] = [
  ['howItWorks.step1.title', 'howItWorks.step1.text'],
  ['howItWorks.step2.title', 'howItWorks.step2.text'],
  ['howItWorks.step3.title', 'howItWorks.step3.text'],
  ['howItWorks.step4.title', 'howItWorks.step4.text'],
  ['howItWorks.step5.title', 'howItWorks.step5.text'],
];

/**
 * How a duel goes, in words a search engine reads whole: the steps in order, each on a navy keycap
 * like the buttons that take them, then what happens when the players disagree, reputation and
 * the fee, and the way to a first duel.
 */
export default async function HowItWorksPage() {
  const { t } = await getTranslation();

  return (
    <ProsePage title={t('howItWorks.title')} intro={t('howItWorks.intro')}>
      <section aria-labelledby="steps-title" className="grid gap-5 border-t border-line pt-6">
        <h2 id="steps-title" className="text-lead">
          {t('howItWorks.stepsTitle')}
        </h2>
        <ol className="grid gap-6">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
              <span
                aria-hidden="true"
                className="keycap row-span-2 grid size-10 place-items-center rounded-xl bg-ink font-label text-paper [--keycap-edge:var(--color-ink-edge)]"
              >
                {index + 1}
              </span>
              <h3 className="self-center text-body font-strong text-ink">{t(title)}</h3>
              <p className={PROSE_TEXT}>{t(text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <ProseSection title={t('howItWorks.trouble.title')}>
        <p className={PROSE_TEXT}>{t('howItWorks.trouble.text')}</p>
      </ProseSection>
      <ProseSection title={t('howItWorks.reputation.title')}>
        <p className={PROSE_TEXT}>{t('howItWorks.reputation.text')}</p>
      </ProseSection>
      <ProseSection title={t('howItWorks.fee.title')}>
        <p className={PROSE_TEXT}>{t('howItWorks.fee.text')}</p>
      </ProseSection>

      <div className="flex flex-wrap gap-3 border-t border-line pt-7">
        <LocaleLink href="/duel/create" className={buttonVariants({ size: 'lg', className: 'max-xs:basis-full' })}>
          {t('hero.cta')}
        </LocaleLink>
        <LocaleLink href="/safety" className={buttonVariants({ variant: 'paper', size: 'lg', className: 'max-xs:basis-full' })}>
          {t('safety.title')}
        </LocaleLink>
      </div>
    </ProsePage>
  );
}
