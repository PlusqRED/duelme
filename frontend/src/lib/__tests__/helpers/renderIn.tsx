import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import type { Language } from '@/i18n/translations';

/** A server part rendered as a page hands it on: inside the language its client parts read. */
export function renderIn(language: Language, node: ReactNode) {
  return render(<LanguageProvider language={language}>{node}</LanguageProvider>);
}
