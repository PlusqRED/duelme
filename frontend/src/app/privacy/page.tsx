import type { Metadata } from 'next';
import { AnalyticsChoice } from '@/components/analytics/AnalyticsChoice';
import { ProsePage } from '@/components/layout/ProsePage';
import { PROSE_TEXT, ProseSection } from '@/components/layout/ProseSection';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVELOPER_EMAIL } from '@/lib/constants';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/privacy', title: t('privacy.title'), description: t('seo.privacy.description') });
}

const PRIVY_POLICY_URL = 'https://www.privy.io/privacy-policy';

/** What DuelMe keeps about a visitor and where, and the visitor's answer on analytics. */
export default async function PrivacyPage() {
  const { t } = await getTranslation();

  return (
    <ProsePage title={t('privacy.title')} note={t('privacy.updated')} intro={t('privacy.intro')}>
      <ProseSection title={t('privacy.chain.title')} text={t('privacy.chain.text')} />

      <ProseSection title={t('privacy.account.title')} text={t('privacy.account.text')}>
        <p className={PROSE_TEXT}>
          <a href={PRIVY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="link">
            {t('privacy.account.link')}
          </a>
        </p>
      </ProseSection>

      <ProseSection title={t('privacy.profile.title')} text={t('privacy.profile.text')} />

      <ProseSection title={t('privacy.analytics.title')} text={t('privacy.analytics.text')}>
        <p className={PROSE_TEXT}>{t('privacy.analytics.consent')}</p>
      </ProseSection>

      <ProseSection title={t('privacy.browser.title')} text={t('privacy.browser.text')} />

      <ProseSection title={t('privacy.choice.title')} text={t('privacy.choice.text')}>
        <AnalyticsChoice />
      </ProseSection>

      <ProseSection title={t('privacy.rights.title')}>
        <p className={PROSE_TEXT}>
          {t('privacy.rights.text')}{' '}
          <a href={`mailto:${DEVELOPER_EMAIL}`} className="link">
            {DEVELOPER_EMAIL}
          </a>
          . {t('privacy.rights.chain')}
        </p>
      </ProseSection>
    </ProsePage>
  );
}
