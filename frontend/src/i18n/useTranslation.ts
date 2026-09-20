'use client';

import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';

export function useTranslation() {
  const { t, plural, language, setLanguage } = useContext(LanguageContext);
  return { t, plural, language, setLanguage };
}
