import type { TranslationKey } from '@/i18n/translations';
import { ZERO_ADDRESS, getClaimableAmountForAddress, seatOf, type SeatSide } from '@/lib/duel';
import type { DuelPhase } from '@/lib/duelPhase';
import { isPublicDuel } from '@/lib/invite';
import type { TurnAction, TurnBlock, TurnDuel, TurnTone, TurnViewer, TurnWhose } from '@/lib/turnView';

/*
 * The panel's moves phase by phase, for `turnView`, which adds what every phase shares: the key,
 * the pill and the people the copy names.
 */

export const otherSide = (side: SeatSide): SeatSide => (side === 'creator' ? 'opponent' : 'creator');

export function addressOf(duel: TurnDuel, side: SeatSide): `0x${string}` | null {
  const address = side === 'creator' ? duel.creator : duel.opponent;
  return address.toLowerCase() === ZERO_ADDRESS ? null : address;
}

function payoutOf(duel: TurnDuel, side: SeatSide): bigint {
  return side === 'creator' ? duel.creatorPayout : duel.opponentPayout;
}

/** What the contract still keeps for `side`: payouts wait there until taken. */
function owedOf(duel: TurnDuel, side: SeatSide): bigint {
  return getClaimableAmountForAddress(duel, addressOf(duel, side));
}

const endings: Partial<Record<DuelPhase, { title: TranslationKey; text: TranslationKey }>> = {
  refunded: { title: 'room.refunded.title', text: 'room.refunded.text' },
  disputed: { title: 'room.disputed.title', text: 'room.disputed.text' },
  mutual: { title: 'room.mutual.title', text: 'room.mutual.text' },
  cancelled: { title: 'room.cancelled.title', text: 'room.cancelled.text' },
  declined: { title: 'room.declined.title', text: 'room.declined.text' },
};

const NEW_DUEL: TurnAction = { id: 'newDuel' };

export interface Draft {
  whose: TurnWhose;
  tone: TurnTone;
  caret: SeatSide | null;
  title: TranslationKey;
  text: TranslationKey;
  blocks: TurnBlock[];
}

function watching(title: TranslationKey, text: TranslationKey): Draft {
  return { whose: 'watch', tone: 'quiet', caret: null, title, text, blocks: [] };
}

/** A duel nobody joined yet: the creator's link, the joiner's stake, or a link that lacks its key. */
export function waitingTurn(duel: TurnDuel, viewer: TurnViewer): Draft {
  if (viewer.side === 'creator') {
    return {
      whose: 'them',
      tone: 'creator',
      caret: 'creator',
      title: 'room.created.creator.title',
      text: 'room.created.creator.text',
      blocks: [
        { type: 'share' },
        { type: 'callout', titleKey: null, key: 'room.created.creator.cancel', action: { id: 'cancel' } },
      ],
    };
  }
  if (!viewer.hasKey) {
    const draft = watching('room.created.nokey.title', 'room.created.nokey.text');
    return { ...draft, blocks: [...draft.blocks, { type: 'actions', actions: [{ id: 'browse' }] }] };
  }
  const text: TranslationKey = viewer.isSignedIn ? 'room.created.guest.text' : 'room.created.signedout.text';
  const blocks: TurnBlock[] = [{ type: 'foe' }];
  if (!viewer.isSignedIn) {
    blocks.push({ type: 'actions', actions: [{ id: 'signIn' }] });
  } else if (viewer.canJoin) {
    const isShort = viewer.shortRaw > 0n;
    const actions: TurnAction[] = [isShort ? { id: 'topUp', amountRaw: viewer.shortRaw } : { id: 'join' }];
    // The contract refuses a decline only where anyone may join: no key and nobody named.
    if (!isPublicDuel(duel.inviteHash) || duel.invitedOpponent.toLowerCase() !== ZERO_ADDRESS) actions.push({ id: 'decline' });
    blocks.push({ type: 'purse' }, { type: 'actions', actions });
    if (isShort) blocks.push({ type: 'later' });
    blocks.push({ type: 'note', kind: 'gas', key: viewer.isRelayed ? 'room.gasless' : 'room.gasSelf' });
  }
  return { whose: 'you', tone: 'opponent', caret: 'opponent', title: 'room.created.guest.title', text, blocks };
}

export interface Seats {
  claimer: SeatSide | null;
  winner: SeatSide | null;
}

