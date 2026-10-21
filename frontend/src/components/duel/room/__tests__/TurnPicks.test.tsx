// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnPicks } from '@/components/duel/room/TurnPicks';
import { translations } from '@/i18n/translations';

afterEach(cleanup);

const en = translations.en;
const VARS = { other: 'Bo', timeout: '1 hour', pot: '10' };

describe('TurnPicks', () => {
  it('says what each pick sets off', () => {
    render(<TurnPicks vars={VARS} onMove={vi.fn()} isBusy={false} />);

    expect(screen.getByText('Bo gets 1 hour to confirm')).toBeTruthy();
    expect(screen.getByText(en['room.action.lost.hint'].replace('{pot}', '10').replace('{other}', 'Bo').replace(/ /g, ' '))).toBeTruthy();
  });

  it('reports a win', () => {
    const onMove = vi.fn();
    render(<TurnPicks vars={VARS} onMove={onMove} isBusy={false} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${en['room.action.won']}`) }));

    expect(onMove).toHaveBeenCalledWith('won');
  });

  it('reports a loss', () => {
    const onMove = vi.fn();
    render(<TurnPicks vars={VARS} onMove={onMove} isBusy={false} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${en['room.action.lost']}`) }));

    expect(onMove).toHaveBeenCalledWith('lost');
  });

  it('takes no pick while a move is under way', () => {
    render(<TurnPicks vars={VARS} onMove={vi.fn()} isBusy />);

    expect(screen.getAllByRole<HTMLButtonElement>('button').every((pick) => pick.disabled)).toBe(true);
  });
});
