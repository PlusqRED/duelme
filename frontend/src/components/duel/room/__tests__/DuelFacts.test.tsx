// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DuelFacts } from '@/components/duel/room/DuelFacts';
import { translations } from '@/i18n/translations';

afterEach(cleanup);

const en = translations.en;

describe('DuelFacts', () => {
  it('lists each fact as a label and its value under the card’s title', () => {
    render(<DuelFacts rows={[{ label: 'Stake', value: '5 USDT each' }]} />);

    expect(screen.getByRole('region', { name: en['room.ledger.title'] })).toBeTruthy();
    expect(screen.getByText('Stake').tagName).toBe('DT');
    expect(screen.getByText('5 USDT each').tagName).toBe('DD');
  });

  it('marks good news green', () => {
    render(<DuelFacts rows={[{ label: 'Platform fee', value: '0 USDT', tone: 'good' }]} />);

    expect(screen.getByText('0 USDT').className).toContain('text-good-ink');
  });

  it('sets the pot larger than the rest', () => {
    render(<DuelFacts rows={[{ label: 'Pot', value: '10 USDT', tone: 'pot' }]} />);

    expect(screen.getByText('10 USDT').className).toContain('text-lg');
  });

  it('greys out a value nobody chose yet', () => {
    render(<DuelFacts rows={[{ label: 'Game', value: 'Not chosen', tone: 'unset' }]} />);

    expect(screen.getByText('Not chosen').className).toContain('text-ink-3');
  });

  it('puts what the caller adds under the facts', () => {
    render(
      <DuelFacts rows={[]}>
        <button type="button">Create</button>
      </DuelFacts>
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
  });
});
