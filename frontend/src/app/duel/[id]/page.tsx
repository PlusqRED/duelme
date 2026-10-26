import type { Metadata } from 'next';
import { DuelNotFound } from '@/components/duel/room/DuelNotFound';
import { DuelRoom } from '@/components/duel/room/DuelRoom';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';

interface DuelPageProps {
  params: Promise<{ id: string }>;
}

/** A duel id as the address carries it: whole digits only, small enough to stay exact as a number. */
function parseDuelId(id: string): number | null {
  const value = Number(id);
  return /^\d+$/.test(id) && Number.isSafeInteger(value) ? value : null;
}

/** One duel is no search result, but an invite shared in a chat shows its number and what it asks. */
export async function generateMetadata({ params }: DuelPageProps): Promise<Metadata> {
  const { id } = await params;
  const duelId = parseDuelId(id);
  const { t } = await getTranslation();
  return pageMetadata({
    path: `/duel/${id}`,
    title: duelId === null ? t('notFound.title') : t('seo.duel.title', { id: duelId }),
    description: t('seo.duel.description'),
  });
}

export default async function DuelPage({ params }: DuelPageProps) {
  const duelId = parseDuelId((await params).id);
  return duelId === null ? <DuelNotFound /> : <DuelRoom duelId={duelId} />;
}
