'use client';

import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { MoneyKind } from '@/lib/arenaView';
import { formatUSDT } from '@/lib/utils';

const kinds: Record<MoneyKind, { icon: IconName; key: TranslationKey }> = {
  ready: { icon: 'wallet', key: 'room.money.ready' },
  back: { icon: 'undo', key: 'room.money.back' },
  done: { icon: 'check', key: 'room.money.done' },
  returned: { icon: 'check', key: 'room.money.returned' },
};

/**
 * What the contract pays a player once the duel is over, under their seat: a win to take in the
 * sun, a stake to take back on paper, green once taken. On a phone it may wrap, without its icon.
 */
export function MoneyChip({ kind, raw }: { kind: MoneyKind; raw: bigint }) {
  const { t, language } = useTranslation();

  return (
    <Chip
      data-kind={kind}
      className="h-[26px] animate-pop gap-[5px] pr-2.5 pl-2 text-xs font-strong data-[kind=back]:bg-paper data-[kind=back]:text-ink-2 data-[kind=back]:inset-ring-[1.5px] data-[kind=back]:inset-ring-line-strong data-[kind=done]:bg-good-soft data-[kind=done]:text-good-ink data-[kind=ready]:bg-sun-soft data-[kind=ready]:text-sun-ink data-[kind=ready]:inset-ring-[1.5px] data-[kind=ready]:inset-ring-sun data-[kind=returned]:bg-good-soft data-[kind=returned]:text-good-ink max-xs:h-auto max-xs:min-h-[22px] max-xs:rounded-[10px] max-xs:px-2 max-xs:py-[3px] max-xs:text-center max-xs:text-micro max-xs:leading-[1.2] max-xs:whitespace-normal"
    >
      <Icon name={kinds[kind].icon} className="size-3.5 max-xs:hidden" />
      {t(kinds[kind].key, { amount: `${formatUSDT(raw, language)} USDT` })}
    </Chip>
  );
}
