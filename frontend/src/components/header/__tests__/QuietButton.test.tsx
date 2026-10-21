// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuietButton } from '@/components/header/QuietButton';

afterEach(cleanup);

describe('QuietButton', () => {
  it('acts on a click without submitting the form around it', () => {
    const onClick = vi.fn();
    render(
      <form onSubmit={() => expect.unreachable('the form was submitted')}>
        <QuietButton icon="logout" onClick={onClick}>
          Sign out
        </QuietButton>
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
