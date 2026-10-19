// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/i18n/LanguageContext';
import { translator } from '@/i18n/translate';

const stats = vi.hoisted(() => ({ duelsPlayed: 4, totalVolumeRaw: 61_800_000n, isLoading: false, isError: false }));
vi.mock('@/hooks/usePlatformStats', () => ({ usePlatformStats: () => stats }));

const { HeroFacts } = await import('@/components/landing/HeroFacts');

/** Each fact as its figure and its words, the way it reads. */
function facts() {
  return [...document.querySelectorAll('dl > div')].map((row) => [row.querySelector('dd')?.textContent, row.querySelector('dt')?.textContent]);
}

beforeEach(() => {
  Object.assign(stats, { duelsPlayed: 4, totalVolumeRaw: 61_800_000n, isLoading: false, isError: false });
});

afterEach(cleanup);

describe('HeroFacts', () => {
  it('gives the fee, the money that went through duels and how many were played', () => {
    render(<HeroFacts />);

    expect(facts()).toEqual([
      ['0%', 'platform fee'],
      ['61.80 USDT', 'total volume'],
      ['4', 'duels played'],
    ]);
  });

  it('shows dashes while the history is read', () => {
    stats.isLoading = true;
    render(<HeroFacts />);

    expect(facts().slice(1).map(([figure]) => figure)).toEqual(['—', '—']);
  });

  it('shows dashes when part of the history failed to load, rather than a total that is too low', () => {
    stats.isError = true;
    render(<HeroFacts />);

    expect(facts().slice(1).map(([figure]) => figure)).toEqual(['—', '—']);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('agrees the words with the count in Russian', () => {
    stats.duelsPlayed = 21;
    render(
      <LanguageContext.Provider value={{ language: 'ru', ...translator('ru') }}>
        <HeroFacts />
      </LanguageContext.Provider>
    );

    expect(facts()[2]).toEqual(['21', 'дуэль сыграна']);
  });
});
