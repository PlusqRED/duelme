// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, buttonVariants } from '@/components/ui/button';

afterEach(cleanup);

describe('Button', () => {
  it('is a navy keycap by default', () => {
    render(<Button>Join</Button>);

    const button = screen.getByRole('button', { name: 'Join' });
    expect(button.className).toContain('keycap');
    expect(button.className).toContain('bg-ink');
  });

  it('keeps the sun for the payout', () => {
    render(<Button variant="sun">Take 20 USDT</Button>);

    expect(screen.getByRole('button', { name: 'Take 20 USDT' }).className).toContain('bg-sun');
  });

  it('draws no keycap for a ghost button', () => {
    render(<Button variant="ghost">Sign out</Button>);

    expect(screen.getByRole('button', { name: 'Sign out' }).className).not.toContain('keycap');
  });

  it('lets the caller lay it out without losing its face', () => {
    render(<Button className="w-full">Join</Button>);

    const { className } = screen.getByRole('button', { name: 'Join' });
    expect(className).toContain('w-full');
    expect(className).toContain('bg-ink');
  });

  it.each(['sm', 'md', 'lg'] as const)('keeps the label at a line height of 1.1 at size %s', (size) => {
    render(<Button size={size}>Join</Button>);

    expect(screen.getByRole('button', { name: 'Join' }).className).toMatch(/(?:^| )text-[\w-]+\/\[1\.1\](?: |$)/);
  });

  it('cannot be pressed while disabled', () => {
    render(<Button disabled>Join</Button>);

    expect(screen.getByRole('button', { name: 'Join' }).hasAttribute('disabled')).toBe(true);
  });

  it('gives a link the same face', () => {
    expect(buttonVariants({ variant: 'paper', size: 'lg' })).toContain('bg-paper');
  });
});
