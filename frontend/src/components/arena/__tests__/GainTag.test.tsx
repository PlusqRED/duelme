// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GainTag } from '@/components/arena/GainTag';
import { LanguageProvider } from '@/i18n/LanguageContext';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

describe('GainTag', () => {
  it('writes the money that came in exactly, in the reader’s number format, with its currency kept beside it', () => {
    const { container } = render(
      <LanguageProvider language="ru">
        <GainTag amount={1_234_500_000n} />
      </LanguageProvider>
    );

    expect(container.textContent).toBe('+1 234,5 USDT');
  });
});
