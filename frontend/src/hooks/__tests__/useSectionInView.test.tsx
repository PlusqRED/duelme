// @vitest-environment happy-dom
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSectionInView } from '@/hooks/useSectionInView';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const IDS = ['first', 'second', 'third'] as const;

function section(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`No section ${id}`);
  return node;
}

function report(id: string, isIntersecting: boolean) {
  act(() => FakeIntersectionObserver.watching(section(id)).report(section(id), isIntersecting));
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  render(
    <>
      {IDS.map((id) => (
        <section key={id} id={id} />
      ))}
    </>
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useSectionInView', () => {
  it('has no section before any crosses the reading band', () => {
    const { result } = renderHook(() => useSectionInView(IDS));

    expect(result.current).toBeNull();
  });

  it('watches the band just above the middle of the screen', () => {
    renderHook(() => useSectionInView(IDS));

    expect(FakeIntersectionObserver.watching(section('first')).rootMargin).toBe('-35% 0px -60% 0px');
  });

  it('names the section in the band', () => {
    const { result } = renderHook(() => useSectionInView(IDS));

    report('second', true);

    expect(result.current).toBe('second');
  });

  it('names the first in page order when two share the band', () => {
    const { result } = renderHook(() => useSectionInView(IDS));

    report('third', true);
    report('second', true);

    expect(result.current).toBe('second');
  });

  it('moves on as a section leaves the band', () => {
    const { result } = renderHook(() => useSectionInView(IDS));
    report('first', true);
    report('second', true);

    report('first', false);

    expect(result.current).toBe('second');
  });

  it('skips an id the page does not have', () => {
    const { result } = renderHook(() => useSectionInView(['missing', ...IDS]));

    report('first', true);

    expect(result.current).toBe('first');
  });

  it('watches nothing for no sections', () => {
    renderHook(() => useSectionInView([]));

    expect(FakeIntersectionObserver.instances).toEqual([]);
  });
});
