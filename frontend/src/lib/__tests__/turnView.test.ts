import { describe, expect, it } from 'vitest';
import type { Duel } from '@/lib/contracts';
import { turnView, type TurnBlock } from '@/lib/turnView';
import { duelView } from './helpers/duelView';
import { CREATOR, OPPONENT, PRIVATE_HASH, creator, joined, joiner, opponent, spectator, viewer } from './helpers/turnViewers';

const STAKE = 5_000_000n;

/** A win `winner` reported, against the other player. */
function claimedBy(winner: `0x${string}`, overrides: Partial<Duel> = {}): Duel {
  return joined({ claimedBy: winner, claimedWinner: winner, ...overrides });
}

function actionsOf(blocks: TurnBlock[]) {
  return blocks.flatMap((block) => (block.type === 'actions' ? block.actions : block.type === 'callout' ? [block.action] : []));
}

function typesOf(blocks: TurnBlock[]) {
  return blocks.map((block) => block.type);
}

describe('turnView while the duel waits for an opponent', () => {
  it('asks the creator to send the link, with cancelling as the quiet way out', () => {
    const view = turnView(duelView(), 'created', creator);

    expect(view).toMatchObject({ whose: 'them', tone: 'creator', caret: 'creator', title: 'room.created.creator.title' });
    expect(typesOf(view.blocks)).toEqual(['share', 'callout']);
    expect(actionsOf(view.blocks)).toEqual([{ id: 'cancel' }]);
  });

  it('shows the creator the empty seat’s colour as the move they wait on', () => {
    expect(turnView(duelView(), 'created', creator).pill).toEqual({ tone: 'opponent', avatar: null, isWatching: false, isLive: false });
  });

  it('asks a signed-out reader with the link to sign in to join', () => {
    const view = turnView(duelView(), 'created', viewer());

    expect(view).toMatchObject({ whose: 'you', tone: 'opponent', caret: 'opponent', text: 'room.created.signedout.text' });
    expect(typesOf(view.blocks)).toEqual(['foe', 'actions']);
    expect(actionsOf(view.blocks)).toEqual([{ id: 'signIn' }]);
  });

  it('tells a reader whose link lacks its key that only the full link lets them in', () => {
    const view = turnView(duelView({ inviteHash: PRIVATE_HASH }), 'created', viewer({ isSignedIn: true, hasKey: false }));

    expect(view).toMatchObject({ whose: 'watch', caret: null, title: 'room.created.nokey.title' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'browse' }]);
    expect(view.pill.isWatching).toBe(true);
  });

  it('holds the stake against the wallet of a reader who can join, then offers Join', () => {
    const view = turnView(duelView(), 'created', joiner);

    expect(typesOf(view.blocks)).toEqual(['foe', 'purse', 'actions', 'note']);
    expect(actionsOf(view.blocks)).toEqual([{ id: 'join' }]);
  });

  it('puts Top up in Join’s place while the wallet is short, with when Join opens', () => {
    const view = turnView(duelView(), 'created', viewer({ isSignedIn: true, canJoin: true, shortRaw: 1_500_000n }));

    expect(actionsOf(view.blocks)).toEqual([{ id: 'topUp', amountRaw: 1_500_000n }]);
    expect(typesOf(view.blocks)).toContain('later');
  });

  it('lets the reader decline a private duel', () => {
    const view = turnView(duelView({ inviteHash: PRIVATE_HASH }), 'created', joiner);

    expect(actionsOf(view.blocks)).toEqual([{ id: 'join' }, { id: 'decline' }]);
  });

  it('lets the named opponent decline a duel addressed to them', () => {
    const view = turnView(duelView({ invitedOpponent: OPPONENT }), 'created', joiner);

    expect(actionsOf(view.blocks).map((action) => action.id)).toContain('decline');
  });

  it('says DuelMe pays the network fee while it relays', () => {
    expect(turnView(duelView(), 'created', joiner).blocks).toContainEqual({ type: 'note', kind: 'gas', key: 'room.gasless' });
  });

  it('says the wallet pays the network fee when DuelMe does not relay', () => {
    const view = turnView(duelView(), 'created', viewer({ isSignedIn: true, canJoin: true, isRelayed: false }));

    expect(view.blocks).toContainEqual({ type: 'note', kind: 'gas', key: 'room.gasSelf' });
  });

  it('offers nothing to a signed-in reader the contract would not take', () => {
    expect(typesOf(turnView(duelView(), 'created', spectator).blocks)).toEqual(['foe']);
  });
});

