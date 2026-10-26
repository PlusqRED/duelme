import type { Metadata } from 'next';
import { PROSE_TEXT, ProsePage, ProseSection } from '@/components/layout/Prose';
import { getLanguage, getTranslation } from '@/i18n/serverTranslation';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { CONTRACT_TESTS, contractCoverage } from '@/lib/contractFacts';
import { explorerLink } from '@/lib/explorer';
import { pageMetadata } from '@/lib/pageMetadata';
import { formatCount, formatPercent } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/safety', title: t('seo.safety.title'), description: t('seo.safety.description') });
}

/**
 * Where the money sits and what keeps it there: the contract to check, what DuelMe cannot do with
 * it, the tests and the audit it has not had yet, and what stays up to the players.
 */
export default async function SafetyPage() {
  const { t, plural } = await getTranslation();
  const language = await getLanguage();
  const contract = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const tests = `${formatCount(CONTRACT_TESTS, language)} ${plural('trust.tests', CONTRACT_TESTS)}`;

  return (
    <ProsePage title={t('safety.title')} intro={t('safety.intro')}>
      <ProseSection title={t('safety.contract.title')}>
        <p className={PROSE_TEXT}>{t('safety.contract.text')}</p>
        <p className={PROSE_TEXT}>
          <a
            href={explorerLink(DEFAULT_CHAIN_ID, 'address', contract) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="link [overflow-wrap:anywhere]"
          >
            {t('safety.contract.link')}: <span className="text-body-sm tabular-nums">{contract}</span>
          </a>
        </p>
      </ProseSection>
      <ProseSection title={t('safety.limits.title')}>
        <p className={PROSE_TEXT}>{t('safety.limits.text')}</p>
      </ProseSection>
      <ProseSection title={t('safety.payouts.title')}>
        <p className={PROSE_TEXT}>{t('safety.payouts.text')}</p>
      </ProseSection>
      <ProseSection title={t('safety.tests.title')}>
        <p className={PROSE_TEXT}>
          {t('safety.tests.text', { tests, coverage: formatPercent(contractCoverage.percent, language) })}
        </p>
      </ProseSection>
      <ProseSection title={t('safety.wallet.title')}>
        <p className={PROSE_TEXT}>{t('safety.wallet.text')}</p>
      </ProseSection>
      <ProseSection title={t('safety.players.title')}>
        <p className={PROSE_TEXT}>{t('safety.players.text')}</p>
      </ProseSection>
    </ProsePage>
  );
}
