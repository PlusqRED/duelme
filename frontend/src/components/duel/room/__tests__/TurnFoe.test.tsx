// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TurnFoe } from '@/components/duel/room/TurnFoe';
import { translations } from '@/i18n/translations';
import { getReputationSummaryFromStats } from '@/lib/reputation';

afterEach(cleanup);

const en = translations.en;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const STATS = en['room.rep.stats'].replace('{honored}', '4').replace('{abandoned}', '0');

describe('TurnFoe', () => {
  it('names who the reader would play', () => {
    render(<TurnFoe address={CREATOR} name="Ace" level={undefined} />);

    expect(screen.getByText(en['room.created.guest.check'])).toBeTruthy();
    expect(screen.getByText('Ace')).toBeTruthy();
  });

  it('leads from their face and name to their profile', () => {
    render(<TurnFoe address={CREATOR} name="Ace" level={undefined} />);

    expect(screen.getByRole('link', { name: 'Ace' }).getAttribute('href')).toBe(`/profile/${CREATOR.toLowerCase()}`);
  });

  it('shows their level and record once the contract has answered', () => {
    render(<TurnFoe address={CREATOR} name="Ace" level={getReputationSummaryFromStats(4, 0)} />);

    expect(screen.getByText(STATS)).toBeTruthy();
  });

  it('shows no record before the contract has answered', () => {
    render(<TurnFoe address={CREATOR} name="Ace" level={undefined} />);

    expect(screen.queryByText(STATS)).toBeNull();
  });
});
