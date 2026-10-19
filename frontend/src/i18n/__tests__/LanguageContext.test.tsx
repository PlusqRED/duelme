// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { languageCookie } from '@/i18n/language';
import { translations } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.restoreAllMocks();
});

function LanguageProbe() {
  const { language, setLanguage, t } = useTranslation();
  return (
    <>
      <p>{t('footer.rights')}</p>
      <button onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}>switch</button>
      <button onClick={() => setLanguage(language)}>same</button>
    </>
  );
}

describe('LanguageProvider', () => {
  it('speaks the language the layout gives it', () => {
    render(
      <LanguageProvider language="ru">
        <LanguageProbe />
      </LanguageProvider>
    );

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });

  it('keeps a new choice in the cookie and asks the server for the page again', () => {
    const cookie = vi.spyOn(document, 'cookie', 'set');
    render(
      <LanguageProvider language="en">
        <LanguageProbe />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(cookie).toHaveBeenCalledWith(languageCookie('ru'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('asks nothing of the server for the language already shown', () => {
    const cookie = vi.spyOn(document, 'cookie', 'set');
    render(
      <LanguageProvider language="en">
        <LanguageProbe />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'same' }));

    expect(cookie).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('follows the language the refreshed page brings', () => {
    const { rerender } = render(
      <LanguageProvider language="en">
        <LanguageProbe />
      </LanguageProvider>
    );

    rerender(
      <LanguageProvider language="ru">
        <LanguageProbe />
      </LanguageProvider>
    );

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });
});
