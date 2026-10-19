// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSnapIndex } from '@/hooks/useSnapIndex';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

let track: HTMLElement;

function card(index: number): Element {
  const node = track.children[index];
  if (!node) throw new Error(`No card ${index}`);
  return node;
}

function report(index: number, isIntersecting: boolean) {
  act(() => FakeIntersectionObserver.watching(card(index)).report(card(index), isIntersecting));
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  track = document.createElement('div');
  track.append(...[0, 1, 2, 3].map(() => document.createElement('article')));
  document.body.append(track);
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('useSnapIndex', () => {
  it('starts on the first card', () => {
    const { result } = renderHook(() => useSnapIndex({ current: track }, 4));

    expect(result.current).toBe(0);
  });

  it('watches the cards within the strip, mostly in view', () => {
    renderHook(() => useSnapIndex({ current: track }, 4));
    const observer = FakeIntersectionObserver.watching(card(3));

    expect([observer.root, observer.thresholds]).toEqual([track, [0.6]]);
  });

  it('follows the card swiped into view', () => {
    const { result } = renderHook(() => useSnapIndex({ current: track }, 4));
    report(0, true);

    report(0, false);
    report(2, true);

    expect(result.current).toBe(2);
  });

  it('names the leftmost when two cards are in view', () => {
    const { result } = renderHook(() => useSnapIndex({ current: track }, 4));

    report(2, true);
    report(1, true);

    expect(result.current).toBe(1);
  });

  it('keeps to the cards there are when fewer are left', () => {
    const { result, rerender } = renderHook(({ count }) => useSnapIndex({ current: track }, count), {
      initialProps: { count: 4 },
    });
    report(3, true);

    track.lastElementChild?.remove();
    track.lastElementChild?.remove();
    rerender({ count: 2 });

    expect(result.current).toBe(1);
  });
});
