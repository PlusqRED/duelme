'use client';

import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { ReputationMark } from '@/lib/reputation';

/**
 * What a duel just added to a player's record, popping in under their seat: green for a duel seen
 * through, orange-edged paper for one walked away from. On a phone it may wrap, without its icon.
 */
export function RepChip({ mark }: { mark: ReputationMark }) {
  const { t } = useTranslation();

  return (
    <Chip
      data-mark={mark}
      className="animate-pop gap-1.5 bg-good-ink pr-[9px] pl-[7px] text-xs font-bold text-paper data-[mark=abandoned]:bg-paper data-[mark=abandoned]:text-orange-ink data-[mark=abandoned]:inset-ring-[1.5px] data-[mark=abandoned]:inset-ring-orange-edge max-xs:h-auto max-xs:min-h-[22px] max-xs:rounded-[10px] max-xs:px-2 max-xs:py-[3px] max-xs:text-center max-xs:leading-[1.2] max-xs:whitespace-normal"
    >
      <Icon name={mark === 'honored' ? 'check' : 'x'} className="size-[13px] stroke-[2.6] max-xs:hidden" />
      {t(mark === 'honored' ? 'rep.honoredTag' : 'rep.abandonedTag')}
    </Chip>
  );
}
