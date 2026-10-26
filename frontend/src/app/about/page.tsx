import type { Metadata } from 'next';
import { PROSE_TEXT, ProsePage, ProseSection } from '@/components/layout/Prose';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVELOPER_EMAIL, DEVLOG_URL, SOURCE_CODE_URL } from '@/lib/constants';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/about', title: t('seo.about.title'), description: t('seo.about.description') });
}

/** Who makes DuelMe and why, where it stands, and how to reach its developer. */
export default async function AboutPage() {
  const { t } = await getTranslation();
  const contacts = [
    { href: `mailto:${DEVELOPER_EMAIL}`, label: t('about.contact.email'), detail: DEVELOPER_EMAIL },
    { href: DEVLOG_URL, label: t('about.contact.devlog'), detail: DEVLOG_URL.replace('https://', '') },
    { href: SOURCE_CODE_URL, label: t('about.contact.source'), detail: SOURCE_CODE_URL.replace('https://', '') },
  ];

  return (
    <ProsePage title={t('about.title')} intro={t('about.intro')}>
      <ProseSection title={t('about.why.title')}>
        <p className={PROSE_TEXT}>{t('about.why.text')}</p>
      </ProseSection>
      <ProseSection title={t('about.who.title')}>
        <p className={PROSE_TEXT}>{t('about.who.text')}</p>
      </ProseSection>
      <ProseSection title={t('about.status.title')}>
        <p className={PROSE_TEXT}>{t('about.status.text')}</p>
      </ProseSection>
      <ProseSection title={t('about.contact.title')}>
        <ul className="grid gap-2">
          {contacts.map(({ href, label, detail }) => (
            <li key={href} className={PROSE_TEXT}>
              <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className="link">
                {label}
              </a>{' '}
              <span className="text-ink-3">{detail}</span>
            </li>
          ))}
        </ul>
      </ProseSection>
    </ProsePage>
  );
}
