import type { DuelMeta } from '@/lib/game';

/** A duel's metadata on the dev deployment: played in `gameSlug`, named after it unless said otherwise. */
export function duelMeta(duelId: number, gameSlug: string, overrides: Partial<DuelMeta> = {}): DuelMeta {
  return {
    duelId,
    chainId: 421614,
    contractAddress: '0x588a54fa8c00c8ac003e41bd8ee26fbc8994105f',
    gameSlug,
    gameName: gameSlug,
    category: 'MOBA',
    creatorAddress: '0x1111111111111111111111111111111111111111',
    createdAt: null,
    ...overrides,
  };
}
