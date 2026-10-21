// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/i18n/LanguageContext';
import { translator } from '@/i18n/translate';
import { translations } from '@/i18n/translations';

const config = vi.hoisted(() => ({ claimTimeout: 3600 }));
vi.mock('@/hooks/useContractConfig', () => ({ useContractConfig: () => config }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { DemoDuel } = await import('@/components/landing/DemoDuel');

function demo() {
  return within(screen.getByRole('region', { name: translations.en['sim.title'] }));
}

/** Presses a step, by its name, or an ending. */
async function pick(name: string) {
  await act(async () => {
    fireEvent.click(demo().getByRole('button', { name: new RegExp(`^(\\d )?${name}$`) }));
  });
}

beforeEach(() => {
  config.claimTimeout = 3600;
});

afterEach(cleanup);

describe('DemoDuel', () => {
  it('starts with you, an open seat and an empty safe, and says how to watch', () => {
    render(<DemoDuel />);

    expect(demo().getByText('You')).toBeTruthy();
    expect(demo().getByText('Open seat')).toBeTruthy();
    expect(demo().getByText('Two players, one contract')).toBeTruthy();
    expect(demo().getByRole('button', { name: 'Watch' })).toBeTruthy();
  });

  it('marks the step picked as the current one', async () => {
    render(<DemoDuel />);

    await pick('Join');

    expect(demo().getByRole('button', { name: '2 Join' }).getAttribute('aria-current')).toBe('step');
    expect(demo().getByRole('list', { name: 'Duel steps' }).querySelectorAll('[aria-current]')).toHaveLength(1);
  });

  it('locks both stakes in the safe once the opponent joins', async () => {
    render(<DemoDuel />);

    await pick('Join');

    expect(demo().getByText('Opponent')).toBeTruthy();
    expect(demo().getByText('Locked')).toBeTruthy();
    expect(demo().getByText('20')).toBeTruthy();
  });

  it('gives the opponent the contract’s own time to answer a reported win, in words', async () => {
    config.claimTimeout = 2 * 3600;
    render(<DemoDuel />);

    await pick('Report');

    expect(demo().getByText('I won')).toBeTruthy();
    expect(demo().getByText(/to respond$/).textContent).toBe('2\u00a0hours to respond');
    expect(demo().getByText(/^You report that you won/).textContent).toContain('has 2\u00a0hours to confirm');
  });

  it('shows the ending picked, pressed, with what it added to each record', async () => {
    render(<DemoDuel />);

    await pick('Stays silent');

    expect(demo().getByRole('button', { name: 'Stays silent' }).getAttribute('aria-pressed')).toBe('true');
    expect(demo().getByText('Time’s up')).toBeTruthy();
    expect(demo().getByText('+1 honored')).toBeTruthy();
    expect(demo().getByText('+1 abandoned')).toBeTruthy();
    expect(demo().getByRole('button', { name: 'Watch again' })).toBeTruthy();
  });

  it('pays the winner the whole pot when the opponent confirms', async () => {
    render(<DemoDuel />);

    await pick('Confirms');

    expect(demo().getByText('Paid out')).toBeTruthy();
    expect(demo().getAllByText('60')).toHaveLength(1);
    expect(demo().getAllByText('+1 honored')).toHaveLength(2);
  });

  it('presses no ending before the last step', async () => {
    render(<DemoDuel />);

    await pick('Play');

    expect(demo().getByRole('group', { name: 'What does your opponent do?' }).querySelectorAll('[aria-pressed=true]')).toHaveLength(0);
  });

  it('speaks Russian with the timeout agreeing with its number', async () => {
    render(
      <LanguageContext.Provider value={{ language: 'ru', ...translator('ru') }}>
        <DemoDuel />
      </LanguageContext.Provider>
    );
    const region = within(screen.getByRole('region', { name: translations.ru['sim.title'] }));

    await act(async () => {
      fireEvent.click(region.getByRole('button', { name: '4 Результат' }));
    });

    expect(region.getByText(/на ответ$/).textContent).toBe('1\u00a0час на ответ');
  });
});
