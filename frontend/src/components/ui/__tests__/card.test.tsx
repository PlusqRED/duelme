// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CardTitle } from '@/components/ui/card';

afterEach(cleanup);

describe('CardTitle', () => {
  it('keeps its line height beside a colour the caller adds', () => {
    render(<CardTitle className="text-orange-ink">Funds</CardTitle>);

    expect(screen.getByText('Funds').className.split(' ')).toEqual(
      expect.arrayContaining(['text-lg/snug', 'text-orange-ink'])
    );
  });
});
