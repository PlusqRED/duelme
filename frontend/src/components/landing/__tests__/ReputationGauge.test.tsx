// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ReputationGauge } from '@/components/landing/ReputationGauge';
import type { GaugePoint } from '@/lib/reputationGauge';

/** Fair's zone, the third, stands 200px in and is 100px wide; the pin stands halfway across it. */
const POINT: GaugePoint = { level: 'fair', spot: 0.5 };
const ZONE_LEFT = 200;
const ZONE_WIDTH = 100;

const offsetLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft');
const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { configurable: true, get: () => ZONE_LEFT });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => ZONE_WIDTH });
});

afterAll(() => {
  if (offsetLeft) Object.defineProperty(HTMLElement.prototype, 'offsetLeft', offsetLeft);
  if (offsetWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
});

afterEach(cleanup);

function pinOf(container: HTMLElement) {
  const pin = container.querySelector<HTMLElement>('[style*="--pin-x"]');
  if (!pin) throw new Error('The pin is on the scale');
  return pin;
}

describe('ReputationGauge', () => {
  it('stands the pin where the record puts it', () => {
    const { container } = render(<ReputationGauge point={POINT} change={null} face={null} />);

    expect(pinOf(container).style.getPropertyValue('--pin-x')).toBe(`${ZONE_LEFT + ZONE_WIDTH * POINT.spot}px`);
  });

  it('keeps the pin at the scale\'s start while its entrance waits', () => {
    const { container } = render(<ReputationGauge point={POINT} change={null} face={null} entrance="waiting" />);

    expect(pinOf(container).style.getPropertyValue('--pin-x')).toBe('0px');
  });

  it('walks the pin from the start to its place', () => {
    const { container, rerender } = render(<ReputationGauge point={POINT} change={null} face={null} entrance="waiting" />);

    rerender(<ReputationGauge point={POINT} change={null} face={null} entrance="walking" />);

    const pin = pinOf(container);
    expect(pin.style.getPropertyValue('--pin-x')).toBe('250px');
    expect(pin.className).toContain('transition-[translate]');
  });

  it('stands the pin still on a scale shown without a change or an entrance', () => {
    const { container } = render(<ReputationGauge point={POINT} change={null} face={null} />);

    expect(pinOf(container).className).not.toContain('transition-[translate]');
  });

  it('draws a smaller pin on a narrow card', () => {
    const { container } = render(<ReputationGauge point={POINT} change={null} face={null} isCompact />);

    expect(pinOf(container).querySelector('.size-\\[38px\\]')).not.toBeNull();
  });
});