/** A duel someone joined: the match, a request to stop, a reported win, and how it ended. */
export function playedTurn(duel: TurnDuel, phase: DuelPhase, viewer: TurnViewer, { claimer, winner }: Seats): Draft {
  const you = viewer.side;
  const as = (draft: Omit<Draft, 'caret'>): Draft => ({ ...draft, caret: you });

  switch (phase) {
    case 'funded':
      if (!you) return watching('room.funded.watch.title', 'room.funded.watch.text');
      return as({
        whose: 'you',
        tone: you,
        title: 'room.funded.player.title',
        text: 'room.funded.player.text',
        blocks: [
          { type: 'picks' },
          { type: 'callout', titleKey: 'room.callOff.title', key: 'room.callOff.text', action: { id: 'callOff' } },
        ],
      });
    case 'cancelReq': {
      if (!you) return watching('room.cancelReq.watch.title', 'room.cancelReq.watch.text');
      if (seatOf(duel, duel.cancelRequestedBy) === you) {
        return as({
          whose: 'them',
          tone: you,
          title: 'room.cancelReq.requester.title',
          text: 'room.cancelReq.requester.text',
          blocks: [{ type: 'actions', actions: [{ id: 'withdraw' }] }],
        });
      }
      return as({
        whose: 'you',
        tone: you,
        title: 'room.cancelReq.responder.title',
        text: 'room.cancelReq.responder.text',
        blocks: [{ type: 'actions', actions: [{ id: 'agree' }, { id: 'keepPlaying' }] }],
      });
    }
    case 'claimed': {
      if (!you) {
        const draft = watching('room.claimed.watch.title', 'room.claimed.watch.text');
        return { ...draft, blocks: [...draft.blocks, { type: 'countdown', noteKey: null }] };
      }
      if (you === claimer) {
        return as({
          whose: 'them',
          tone: you,
          title: 'room.claimed.claimer.title',
          text: 'room.claimed.claimer.text',
          blocks: [{ type: 'countdown', noteKey: 'room.countdown.them' }],
        });
      }
      return as({
        whose: 'you',
        tone: you,
        title: 'room.claimed.responder.title',
        text: 'room.claimed.responder.text',
        blocks: [
          { type: 'countdown', noteKey: 'room.countdown.you' },
          { type: 'actions', actions: [{ id: 'confirm' }, { id: 'dispute' }] },
          { type: 'note', kind: 'dispute', key: 'room.claimed.responder.dispute' },
        ],
      });
    }
    case 'timeout': {
      if (!you) return watching('room.timeout.watch.title', 'room.timeout.watch.text');
      const isClaimer = you === claimer;
      return as({
        whose: 'you',
        tone: you,
        title: isClaimer ? 'room.timeout.claimer.title' : 'room.timeout.responder.title',
        text: isClaimer ? 'room.timeout.claimer.text' : 'room.timeout.responder.text',
        blocks: [{ type: 'actions', actions: [{ id: 'takeBack', amountRaw: duel.wagerAmount }] }],
      });
    }
    case 'resolved':
      return resolvedTurn(duel, viewer, you, winner);
    default:
      return endedTurn(duel, phase, viewer, you, claimer);
  }
}

function resolvedTurn(duel: TurnDuel, viewer: TurnViewer, you: SeatSide | null, winner: SeatSide | null): Draft {
  const isWaiting = !!winner && owedOf(duel, winner) > 0n;
  if (!you) {
    return {
      whose: 'over',
      tone: 'quiet',
      caret: null,
      title: 'room.resolved.watch.title',
      // The pot leaves the contract only when the winner takes it.
      text: isWaiting ? 'room.resolved.watch.waiting' : 'room.resolved.watch.text',
      blocks: [{ type: 'actions', actions: [NEW_DUEL] }],
    };
  }
  if (you === winner) {
    const winText: TranslationKey = viewer.isRelayed ? 'room.resolved.winner.text' : 'room.resolved.winner.textSelf';
    return {
      whose: isWaiting ? 'you' : 'over',
      tone: 'sun',
      caret: you,
      title: 'room.resolved.winner.title',
      text: isWaiting ? winText : 'room.resolved.winnerDone.text',
      blocks: [{ type: 'actions', actions: [isWaiting ? { id: 'claimWin' } : NEW_DUEL] }],
    };
  }
  return {
    whose: 'over',
    tone: 'quiet',
    caret: you,
    title: 'room.resolved.loser.title',
    text: 'room.resolved.loser.text',
    blocks: [{ type: 'actions', actions: [NEW_DUEL] }],
  };
}

/** Every way a duel ends without a winner: each player takes their own stake back. */
function endedTurn(duel: TurnDuel, phase: DuelPhase, viewer: TurnViewer, you: SeatSide | null, claimer: SeatSide | null): Draft {
  const ending = endings[phase];
  if (!ending) {
    throw new Error(`No turn for phase ${phase}`);
  }
  // The copy names who let the time run out or declined; to that reader it says "you".
  const isNamedYou =
    (phase === 'refunded' && !!you && !!claimer && you !== claimer) || (phase === 'declined' && you === 'opponent');
  const text: TranslationKey = !isNamedYou
    ? ending.text
    : phase === 'refunded'
      ? 'room.refunded.textYou'
      : 'room.declined.textYou';
  const draft: Draft = { whose: 'over', tone: you ?? 'quiet', caret: you, title: ending.title, text, blocks: [] };
  if (!you) {
    draft.blocks.push({ type: 'actions', actions: [NEW_DUEL] });
    return draft;
  }
  const owed = owedOf(duel, you);
  const paid = payoutOf(duel, you);
  if (owed > 0n) {
    draft.whose = 'you';
    draft.blocks.push({ type: 'actions', actions: [{ id: 'takeBack', amountRaw: owed }] });
  } else if (paid > 0n) {
    draft.blocks.push({ type: 'note', kind: 'returned', key: 'room.back.done', amountRaw: paid }, { type: 'actions', actions: [NEW_DUEL] });
  } else {
    draft.blocks.push({ type: 'actions', actions: [NEW_DUEL] });
  }
  return draft;
}
