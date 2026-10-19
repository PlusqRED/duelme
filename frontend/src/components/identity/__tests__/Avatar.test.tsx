// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar } from '@/components/identity/Avatar';
import { identiconCells } from '@/lib/identicon';

afterEach(cleanup);

const ADDRESS = '0x1111111111111111111111111111111111111111';

describe('Avatar', () => {
  it('draws the address pattern, one square per filled cell', () => {
    const { container } = render(<Avatar address={ADDRESS} tone="red" />);

    expect(container.querySelectorAll('rect')).toHaveLength(identiconCells(ADDRESS).length);
  });

  it('sits on the seat colour it is given', () => {
    const { container } = render(<Avatar address={ADDRESS} tone="blue" />);

    expect(container.firstElementChild?.className.split(' ')).toContain('bg-blue');
  });

  it('is left out of what a screen reader reads, since the name sits beside it', () => {
    const { container } = render(<Avatar address={ADDRESS} tone="ink" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
