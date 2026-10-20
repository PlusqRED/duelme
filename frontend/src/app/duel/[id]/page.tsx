import { DuelNotFound } from '@/components/duel/room/DuelNotFound';
import { DuelRoom } from '@/components/duel/room/DuelRoom';

/** A duel id as the address carries it: whole digits only, small enough to stay exact as a number. */
function parseDuelId(id: string): number | null {
  const value = Number(id);
  return /^\d+$/.test(id) && Number.isSafeInteger(value) ? value : null;
}

export default async function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const duelId = parseDuelId((await params).id);
  return duelId === null ? <DuelNotFound /> : <DuelRoom duelId={duelId} />;
}
