// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Note } from '@/components/ui/note';

afterEach(cleanup);

describe('Note', () => {
  it('sets an aside quietly, its icon quieter still', () => {
    render(<Note icon="fuel">The fee is paid in ETH.</Note>);

    const note = screen.getByText('The fee is paid in ETH.');
    expect(note.className).toContain('text-ink-2');
    expect(note.querySelector('svg')?.getAttribute('class')).toContain('text-ink-3');
  });

  it('sets what stops you in the warning colour, its icon too', () => {
    render(<Note icon="alert" tone="bad">No ETH for the fee.</Note>);

    const note = screen.getByText('No ETH for the fee.');
    expect(note.className).toContain('text-orange-ink');
    expect(note.querySelector('svg')?.getAttribute('class')).toContain('text-orange-ink');
  });
});
