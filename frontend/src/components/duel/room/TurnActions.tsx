'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { Spinner } from '@/components/ui/spinner';
import type { TurnMove } from '@/hooks/useDuelTurnActions';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { TurnAction, TurnActionId } from '@/lib/turnView';
import { cn, formatUSDT } from '@/lib/utils';

interface ActionLook {
  key: TranslationKey;
  icon?: IconName;
  /** Navy for every action, paper beside it, sun only to take the winnings. */
  variant: 'navy' | 'paper' | 'sun';
}

/** The two ways somewhere else rather than a move in this duel. */
const links = { browse: '/duels/public', newDuel: '/duel/create' } as const;

const looks: Record<TurnActionId, ActionLook> = {
  join: { key: 'room.action.join', icon: 'lock', variant: 'navy' },
  topUp: { key: 'room.action.topUp', icon: 'plus', variant: 'navy' },
  decline: { key: 'room.action.decline', icon: 'x', variant: 'paper' },
  signIn: { key: 'room.action.signIn', icon: 'login', variant: 'navy' },
  browse: { key: 'hero.browse', variant: 'paper' },
  cancel: { key: 'room.action.cancel', icon: 'x', variant: 'paper' },
  callOff: { key: 'room.action.callOff', icon: 'pause', variant: 'paper' },
  withdraw: { key: 'room.action.withdraw', icon: 'undo', variant: 'paper' },
  agree: { key: 'room.action.agree', icon: 'check', variant: 'navy' },
  keepPlaying: { key: 'room.action.keepPlaying', icon: 'gamepad', variant: 'paper' },
  won: { key: 'room.action.won', icon: 'trophy', variant: 'navy' },
  lost: { key: 'room.action.lost', icon: 'flag', variant: 'paper' },
  confirm: { key: 'room.action.confirm', icon: 'check', variant: 'navy' },
  dispute: { key: 'room.action.dispute', icon: 'x', variant: 'paper' },
  takeBack: { key: 'room.action.takeBack', icon: 'undo', variant: 'navy' },
  claimWin: { key: 'room.action.claimWin', icon: 'wallet', variant: 'sun' },
  newDuel: { key: 'hero.cta', variant: 'paper' },
};

export interface TurnMoves {
  /** The copy's names and amounts, the same for every line of the panel. */
  vars: TranslationParams;
  onMove: (move: TurnMove) => void;
  /** The answer on its way, whose button turns. */
  pending: TurnMove | null;
  /** A move is under way, so no button starts another. */
  isBusy: boolean;
  /** Join arrives in Top up's place once money covered the stake, and takes the focus. */
  isJoinArriving?: boolean;
  /** Pointing at Join, or at signing in to join, shows the reader sitting down in the open seat. */
  onPreviewJoin?: (isPreviewing: boolean) => void;
}

interface TurnActionButtonProps extends TurnMoves {
  action: TurnAction;
  className?: string;
}

/** One move as a keycap, or a link that looks like one. */
export function TurnActionButton({ action, vars, onMove, pending, isBusy, isJoinArriving, onPreviewJoin, className }: TurnActionButtonProps) {
  const { t, language } = useTranslation();
  const look = looks[action.id];
  const joinRef = useRef<HTMLButtonElement>(null);
  const isJoin = action.id === 'join';
  // Taking the seat, signed in or about to be, shows the reader in it.
  const previews = isJoin || action.id === 'signIn';
  const label = t(look.key, action.amountRaw === undefined ? vars : { ...vars, amount: formatUSDT(action.amountRaw, language) });

  useEffect(() => {
    if (isJoin && isJoinArriving) joinRef.current?.focus({ preventScroll: true });
  }, [isJoin, isJoinArriving]);

  useEffect(() => {
    if (!previews || !onPreviewJoin) return undefined;
    return () => onPreviewJoin(false);
  }, [previews, onPreviewJoin]);

  if (action.id === 'browse' || action.id === 'newDuel') {
    return (
      <Link href={links[action.id]} className={cn(buttonVariants({ variant: look.variant, size: 'lg' }), className)}>
        {look.icon && <Icon name={look.icon} />}
        {label}
      </Link>
    );
  }
  const move = action.id;
  const preview = previews && onPreviewJoin ? (isPreviewing: boolean) => () => onPreviewJoin(isPreviewing) : null;
  return (
    <Button
      ref={isJoin ? joinRef : undefined}
      size="lg"
      variant={look.variant}
      data-action={move}
      disabled={isBusy}
      onClick={() => onMove(move)}
      onPointerEnter={preview?.(true)}
      onPointerLeave={preview?.(false)}
      onFocus={preview?.(true)}
      onBlur={preview?.(false)}
      className={cn(isJoin && isJoinArriving && 'animate-arrive', className)}
    >
      {pending === move ? <Spinner /> : look.icon && <Icon name={look.icon} />}
      {label}
    </Button>
  );
}

interface TurnActionsProps extends TurnMoves {
  actions: TurnAction[];
}

/** A row of moves; on a phone each takes the whole width. */
export function TurnActions({ actions, ...moves }: TurnActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {actions.map((action) => (
        <TurnActionButton key={action.id} action={action} {...moves} className="max-xs:flex-[1_1_100%]" />
      ))}
    </div>
  );
}
