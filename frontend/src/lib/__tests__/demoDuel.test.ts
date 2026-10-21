import { describe, expect, it } from 'vitest';
import { actorsFirst, clockLeft, DEMO_STAKE_RAW, demoStage, demoStatus, hasActed, pauseClock, resumeClock, startClock, vaultTotal } from '@/lib/demoDuel';

describe('demoStage', () => {
  it('starts with both wallets full and the safe empty and open', () => {
    const stage = demoStage(0, null);

    expect(stage.wallets).toEqual({ creator: 50_000_000n, opponent: 50_000_000n });
    expect(vaultTotal(stage)).toBe(0n);
    expect(stage.isLocked).toBe(false);
  });

  it('moves the creator\'s stake into the safe as the duel is made', () => {
    const stage = demoStage(1, null);

    expect(stage.wallets.creator).toBe(40_000_000n);
    expect(vaultTotal(stage)).toBe(DEMO_STAKE_RAW);
    expect(stage.isJoined).toBe(false);
  });

  it('locks both stakes once the opponent joins, until the end', () => {
    for (const step of [2, 3, 4]) {
      const stage = demoStage(step, null);
      expect(vaultTotal(stage)).toBe(20_000_000n);
      expect(stage.isLocked).toBe(true);
    }
  });

  it('shows the match only while it is played, and the reported win with its running time after', () => {
    expect(demoStage(3, null).isPlaying).toBe(true);
    expect(demoStage(4, null)).toMatchObject({ isPlaying: false, timer: 'running', says: { creator: 'won', opponent: null } });
  });

  it('pays the whole pot to the winner when the opponent confirms, and both earn honor', () => {
    const stage = demoStage(5, 'confirm');

    expect(stage.wallets).toEqual({ creator: 60_000_000n, opponent: 40_000_000n });
    expect(stage).toMatchObject({ vault: 'paid', hasWinner: true, marks: { creator: ['honored'], opponent: ['honored'] } });
    expect(vaultTotal(stage)).toBe(0n);
  });

  it('gives each their stake back after a dispute, with reputation unchanged', () => {
    const stage = demoStage(5, 'dispute');

    expect(stage.wallets).toEqual({ creator: 50_000_000n, opponent: 50_000_000n });
    expect(stage).toMatchObject({ vault: 'returned', says: { opponent: 'dispute' }, marks: { creator: [], opponent: [] } });
  });

  it('gives the stakes back when time runs out, and the silent side an abandoned', () => {
    const stage = demoStage(5, 'timeout');

    expect(stage).toMatchObject({ vault: 'returned', timer: 'up', marks: { creator: ['honored'], opponent: ['abandoned'] } });
  });

  it('ends as confirmed when no ending is named', () => {
    expect(demoStage(5, null)).toEqual(demoStage(5, 'confirm'));
  });
});

describe('actorsFirst', () => {
  it('lets the players act while the money stays put', () => {
    const from = demoStage(1, null);
    const to = demoStage(2, null);

    const beat = actorsFirst(from, to);

    expect(beat.isJoined).toBe(true);
    expect(beat.wallets).toEqual(from.wallets);
    expect(beat.staked).toEqual(from.staked);
    expect(beat.isLocked).toBe(false);
  });
});

describe('hasActed', () => {
  it('sees a join, a word or the clock running out, and not a move of money alone', () => {
    expect(hasActed(demoStage(1, null), demoStage(2, null))).toBe(true);
    expect(hasActed(demoStage(4, null), demoStage(5, 'dispute'))).toBe(true);
    expect(hasActed(demoStage(0, null), demoStage(1, null))).toBe(false);
  });
});

describe('demoStatus', () => {
  it('names each step with the app\'s own words for the duel\'s state', () => {
    expect(demoStatus(1, null)).toEqual({ state: 'duel.waiting', tone: 'waiting', desc: 'sim.desc.1' });
    expect(demoStatus(4, null).state).toBe('duel.waitingConfirm');
  });

  it('names the ending at the last step', () => {
    expect(demoStatus(5, 'timeout')).toEqual({ state: 'duel.responseTimedOut', tone: 'idle', desc: 'sim.desc.timeout' });
    expect(demoStatus(5, 'confirm').tone).toBe('paid');
  });
});

describe('step clock', () => {
  it('testClockLeftCountsDownWhileRunning', () => {
    expect(clockLeft(startClock(1, 1000), 2500, 4800)).toBe(3300);
  });

  it('testClockLeftHoldsWhilePaused', () => {
    const paused = pauseClock(startClock(1, 1000), 2000);

    expect(clockLeft(paused, 9000, 4800)).toBe(3800);
  });

  it('testClockLeftGoesOnFromWhereItPaused', () => {
    const resumed = resumeClock(pauseClock(startClock(1, 1000), 2000), 9000);

    expect(clockLeft(resumed, 9500, 4800)).toBe(3300);
  });

  it('testClockLeftNeverGoesBelowZero', () => {
    expect(clockLeft(startClock(1, 0), 9000, 4800)).toBe(0);
  });

  it('testPauseAndResumeClockAreIdempotent', () => {
    const paused = pauseClock(startClock(1, 1000), 2000);
    const running = startClock(1, 1000);

    expect([pauseClock(paused, 5000), resumeClock(running, 5000)]).toEqual([paused, running]);
  });
});
