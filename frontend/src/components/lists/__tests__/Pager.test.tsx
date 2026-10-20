// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pager } from '@/components/lists/Pager';

afterEach(cleanup);

describe('Pager', () => {
  it('shows nothing for a list that fits on one page', () => {
    const { container } = render(<Pager page={1} total={20} pageSize={20} onPage={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('says which items the page shows', () => {
    render(<Pager page={2} total={57} pageSize={20} onPage={vi.fn()} />);

    expect(screen.getByText('21–40 of 57')).toBeTruthy();
  });

  it('marks the page shown', () => {
    render(<Pager page={2} total={57} pageSize={20} onPage={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Page 2' }).getAttribute('aria-current')).toBe('page');
  });

  it('goes to the page picked', () => {
    const onPage = vi.fn();
    render(<Pager page={1} total={57} pageSize={20} onPage={onPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));

    expect(onPage).toHaveBeenCalledWith(3);
  });

  it('goes on to the next page', () => {
    const onPage = vi.fn();
    render(<Pager page={1} total={57} pageSize={20} onPage={onPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('cannot go back from the first page', () => {
    render(<Pager page={1} total={57} pageSize={20} onPage={vi.fn()} />);

    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
