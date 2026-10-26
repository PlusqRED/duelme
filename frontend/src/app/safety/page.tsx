import type { Metadata } from 'next';
import { ProsePage } from '@/components/layout/ProsePage';
import { PROSE_TEXT, ProseSection } from '@/components/layout/ProseSection';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { contractCoverage, contractTestsLabel, emergencyDelayLabel } from '@/lib/contractFacts';
import { explorerLink } from '@/lib/explorer';
import { pageMetadata } from '@/lib/pageMetadata';
import { formatPercent } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t, plural, language } = await getTranslation();
  return pageMetadata({
    path: '/safety',
    title: t('seo.safety.title'),
    description: t('seo.safety.description', { days: emergencyDelayLabel(plural, language) }),
  });
}

/**
 * Where the money sits and what keeps it there: the contract to check, what DuelMe cannot do with
 * it, the tests and the audit it has not had yet, and what stays up to the players.
 */
export default async function SafetyPage() {
  const { t, plural, language } = await getTranslation();
  const contract = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const tests = contractTestsLabel(plural, language);

  return (
    <ProsePage title={t('safety.title')} intro={t('safety.intro')}>
      <ProseSection title={t('safety.contract.title')} text={t('safety.contract.text')}>
        <p className={PROSE_TEXT}>
          <a
            href={explorerLink(DEFAULT_CHAIN_ID, 'address', contract) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="link inline-block py-2.5 [overflow-wrap:anywhere]"
          >
            {t('safety.contract.link')}: <span className="text-body-sm tabular-nums">{contract}</span>
          </a>
        </p>
      </ProseSection>
      <ProseSection title={t('safety.limits.title')} text={t('safety.limits.text', { days: emergencyDelayLabel(plural, language) })} />
      <ProseSection title={t('safety.payouts.title')} text={t('safety.payouts.text')} />
      <ProseSection title={t('safety.tests.title')}>
        <p className={PROSE_TEXT}>
          {t('safety.tests.text', { tests, coverage: formatPercent(contractCoverage.percent, language) })}
        </p>
      </ProseSection>
      <ProseSection title={t('safety.wallet.title')} text={t('safety.wallet.text')} />
      <ProseSection title={t('safety.players.title')} text={t('safety.players.text')} />
    </ProsePage>
  );
}
