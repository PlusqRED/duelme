// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

afterEach(cleanup);

function renderOpenDialog(showCloseButton?: boolean) {
  return render(
    <Dialog open>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Top up</DialogTitle>
          <DialogDescription>Send USDT to this address.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('names the window after its title and describes it', () => {
    renderOpenDialog();

    const dialog = screen.getByRole('dialog', { name: 'Top up' });
    expect(dialog.getAttribute('aria-describedby')).toBe(screen.getByText('Send USDT to this address.').id);
  });

  it('offers a close button labelled in words', () => {
    renderOpenDialog();

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('has no close button while closing would hide a result still coming', () => {
    renderOpenDialog(false);

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('pins a footer to the bottom of a phone\'s sheet only when asked', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Top up</DialogTitle>
          <DialogFooter isPinned>Pinned</DialogFooter>
          <DialogFooter>Plain</DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Pinned').className).toContain('max-xs:sticky');
    expect(screen.getByText('Plain').className).not.toContain('sticky');
  });
});
