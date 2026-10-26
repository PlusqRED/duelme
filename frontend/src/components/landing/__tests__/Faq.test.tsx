// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { translations } from '@/i18n/translations';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }) }));

const { Faq } = await import('@/components/landing/Faq');

afterEach(cleanup);

describe('Faq', () => {
  it('asks the questions under its heading, in the reader’s language', async () => {
    render(await Faq());

    expect(screen.getByRole('region', { name: translations.ru['faq.title'] })).toBeTruthy();
    expect(screen.getByText(translations.ru['faq.fee.q'])).toBeTruthy();
  });

  it('has every answer in the page before it is opened, for search engines to read', async () => {
    const { container } = render(await Faq());

    expect(container.textContent).toContain(translations.ru['faq.custody.a']);
  });

  it('opens an answer on a press of its question', async () => {
    render(await Faq());
    const question = screen.getByText(translations.ru['faq.dispute.q']);

    fireEvent.click(question);

    expect(question.closest('details')?.open).toBe(true);
  });
});
