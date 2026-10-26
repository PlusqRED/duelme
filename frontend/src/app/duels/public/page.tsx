import type { Metadata } from 'next';
import { OpenDuelsBoard } from '@/components/duels/OpenDuelsBoard';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/duels/public', title: t('seo.public.title'), description: t('seo.public.description') });
}

export default function PublicDuelsPage() {
  return <OpenDuelsBoard />;
}
