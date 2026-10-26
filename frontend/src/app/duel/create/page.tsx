import type { Metadata } from 'next';
import { CreateDuelRoom } from '@/components/duel/create/CreateDuelRoom';
import { JsonLd } from '@/components/seo/JsonLd';
import { localePath } from '@/i18n/localePath';
import { getLanguage, getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';
import { breadcrumbSchema } from '@/lib/structuredData';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/duel/create', title: t('seo.create.title'), description: t('seo.create.description') });
}

export default async function CreateDuelPage() {
  const { t } = await getTranslation();
  const language = await getLanguage();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: t('seo.crumb.home'), path: localePath('/', language) },
          { name: t('hero.cta'), path: localePath('/duel/create', language) },
        ])}
      />
      <CreateDuelRoom />
    </>
  );
}
