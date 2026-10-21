'use client';

import type { ReactNode } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatUSDT, truncateAddress } from '@/lib/utils';

/** The made-up wallet the phone signs in with: a face and an address, never a real one. */
const SAMPLE_WALLET = '0x7c1e000000000000000000000000000000009b42';

/** The phone's main button, navy on its edge like the real one. */
export const MAIN_MOCK = 'border-ink bg-ink text-paper shadow-[0_3px_0_var(--color-ink-edge)]';

interface PartProps {
  /** Its place on the screen: the parts come in one after another. */
  index: number;
  isPlaying: boolean;
  children: ReactNode;
}

export function Part({ index, isPlaying, children }: PartProps) {
  return (
    <div
      style={{ '--delay': `${200 + index * 70}ms` }}
      className={cn('relative', isPlaying && 'animate-swap [animation-delay:var(--delay)]')}
    >
      {children}
    </div>
  );
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 mb-1 text-xl font-extrabold tracking-[-0.02em]">{children}</p>;
}

export function ScreenNote({ children }: { children: ReactNode }) {
  return <p className="text-center text-note text-ink-3">{children}</p>;
}

interface MockButtonProps {
  glyph: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A button drawn on the phone: the screen acts the step out, it is not there to press. */
export function MockButton({ glyph, children, className }: MockButtonProps) {
  return (
    <span
      className={cn(
        'relative flex min-h-12 items-center gap-2.5 overflow-hidden rounded-[14px] border-[1.5px] border-line bg-paper px-4 text-body-sm font-label',
        className
      )}
    >
      {glyph}
      {children}
    </span>
  );
}

interface WalletCardProps {
  balance: bigint;
  /** The wallet was just made: its "made for you" chip pops in. */
  isNew: boolean;
}

export function WalletCard({ balance, isNew }: WalletCardProps) {
  const { t, language } = useTranslation();
  return (
    <div className="relative grid gap-1 rounded-[20px] bg-ink p-4 text-paper shadow-safe">
      <div className="mb-1.5 flex items-center justify-between">
        <Avatar address={SAMPLE_WALLET} tone="red" className="size-[34px]" />
        <Chip
          className={cn('h-[26px] gap-[5px] bg-sun pr-2.5 pl-2 text-xs font-extrabold text-ink', isNew && 'animate-pop [animation-delay:0.85s]')}
        >
          <Icon name="sparkles" className="size-3.5" />
          {t('start.mock.created')}
        </Chip>
      </div>
      <p className="text-sm font-semibold text-paper/70 tabular-nums">{truncateAddress(SAMPLE_WALLET)}</p>
      <p className="text-figure/[1.1] font-extrabold tabular-nums">
        {formatUSDT(balance, language)}
        <small className="ml-[5px] text-note font-label tracking-normal opacity-70">USDT</small>
      </p>
    </div>
  );
}
