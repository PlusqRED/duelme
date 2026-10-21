// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoAutoplay } from '@/hooks/useDemoAutoplay';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

function renderAutoplay(reducedMotion = false) {
  const root = { current: document.createElement('section') };
  const playing = { current: false };
  const touched = { current: false };
  const play = vi.fn(() => {
    playing.current = true;
  });
  const pause = vi.fn(() => {
    playing.current = false;
  });
  renderHook(() => useDemoAutoplay(root, reducedMotion, { play, pause, playing, touched }));
  const show = (isSeen: boolean) => act(() => FakeIntersectionObserver.watching(root.current).report(root.current, isSeen));
  return { root, play, pause, touched, show };
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDemoAutoplay', () => {
  it('plays once it is mostly on screen', () => {
    const { root, play, show } = renderAutoplay();

    show(true);
    wait(700);

    expect(FakeIntersectionObserver.watching(root.current).thresholds).toEqual([0.55]);
    expect(play).toHaveBeenCalledOnce();
  });

  it('pauses while scrolled away and goes on once back', () => {
    const { play, pause, show } = renderAutoplay();
    show(true);
    wait(700);

    show(false);
    show(true);

    expect([pause.mock.calls.length, play.mock.calls.length]).toEqual([1, 2]);
  });

  it('waits until it is seen when scrolled away before it starts', () => {
    const { play, show } = renderAutoplay();
    show(true);
    show(false);
    wait(700);
    const before = play.mock.calls.length;

    show(true);

    expect([before, play.mock.calls.length]).toEqual([0, 1]);
  });

  it('leaves the demo alone once the visitor has taken it', () => {
    const { play, touched, show } = renderAutoplay();
    touched.current = true;

    show(true);
    wait(700);

    expect(play).not.toHaveBeenCalled();
  });

  it('does not play by itself when the reader asked for less motion', () => {
    renderAutoplay(true);

    expect(FakeIntersectionObserver.instances).toEqual([]);
  });
});
