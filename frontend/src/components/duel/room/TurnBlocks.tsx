'use client';

import { type ComponentProps } from 'react';
import { InviteLinkBox } from '@/components/duel/room/InviteLinkBox';
import { TurnActionButton, TurnActions, type TurnMoves } from '@/components/duel/room/TurnActions';
import { TurnCountdown } from '@/components/duel/room/TurnCountdown';
import { TurnFoe } from '@/components/duel/room/TurnFoe';
import { TurnPicks } from '@/components/duel/room/TurnPicks';
import { NeedsList } from '@/components/sign/NeedsList';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useTranslation } from '@/i18n/useTranslation';
import type { TurnBlock } from '@/lib/turnView';
import { cn, formatUSDT } from '@/lib/utils';

type NoteKind = Extract<TurnBlock, { type: 'note' }>['kind'];

/** A note's icon, green where it is good news (no ETH needed, a stake back), quiet beside a warning. */
const noteLooks: Record<NoteKind, { icon: IconName; tone: string }> = {
  gas: { icon: 'fuel', tone: 'text-good' },
  returned: { icon: 'check', tone: 'text-good' },
  dispute: { icon: 'x', tone: 'text-ink-3' },
};

interface TurnBlocksProps {
  blocks: TurnBlock[];
  moves: TurnMoves;
  share: ComponentProps<typeof InviteLinkBox>;
  foe: ComponentProps<typeof TurnFoe>;
  purse: NonNullable<ComponentProps<typeof NeedsList>['usdt']>;
  countdown: Omit<ComponentProps<typeof TurnCountdown>, 'note'>;
}

/** What follows the panel's title, block by block: the moves and what the reader needs to make them. */
export function TurnBlocks({ blocks, moves, share, foe, purse, countdown }: TurnBlocksProps) {
  const { t, language } = useTranslation();

  return blocks.map((block) => {
    switch (block.type) {
      case 'actions':
        return <TurnActions key={block.type} actions={block.actions} {...moves} />;
      case 'note': {
        const look = noteLooks[block.kind];
        const vars = block.amountRaw === undefined ? moves.vars : { ...moves.vars, amount: formatUSDT(block.amountRaw, language) };
        return (
          <p key={block.type} className="flex items-start gap-2 text-body-sm text-ink-2">
            <Icon name={look.icon} className={cn('mt-0.5 size-[18px]', look.tone)} />
            <span>{t(block.key, vars)}</span>
          </p>
        );
      }
      case 'callout':
        return (
          <div
            key={block.type}
            className="grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-dashed border-line-strong pt-4 min-[700px]:grid-cols-[minmax(0,1fr)_auto] min-[700px]:items-center"
          >
            <div>
              {block.titleKey && <h3 className="text-base font-strong">{t(block.titleKey)}</h3>}
              <p className="mt-0.5 text-body-sm text-ink-2">{t(block.key, moves.vars)}</p>
            </div>
            <TurnActionButton action={block.action} {...moves} className="justify-self-start" />
          </div>
        );
      case 'picks':
        return <TurnPicks key={block.type} vars={moves.vars} onMove={moves.onMove} isBusy={moves.isBusy} />;
      case 'share':
        return <InviteLinkBox key={block.type} {...share} />;
      case 'foe':
        return <TurnFoe key={block.type} {...foe} />;
      case 'purse':
        return <NeedsList key={block.type} usdt={purse} />;
      case 'later':
        return (
          <p key={block.type} className="text-sm text-ink-3">
            {t('room.purse.later', moves.vars)}
          </p>
        );
      case 'countdown':
        return <TurnCountdown key={block.type} {...countdown} note={block.noteKey && t(block.noteKey)} />;
    }
  });
}
