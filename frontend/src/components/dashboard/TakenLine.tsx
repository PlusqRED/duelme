'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { formatUSDT } from '@/lib/utils';

interface TakenLineProps {
  /** In USDT's smallest unit. */
  raw: bigint;
  /** The signing window has closed: the line takes the focus that Take, now gone, held. */
  isSettled: boolean;
}

/** Where the safe stood, once it is emptied: a quiet line that the money is in the wallet now. */
export function TakenLine({ raw, isSettled }: TakenLineProps) {
  const { t, language } = useTranslation();
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!isSettled) return;
    // After the window hands the focus back, which it cannot give to a Take that is gone.
    const timer = setTimeout(() => ref.current?.focus());
    return () => clearTimeout(timer);
  }, [isSettled]);

  return (
    <p
      ref={ref}
      tabIndex={-1}
      className="flex items-center gap-2.5 rounded-[20px] bg-paper px-[18px] py-4 font-bold text-good-ink ring-[1.5px] ring-good ring-inset outline-offset-3"
    >
      <Icon name="check" className="size-[22px] stroke-[2.6]" />
      {t('dash.tray.taken', { amount: formatUSDT(raw, language) })}
    </p>
  );
}