describe('turnView while the match is on', () => {
  it('asks a player to report the result, with calling it off as the quiet way out', () => {
    const view = turnView(joined(), 'funded', opponent);

    expect(view).toMatchObject({ whose: 'you', tone: 'opponent', caret: 'opponent', title: 'room.funded.player.title' });
    expect(typesOf(view.blocks)).toEqual(['picks', 'callout']);
    expect(actionsOf(view.blocks)).toEqual([{ id: 'callOff' }]);
  });

  it('leaves a watcher only watching', () => {
    expect(turnView(joined(), 'funded', spectator)).toMatchObject({ whose: 'watch', caret: null, blocks: [] });
  });

  it('plays an unnamed game as the players’ match', () => {
    expect(turnView(joined(), 'funded', opponent, false).text).toBe('room.funded.player.textUnnamed');
  });
});

describe('turnView while a request to call it off is open', () => {
  it('lets the player who asked withdraw, while the other one’s face says whose move it is', () => {
    const view = turnView(joined({ cancelRequestedBy: CREATOR }), 'cancelReq', creator);

    expect(view).toMatchObject({ whose: 'them', title: 'room.cancelReq.requester.title' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'withdraw' }]);
    expect(view.pill).toMatchObject({ tone: 'opponent', avatar: OPPONENT });
  });

  it('asks the other player to agree or keep playing', () => {
    const view = turnView(joined({ cancelRequestedBy: CREATOR }), 'cancelReq', opponent);

    expect(view).toMatchObject({ whose: 'you', title: 'room.cancelReq.responder.title' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'agree' }, { id: 'keepPlaying' }]);
  });

  it('tells a watcher the players are deciding', () => {
    expect(turnView(joined({ cancelRequestedBy: CREATOR }), 'cancelReq', spectator).title).toBe('room.cancelReq.watch.title');
  });
});

describe('turnView while a reported win waits for an answer', () => {
  it('shows the player who reported it the clock running for the other one', () => {
    const view = turnView(claimedBy(CREATOR), 'claimed', creator);

    expect(view).toMatchObject({ whose: 'them', title: 'room.claimed.claimer.title' });
    expect(view.blocks).toEqual([{ type: 'countdown', noteKey: 'room.countdown.them' }]);
  });

  it('asks the other player to confirm or dispute against the clock', () => {
    const view = turnView(claimedBy(CREATOR), 'claimed', opponent);

    expect(view).toMatchObject({ whose: 'you', title: 'room.claimed.responder.title' });
    expect(view.blocks[0]).toEqual({ type: 'countdown', noteKey: 'room.countdown.you' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'confirm' }, { id: 'dispute' }]);
    expect(typesOf(view.blocks)).toContain('note');
  });

  it('names to a watcher who reported and who has to answer', () => {
    const view = turnView(claimedBy(OPPONENT), 'claimed', spectator);

    expect(view.blocks).toEqual([{ type: 'countdown', noteKey: null }]);
    expect(view.people).toMatchObject({ claimer: OPPONENT, other: CREATOR });
  });
});

describe('turnView once the time to answer ran out', () => {
  it('offers the player who reported their stake back in one move', () => {
    const view = turnView(claimedBy(CREATOR), 'timeout', creator);

    expect(view).toMatchObject({ whose: 'you', title: 'room.timeout.claimer.title', text: 'room.timeout.claimer.text' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'takeBack', amountRaw: STAKE }]);
  });

  it('tells the player who did not answer that their time ran out', () => {
    expect(turnView(claimedBy(CREATOR), 'timeout', opponent).title).toBe('room.timeout.responder.title');
  });

  it('tells a watcher both stakes can go back', () => {
    expect(turnView(claimedBy(CREATOR), 'timeout', spectator)).toMatchObject({ whose: 'watch', title: 'room.timeout.watch.title' });
  });
});

