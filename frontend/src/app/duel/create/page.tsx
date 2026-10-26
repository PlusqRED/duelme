import type { Metadata } from 'next';
import { CreateDuelRoom } from '@/components/duel/create/CreateDuelRoom';
import { JsonLd } from '@/components/seo/JsonLd';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';
import { breadcrumbSchema } from '@/lib/structuredData';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/duel/create', title: t('seo.create.title'), description: t('seo.create.description') });
}

export default async function CreateDuelPage() {
  const { t, language } = await getTranslation();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: t('seo.crumb.home'), path: '/' },
            { name: t('hero.cta'), path: '/duel/create' },
          ],
          language
        )}
      />
      <CreateDuelRoom />
    </>
  );
}
