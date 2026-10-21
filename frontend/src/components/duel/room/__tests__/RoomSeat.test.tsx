// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomSeat } from '@/components/duel/room/RoomSeat';
import { translations } from '@/i18n/translations';
import type { ArenaSeat } from '@/lib/arenaView';
import { getReputationSummaryFromStats } from '@/lib/reputation';

afterEach(cleanup);

const en = translations.en;
const PLAYER = '0x32a3000000000000000000000000000000aa23';
const QUIET: ArenaSeat = { say: null, timer: null, money: null, marks: [], isWinner: false };

function seat(overrides: Partial<Parameters<typeof RoomSeat>[0]> = {}) {
  return (
    <RoomSeat
      side="opponent"
      seat={QUIET}
      address={PLAYER}
      name="0x32a3...aa23"
      isYou={false}
      level={undefined}
      note={null}
      clock={null}
      gain={undefined}
      faceRef={createRef()}
      {...overrides}
    />
  );
}

describe('RoomSeat', () => {
  it('keeps a small seat on a dashboard card to the name, without the address and level under it', () => {
    render(seat({ isYou: true, name: en['room.you'], level: getReputationSummaryFromStats(4, 0), isCompact: true }));

    expect(screen.queryByText('0x32a3...aa23')).toBeNull();
    expect(screen.queryByTitle(en['room.rep.stats'].replace('{honored}', '4').replace('{abandoned}', '0'))).toBeNull();
  });

  it('shows an open seat until someone joins', () => {
    const { container } = render(seat({ address: null, name: en['sim.openSeat'] }));

    expect(screen.getByText(en['sim.openSeat']).className).toContain('text-blue-deep');
    expect(container.querySelector('.border-dashed')).not.toBeNull();
  });

  it('calls the reader’s seat You, with their address under it', () => {
    render(seat({ isYou: true, name: en['room.you'] }));

    expect(screen.getByText(en['room.you']).closest('p')?.className).toContain('bg-ink');
    expect(screen.getByText('0x32a3...aa23')).toBeTruthy();
  });

  it('leads from the player’s name to their profile', () => {
    render(seat());

    expect(screen.getByRole('link', { name: '0x32a3...aa23' }).getAttribute('href')).toBe(`/profile/${PLAYER}`);
  });

  it('leaves an open seat’s name unlinked', () => {
    render(seat({ address: null, name: en['sim.openSeat'] }));

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the player’s level while the duel runs, with their record on hover', () => {
    render(seat({ level: getReputationSummaryFromStats(4, 0) }));

    const level = screen.getByTitle(en['room.rep.stats'].replace('{honored}', '4').replace('{abandoned}', '0'));
    expect(level.textContent).not.toBe('');
  });

  it('says what the player says, in words with an icon', () => {
    const { container } = render(seat({ seat: { ...QUIET, say: 'dispute' } }));

    expect(screen.getByText(en['sim.say.dispute'])).toBeTruthy();
    expect(container.querySelector('p svg')).not.toBeNull();
  });

  it('carries the creator’s note while nobody has said anything', () => {
    render(seat({ side: 'creator', note: '2300 ELO' }));

    expect(screen.getByText('“2300 ELO”')).toBeTruthy();
  });

  it('counts down the time to answer over the player who has to answer', () => {
    render(seat({ seat: { ...QUIET, timer: 'running' }, clock: { left: 0.5, text: '30:00' } }));

    expect(screen.getByText(en['room.timer.left'].replace('{time}', '30:00'))).toBeTruthy();
  });

  it('says the time is up once it ran out', () => {
    render(seat({ seat: { ...QUIET, timer: 'up' }, clock: null }));

    expect(screen.getByText(en['sim.timeUp'])).toBeTruthy();
  });

  it('shows the money and the record a finished duel left the player', () => {
    render(seat({ seat: { ...QUIET, money: { kind: 'ready', raw: 198_000_000n }, marks: ['honored'] } }));

    expect(screen.getByText(en['rep.honoredTag'])).toBeTruthy();
    expect(document.querySelector('[data-kind="ready"]')).not.toBeNull();
  });

  it('lets money that just came in rise off the face', () => {
    render(seat({ gain: { raw: 198_000_000n, id: 1 } }));

    expect(document.querySelector('.animate-float-up')?.textContent).toContain('198');
  });

  it('shows the reader sitting down in an open seat while they point at Join', () => {
    render(seat({ address: null, name: en['sim.openSeat'], takeable: { isTaking: true, purse: null, onTake: null } }));

    expect(screen.getByText(en['room.you']).className).toContain('opacity-100');
  });

  it('keeps an open seat empty for a reader who could not take it', () => {
    render(seat({ address: null, name: en['sim.openSeat'] }));

    expect(screen.queryByText(en['room.you'])).toBeNull();
  });

  it('carries the wallet’s USDT under an open seat the reader could take, orange when it falls short', () => {
    render(seat({ address: null, name: en['sim.openSeat'], takeable: { isTaking: false, purse: { text: '2 USDT', isShort: true }, onTake: null } }));

    expect(screen.getByText('2 USDT').className).toContain('text-orange-ink');
  });

  it('makes the panel’s move at a press on an open seat the reader could take, under a hand', () => {
    const onTake = vi.fn();
    const faceRef = createRef<HTMLSpanElement>();
    render(seat({ address: null, name: en['sim.openSeat'], faceRef, takeable: { isTaking: false, purse: null, onTake } }));

    fireEvent.click(faceRef.current!);

    expect(onTake).toHaveBeenCalledTimes(1);
    expect(faceRef.current?.className).toContain('cursor-pointer');
  });

  it('leaves an open seat with no move to make unpressable', () => {
    const faceRef = createRef<HTMLSpanElement>();
    render(seat({ address: null, name: en['sim.openSeat'], faceRef, takeable: { isTaking: false, purse: null, onTake: null } }));

    expect(faceRef.current?.className).not.toContain('cursor-pointer');
  });

  it('shows the creator a no-entry sign over their own duel’s open seat, and why', () => {
    render(seat({ address: null, name: en['sim.openSeat'], isOwnOpen: true }));

    const face = screen.getByTitle(en['room.openSeat.own']);
    expect(face.style.cursor).toContain('not-allowed');
    expect(face.className).not.toContain('cursor-pointer');
  });

  it('keeps the no-entry sign off every other seat', () => {
    render(seat({ address: null, name: en['sim.openSeat'] }));

    expect(screen.queryByTitle(en['room.openSeat.own'])).toBeNull();
  });
});
