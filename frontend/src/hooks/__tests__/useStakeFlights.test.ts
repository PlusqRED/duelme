// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStakeFlights, type FlightAnchors } from '@/hooks/useStakeFlights';

interface HeldAnimation {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  land: () => void;
  cancel: () => void;
}

let animations: HeldAnimation[] = [];

/** Each animation runs until the test lands it, or until it is cancelled. */
function holdAnimations() {
  vi.spyOn(Element.prototype, 'animate').mockImplementation(function (this: Element, keyframes, options) {
    let land = () => {};
    let cancel = () => {};
    const finished = new Promise<Animation>((resolve, reject) => {
      land = () => resolve(this.getAnimations()[0]);
      cancel = () => reject(new DOMException('cancelled', 'AbortError'));
    });
    const held = { keyframes: [keyframes].flat() as Keyframe[], options: options as KeyframeAnimationOptions, land, cancel };
    animations.push(held);
    return { finished, cancel } as unknown as Animation;
  });
  vi.spyOn(Element.prototype, 'getAnimations').mockImplementation(() => animations.map(({ cancel }) => ({ cancel }) as unknown as Animation));
}

function box(left: number, top: number, size = 40, text = ''): HTMLElement {
  const node = document.createElement('span');
  node.textContent = text;
  node.getBoundingClientRect = () => DOMRect.fromRect({ x: left, y: top, width: size, height: size });
  return node;
}

function anchors(): FlightAnchors {
  const stage = box(0, 0, 400);
  document.body.append(stage);
  return {
    stage: { current: stage },
    wallets: { creator: { current: box(0, 200) }, opponent: { current: box(360, 200) } },
    slots: { creator: { current: box(160, 100, 40, '10') }, opponent: { current: box(200, 100, 40, '10') } },
  };
}

function tokens(from: FlightAnchors) {
  return from.stage.current?.querySelectorAll('[data-flight]') ?? [];
}

beforeEach(() => {
  animations = [];
  holdAnimations();
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('useStakeFlights', () => {
  it('draws a copy of the slot’s stake in its seat’s colour over the stage while it flies, hidden from readers', () => {
    const where = anchors();
    const { result } = renderHook(() => useStakeFlights(where));

    void result.current.fly('opponent', 'in', 120);

    const [token] = tokens(where);
    expect(token.textContent).toBe('10');
    expect(token.getAttribute('aria-hidden')).toBe('true');
    expect(token.className).toContain('bg-blue');
    expect(animations[0].options).toMatchObject({ delay: 120, duration: 900 });
  });

  it('flies from the wallet to the slot on the way in', () => {
    const where = anchors();
    const { result } = renderHook(() => useStakeFlights(where));

    void result.current.fly('creator', 'in', 0);

    const { keyframes } = animations[0];
    expect(keyframes[0].transform).toBe('translate(0px, 200px) scale(0.4)');
    expect(keyframes.at(-1)?.transform).toBe('translate(160px, 100px) scale(1)');
  });

  it('flies from the slot to the winner’s wallet on the way out, shrinking as it lands', () => {
    const where = anchors();
    const { result } = renderHook(() => useStakeFlights(where));

    void result.current.fly('opponent', 'out', 0, 'creator');

    const { keyframes } = animations[0];
    expect(keyframes[0].transform).toBe('translate(200px, 100px) scale(1)');
    expect(keyframes.at(-1)).toMatchObject({ transform: 'translate(0px, 200px) scale(0.45)', opacity: 0 });
  });

  it('takes the stake away and says it landed once the flight is over', async () => {
    const where = anchors();
    const { result } = renderHook(() => useStakeFlights(where));
    const landed = result.current.fly('creator', 'in', 0);

    animations[0].land();

    await expect(landed).resolves.toBe(true);
    expect(tokens(where)).toHaveLength(0);
  });

  it('drops every stake in flight on cancel, and says none of them landed', async () => {
    const where = anchors();
    const { result } = renderHook(() => useStakeFlights(where));
    const first = result.current.fly('creator', 'in', 0);
    const second = result.current.fly('opponent', 'in', 120);

    result.current.cancel();

    await expect(Promise.all([first, second])).resolves.toEqual([false, false]);
    expect(tokens(where)).toHaveLength(0);
  });

  it('does not fly when the stage is not drawn', async () => {
    const where = { ...anchors(), stage: { current: null } };
    const { result } = renderHook(() => useStakeFlights(where));

    await expect(result.current.fly('creator', 'in', 0)).resolves.toBe(false);
    expect(animations).toEqual([]);
  });
});
