// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnCountdown } from '@/components/duel/room/TurnCountdown';
import { translations } from '@/i18n/translations';

const en = translations.en;
const CLAIMED_AT = 1_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date((CLAIMED_AT + 900) * 1000));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TurnCountdown', () => {
  it('shows the time left to answer as a clock', () => {
    render(<TurnCountdown duel={{ claimTimestamp: BigInt(CLAIMED_AT) }} claimTimeout={3600} note={null} />);

    expect(screen.getByRole('timer').textContent).toContain('45:00');
  });

  it('drains its bar with the time left', () => {
    const { container } = render(<TurnCountdown duel={{ claimTimestamp: BigInt(CLAIMED_AT) }} claimTimeout={3600} note={null} />);

    expect((container.querySelector('[role=timer] i') as HTMLElement).style.getPropertyValue('--left')).toBe('0.75');
  });

  it('says what running out means for the reader', () => {
    render(<TurnCountdown duel={{ claimTimestamp: BigInt(CLAIMED_AT) }} claimTimeout={3600} note={en['room.countdown.you']} />);

    expect(screen.getByText(en['room.countdown.you'])).toBeTruthy();
  });
});
