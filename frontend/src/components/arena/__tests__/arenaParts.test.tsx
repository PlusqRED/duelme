// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Bubble } from '@/components/arena/Bubble';
import { Match } from '@/components/arena/Match';
import { MoneyChip } from '@/components/arena/MoneyChip';
import { Safe } from '@/components/arena/Safe';
import { Seat } from '@/components/arena/Seat';
import { Track } from '@/components/arena/Track';
import { translations } from '@/i18n/translations';
import type { MoneyKind } from '@/lib/arenaView';
import type { SafeTone } from '@/lib/duel';

afterEach(cleanup);

const en = translations.en;
const NBSP = String.fromCharCode(0xa0);

function safe(overrides: Partial<Parameters<typeof Safe>[0]> = {}) {
  return (
    <Safe
      filled={{ creator: true, opponent: true }}
      slotRefs={{ creator: createRef(), opponent: createRef() }}
      stakeLabel="99"
      total="198"
      isLocked={false}
      name="Smart contract"
      state={{ label: 'Locked', tone: 'locked' }}
      {...overrides}
    />
  );
}

describe('MoneyChip', () => {
  it.each([
    ['ready', 'room.money.ready'],
    ['back', 'room.money.back'],
    ['done', 'room.money.done'],
    ['returned', 'room.money.returned'],
  ] as const)('says what the contract pays (%s)', (kind: MoneyKind, key) => {
    const { container } = render(<MoneyChip kind={kind} raw={198_000_000n} />);

    expect(container.textContent).toBe(en[key].replace('{amount}', `198${NBSP}USDT`));
  });
});

describe('Match', () => {
  it('sweeps a bar under the match being played', () => {
    const { container } = render(<Match label="Match in Chess" />);

    expect(screen.getByText('Match in Chess')).toBeTruthy();
    expect(container.querySelector('i')?.className).toContain('animate-scan');
  });

  it('stops the bar, striped, while the players talk of calling it off', () => {
    const { container } = render(<Match label="Paused" isPaused />);

    expect(container.querySelector('i')?.className).not.toContain('animate-scan');
  });
});

describe('Track', () => {
  it('lights up in the seat’s colour once its stake is in', () => {
    const { container, rerender } = render(<Track side="opponent" isLit={false} />);
    expect(container.firstElementChild?.className).not.toContain('after:scale-x-100');

    rerender(<Track side="opponent" isLit />);

    expect(container.firstElementChild?.className).toContain('after:scale-x-100');
  });
});

describe('Safe', () => {
  it.each<SafeTone>(['waiting', 'paused', 'unlocked', 'forWinner', 'returning', 'returned'])(
    'tells its styles what it does with the money (%s)',
    (tone) => {
      render(safe({ state: { label: 'state', tone } }));

      expect(screen.getByText('state').getAttribute('data-tone')).toBe(tone);
    }
  );

  it('turns the stakes to the sun once they are the winner’s', () => {
    const { container } = render(safe({ isPayout: true }));

    const stakes = [...container.querySelectorAll('[aria-hidden="true"].grid')].filter((node) => node.textContent === '99');
    expect(stakes).toHaveLength(2);
    stakes.forEach((stake) => expect(stake.className).toContain('bg-sun'));
  });

  it('greys its shut lock while the players talk of calling the duel off', () => {
    const { container } = render(safe({ isLocked: true, state: { label: 'Paused', tone: 'paused' } }));

    expect(container.querySelector('.bg-canvas-deep.rounded-full')).not.toBeNull();
    expect(container.querySelector('.bg-sun.rounded-full.size-10')).toBeNull();
  });
});

describe('Bubble', () => {
  it('carries a player’s own words without an icon, wrapping', () => {
    const { container } = render(
      <Bubble side="creator" kind="note">
        “2300 ELO”
      </Bubble>
    );

    expect(container.querySelector('svg')).toBeNull();
    expect(container.firstElementChild?.className).toContain('whitespace-normal');
  });
});

describe('Seat', () => {
  it('sets the reader’s own name in navy', () => {
    render(
      <Seat face={null} timer={null} isWinner={false} name={en['room.you']} isOpen={false} isYou>
        {null}
      </Seat>
    );

    expect(screen.getByText(en['room.you']).className).toContain('bg-ink');
  });
});
