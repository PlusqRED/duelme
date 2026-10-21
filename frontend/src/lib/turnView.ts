import type { TranslationKey } from '@/i18n/translations';
import type { Duel } from '@/lib/contracts';
import { seatOf, type SeatSide } from '@/lib/duel';
import type { DuelPhase } from '@/lib/duelPhase';
import { addressOf, otherSide, playedTurn, waitingTurn, type Draft } from '@/lib/turnPhases';

type Address = `0x${string}`;

/** Whose move the panel says it is: the reader's, the other player's, nobody's to make here, or none at all. */
export type TurnWhose = 'you' | 'them' | 'watch' | 'over';

/** The colour the panel takes: the seat it talks to, the winner's sun, or none for a reader who only watches. */
export type TurnTone = SeatSide | 'sun' | 'quiet';

export type TurnActionId =
  | 'join'
  | 'topUp'
  | 'decline'
  | 'signIn'
  | 'browse'
  | 'cancel'
  | 'callOff'
  | 'withdraw'
  | 'agree'
  | 'keepPlaying'
  | 'won'
  | 'lost'
  | 'confirm'
  | 'dispute'
  | 'takeBack'
  | 'claimWin'
  | 'newDuel';

export interface TurnAction {
  id: TurnActionId;
  /** The amount its label names: the stake short of a top-up, or the money to take. */
  amountRaw?: bigint;
}

export type TurnBlock =
  | { type: 'actions'; actions: TurnAction[] }
  | { type: 'note'; kind: 'gas' | 'dispute' | 'returned'; key: TranslationKey; amountRaw?: bigint }
  | { type: 'callout'; titleKey: TranslationKey | null; key: TranslationKey; action: TurnAction }
  /** I won and I lost, each saying what it sets off. */
  | { type: 'picks' }
  /** The invite link to send. */
  | { type: 'share' }
  /** Who the reader would play, before they put money in. */
  | { type: 'foe' }
  /** The stake against the reader's wallet. */
  | { type: 'purse' }
  /** That Join opens once the wallet holds the stake. */
  | { type: 'later' }
  /** The time left to answer a reported win. */
  | { type: 'countdown'; noteKey: TranslationKey | null };

export interface TurnPill {
  tone: TurnTone;
  /** The other player's face when it is their move. */
  avatar: Address | null;
  isWatching: boolean;
  /** The move is the reader's, so the dot pulses. */
  isLive: boolean;
}

/** The players the copy names. */
export interface TurnPeople {
  creator: Address;
  /** The other player from the reader's seat; to a watcher of a reported win, the one who has to answer. */
  other: Address | null;
  claimer: Address | null;
  winner: Address | null;
  /** Who let the time to answer run out. */
  late: Address | null;
  /** Who declined the invite. */
  who: Address | null;
}

/** The duel page's "your move" panel, as plain data. */
export interface TurnView {
  /** Changes with the move, not with a redraw in place: a new one swaps in and ignores presses for a moment. */
  key: string;
  whose: TurnWhose;
  tone: TurnTone;
  /** The seat the panel's notch points at. */
  caret: SeatSide | null;
  pill: TurnPill;
  title: TranslationKey;
  /** What the move is about, under the title. */
  text: TranslationKey;
  /** What follows it: the moves, and what the reader needs to make them. */
  blocks: TurnBlock[];
  people: TurnPeople;
}

export interface TurnViewer {
  /** The reader's seat, once signed in; null for anyone else. */
  side: SeatSide | null;
  isSignedIn: boolean;
  /** Holds what the contract asks of a joiner: an open duel needs nothing, a private one its key. */
  hasKey: boolean;
  /** Signed in with a wallet the contract would take as the opponent. */
  canJoin: boolean;
  /** USDT the wallet lacks for the stake; zero while it holds enough or is not known yet. */
  shortRaw: bigint;
  /** DuelMe pays the network fee for duel actions. */
  isRelayed: boolean;
}

export type TurnDuel = Pick<
  Duel,
  | 'creator'
  | 'opponent'
  | 'invitedOpponent'
  | 'inviteHash'
  | 'wagerAmount'
  | 'claimedBy'
  | 'claimedWinner'
  | 'cancelRequestedBy'
  | 'creatorPayout'
  | 'opponentPayout'
  | 'creatorClaimed'
  | 'opponentClaimed'
>;

/**
 * What the panel under the arena says to this reader in this phase, and the moves it offers: only
 * those the contract would take from them now. The creator shares the link or cancels; a reader who
 * could join sees who they would play and their stake against their wallet; the players report,
 * answer and take their money; anyone else watches. `isGameNamed` is false for a duel created
 * without a game's name, which the copy then leaves out.
 */
export function turnView(duel: TurnDuel, phase: DuelPhase, viewer: TurnViewer, isGameNamed = true): TurnView {
  const you = viewer.side;
  const claimer = seatOf(duel, duel.claimedBy);
  const responder = claimer ? otherSide(claimer) : null;
  const winner = seatOf(duel, duel.claimedWinner);
  const people: TurnPeople = {
    creator: duel.creator,
    other: you ? addressOf(duel, otherSide(you)) : null,
    claimer: claimer ? addressOf(duel, claimer) : null,
    winner: winner ? addressOf(duel, winner) : null,
    late: phase === 'refunded' && responder ? addressOf(duel, responder) : null,
    who: phase === 'declined' ? addressOf(duel, 'opponent') : null,
  };
  if (!you && phase === 'claimed' && responder) people.other = addressOf(duel, responder);

  const draft = phase === 'created' ? waitingTurn(duel, viewer) : playedTurn(duel, phase, viewer, { claimer, winner });
  return {
    ...draft,
    // A duel made without a game's name is played in "your match", not "in {game}".
    text: draft.text === 'room.funded.player.text' && !isGameNamed ? 'room.funded.player.textUnnamed' : draft.text,
    key: `${phase}|${you ?? (viewer.isSignedIn ? 'in' : 'out')}|${viewer.hasKey}|${draft.whose}`,
    pill: pillOf(duel, draft, you),
    people,
  };
}

/** The pill over the title: whose colour, and the other player's face while the move is theirs. */
function pillOf(duel: TurnDuel, draft: Draft, you: SeatSide | null): TurnPill {
  const pill: TurnPill = { tone: 'quiet', avatar: null, isWatching: draft.whose === 'watch', isLive: draft.whose === 'you' };
  if (draft.whose === 'you') {
    pill.tone = draft.tone === 'sun' ? 'sun' : (draft.caret ?? draft.tone);
  } else if (draft.whose === 'them' && you) {
    pill.tone = otherSide(you);
    pill.avatar = addressOf(duel, pill.tone);
  } else if (draft.tone === 'sun') {
    pill.tone = 'sun';
  }
  return pill;
}
