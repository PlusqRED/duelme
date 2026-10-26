import type { Metadata } from 'next';
import { ProsePage } from '@/components/layout/ProsePage';
import { PROSE_TEXT, ProseSection } from '@/components/layout/ProseSection';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVLOG_HANDLE, DEVLOG_URL } from '@/lib/constants';
import { pageMetadata } from '@/lib/pageMetadata';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/about', title: t('seo.about.title'), description: t('seo.about.description') });
}

/** Who makes DuelMe and why, where it stands, and how to reach its developer. */
export default async function AboutPage() {
  const { t } = await getTranslation();

  return (
    <ProsePage title={t('about.title')} intro={t('about.intro')}>
      <ProseSection title={t('about.why.title')} text={t('about.why.text')} />
      <ProseSection title={t('about.who.title')} text={t('about.who.text')} />
      <ProseSection title={t('about.status.title')} text={t('about.status.text')} />
      <ProseSection title={t('about.contact.title')}>
        <p className={cn(PROSE_TEXT, 'flex flex-wrap items-center gap-x-2')}>
          <a href={DEVLOG_URL} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-11 items-center">
            {t('about.contact.devlog')}
          </a>
          <span className="text-ink-3 [overflow-wrap:anywhere]">{DEVLOG_HANDLE}</span>
        </p>
      </ProseSection>
    </ProsePage>
  );
}
