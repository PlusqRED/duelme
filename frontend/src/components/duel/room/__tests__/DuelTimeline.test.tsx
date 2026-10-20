// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DuelTimeline, timelineEvents } from '@/components/duel/room/DuelTimeline';
import { translations } from '@/i18n/translations';

afterEach(cleanup);

const en = translations.en;
const HOUR = 3600;
const UNSET = { createdAt: 1000n, fundedAt: 0n, cancelRequestedAt: 0n, claimTimestamp: 0n, finalizedAt: 0n };

describe('timelineEvents', () => {
  it('has only the creation for a duel nobody joined', () => {
    expect(timelineEvents(UNSET, 'created', HOUR).map((event) => event.key)).toEqual(['duel.timelineCreated']);
  });

  it('adds the time to answer running out, an hour after the report', () => {
    const duel = { ...UNSET, fundedAt: 1100n, claimTimestamp: 1200n };

    const events = timelineEvents(duel, 'timeout', HOUR);

    expect(events.map((event) => event.key)).toEqual([
      'duel.timelineCreated',
      'duel.timelineAccepted',
      'duel.timelineResultSubmitted',
      'duel.timelineTimedOut',
    ]);
    expect(events.at(-1)?.timestamp).toBe(1200n + BigInt(HOUR));
  });

  it.each([
    ['resolved', 'duel.timelineResolved'],
    ['refunded', 'duel.timelineRefunded'],
    ['cancelled', 'duel.timelineCancelled'],
    ['declined', 'duel.timelineDeclined'],
    ['disputed', 'duel.timelineDisputed'],
    ['mutual', 'duel.timelineMutuallyCancelled'],
  ] as const)('names how a %s duel ended', (phase, key) => {
    const events = timelineEvents({ ...UNSET, finalizedAt: 2000n }, phase, HOUR);

    expect(events.at(-1)).toMatchObject({ key, timestamp: 2000n });
  });

  it('lists a request to call the duel off', () => {
    const events = timelineEvents({ ...UNSET, fundedAt: 1100n, cancelRequestedAt: 1300n }, 'cancelReq', HOUR);

    expect(events.at(-1)?.key).toBe('duel.timelineCancellationRequested');
  });
});

describe('DuelTimeline', () => {
  it('lists each moment under its heading', () => {
    render(<DuelTimeline duel={{ ...UNSET, fundedAt: 1100n }} phase="funded" claimTimeout={HOUR} />);

    expect(screen.getByRole('heading', { name: en['duel.timelineTitle'] })).toBeTruthy();
    expect(screen.getAllByRole('listitem').map((item) => item.querySelector('span span:last-child')?.textContent)).toEqual([
      en['duel.timelineCreated'],
      en['duel.timelineAccepted'],
    ]);
  });
});
