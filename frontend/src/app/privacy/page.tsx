import type { Metadata } from 'next';
import { AnalyticsChoice } from '@/components/analytics/AnalyticsChoice';
import { PROSE_TEXT, ProsePage, ProseSection } from '@/components/layout/Prose';
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
      <ProseSection title={t('privacy.chain.title')}>
        <p className={PROSE_TEXT}>{t('privacy.chain.text')}</p>
      </ProseSection>

      <ProseSection title={t('privacy.account.title')}>
        <p className={PROSE_TEXT}>{t('privacy.account.text')}</p>
        <p className={PROSE_TEXT}>
          <a href={PRIVY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="link">
            {t('privacy.account.link')}
          </a>
        </p>
      </ProseSection>

      <ProseSection title={t('privacy.profile.title')}>
        <p className={PROSE_TEXT}>{t('privacy.profile.text')}</p>
      </ProseSection>

      <ProseSection title={t('privacy.analytics.title')}>
        <p className={PROSE_TEXT}>{t('privacy.analytics.text')}</p>
        <p className={PROSE_TEXT}>{t('privacy.analytics.consent')}</p>
      </ProseSection>

      <ProseSection title={t('privacy.browser.title')}>
        <p className={PROSE_TEXT}>{t('privacy.browser.text')}</p>
      </ProseSection>

      <ProseSection title={t('privacy.choice.title')}>
        <p className={PROSE_TEXT}>{t('privacy.choice.text')}</p>
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
