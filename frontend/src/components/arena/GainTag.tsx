'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatUSDT } from '@/lib/utils';

interface GainTagProps {
  /** The USDT that just came in, in the token's base units. */
  amount: bigint;
  className?: string;
}

/** Money that just came in, rising off what it landed on. The caller places it. */
export function GainTag({ amount, className }: GainTagProps) {
  const { language } = useTranslation();

  return (
    <span
      className={cn(
        'animate-float-up rounded-full bg-sun px-[9px] py-[3px] text-note font-extrabold whitespace-nowrap text-ink',
        className
      )}
    >
      +{formatUSDT(amount, language)}&nbsp;USDT
    </span>
  );
}
