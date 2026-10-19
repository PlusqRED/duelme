// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';

afterEach(cleanup);

describe('PartialDataNotice', () => {
  it('says nothing while the whole list loaded', () => {
    const { container } = render(<PartialDataNotice when={false} onRetry={() => {}} />);

    expect(container.childElementCount).toBe(0);
  });

  it('says the list is short', () => {
    render(<PartialDataNotice when onRetry={() => {}} />);

    expect(screen.getByRole('status').textContent).toContain('may be incomplete');
  });

  it('reads the list again on Try again', () => {
    const onRetry = vi.fn();
    render(<PartialDataNotice when onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
