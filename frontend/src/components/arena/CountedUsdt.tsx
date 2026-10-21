'use client';

import { useCountUp } from '@/hooks/useCountUp';
import { useTranslation } from '@/i18n/useTranslation';
import { formatUSDT } from '@/lib/utils';

/**
 * An amount counting to each new value, on its own so that each frame of the count redraws the
 * figure alone, not the seat or the stage around it. A new `epoch` shows the value at once.
 */
export function CountedUsdt({ raw, epoch = 0 }: { raw: bigint; epoch?: number }) {
  const { language } = useTranslation();
  return formatUSDT(useCountUp(raw, epoch) ?? raw, language);
}