describe('turnView once the duel has a winner', () => {
  const won = (overrides: Partial<Duel> = {}) => claimedBy(CREATOR, { creatorPayout: STAKE * 2n, ...overrides });

  it('offers the winner their winnings in the sun', () => {
    const view = turnView(won(), 'resolved', creator);

    expect(view).toMatchObject({ whose: 'you', tone: 'sun', text: 'room.resolved.winner.text' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'claimWin' }]);
    expect(view.pill).toMatchObject({ tone: 'sun', isLive: true });
  });

  it('tells the winner their wallet pays the fee when DuelMe does not relay', () => {
    expect(turnView(won(), 'resolved', { ...creator, isRelayed: false }).text).toBe('room.resolved.winner.textSelf');
  });

  it('tells a winner who took the pot it is in their wallet', () => {
    const view = turnView(won({ creatorClaimed: true }), 'resolved', creator);

    expect(view).toMatchObject({ whose: 'over', text: 'room.resolved.winnerDone.text' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'newDuel' }]);
  });

  it('tells the loser who won, with a new duel as the way on', () => {
    const view = turnView(won(), 'resolved', opponent);

    expect(view).toMatchObject({ whose: 'over', tone: 'quiet', title: 'room.resolved.loser.title' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'newDuel' }]);
  });

  it.each([
    [false, 'room.resolved.watch.waiting'],
    [true, 'room.resolved.watch.text'],
  ])('tells a watcher where the pot is once taken: %s', (isTaken, text) => {
    expect(turnView(won({ creatorClaimed: isTaken }), 'resolved', spectator).text).toBe(text);
  });
});

describe('turnView once the duel ended with no winner', () => {
  const backToBoth = { creatorPayout: STAKE, opponentPayout: STAKE };

  it('offers a player their own stake back', () => {
    const view = turnView(claimedBy(CREATOR, backToBoth), 'refunded', creator);

    expect(view).toMatchObject({ whose: 'you', tone: 'creator', title: 'room.refunded.title', text: 'room.refunded.text' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'takeBack', amountRaw: STAKE }]);
  });

  it('names who let the time run out', () => {
    expect(turnView(claimedBy(CREATOR, backToBoth), 'refunded', spectator).people.late).toBe(OPPONENT);
  });

  it('says "you" to the reader who let the time run out', () => {
    expect(turnView(claimedBy(CREATOR, backToBoth), 'refunded', opponent).text).toBe('room.refunded.textYou');
  });

  it('says "you" to the reader who declined, who has nothing to take', () => {
    const view = turnView(joined({ creatorPayout: STAKE }), 'declined', opponent);

    expect(view).toMatchObject({ whose: 'over', text: 'room.declined.textYou' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'newDuel' }]);
  });

  it('tells a player who took their stake back that it is in their wallet', () => {
    const view = turnView(duelView({ creatorPayout: STAKE, creatorClaimed: true }), 'cancelled', creator);

    expect(view.blocks).toEqual([
      { type: 'note', kind: 'returned', key: 'room.back.done', amountRaw: STAKE },
      { type: 'actions', actions: [{ id: 'newDuel' }] },
    ]);
  });

  it('shows a watcher how it ended, with a new duel as the way on', () => {
    const view = turnView(claimedBy(CREATOR, backToBoth), 'disputed', spectator);

    expect(view).toMatchObject({ whose: 'over', caret: null, title: 'room.disputed.title' });
    expect(actionsOf(view.blocks)).toEqual([{ id: 'newDuel' }]);
  });
});

describe('turnView’s key', () => {
  it('changes with the move', () => {
    const before = turnView(claimedBy(CREATOR, { creatorPayout: STAKE * 2n }), 'resolved', creator);
    const after = turnView(claimedBy(CREATOR, { creatorPayout: STAKE * 2n, creatorClaimed: true }), 'resolved', creator);

    expect(after.key).not.toBe(before.key);
  });

  it('stays while only the wallet changes', () => {
    const short = turnView(duelView(), 'created', { ...joiner, shortRaw: 1n });

    expect(turnView(duelView(), 'created', joiner).key).toBe(short.key);
  });
});
