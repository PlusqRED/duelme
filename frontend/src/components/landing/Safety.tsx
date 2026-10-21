import { EscrowCard } from '@/components/landing/EscrowCard';
import { Guarantees } from '@/components/landing/Guarantees';
import { SectionHead } from '@/components/landing/SectionHead';
import { getTranslation } from '@/i18n/serverTranslation';
import { LANDING_SECTION_IDS } from '@/lib/navigation';

const TITLE_ID = 'safety-title';

/**
 * The page's one navy band, the contract's own colour: the escrow contract to check for yourself,
 * and the four guarantees it gives.
 */
export async function Safety() {
  const { t } = await getTranslation();

  return (
    <section
      id={LANDING_SECTION_IDS.safety}
      aria-labelledby={TITLE_ID}
      className="mt-section bg-ink py-[clamp(56px,6vw,88px)] text-paper [&_:focus-visible]:outline-sun"
    >
      <div className="mx-auto w-full max-w-page px-gutter">
        <div className="grid gap-7 wide:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] wide:items-center wide:gap-14">
          <SectionHead titleId={TITLE_ID} title={t('trust.title')} subtitle={t('trust.subtitle')} isOnNavy className="mb-0" />
          <EscrowCard />
        </div>
        <Guarantees className="mt-9" />
      </div>
    </section>
  );
}
