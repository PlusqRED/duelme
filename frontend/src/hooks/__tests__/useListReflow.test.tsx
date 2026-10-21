// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { useListReflow } = await import('@/hooks/useListReflow');

/** Where each row sits, by its key: happy-dom lays nothing out, so the test says. */
let tops: Record<string, number> = {};
let animate: Mock<HTMLElement['animate']>;

/** A list with the button that picks its next filter, which notes where its rows are. */
function List({ rows, filter }: { rows: string[]; filter: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const { capture } = useListReflow(listRef, filter);
  return (
    <>
      <button type="button" onClick={capture}>
        Pick
      </button>
      <ol ref={listRef}>
        {rows.map((row) => (
          <li key={row} data-key={row}>
            {row}
          </li>
        ))}
      </ol>
    </>
  );
}

function pick() {
  fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
}

/** The row each animation moved, with its first frame and its delay. */
function moves() {
  return animate.mock.contexts.map((row, index) => {
    const [keyframes, options] = animate.mock.calls[index];
    const first = Array.isArray(keyframes) ? keyframes[0] : keyframes;
    const delay = typeof options === 'object' ? options.delay : undefined;
    return [row instanceof HTMLElement ? row.dataset.key : undefined, first, delay ?? 0];
  });
}

beforeEach(() => {
  motion.reduced = false;
  tops = {};
  animate = vi.fn<HTMLElement['animate']>();
  vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(animate);
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    return tops[this.dataset.key ?? ''] ?? 0;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useListReflow', () => {
  it('moves nothing on the first render', () => {
    render(<List rows={['a', 'b']} filter="all" />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('slides a row that stays from where it was to its new place', () => {
    tops = { a: 0, b: 100, c: 200 };
    const { rerender } = render(<List rows={['a', 'b', 'c']} filter="all" />);
    pick();

    tops = { c: 0 };
    rerender(<List rows={['c']} filter="chess" />);

    expect(moves()).toEqual([['c', { transform: 'translateY(200px)' }, 0]]);
  });

  it('raises new rows in after a moment, one after another', () => {
    tops = { a: 0 };
    const { rerender } = render(<List rows={['a']} filter="chess" />);
    pick();

    tops = { a: 0, b: 100, c: 200 };
    rerender(<List rows={['a', 'b', 'c']} filter="all" />);

    expect(moves()).toEqual([
      ['b', { opacity: 0, transform: 'translateY(12px)' }, 140],
      ['c', { opacity: 0, transform: 'translateY(12px)' }, 210],
    ]);
  });

  it('moves nothing when the list changes without a new filter', () => {
    tops = { a: 0 };
    const { rerender } = render(<List rows={['a']} filter="all" />);
    pick();

    tops = { b: 0, a: 100 };
    rerender(<List rows={['b', 'a']} filter="all" />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('moves nothing for a new filter whose places were not captured', () => {
    tops = { a: 0, b: 100 };
    const { rerender } = render(<List rows={['a', 'b']} filter="all" />);

    tops = { b: 0 };
    rerender(<List rows={['b']} filter="chess" />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('moves from the places captured last, once', () => {
    tops = { a: 0, b: 100 };
    const { rerender } = render(<List rows={['a', 'b']} filter="all" />);
    pick();
    tops = { b: 0 };
    rerender(<List rows={['b']} filter="chess" />);
    animate.mockClear();

    rerender(<List rows={['b']} filter="dota-2" />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('moves nothing with motion reduced', () => {
    motion.reduced = true;
    tops = { a: 0, b: 100 };
    const { rerender } = render(<List rows={['a', 'b']} filter="all" />);
    pick();

    tops = { b: 0, c: 100 };
    rerender(<List rows={['b', 'c']} filter="chess" />);

    expect(animate).not.toHaveBeenCalled();
  });
});
