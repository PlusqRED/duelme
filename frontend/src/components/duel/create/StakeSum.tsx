'use client';

import { Fragment } from 'react';
import { CountedUsdt } from '@/components/arena/CountedUsdt';
import { Stake } from '@/components/arena/Stake';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatUSDT } from '@/lib/utils';

interface StakeSumProps {
  id: string;
  /** The stake, in USDT's smallest unit; null while none is set. */
  raw: bigint | null;
  /** Raised as a stake is set on the slider: the stake runs through the sum, yours, theirs, the winner's. */
  rippleKey: number;
  /** Raised while a drag runs: the winner's sum follows it rather than counting to each step. */
  countEpoch: number;
}

/** The duel in one sum, in the players' colours: yours plus the same from them goes to the winner, and no fee. */
export function StakeSum({ id, raw, rippleKey, countEpoch }: StakeSumProps) {
  const { t, language } = useTranslation();
  const stake = raw === null ? '?' : formatUSDT(raw, language);
  const parts = [
    { key: 'you', label: t('create.math.you'), chip: <Stake side="creator">{stake}</Stake> },
    { key: 'them', label: t('create.math.them'), chip: <Stake side="opponent">{stake}</Stake> },
    {
      key: 'winner',
      label: t('create.math.winner'),
      chip: <Stake side="creator" isPrize>{raw === null ? '?' : <CountedUsdt raw={raw * 2n} epoch={countEpoch} />}</Stake>,
    },
  ];

  return (
    <div id={id} className="flex flex-wrap items-start gap-x-2.5 gap-y-2">
      {parts.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 && (
            <b aria-hidden="true" className={cn('grid h-10 place-items-center text-xl font-bold text-ink-3 transition-opacity duration-300', raw === null && 'opacity-55')}>
              {index === 1 ? '+' : '='}
            </b>
          )}
          <span className="grid justify-items-center gap-1">
            <span
              key={rippleKey}
              className={cn(
                'grid h-10 min-w-[58px] *:h-full *:px-2.5 *:text-base *:transition-opacity *:duration-300',
                raw === null && '*:opacity-55',
                rippleKey > 0 && '*:animate-bump',
                rippleKey > 0 && index === 1 && '*:[animation-delay:70ms]',
                rippleKey > 0 && index === 2 && '*:[animation-delay:140ms]'
              )}
            >
              {part.chip}
            </span>
            <small className="text-xs font-label text-ink-3">{part.label}</small>
          </span>
        </Fragment>
      ))}
      <Chip className="mb-[18px] ml-auto gap-1 self-center bg-good-soft font-bold text-good-ink">
        <Icon name="check" className="size-3.5" />
        {t('create.math.fee')}
      </Chip>
    </div>
  );
}
