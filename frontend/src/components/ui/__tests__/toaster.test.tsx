// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it } from 'vitest';
import { Toaster } from '@/components/ui/toaster';

afterEach(() => {
  act(() => toast.dismiss());
  cleanup();
});

async function showError(text: string) {
  render(<Toaster />);
  await act(async () => {
    toast.error(text);
  });
  const item = (await screen.findByText(text)).closest('[data-sonner-toast]');
  if (!item) throw new Error('no toast rendered');
  return item;
}

describe('Toaster', () => {
  it('sets a toast in the design font, not the one sonner brings', async () => {
    const item = await showError('Could not copy');

    expect(item.className.split(' ')).toContain('font-sans');
  });

  it('hides the content of the toasts stacked behind the front one', async () => {
    const item = await showError('Could not copy');

    expect(item.className.split(' ')).toContain('data-[expanded=false]:data-[front=false]:*:opacity-0');
  });
});
