import { GuideShortcuts } from '@/components/game/GuideShortcuts';
import { BrandMark } from '@/components/identity/BrandMark';
import { buttonVariants } from '@/components/ui/button';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { Note } from '@/components/ui/note';
import { getTranslation } from '@/i18n/serverTranslation';

const TITLE_ID = 'closing-title';

/** The page's last word: the brand, what a duel takes, the games with a guide, that any other can be added, and the way to make one. */
export async function Closing() {
  const { t } = await getTranslation();

  return (
    <section aria-labelledby={TITLE_ID} className="mx-auto w-full max-w-page px-gutter py-section">
      <div className="grid justify-items-start gap-4 rounded-[28px] border border-line bg-paper p-[clamp(28px,4vw,52px)]">
        <BrandMark size="lg" />
        <h2 id={TITLE_ID} className="text-h2">
          {t('cta.title')}
        </h2>
        <p className="max-w-[48ch] text-lg text-ink-2">{t('cta.subtitle')}</p>
        <GuideShortcuts className="mt-1" />
        <div className="max-w-[60ch]">
          <Note icon="plus" tone="plain">
            {t('cta.anyGame')}
          </Note>
        </div>
        <LocaleLink href="/duel/create" className={buttonVariants({ size: 'lg', className: 'mt-2' })}>
          {t('hero.cta')}
        </LocaleLink>
        <p className="text-body-sm text-ink-3">{t('cta.note')}</p>
      </div>
    </section>
  );
}
