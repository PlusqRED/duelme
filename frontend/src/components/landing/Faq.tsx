import { SectionHead } from '@/components/landing/SectionHead';
import { Icon } from '@/components/ui/icon';
import { getTranslation } from '@/i18n/serverTranslation';
import type { PageTranslationKey } from '@/i18n/pageTranslations';

const TITLE_ID = 'faq-title';

/** Each question with its answer, the keys written out so the translation guard sees them used. */
const QUESTIONS: readonly (readonly [PageTranslationKey, PageTranslationKey])[] = [
  ['faq.what.q', 'faq.what.a'],
  ['faq.games.q', 'faq.games.a'],
  ['faq.winner.q', 'faq.winner.a'],
  ['faq.dispute.q', 'faq.dispute.a'],
  ['faq.middleman.q', 'faq.middleman.a'],
  ['faq.fee.q', 'faq.fee.a'],
  ['faq.custody.q', 'faq.custody.a'],
  ['faq.wallet.q', 'faq.wallet.a'],
];

/**
 * The questions people ask before a first duel. Every answer is in the page's HTML though it opens
 * on a press, so a search engine reads them all and a reader opens the one they came for; the
 * toggle is a keycap that sinks and turns navy while its answer is open. No FAQPage structured
 * data: Google stopped showing it in 2026.
 */
export async function Faq() {
  const { t } = await getTranslation();

  return (
    <section id="faq" aria-labelledby={TITLE_ID} className="mx-auto w-full max-w-page px-gutter pt-section">
      <div className="grid gap-7 wide:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] wide:items-start wide:gap-14">
        <SectionHead titleId={TITLE_ID} title={t('faq.title')} subtitle={t('faq.subtitle')} className="mb-0 wide:sticky wide:top-28" />
        <div className="border-t border-line">
          {QUESTIONS.map(([question, answer]) => (
            <details key={question} className="group/faq border-b border-line">
              <summary className="flex min-h-18 cursor-pointer list-none items-center justify-between gap-5 py-4 text-lead [&::-webkit-details-marker]:hidden">
                {t(question)}
                <span
                  aria-hidden="true"
                  className="keycap grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-ink [--keycap-edge:var(--color-line-strong)] group-open/faq:translate-y-[3px] group-open/faq:bg-ink group-open/faq:text-paper group-open/faq:[--keycap-drop:1px] group-open/faq:[--keycap-edge:var(--color-ink-edge)]"
                >
                  <Icon name="plus" className="size-5 transition-transform duration-300 ease-spring group-open/faq:rotate-45" />
                </span>
              </summary>
              <p className="max-w-[62ch] animate-rise pb-6 text-body text-pretty text-ink-2">{t(answer)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
