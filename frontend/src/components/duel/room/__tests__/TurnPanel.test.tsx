// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnPanel, WhosePill } from '@/components/duel/room/TurnPanel';

const PLAYER = '0x111111111111111111111111111111111111abcd' as const;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function panel(overrides: Partial<ComponentProps<typeof TurnPanel>> = {}, onMove = vi.fn()) {
  return (
    <TurnPanel
      tone="opponent"
      pointAt={null}
      whose={{ tone: 'opponent', label: 'Your move', isLive: true }}
      titleId="turn-title"
      title="Ace challenges you"
      text="Put in 5 USDT to accept."
      swapKey="created|in"
      {...overrides}
    >
      <button type="button" data-action="join" onClick={onMove}>
        Join
      </button>
    </TurnPanel>
  );
}

describe('TurnPanel', () => {
  it('names whose move it is and what it is, the title labelling the panel', () => {
    render(panel());

    expect(screen.getByText('Your move')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Ace challenges you' })).toBeTruthy();
    expect(screen.getByText('Put in 5 USDT to accept.')).toBeTruthy();
  });

  it('ignores a press on a move while it appears', () => {
    const onMove = vi.fn();
    render(panel({}, onMove));

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(onMove).not.toHaveBeenCalled();
  });

  it('takes presses once the move has settled', () => {
    const onMove = vi.fn();
    render(panel({}, onMove));

    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(onMove).toHaveBeenCalledOnce();
  });

  it('ignores presses again when a new move takes the panel', () => {
    const onMove = vi.fn();
    const { rerender } = render(panel({}, onMove));
    act(() => vi.advanceTimersByTime(700));

    rerender(panel({ swapKey: 'funded|creator' }, onMove));
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(onMove).not.toHaveBeenCalled();
  });

  it('keeps taking presses through a redraw of the same move', () => {
    const onMove = vi.fn();
    const { rerender } = render(panel({}, onMove));
    act(() => vi.advanceTimersByTime(700));

    rerender(panel({ title: 'Bo challenges you' }, onMove));
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(onMove).toHaveBeenCalledOnce();
  });

  it('draws no notch without a seat to point at', () => {
    render(panel());

    expect(screen.getByRole('region').dataset.notch).toBe('none');
  });

  it('puts the notch under the middle of the seat it points at', () => {
    const face = document.createElement('span');
    face.getBoundingClientRect = () => ({ left: 300, width: 80 }) as DOMRect;
    const pointAt = createRef<HTMLElement>();
    pointAt.current = face;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 100, width: 600 } as DOMRect);

    render(panel({ pointAt }));

    expect(screen.getByRole('region').style.getPropertyValue('--caret')).toBe('240px');
  });
});

describe('WhosePill', () => {
  it('shows the other player’s face when it is their move', () => {
    const { container } = render(<WhosePill tone="creator" label="Their move" avatar={PLAYER} icon="eye" />);

    expect(container.querySelector('.bg-red')).not.toBeNull();
  });

  it('shows an icon for a reader who watches', () => {
    const { container } = render(<WhosePill tone="quiet" label="Watching" icon="eye" />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('i')).toBeNull();
  });

  it('pulses its dot while the move is the reader’s', () => {
    const { container } = render(<WhosePill tone="opponent" label="Your move" isLive />);

    expect(container.querySelector('i')?.className).toContain('after:animate-on-air');
  });
});
