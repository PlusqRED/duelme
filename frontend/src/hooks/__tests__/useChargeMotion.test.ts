// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useChargeMotion } from '@/hooks/useChargeMotion';

const STOPS = [0.3, 3, 5, 10, 25, 50, 100, 500];

function parts(cells: number) {
  const root = document.createElement('div');
  const bar = document.createElement('div');
  for (let index = 0; index < cells; index += 1) bar.append(document.createElement('span'));
  const cap = document.createElement('span');
  const text = document.createElement('b');
  return { root: { current: root }, bar: { current: bar }, cap: { current: cap }, text: { current: text } };
}

function motion(cells = 4) {
  const slider = parts(cells);
  const { result } = renderHook(() => useChargeMotion(slider, STOPS, (stake) => `${stake}`));
  return { slider, motion: result };
}

afterEach(cleanup);

describe('useChargeMotion', () => {
  it('puts the keycap where it jumps to and fills the bar up to it', () => {
    const { slider, motion: result } = motion(4);

    act(() => {
      result.current.valueRef.current = 25;
      result.current.moveTo(0.5, 'jump');
    });

    const fills = Array.from(slider.bar.current.children).map((cell) => (cell as HTMLElement).style.getPropertyValue('--f'));
    expect(slider.root.current.style.getPropertyValue('--pos')).toBe('0.5');
    expect(fills).toEqual(['1.000', '1.000', '0.000', '0.000']);
    expect(slider.text.current.textContent).toBe('25');
  });

  it('leaves the bar empty and shows 0 without a stake', () => {
    const { slider, motion: result } = motion(4);

    act(() => result.current.moveTo(0, 'jump'));

    expect(slider.text.current.textContent).toBe('0');
    expect(slider.root.current.hasAttribute('data-at-start')).toBe(true);
  });

  it('marks a stake past what the wallet holds', () => {
    const { slider, motion: result } = motion(4);

    act(() => {
      result.current.limitRef.current = 10;
      result.current.valueRef.current = 25;
      result.current.moveTo(0.5, 'jump');
    });

    expect(slider.root.current.hasAttribute('data-short')).toBe(true);
  });

  it('marks the slider’s end', () => {
    const { slider, motion: result } = motion(4);

    act(() => {
      result.current.valueRef.current = 500;
      result.current.moveTo(1, 'jump');
    });

    expect(slider.root.current.hasAttribute('data-at-end')).toBe(true);
  });
});
