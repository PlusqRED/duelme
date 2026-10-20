// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HistoryPager } from '@/components/dashboard/HistoryPager';

/** The pager over 45 rows, turning its own page the way the history does. */
function Pager({ start = 1, onPage = vi.fn() }: { start?: number; onPage?: (page: number) => void }) {
  const [page, setPage] = useState(start);
  const from = (page - 1) * 20;
  return (
    <HistoryPager
      page={page}
      pages={3}
      from={from}
      count={Math.min(20, 45 - from)}
      total={45}
      onPage={(next) => {
        onPage(next);
        setPage(next);
      }}
    />
  );
}

afterEach(cleanup);

describe('HistoryPager', () => {
  it('names every page and marks the current one', () => {
    render(<Pager start={2} />);

    expect(screen.getByRole('button', { name: 'Page 2 of 3' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Page 1 of 3' }).getAttribute('aria-current')).toBeNull();
  });

  it('says which rows are shown', () => {
    render(<Pager start={3} />);

    expect(screen.getByText('41–45 of 45')).toBeTruthy();
  });

  it('turns off the step that leads past the first page', () => {
    render(<Pager />);

    expect(screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(true);
  });

  it('asks for the page a step leads to', () => {
    const onPage = vi.fn();
    render(<Pager onPage={onPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('gives the focus to the current page after a step, since the step pressed may have turned off', () => {
    render(<Pager start={2} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Page 3 of 3' }));
  });
});
