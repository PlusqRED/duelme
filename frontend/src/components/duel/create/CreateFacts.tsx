'use client';

import type { ReactNode } from 'react';
import { DuelFacts, type DuelFact } from '@/components/duel/room/DuelFacts';
import { Icon } from '@/components/ui/icon';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useTranslation } from '@/i18n/useTranslation';
import { AVAILABLE_CHAINS, DUELME_ADDRESSES } from '@/lib/constants';
import type { Game } from '@/lib/game';
import { formatUSDT, truncateAddress } from '@/lib/utils';

interface CreateFactsProps {
  chainId: number;
  game: Game | null;
  /** The stake, in USDT's smallest unit; null while none is set. */
  stakeRaw: bigint | null;
  isPublic: boolean;
  /** Under the facts on a wide screen: the way on. */
  children?: ReactNode;
}

/** The duel's facts as they are set: what is not chosen yet says so, and what is fixed (no fee, the contract) is there from the start. */
export function CreateFacts({ chainId, game, stakeRaw, isPublic, children }: CreateFactsProps) {
  const { t, language } = useTranslation();
  const { isRelayEnabled } = useRelayerStatus(chainId);
  const network = AVAILABLE_CHAINS.find((chain) => chain.id === chainId);
  const contract = DUELME_ADDRESSES[chainId];
  const unset = t('create.ledger.none');

  const rows: DuelFact[] = [
    game ? { label: t('create.ledger.game'), value: game.name } : { label: t('create.ledger.game'), value: unset, tone: 'unset' },
    stakeRaw === null
      ? { label: t('room.ledger.stake'), value: unset, tone: 'unset' }
      : { label: t('room.ledger.stake'), value: t('room.ledger.each', { amount: formatUSDT(stakeRaw, language) }) },
    stakeRaw === null
      ? { label: t('room.ledger.pot'), value: unset, tone: 'unset' }
      : { label: t('room.ledger.pot'), value: `${formatUSDT(stakeRaw * 2n, language)} USDT`, tone: 'pot' },
    {
      label: t('room.ledger.fee'),
      value: (
        <>
          <Icon name="check" className="size-4" />0&nbsp;USDT
        </>
      ),
      tone: 'good',
    },
    { label: t('room.ledger.gas'), value: t(isRelayEnabled ? 'room.ledger.gasValue' : 'room.ledger.gasSelf') },
    { label: t('room.ledger.access'), value: t(isPublic ? 'room.ledger.public' : 'room.ledger.private') },
    { label: t('room.ledger.network'), value: network?.name ?? '' },
    {
      label: t('room.ledger.contract'),
      value: network && (
        <a href={`${network.explorer}/address/${contract}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-deep underline decoration-blue-deep/30 decoration-2 underline-offset-4 hover:decoration-current">
          {truncateAddress(contract)}
          <Icon name="external" className="size-4" />
        </a>
      ),
    },
  ];

  return <DuelFacts rows={rows}>{children}</DuelFacts>;
}
