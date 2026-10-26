// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCrowdedNav } from '@/hooks/useCrowdedNav';

/** What the menu's button takes from the room while it shows: its 44px and the gap before it. */
const MENU_BUTTON_PX = 54;

interface Watch {
  measure: () => void;
  targets: Element[];
  isDisconnected: boolean;
}

const watches: Watch[] = [];

class FakeResizeObserver {
  private readonly watch: Watch;

  constructor(callback: () => void) {
    this.watch = { measure: callback, targets: [], isDisconnected: false };
    watches.push(this.watch);
  }

  observe(target: Element) {
    this.watch.targets.push(target);
  }

  unobserve() {}

  disconnect() {
    this.watch.isDisconnected = true;
  }
}

/** The bar's room, as wide as `width` says, less the menu's button while the bar is crowded. */
function bar(width: { px: number }) {
  const node = document.createElement('nav');
  node.getBoundingClientRect = () => {
    const px = width.px === 0 || !node.hasAttribute('data-crowded') ? width.px : width.px - MENU_BUTTON_PX;
    return { width: px } as DOMRect;
  };
  return node;
}

function row(width: { px: number }) {
  const node = document.createElement('div');
  node.getBoundingClientRect = () => ({ width: width.px }) as DOMRect;
  return node;
}

function renderCrowded(room: HTMLElement, list: HTMLElement) {
  const roomRef = { current: room };
  const rowRef = { current: list };
  return renderHook(() => useCrowdedNav(roomRef, rowRef));
}

function resize() {
  act(() => watches.at(-1)?.measure());
}

beforeEach(() => {
  watches.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useCrowdedNav', () => {
  it('leaves the row in the bar while it fits', () => {
    const { result } = renderCrowded(bar({ px: 702 }), row({ px: 681 }));

    expect(result.current).toBe(false);
  });

  it('crowds the bar when the row is wider than its room', () => {
    const { result } = renderCrowded(bar({ px: 680 }), row({ px: 681 }));

    expect(result.current).toBe(true);
  });

  it('leaves a row exactly as wide as its room in the bar', () => {
    const { result } = renderCrowded(bar({ px: 681 }), row({ px: 681 }));

    expect(result.current).toBe(false);
  });

  it('watches both the room and the row', () => {
    const room = bar({ px: 702 });
    const list = row({ px: 681 });
    renderCrowded(room, list);

    expect(watches.at(-1)?.targets).toEqual([room, list]);
  });

  it('measures again when the room narrows and widens', () => {
    const roomWidth = { px: 702 };
    const { result } = renderCrowded(bar(roomWidth), row({ px: 681 }));

    roomWidth.px = 600;
    resize();
    const narrowed = result.current;
    roomWidth.px = 702;
    resize();

    expect([narrowed, result.current]).toEqual([true, false]);
  });

  it('measures again when the row grows', () => {
    const rowWidth = { px: 577 };
    const { result } = renderCrowded(bar({ px: 600 }), row(rowWidth));

    rowWidth.px = 681;
    resize();

    expect(result.current).toBe(true);
  });

  it('brings the row back once it fits without the menu’s button', () => {
    const room = bar({ px: 702 });
    room.setAttribute('data-crowded', 'true');
    const { result } = renderCrowded(room, row({ px: 681 }));

    expect(result.current).toBe(false);
  });

  it('puts the crowded mark back after measuring', () => {
    const room = bar({ px: 702 });
    room.setAttribute('data-crowded', 'true');
    const { result } = renderCrowded(room, row({ px: 720 }));

    expect([result.current, room.getAttribute('data-crowded')]).toEqual([true, 'true']);
  });

  it('keeps the last answer while the room is not displayed', () => {
    const roomWidth = { px: 600 };
    const { result } = renderCrowded(bar(roomWidth), row({ px: 681 }));

    roomWidth.px = 0;
    resize();

    expect(result.current).toBe(true);
  });

  it('says the row fits until a displayed room is measured', () => {
    const { result } = renderCrowded(bar({ px: 0 }), row({ px: 0 }));

    expect(result.current).toBe(false);
  });

  it('stops watching once the bar is gone', () => {
    const { unmount } = renderCrowded(bar({ px: 702 }), row({ px: 681 }));

    unmount();

    expect(watches.at(-1)?.isDisconnected).toBe(true);
  });

  it('measures once where the browser cannot watch sizes', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { result } = renderCrowded(bar({ px: 600 }), row({ px: 681 }));

    expect(result.current).toBe(true);
  });
});
