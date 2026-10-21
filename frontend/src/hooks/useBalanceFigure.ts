'use client';

import { useBalanceChange } from '@/hooks/useBalanceChange';
import { useCountUp } from '@/hooks/useCountUp';
import { useTranslation } from '@/i18n/useTranslation';
import { formatUSDT } from '@/lib/utils';
import type { BalanceReading } from '@/lib/balanceStatus';
import { readingFigure, readingRaw } from '@/lib/walletBalances';

/**
 * A USDT balance as it moves on screen: the amount once known, the figure counting to it (an
 * ellipsis while it is read, a dash once the read failed), and the last move, to show by how much.
 */
export function useBalanceFigure(reading: BalanceReading) {
  const { language } = useTranslation();
  const raw = readingRaw(reading);
  const shown = useCountUp(raw);
  const change = useBalanceChange(raw);
  const format = (value: bigint) => formatUSDT(value, language);

  return { raw, figure: shown === null ? readingFigure(reading, format) : format(shown), change };
}
