'use client';

import { useRef, type KeyboardEvent, type Ref } from 'react';
import { GainRing } from '@/components/header/GainRing';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useBalanceFigure } from '@/hooks/useBalanceFigure';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { cn, formatEth, formatUSDT } from '@/lib/utils';
import { readingFigure } from '@/lib/walletBalances';

/** Arrow keys move between the networks, as in any radio group. */
const ARROW_STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
/** Past this many characters a balance is set smaller, to stay in its tile (USD₮0 has 6 decimals). */
const LONG_FIGURE = 6;

interface NetworkTilesProps {
  networks: NetworkBalances[];
  pickedId: number;
  onPick: (chainId: number) => void;
}

/**
 * The balance on each network, a tile each, picked as a radio group: Top up and Send act on the
 * picked one, and an ink frame slides to it. The tiles share their rows, so the figures line up
 * whatever the networks' names.
 */
export function NetworkTiles({ networks, pickedId, onPick }: NetworkTilesProps) {
  const { t } = useTranslation();
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const picked = Math.max(0, networks.findIndex((network) => network.chain.id === pickedId));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEP[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (picked + step + networks.length) % networks.length;
    onPick(networks[next].chain.id);
    tiles.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('wallet.pick')}
      onKeyDown={onKeyDown}
      style={{ '--pick': picked, '--count': networks.length }}
      className="relative mt-1 grid grid-cols-[repeat(var(--count),minmax(0,1fr))] grid-rows-[repeat(3,auto)_1fr] gap-x-(--gap) [--gap:0.5rem]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-1 w-[calc((100%-(var(--count)-1)*var(--gap))/var(--count))] translate-x-[calc(var(--pick)*(100%+var(--gap)))] rounded-tile border-2 border-ink transition-[translate] duration-450 ease-spring"
      />
      {networks.map((network, index) => (
        <NetworkTile
          key={network.chain.id}
          ref={(tile) => {
            tiles.current[index] = tile;
          }}
          network={network}
          isPicked={index === picked}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

interface NetworkTileProps {
  ref: Ref<HTMLButtonElement>;
  network: NetworkBalances;
  isPicked: boolean;
  onPick: (chainId: number) => void;
}

/** One network's balance: the figure counts to a new amount, and a float says by how much. */
function NetworkTile({ ref, network, isPicked, onPick }: NetworkTileProps) {
  const { t, language } = useTranslation();
  const { figure, change } = useBalanceFigure(network.usdt);
  const isGain = change !== null && change.delta > 0n;

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isPicked}
      tabIndex={isPicked ? 0 : -1}
      onClick={() => onPick(network.chain.id)}
      className="relative row-span-4 grid min-w-0 cursor-pointer grid-rows-subgrid justify-items-start gap-y-1 rounded-tile border-[1.5px] border-line bg-paper p-3 text-left text-ink transition-colors hover:border-line-strong aria-checked:border-transparent aria-checked:bg-canvas"
    >
      <span className="flex min-w-0 items-start gap-2">
        <span aria-hidden="true" className="relative mt-px size-[18px] flex-none rounded-full border-2 border-line-strong bg-paper">
          <span
            className={cn(
              'absolute -inset-0.5 rounded-full border-[5px] border-ink transition-[opacity,scale] duration-300 ease-spring',
              isPicked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
          />
        </span>
        <b className="text-body-sm/[1.25] font-strong">{network.chain.name}</b>
      </span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-1 tabular-nums">
        <b
          key={change?.id}
          className={cn(
            'font-extrabold',
            figure.length > LONG_FIGURE ? 'text-lg/[1.1] tracking-[-0.02em]' : 'text-2xl/[1.1] tracking-[-0.03em]',
            change && !isGain && 'animate-bump'
          )}
        >
          {figure}
        </b>
        <small className="text-xs font-label text-ink-3">USDT</small>
      </span>
      <span className="inline-flex items-center gap-1 text-note whitespace-nowrap text-ink-3 tabular-nums">
        <Icon name="fuel" className="size-3.5" />
        {t('wallet.eth', { amount: readingFigure(network.eth, (wei) => formatEth(wei, language)) })}
      </span>
      <span className="mt-1 flex flex-wrap gap-1 self-end">
        {network.chain.testnet && (
          <Chip className="h-[22px] bg-orange-soft px-2 text-xs text-orange-ink">{t('wallet.testnet')}</Chip>
        )}
      </span>
      {network.chain.id === DEFAULT_CHAIN_ID && (
        <Chip className="absolute -top-[11px] right-2.5 z-2 gap-[3px] bg-good-soft text-good-ink ring-2 ring-paper">
          <Icon name="check" className="size-3 stroke-3" />
          {t('wallet.duelsHere')}
        </Chip>
      )}
      {change && (
        <>
          {isGain && <GainRing key={`ring-${change.id}`} className="-inset-[1.5px] rounded-tile border-[1.5px]" />}
          <span
            key={change.id}
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-2.5 right-2.5 z-2 animate-float-up rounded-full px-2 py-0.5 text-note font-extrabold text-paper tabular-nums',
              isGain ? 'bg-good' : 'bg-ink'
            )}
          >
            {isGain ? '+' : '−'}
            {formatUSDT(isGain ? change.delta : -change.delta, language)}
          </span>
        </>
      )}
    </button>
  );
}
