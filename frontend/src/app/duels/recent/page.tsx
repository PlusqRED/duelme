import { RecentDuelsBoard } from '@/components/duels/RecentDuelsBoard';
import { readSearchParam, SEARCH_PARAM } from '@/lib/searchQuery';

interface RecentDuelsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The recent duels; `?q=` opens it searched, as the site's search action does. */
export default async function RecentDuelsPage({ searchParams }: RecentDuelsPageProps) {
  const params = await searchParams;
  return <RecentDuelsBoard initialQuery={readSearchParam(params[SEARCH_PARAM])} />;
}
