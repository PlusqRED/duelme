// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { translations } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

function LanguageProbe() {
  const { t, language } = useTranslation();
  return (
    <p data-language={language}>{t('footer.rights')}</p>
  );
}

afterEach(cleanup);

describe('LanguageProvider', () => {
  it('speaks the language the layout read from the address', () => {
    render(
      <LanguageProvider language="ru">
        <LanguageProbe />
      </LanguageProvider>
    );

    expect(screen.getByText(translations.ru['footer.rights']).dataset.language).toBe('ru');
  });

  it('is English outside a provider', () => {
    render(<LanguageProbe />);

    expect(screen.getByText(translations.en['footer.rights']).dataset.language).toBe('en');
  });
});
