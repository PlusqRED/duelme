// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChargeCells } from '@/components/sign/ChargeCells';

afterEach(cleanup);

const STAKE = 10_000_000n;

function faces(container: HTMLElement) {
  return [...container.querySelectorAll(':scope > span > i > i')];
}

describe('ChargeCells', () => {
  it('draws the stake as ten cells', () => {
    const { container } = render(<ChargeCells haveRaw={0n} needRaw={STAKE} side="opponent" />);

    expect(container.querySelectorAll(':scope > span > i')).toHaveLength(10);
  });

  it('lights the cells the wallet covers, part of the next one partly', () => {
    const { container } = render(<ChargeCells haveRaw={4_500_000n} needRaw={STAKE} side="opponent" />);

    expect(faces(container).map((face) => (face as HTMLElement).style.getPropertyValue('--part'))).toEqual(['1', '1', '1', '1', '0.5']);
  });

  it('hatches the cells the wallet lacks', () => {
    const { container } = render(<ChargeCells haveRaw={4_500_000n} needRaw={STAKE} side="opponent" />);

    const hatched = [...container.querySelectorAll(':scope > span > i')].filter((cell) => cell.className.includes('repeating-linear-gradient'));
    expect(hatched).toHaveLength(6);
  });

  it('lights them in the seat’s colour', () => {
    const { container } = render(<ChargeCells haveRaw={STAKE} needRaw={STAKE} side="creator" />);

    expect(container.firstElementChild?.className).toContain('--color-red');
  });

  it('charges the cells money just covered, and glints once full', () => {
    const { container } = render(<ChargeCells haveRaw={STAKE} needRaw={STAKE} side="opponent" fromRaw={4_000_000n} />);

    expect(container.querySelectorAll('.animate-cell-charge')).toHaveLength(6);
    expect(container.querySelector('.animate-cells-glint')).not.toBeNull();
  });

  it('keeps still without money that just landed', () => {
    const { container } = render(<ChargeCells haveRaw={STAKE} needRaw={STAKE} side="opponent" />);

    expect(container.querySelector('.animate-cell-charge, .animate-cells-glint')).toBeNull();
  });
});
