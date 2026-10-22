import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AnalyticsChoice } from '@/components/analytics/AnalyticsChoice';
import { PageColumn } from '@/components/layout/PageColumn';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVELOPER_EMAIL } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t('privacy.title'), alternates: { canonical: '/privacy' } };
}

const PRIVY_POLICY_URL = 'https://www.privy.io/privacy-policy';

interface PrivacySectionProps {
  title: string;
  children: ReactNode;
}

function PrivacySection({ title, children }: PrivacySectionProps) {
  return (
    <section className="grid gap-2.5 border-t border-line pt-6">
      <h2 className="text-lead">{title}</h2>
      {children}
    </section>
  );
}

/** What DuelMe keeps about a visitor and where, and the visitor's answer on analytics. */
export default async function PrivacyPage() {
  const { t } = await getTranslation();
  const text = 'max-w-[68ch] text-body text-pretty text-ink-2';

  return (
    <PageColumn className="grid max-w-[760px] gap-7">
      <header className="grid gap-2">
        <h1 className="text-h1 hyphens-auto [overflow-wrap:anywhere]">{t('privacy.title')}</h1>
        <p className="text-body-sm text-ink-3">{t('privacy.updated')}</p>
        <p className={text}>{t('privacy.intro')}</p>
      </header>

      <PrivacySection title={t('privacy.chain.title')}>
        <p className={text}>{t('privacy.chain.text')}</p>
      </PrivacySection>

      <PrivacySection title={t('privacy.account.title')}>
        <p className={text}>{t('privacy.account.text')}</p>
        <p className={text}>
          <a href={PRIVY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="link">
            {t('privacy.account.link')}
          </a>
        </p>
      </PrivacySection>

      <PrivacySection title={t('privacy.profile.title')}>
        <p className={text}>{t('privacy.profile.text')}</p>
      </PrivacySection>

      <PrivacySection title={t('privacy.analytics.title')}>
        <p className={text}>{t('privacy.analytics.text')}</p>
        <p className={text}>{t('privacy.analytics.consent')}</p>
      </PrivacySection>

      <PrivacySection title={t('privacy.browser.title')}>
        <p className={text}>{t('privacy.browser.text')}</p>
      </PrivacySection>

      <PrivacySection title={t('privacy.choice.title')}>
        <p className={text}>{t('privacy.choice.text')}</p>
        <AnalyticsChoice />
      </PrivacySection>

      <PrivacySection title={t('privacy.rights.title')}>
        <p className={text}>
          {t('privacy.rights.text')}{' '}
          <a href={`mailto:${DEVELOPER_EMAIL}`} className="link">
            {DEVELOPER_EMAIL}
          </a>
          . {t('privacy.rights.chain')}
        </p>
      </PrivacySection>
    </PageColumn>
  );
}
