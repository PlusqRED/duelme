// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnActionButton, TurnActions } from '@/components/duel/room/TurnActions';
import { translations, type TranslationKey } from '@/i18n/translations';

afterEach(cleanup);

const en = translations.en;
const VARS = { wager: '5', pot: '10' };

/** A label as Testing Library reads it: filled in, its non-breaking spaces plain. */
function label(key: TranslationKey, vars: Record<string, string> = VARS) {
  return Object.entries(vars)
    .reduce<string>((text, [token, value]) => text.replace(`{${token}}`, value), en[key])
    .replace(/ /g, ' ');
}

function button(overrides: Partial<ComponentProps<typeof TurnActionButton>> = {}) {
  return <TurnActionButton action={{ id: 'join' }} vars={VARS} onMove={vi.fn()} isBusy={false} {...overrides} />;
}

describe('TurnActionButton', () => {
  it('names the move with the duel’s amounts', () => {
    render(button());

    expect(screen.getByText(label('room.action.join'))).toBeTruthy();
  });

  it('names the amount the move itself carries', () => {
    render(button({ action: { id: 'topUp', amountRaw: 20_000_000n } }));

    expect(screen.getByText(label('room.action.topUp', { amount: '20' }))).toBeTruthy();
  });

  it('makes the move when pressed', () => {
    const onMove = vi.fn();
    render(button({ onMove }));

    fireEvent.click(screen.getByRole('button'));

    expect(onMove).toHaveBeenCalledWith('join');
  });

  it('starts nothing while another move is under way', () => {
    render(button({ isBusy: true }));

    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
  });

  it('leads to the public duels rather than making a move', () => {
    render(button({ action: { id: 'browse' } }));

    expect(screen.getByRole('link').getAttribute('href')).toBe('/duels/public');
  });

  it('leads to a new duel once this one is over', () => {
    render(button({ action: { id: 'newDuel' } }));

    expect(screen.getByRole('link').getAttribute('href')).toBe('/duel/create');
  });

  it('arrives in Top up’s place and takes the focus once money covered the stake', () => {
    render(button({ isJoinArriving: true }));

    expect(screen.getByRole('button').className).toContain('animate-arrive');
    expect(document.activeElement).toBe(screen.getByRole('button'));
  });

  it('shows the reader sitting down while they point at Join', () => {
    const onPreviewJoin = vi.fn();
    render(button({ onPreviewJoin }));

    fireEvent.pointerEnter(screen.getByRole('button'));
    fireEvent.pointerLeave(screen.getByRole('button'));

    expect(onPreviewJoin.mock.calls).toEqual([[true], [false]]);
  });

  it('shows no one sitting down for a move that takes no seat', () => {
    const onPreviewJoin = vi.fn();
    render(button({ action: { id: 'decline' }, onPreviewJoin }));

    fireEvent.pointerEnter(screen.getByRole('button'));

    expect(onPreviewJoin).not.toHaveBeenCalled();
  });
});

describe('TurnActions', () => {
  it('lays the moves out in a row, in order', () => {
    render(<TurnActions actions={[{ id: 'confirm' }, { id: 'dispute' }]} vars={VARS} onMove={vi.fn()} isBusy={false} />);

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual([en['room.action.confirm'], en['room.action.dispute']]);
  });
});
