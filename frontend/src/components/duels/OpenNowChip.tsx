'use client';

import { Chip } from '@/components/ui/chip';
import { useTranslation } from '@/i18n/useTranslation';

/** How many public duels are open, with a blue dot breathing like an open seat; nothing while none is. */
export function OpenNowChip({ count }: { count: number }) {
  const { t } = useTranslation();

  if (count === 0) {
    return null;
  }
  return (
    <Chip className="h-8 gap-2 bg-blue-soft pr-[13px] pl-[11px] text-sm font-bold text-blue-deep before:size-2 before:animate-breathe before:rounded-full before:bg-blue before:opacity-40">
      {t('publicDuels.openNow', { n: count })}
    </Chip>
  );
}
