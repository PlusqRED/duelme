// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StakeCharge } from '@/components/duel/create/StakeCharge';

afterEach(cleanup);

const STOPS = [0.3, 3, 5, 10, 25, 50, 100, 500];

function charge(overrides: Partial<Parameters<typeof StakeCharge>[0]> = {}) {
  const props = {
    stops: STOPS,
    stake: 3 as number | null,
    isInvalid: false,
    limit: null as number | null,
    format: (stake: number) => String(stake),
    label: 'Stake',
    emptyText: 'Not set',
    shouldHint: false,
    onChange: vi.fn(),
    onEnter: vi.fn(),
    ...overrides,
  };
  render(<StakeCharge {...props} />);
  return props;
}

describe('StakeCharge', () => {
  it('reads out the stake in USDT', () => {
    charge({ stake: 25 });

    expect(screen.getByRole('slider', { name: 'Stake' }).getAttribute('aria-valuetext')).toBe('25 USDT');
  });

  it('reads out that no stake is set', () => {
    charge({ stake: null });

    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('Not set');
  });

  it('holds a stake past its end at the end', () => {
    charge({ stake: 750 });

    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('500');
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('750 USDT');
  });

  it('moves to the next mark with an arrow key', () => {
    const props = charge({ stake: 3 });

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(props.onChange).toHaveBeenCalledWith(5, true);
  });

  it('moves one step with Shift and an arrow key', () => {
    const props = charge({ stake: 5 });

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight', shiftKey: true });

    expect(props.onChange).toHaveBeenCalledWith(5.5, true);
  });

  it.each([
    ['Home', 0.3],
    ['End', 500],
  ])('goes to an end with %s', (key, stake) => {
    const props = charge({ stake: 10 });

    fireEvent.keyDown(screen.getByRole('slider'), { key });

    expect(props.onChange).toHaveBeenCalledWith(stake, true);
  });

  it('goes on with Enter', () => {
    const props = charge();

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Enter' });

    expect(props.onEnter).toHaveBeenCalledOnce();
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('sets a mark’s stake when the mark is pressed', () => {
    const props = charge({ stake: null });

    fireEvent.click(screen.getByText('100'));

    expect(props.onChange).toHaveBeenCalledWith(100, true);
  });

  it('flags what the wallet holds on the bar', () => {
    charge({ limit: 46.7 });

    expect(screen.getByText('46.7')).toBeTruthy();
  });

  it('flags nothing without a balance', () => {
    charge({ limit: null });

    expect(screen.queryByText('46.7')).toBeNull();
  });
});
