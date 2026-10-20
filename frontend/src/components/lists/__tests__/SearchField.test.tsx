// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterPill } from '@/components/lists/FilterPill';
import { SearchField } from '@/components/lists/SearchField';

afterEach(cleanup);

describe('SearchField', () => {
  it('is named by what it searches', () => {
    render(<SearchField value="" onChange={vi.fn()} placeholder="Find a game" />);

    expect(screen.getByRole('searchbox', { name: 'Find a game' })).toBeTruthy();
  });

  it('passes on what is typed', () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Find a game" />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'chess' } });

    expect(onChange).toHaveBeenCalledWith('chess');
  });

  it('offers to clear the search only once something is typed', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchField value="" onChange={onChange} placeholder="Find a game" />);
    expect(screen.queryByRole('button', { name: 'Clear the search' })).toBeNull();

    rerender(<SearchField value="chess" onChange={onChange} placeholder="Find a game" />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear the search' }));

    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('FilterPill', () => {
  it('says whether it is on, and how many it holds', () => {
    render(
      <FilterPill isPressed onClick={vi.fn()} count={4}>
        Won
      </FilterPill>
    );

    const pill = screen.getByRole('button', { name: 'Won 4' });
    expect(pill.getAttribute('aria-pressed')).toBe('true');
  });
});
