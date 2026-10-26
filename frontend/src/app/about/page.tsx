import type { Metadata } from 'next';
import { PROSE_TEXT, ProsePage, ProseSection } from '@/components/layout/Prose';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVELOPER_EMAIL, DEVLOG_HANDLE, DEVLOG_URL, SOURCE_CODE_HANDLE, SOURCE_CODE_URL } from '@/lib/constants';
import { pageMetadata } from '@/lib/pageMetadata';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/about', title: t('seo.about.title'), description: t('seo.about.description') });
}

/** Who makes DuelMe and why, where it stands, and how to reach its developer. */
export default async function AboutPage() {
  const { t } = await getTranslation();
  const contacts = [
    { href: `mailto:${DEVELOPER_EMAIL}`, label: t('about.contact.email'), detail: DEVELOPER_EMAIL },
    { href: DEVLOG_URL, label: t('about.contact.devlog'), detail: DEVLOG_HANDLE },
    { href: SOURCE_CODE_URL, label: t('about.contact.source'), detail: SOURCE_CODE_HANDLE },
  ];

  return (
    <ProsePage title={t('about.title')} intro={t('about.intro')}>
      <ProseSection title={t('about.why.title')} text={t('about.why.text')} />
      <ProseSection title={t('about.who.title')} text={t('about.who.text')} />
      <ProseSection title={t('about.status.title')} text={t('about.status.text')} />
      <ProseSection title={t('about.contact.title')}>
        <ul className="grid">
          {contacts.map(({ href, label, detail }) => (
            <li key={href} className={cn(PROSE_TEXT, 'flex flex-wrap items-center gap-x-2')}>
              <a
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="link inline-flex min-h-11 items-center"
              >
                {label}
              </a>
              <span className="text-ink-3 [overflow-wrap:anywhere]">{detail}</span>
            </li>
          ))}
        </ul>
      </ProseSection>
    </ProsePage>
  );
}
