// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameStepBody } from '@/components/duel/create/GameStepBody';
import { translations } from '@/i18n/translations';
import type { Game, GameCategory } from '@/lib/game';

afterEach(cleanup);

const en = translations.en;

const game = (slug: string, name: string, category: GameCategory, duelCount: number): Game => ({
  slug,
  name,
  iconUrl: null,
  category,
  duelCount,
  createdAt: null,
  updatedAt: null,
});

const CATALOG = [
  game('chess', 'Chess', 'STRATEGY', 1),
  game('cs-2', 'CS 2', 'FPS', 2),
  game('dota-2', 'Dota 2', 'MOBA', 2),
  game('wow-midnight', 'Wow Midnight', 'OTHER', 3),
];

function body(picked: Game | null = null) {
  const onPick = vi.fn();
  render(<GameStepBody catalog={CATALOG} picked={picked} isOpen onPick={onPick} />);
  return onPick;
}

const search = () => screen.getByRole('searchbox', { name: en['create.game.search'] });

describe('GameStepBody', () => {
  it('offers the most played games first', () => {
    body();

    const names = screen.getAllByRole('button', { pressed: false }).map((button) => button.querySelector('strong')?.textContent);
    expect(names.slice(0, 2)).toEqual(['Wow Midnight', 'CS 2']);
  });

  it('marks the picked game', () => {
    body(CATALOG[0]);

    expect(screen.getByRole('button', { pressed: true }).textContent).toContain('Chess');
  });

  it('picks a game pressed', () => {
    const onPick = body();

    fireEvent.click(screen.getByRole('button', { name: /Dota 2/ }));

    expect(onPick).toHaveBeenCalledWith(CATALOG[2]);
  });

  it('picks the one game left with Enter', () => {
    const onPick = body();
    fireEvent.change(search(), { target: { value: 'chess' } });

    fireEvent.keyDown(search(), { key: 'Enter' });

    expect(onPick).toHaveBeenCalledWith(CATALOG[0]);
  });

  it('offers to add a game nothing matches', () => {
    body();

    fireEvent.change(search(), { target: { value: 'Tekken 8' } });

    expect(screen.getByText(en['gamePicker.noMatches'].replace('{query}', 'Tekken 8'))).toBeTruthy();
    expect(screen.getByRole('button', { name: en['create.game.addNamed'].replace('{query}', 'Tekken 8') })).toBeTruthy();
  });

  it('adds a new game under its category and picks it', () => {
    const onPick = body();
    fireEvent.change(search(), { target: { value: 'Tekken 8' } });
    fireEvent.click(screen.getByRole('button', { name: en['create.game.addNamed'].replace('{query}', 'Tekken 8') }));

    fireEvent.click(screen.getByRole('button', { name: en['category.FIGHTING'] }));
    fireEvent.click(screen.getByRole('button', { name: en['create.game.submit'] }));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tekken 8', category: 'FIGHTING', slug: 'new:tekken8' }));
  });

  it('picks the catalog’s game for a name it has, however spelled', () => {
    const onPick = body();
    fireEvent.click(screen.getByRole('button', { name: en['create.game.add'] }));

    fireEvent.change(screen.getByLabelText(en['createGame.name']), { target: { value: 'cs2' } });
    fireEvent.click(screen.getByRole('button', { name: en['category.OTHER'] }));
    fireEvent.click(screen.getByRole('button', { name: en['create.game.submit'] }));

    expect(onPick).toHaveBeenCalledWith(CATALOG[1]);
  });

  it('waits for a category before adding', () => {
    body();
    fireEvent.click(screen.getByRole('button', { name: en['create.game.add'] }));

    fireEvent.change(screen.getByLabelText(en['createGame.name']), { target: { value: 'Tekken 8' } });

    expect((screen.getByRole('button', { name: en['create.game.submit'] }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(en['createGame.categoryRequired'])).toBeTruthy();
  });

  it('goes back to the link that opened the form when it is cancelled', () => {
    body();
    fireEvent.click(screen.getByRole('button', { name: en['create.game.add'] }));

    fireEvent.click(screen.getByRole('button', { name: en['create.game.cancel'] }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: en['create.game.add'] }));
  });
});
