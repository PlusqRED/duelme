// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavFit } from '@/hooks/useNavFit';

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
    const px = node.getAttribute('data-nav-fit') === 'crowded' ? width.px - MENU_BUTTON_PX : width.px;
    return { width: px } as DOMRect;
  };
  return node;
}

function row(width: { px: number }) {
  const node = document.createElement('div');
  node.getBoundingClientRect = () => ({ width: width.px }) as DOMRect;
  return node;
}

/** The hook over a bar and its row; `fit()` reads the mark it gives the bar now. */
function renderFit(room: HTMLElement, list: HTMLElement) {
  const roomRef = { current: room };
  const rowRef = { current: list };
  const { result, unmount } = renderHook(() => useNavFit(roomRef, rowRef));
  return { fit: () => result.current['data-nav-fit'], unmount };
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

describe('useNavFit', () => {
  it('leaves the row in the bar while it fits', () => {
    const { fit } = renderFit(bar({ px: 702 }), row({ px: 681 }));

    expect(fit()).toBe('fits');
  });

  it('crowds the bar when the row is wider than its room', () => {
    const { fit } = renderFit(bar({ px: 680 }), row({ px: 681 }));

    expect(fit()).toBe('crowded');
  });

  it('leaves a row exactly as wide as its room in the bar', () => {
    const { fit } = renderFit(bar({ px: 681 }), row({ px: 681 }));

    expect(fit()).toBe('fits');
  });

  it('watches both the room and the row', () => {
    const room = bar({ px: 702 });
    const list = row({ px: 681 });
    renderFit(room, list);

    expect(watches.at(-1)?.targets).toEqual([room, list]);
  });

  it('measures again when the room narrows', () => {
    const roomWidth = { px: 702 };
    const { fit } = renderFit(bar(roomWidth), row({ px: 681 }));

    roomWidth.px = 600;
    resize();

    expect(fit()).toBe('crowded');
  });

  it('measures again when the room widens', () => {
    const roomWidth = { px: 600 };
    const { fit } = renderFit(bar(roomWidth), row({ px: 681 }));

    roomWidth.px = 702;
    resize();

    expect(fit()).toBe('fits');
  });

  it('measures again when the row grows', () => {
    const rowWidth = { px: 577 };
    const { fit } = renderFit(bar({ px: 600 }), row(rowWidth));

    rowWidth.px = 681;
    resize();

    expect(fit()).toBe('crowded');
  });

  it('brings the row back once it fits without the menu’s button', () => {
    const room = bar({ px: 702 });
    room.setAttribute('data-nav-fit', 'crowded');
    const { fit } = renderFit(room, row({ px: 681 }));

    expect(fit()).toBe('fits');
  });

  it('puts the bar’s mark back after measuring', () => {
    const room = bar({ px: 702 });
    room.setAttribute('data-nav-fit', 'crowded');
    renderFit(room, row({ px: 720 }));

    expect(room.getAttribute('data-nav-fit')).toBe('crowded');
  });

  it('keeps the last mark while the bar is not displayed', () => {
    const roomWidth = { px: 600 };
    const rowWidth = { px: 681 };
    const { fit } = renderFit(bar(roomWidth), row(rowWidth));

    roomWidth.px = 0;
    rowWidth.px = 0;
    resize();

    expect(fit()).toBe('crowded');
  });

  it('crowds a displayed bar squeezed to no room at all', () => {
    const { fit } = renderFit(bar({ px: 0 }), row({ px: 681 }));

    expect(fit()).toBe('crowded');
  });

  it('gives no mark until a displayed bar is measured', () => {
    const { fit } = renderFit(bar({ px: 0 }), row({ px: 0 }));

    expect(fit()).toBeUndefined();
  });

  it('stops watching once the bar is gone', () => {
    const { unmount } = renderFit(bar({ px: 702 }), row({ px: 681 }));

    unmount();

    expect(watches.at(-1)?.isDisconnected).toBe(true);
  });

  it('measures once where the browser cannot watch sizes', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { fit } = renderFit(bar({ px: 600 }), row({ px: 681 }));

    expect(fit()).toBe('crowded');
  });
});
