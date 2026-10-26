import type { Metadata } from 'next';
import { RecentDuelsBoard } from '@/components/duels/RecentDuelsBoard';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';
import { readSearchParam, SEARCH_PARAM } from '@/lib/searchQuery';

interface RecentDuelsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/duels/recent', title: t('seo.recent.title'), description: t('seo.recent.description') });
}

/** The recent duels; `?q=` opens it searched, as a shared search left it. */
export default async function RecentDuelsPage({ searchParams }: RecentDuelsPageProps) {
  const params = await searchParams;
  return <RecentDuelsBoard initialQuery={readSearchParam(params[SEARCH_PARAM])} />;
}
