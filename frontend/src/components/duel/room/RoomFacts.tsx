'use client';

import { DuelFacts, type DuelFact } from '@/components/duel/room/DuelFacts';
import { Icon } from '@/components/ui/icon';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import type { Duel } from '@/lib/contracts';
import { isPublicDuel } from '@/lib/invite';
import { formatUSDT, truncateAddress } from '@/lib/utils';

const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
const contractPage = `${DEFAULT_CHAIN.explorer}/address/${contractAddress}`;

interface RoomFactsProps {
  duel: Pick<Duel, 'wagerAmount' | 'inviteHash'>;
}

/**
 * The duel page's facts: the stake each and the pot, the platform's fee of 0, who pays the network
 * fee (DuelMe while it relays, the reader's ETH otherwise), who may join, and the contract that
 * holds the money, to check on the explorer.
 */
export function RoomFacts({ duel }: RoomFactsProps) {
  const { t, language } = useTranslation();
  const { isRelayEnabled } = useRelayerStatus(DEFAULT_CHAIN_ID);
  const rows: DuelFact[] = [
    { label: t('room.ledger.stake'), value: t('room.ledger.each', { amount: formatUSDT(duel.wagerAmount, language) }) },
    { label: t('room.ledger.pot'), value: `${formatUSDT(duel.wagerAmount * 2n, language)} USDT`, tone: 'pot' },
    {
      label: t('room.ledger.fee'),
      value: (
        <>
          <Icon name="check" />0&nbsp;USDT
        </>
      ),
      tone: 'good',
    },
    { label: t('room.ledger.gas'), value: t(isRelayEnabled ? 'room.ledger.gasValue' : 'room.ledger.gasSelf') },
    { label: t('room.ledger.access'), value: t(isPublicDuel(duel.inviteHash) ? 'room.ledger.public' : 'room.ledger.private') },
    { label: t('room.ledger.network'), value: DEFAULT_CHAIN.name },
    {
      label: t('room.ledger.contract'),
      value: (
        <a
          href={contractPage}
          target="_blank"
          rel="noopener noreferrer"
          className="-my-2.5 inline-flex items-center gap-1 py-2.5 whitespace-nowrap text-blue-deep underline decoration-blue-deep/30 decoration-2 underline-offset-4 hover:decoration-current"
        >
          {truncateAddress(contractAddress)}
          <Icon name="external" />
        </a>
      ),
    },
  ];

  return <DuelFacts rows={rows} />;
}
